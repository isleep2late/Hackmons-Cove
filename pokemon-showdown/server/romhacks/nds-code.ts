export interface NdsOverlay {
	id: number;
	ram: number;
	fileId: number;
	compressed: boolean;
}

export interface NdsCode {
	rom: Buffer;
	code: string;
	rev: number;
	arm9: Buffer;
	arm9Ram: number;
	overlays: NdsOverlay[];
	overlay: (index: number) => Buffer | null;
	files: () => Map<string, Buffer>;
	narc: (filePath: string) => Buffer[] | null;
}

const MAX_UNPACKED = 0x1000000;
const MAX_OVERLAYS = 1024;
const MAX_FILES = 0x10000;
const MAX_ENTRIES = 200000;
const UNPACK_BUDGET = 0x4000000;

export function blz(src: Buffer): Buffer | null {
	const end = src.length;
	if (end < 8 || end > MAX_UNPACKED) return null;
	const control = src.readUInt32LE(end - 8);
	const extra = src.readUInt32LE(end - 4);
	if (!extra || extra > MAX_UNPACKED) return null;
	const coded = control & 0xffffff;
	const header = control >>> 24;
	if (coded > end || header < 8 || header > 11 || header > coded) return null;
	const out = Buffer.alloc(end + extra);
	src.copy(out, 0, 0, end);
	let from = end - header;
	let to = end + extra;
	const stop = end - coded;
	while (from > stop) {
		const flags = src[--from];
		for (let bit = 0x80; bit && from > stop; bit >>= 1) {
			if (flags & bit) {
				if (from < stop + 2) return null;
				const high = src[--from];
				const low = src[--from];
				const length = (high >> 4) + 3;
				const distance = (((high & 0xf) << 8) | low) + 3;
				for (let k = 0; k < length; k++) {
					to--;
					if (to < 0 || to + distance >= out.length) return null;
					out[to] = out[to + distance];
				}
			} else {
				if (to <= 0) return null;
				out[--to] = src[--from];
			}
		}
	}
	return out;
}

export function readNarcSafe(file: Buffer | null | undefined): Buffer[] | null {
	if (!file || file.length < 0x20 || file.length > MAX_UNPACKED) return null;
	if (file.toString('latin1', 0, 4) !== 'NARC' || file.toString('latin1', 0x10, 0x14) !== 'BTAF') return null;
	const btafSize = file.readUInt32LE(0x14);
	const count = file.readUInt32LE(0x18) & 0xffff;
	const btnf = 0x10 + btafSize;
	if (btnf + 8 > file.length || 0x1c + count * 8 > file.length) return null;
	const data = btnf + file.readUInt32LE(btnf + 4) + 8;
	const out: Buffer[] = [];
	let previous = 0;
	for (let i = 0; i < count; i++) {
		const start = file.readUInt32LE(0x1c + i * 8);
		const end = file.readUInt32LE(0x20 + i * 8);
		if (start > end || start < previous || data + end > file.length) return null;
		previous = end;
		out.push(file.subarray(data + start, data + end));
	}
	return out;
}

export function openNdsCode(rom: Buffer): NdsCode | null {
	if (rom.length < 0x4000 || rom.toString('latin1', 0, 7) !== 'POKEMON') return null;
	const size = rom.length;
	const fat = rom.readUInt32LE(0x48);
	const fatSize = rom.readUInt32LE(0x4c);
	const fnt = rom.readUInt32LE(0x40);
	if (fat >= size || fnt >= size) return null;
	const fileCount = Math.min(MAX_FILES, Math.floor(Math.min(fatSize, size - fat) / 8));
	const fileById = (id: number): Buffer | null => {
		if (id < 0 || id >= fileCount) return null;
		const start = rom.readUInt32LE(fat + id * 8);
		const end = rom.readUInt32LE(fat + id * 8 + 4);
		if (start > end || end > size) return null;
		return rom.subarray(start, end);
	};

	const arm9Offset = rom.readUInt32LE(0x20);
	const arm9Ram = rom.readUInt32LE(0x28);
	const arm9Size = rom.readUInt32LE(0x2c);
	if (arm9Offset >= size || arm9Size > size - arm9Offset || arm9Size < 0x1000 || arm9Size > MAX_UNPACKED) return null;
	const arm9Raw = rom.subarray(arm9Offset, arm9Offset + arm9Size);
	const arm9 = blz(arm9Raw) || arm9Raw;

	const overlayTable = rom.readUInt32LE(0x50);
	const overlayTableSize = rom.readUInt32LE(0x54);
	const overlays: NdsOverlay[] = [];
	if (overlayTable < size) {
		const count = Math.min(MAX_OVERLAYS, Math.floor(Math.min(overlayTableSize, size - overlayTable) / 32));
		for (let i = 0; i < count; i++) {
			const entry = overlayTable + i * 32;
			overlays.push({
				id: rom.readUInt32LE(entry),
				ram: rom.readUInt32LE(entry + 4),
				fileId: rom.readUInt32LE(entry + 24),
				compressed: !!(rom[entry + 31] & 1),
			});
		}
	}
	const overlayCache = new Map<string, Buffer | null>();
	let unpacked = 0;
	const overlay = (index: number): Buffer | null => {
		const entry = overlays[index];
		if (!entry) return null;
		const key = `${entry.fileId}:${entry.compressed ? 1 : 0}`;
		const cached = overlayCache.get(key);
		if (cached !== undefined) return cached;
		const raw = fileById(entry.fileId);
		let data = raw;
		if (raw && entry.compressed && unpacked < UNPACK_BUDGET) {
			const plain = blz(raw);
			if (plain) {
				unpacked += plain.length;
				data = plain;
			}
		}
		overlayCache.set(key, data);
		return data;
	};

	let fileMap: Map<string, Buffer> | null = null;
	const files = (): Map<string, Buffer> => {
		if (fileMap) return fileMap;
		const map = new Map<string, Buffer>();
		fileMap = map;
		const visited = new Set<number>();
		let entries = 0;
		const walk = (dir: number, prefix: string, depth: number) => {
			if (depth > 12 || visited.has(dir) || visited.size > 0x1000) return;
			visited.add(dir);
			const entry = fnt + dir * 8;
			if (entry + 8 > size) return;
			let at = fnt + rom.readUInt32LE(entry);
			let fileId = rom.readUInt16LE(entry + 4);
			for (let guard = 0; guard < 100000 && at < size && map.size < MAX_FILES && entries < MAX_ENTRIES; guard++) {
				entries++;
				const header = rom[at++];
				if (!header) break;
				const length = header & 0x7f;
				if (at + length + 2 > size) break;
				const name = rom.toString('latin1', at, at + length);
				at += length;
				if (header & 0x80) {
					const id = rom.readUInt16LE(at) & 0xfff;
					at += 2;
					walk(id, prefix + name + '/', depth + 1);
				} else {
					const file = fileById(fileId);
					if (file) map.set(prefix + name, file);
					fileId++;
				}
			}
		};
		walk(0, '', 0);
		return map;
	};

	const narcCache = new Map<string, Buffer[] | null>();
	const narc = (filePath: string): Buffer[] | null => {
		const cached = narcCache.get(filePath);
		if (cached !== undefined) return cached;
		const members = readNarcSafe(files().get(filePath));
		narcCache.set(filePath, members);
		return members;
	};

	return {
		rom, code: rom.toString('latin1', 0x0c, 0x10), rev: rom[0x1e], arm9, arm9Ram, overlays, overlay, files, narc,
	};
}
