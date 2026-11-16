import * as crypto from 'crypto';
import * as zlib from 'zlib';

export type PatchFormat = 'ips' | 'ups' | 'bps' | 'xdelta' | 'bsp';

export interface PatchInfo {
	format: PatchFormat;
	sourceSize: number | null;
	targetSize: number | null;
	sourceCrc: number | null;
	targetCrc: number | null;
}

export const MAX_TARGET_SIZE = 512 * 1024 * 1024;

export function crc32(buf: Uint8Array): number {
	return (zlib as any).crc32(buf) >>> 0;
}

export function detectPatchFormat(patch: Uint8Array): PatchFormat | null {
	if (patch.length < 8) return null;
	const magic = String.fromCharCode(patch[0], patch[1], patch[2], patch[3]);
	if (magic === 'BPS1') return 'bps';
	if (magic === 'UPS1') return 'ups';
	if (magic === 'PATC' && patch[4] === 0x48) return 'ips';
	if (patch[0] === 0xd6 && patch[1] === 0xc3 && patch[2] === 0xc4) return 'xdelta';
	if (looksLikeBsp(patch)) return 'bsp';
	return null;
}

function readVlv(patch: Uint8Array, pos: { i: number }): number {
	let data = 0;
	let shift = 1;
	for (;;) {
		if (pos.i >= patch.length) throw new Error('The patch is truncated.');
		const x = patch[pos.i++];
		data += (x & 0x7f) * shift;
		if (x & 0x80) break;
		shift *= 128;
		data += shift;
		if (shift > 2 ** 40) throw new Error('The patch has an invalid number.');
	}
	return data;
}

function readU32(patch: Uint8Array, offset: number): number {
	return (patch[offset] | (patch[offset + 1] << 8) | (patch[offset + 2] << 16) | (patch[offset + 3] << 24)) >>> 0;
}

export function readPatchInfo(patch: Uint8Array): PatchInfo {
	const format = detectPatchFormat(patch);
	if (!format) {
		throw new Error('This is not an IPS, UPS, BPS, xdelta or BSP patch. Upload the patch file only, never a ROM.');
	}
	if (format === 'ips' || format === 'xdelta' || format === 'bsp') {
		return { format, sourceSize: null, targetSize: null, sourceCrc: null, targetCrc: null };
	}
	if (patch.length < 4 + 2 + 12) throw new Error('The patch is truncated.');
	const pos = { i: 4 };
	const sourceSize = readVlv(patch, pos);
	const targetSize = readVlv(patch, pos);
	const sourceCrc = readU32(patch, patch.length - 12);
	const targetCrc = readU32(patch, patch.length - 8);
	const patchCrc = readU32(patch, patch.length - 4);
	if (crc32(patch.subarray(0, patch.length - 4)) !== patchCrc) {
		throw new Error('The patch file is corrupt (its own checksum does not match).');
	}
	return { format, sourceSize, targetSize, sourceCrc, targetCrc };
}

function applyIps(patch: Uint8Array, source: Uint8Array): Uint8Array {
	let target = new Uint8Array(Math.max(source.length, 1));
	target.set(source);
	let size = source.length;
	const ensure = (end: number) => {
		if (end > MAX_TARGET_SIZE) throw new Error('The patched game would be larger than 512 MB.');
		if (end > target.length) {
			const grown = new Uint8Array(Math.max(end, target.length * 2));
			grown.set(target);
			target = grown;
		}
		if (end > size) size = end;
	};
	let i = 5;
	for (;;) {
		if (i + 3 > patch.length) throw new Error('The patch is truncated.');
		if (patch[i] === 0x45 && patch[i + 1] === 0x4f && patch[i + 2] === 0x46) {
			i += 3;
			break;
		}
		const offset = (patch[i] << 16) | (patch[i + 1] << 8) | patch[i + 2];
		i += 3;
		if (i + 2 > patch.length) throw new Error('The patch is truncated.');
		const len = (patch[i] << 8) | patch[i + 1];
		i += 2;
		if (len) {
			if (i + len > patch.length) throw new Error('The patch is truncated.');
			ensure(offset + len);
			target.set(patch.subarray(i, i + len), offset);
			i += len;
		} else {
			if (i + 3 > patch.length) throw new Error('The patch is truncated.');
			const runLen = (patch[i] << 8) | patch[i + 1];
			const value = patch[i + 2];
			i += 3;
			ensure(offset + runLen);
			target.fill(value, offset, offset + runLen);
		}
	}
	if (i + 3 === patch.length) {
		const truncated = (patch[i] << 16) | (patch[i + 1] << 8) | patch[i + 2];
		if (truncated < size) size = truncated;
	}
	return target.subarray(0, size);
}

interface IpsRecord { offset: number; length: number; at: number; run: boolean }

function *ipsRecords(patch: Uint8Array): Generator<IpsRecord> {
	let i = 5;
	for (let records = 0; records < 4000000 && i + 5 <= patch.length; records++) {
		if (patch[i] === 0x45 && patch[i + 1] === 0x4f && patch[i + 2] === 0x46) break;
		const offset = (patch[i] << 16) | (patch[i + 1] << 8) | patch[i + 2];
		const length = (patch[i + 3] << 8) | patch[i + 4];
		i += 5;
		if (length) {
			if (i + length > patch.length) break;
			yield { offset, length, at: i, run: false };
			i += length;
		} else {
			if (i + 3 > patch.length) break;
			const runLength = (patch[i] << 8) | patch[i + 1];
			if (runLength) yield { offset, length: runLength, at: i + 2, run: true };
			i += 3;
		}
	}
}

export function ipsBoundaryFit(patch: Uint8Array, source: Uint8Array): { matches: number, checked: number } {
	let matches = 0;
	let checked = 0;
	const at = (offset: number, value: number) => {
		if (offset >= source.length) return;
		checked++;
		if (source[offset] === value) matches++;
	};
	let held: IpsRecord | null = null;
	let heldJoined = false;
	const close = (joinsAfter: boolean) => {
		if (!held || joinsAfter || (held.length === 1 && !heldJoined)) return;
		at(held.offset + held.length - 1, patch[held.run ? held.at : held.at + held.length - 1]);
	};
	for (const record of ipsRecords(patch)) {
		const joined = !!held && held.offset + held.length === record.offset;
		close(joined);
		if (!joined) at(record.offset, patch[record.at]);
		held = record;
		heldJoined = joined;
	}
	close(false);
	return { matches, checked };
}

export function ipsKeptBytes(patch: Uint8Array, source: Uint8Array): number {
	let kept = 0;
	for (const record of ipsRecords(patch)) {
		const end = Math.min(record.offset + record.length, source.length);
		for (let offset = record.offset; offset < end; offset++) {
			if (source[offset] === patch[record.run ? record.at : record.at + offset - record.offset]) kept++;
		}
	}
	return kept;
}

export function ipsPairFit(
	patch: Uint8Array, first: Uint8Array, second: Uint8Array
): { first: number, second: number, differing: number } {
	const fit = { first: 0, second: 0, differing: 0 };
	const shared = Math.min(first.length, second.length);
	for (const record of ipsRecords(patch)) {
		const end = Math.min(record.offset + record.length, shared);
		for (let offset = record.offset; offset < end; offset++) {
			if (first[offset] === second[offset]) continue;
			fit.differing++;
			const value = patch[record.run ? record.at : record.at + offset - record.offset];
			if (value === first[offset]) fit.first++;
			else if (value === second[offset]) fit.second++;
		}
	}
	return fit;
}

function applyUps(patch: Uint8Array, source: Uint8Array, info: PatchInfo): Uint8Array {
	const pos = { i: 4 };
	readVlv(patch, pos);
	readVlv(patch, pos);
	const targetSize = info.targetSize!;
	if (targetSize > MAX_TARGET_SIZE) throw new Error('The patched game would be larger than 512 MB.');
	const target = new Uint8Array(targetSize);
	target.set(source.subarray(0, Math.min(source.length, targetSize)));
	const end = patch.length - 12;
	let offset = 0;
	while (pos.i < end) {
		offset += readVlv(patch, pos);
		while (pos.i < end) {
			const x = patch[pos.i++];
			if (offset < targetSize) target[offset] ^= x;
			offset++;
			if (!x) break;
		}
	}
	return target;
}

function applyBps(patch: Uint8Array, source: Uint8Array, info: PatchInfo): Uint8Array {
	const pos = { i: 4 };
	readVlv(patch, pos);
	readVlv(patch, pos);
	const metadataSize = readVlv(patch, pos);
	pos.i += metadataSize;
	const targetSize = info.targetSize!;
	if (targetSize > MAX_TARGET_SIZE) throw new Error('The patched game would be larger than 512 MB.');
	const target = new Uint8Array(targetSize);
	const end = patch.length - 12;
	let out = 0;
	let sourceRel = 0;
	let targetRel = 0;
	while (pos.i < end) {
		const data = readVlv(patch, pos);
		const command = data & 3;
		const length = Math.floor(data / 4) + 1;
		if (out + length > targetSize) throw new Error('The patch writes past the end of the game.');
		if (command === 0) {
			if (out + length > source.length) throw new Error('The patch reads past the end of the base game.');
			target.set(source.subarray(out, out + length), out);
			out += length;
		} else if (command === 1) {
			if (pos.i + length > end) throw new Error('The patch is truncated.');
			target.set(patch.subarray(pos.i, pos.i + length), out);
			pos.i += length;
			out += length;
		} else {
			const raw = readVlv(patch, pos);
			const delta = (raw & 1 ? -1 : 1) * Math.floor(raw / 2);
			if (command === 2) {
				sourceRel += delta;
				if (sourceRel < 0 || sourceRel + length > source.length) {
					throw new Error('The patch reads outside the base game.');
				}
				target.set(source.subarray(sourceRel, sourceRel + length), out);
				sourceRel += length;
				out += length;
			} else {
				targetRel += delta;
				if (targetRel < 0 || targetRel >= out) throw new Error('The patch reads outside the patched game.');
				for (let n = 0; n < length; n++) target[out++] = target[targetRel++];
			}
		}
	}
	return target;
}

function adler32(buf: Uint8Array): number {
	let a = 1;
	let b = 0;
	for (let i = 0; i < buf.length;) {
		const end = Math.min(i + 3800, buf.length);
		for (; i < end; i++) {
			a += buf[i];
			b += a;
		}
		a %= 65521;
		b %= 65521;
	}
	return ((b << 16) | a) >>> 0;
}

interface CodeEntry { type1: number; size1: number; mode1: number; type2: number; size2: number; mode2: number }
let codeTable: CodeEntry[] | null = null;

function getCodeTable(): CodeEntry[] {
	if (codeTable) return codeTable;
	const table: CodeEntry[] = [];
	const push = (type1: number, size1: number, mode1: number, type2 = 0, size2 = 0, mode2 = 0) => {
		table.push({ type1, size1, mode1, type2, size2, mode2 });
	};
	push(2, 0, 0);
	for (let size = 0; size <= 17; size++) push(1, size, 0);
	for (let mode = 0; mode < 9; mode++) {
		push(3, 0, mode);
		for (let size = 4; size <= 18; size++) push(3, size, mode);
	}
	for (let mode = 0; mode < 6; mode++) {
		for (let addSize = 1; addSize <= 4; addSize++) {
			for (let copySize = 4; copySize <= 6; copySize++) push(1, addSize, 0, 3, copySize, mode);
		}
	}
	for (let mode = 6; mode < 9; mode++) {
		for (let addSize = 1; addSize <= 4; addSize++) push(1, addSize, 0, 3, 4, mode);
	}
	for (let mode = 0; mode < 9; mode++) push(3, 4, mode, 1, 1, 0);
	codeTable = table;
	return table;
}

export function vcdiffChecksummed(patch: Uint8Array): boolean {
	let i = 4;
	const int = () => {
		let value = 0;
		for (;;) {
			if (i >= patch.length) return -1;
			const b = patch[i++];
			value = value * 128 + (b & 0x7f);
			if (!(b & 0x80)) return value;
			if (value > 2 ** 40) return -1;
		}
	};
	const headerFlags = patch[i++];
	if (headerFlags & 1) i++;
	if (headerFlags & 2) {
		const tableLength = int();
		if (tableLength < 0) return false;
		i += tableLength;
	}
	if (headerFlags & 4) {
		const appLength = int();
		if (appLength < 0) return false;
		i += appLength;
	}
	let windows = 0;
	while (i < patch.length) {
		const windowFlags = patch[i++];
		if (!(windowFlags & 4)) return false;
		if (windowFlags & 3 && (int() < 0 || int() < 0)) return false;
		const deltaLength = int();
		if (deltaLength < 0) return false;
		i += deltaLength;
		windows++;
	}
	return windows > 0 && i === patch.length;
}

const NO_CHECKSUM = 'This xdelta patch carries no checksum, so it cannot be checked against the base game. ' +
	'Ask the hack author for a patch made with checksums on (the xdelta default), or use a BPS patch.';

export function requireVcdiffChecksum(patch: Uint8Array) {
	if (!vcdiffChecksummed(patch)) throw new Error(NO_CHECKSUM);
}

function applyVcdiff(patch: Uint8Array, source: Uint8Array): Uint8Array {
	let i = 4;
	const int = () => {
		let value = 0;
		for (;;) {
			if (i >= patch.length) throw new Error('The patch is truncated.');
			const b = patch[i++];
			value = value * 128 + (b & 0x7f);
			if (!(b & 0x80)) return value;
			if (value > 2 ** 40) throw new Error('The patch has an invalid number.');
		}
	};
	const headerFlags = patch[i++];
	if (headerFlags & 1) {
		throw new Error('This xdelta patch uses secondary compression, which cannot be read yet. Ask the hack author for a patch made with "-S none", or use a BPS patch.');
	}
	if (headerFlags & 2) throw new Error('This xdelta patch uses a custom code table, which cannot be read.');
	if (headerFlags & 4) i += int();
	const table = getCodeTable();
	const windows: Uint8Array[] = [];
	let total = 0;
	while (i < patch.length) {
		const windowFlags = patch[i++];
		let segmentSize = 0;
		let segmentPos = 0;
		if (windowFlags & 3) {
			segmentSize = int();
			segmentPos = int();
		}
		if (windowFlags & 2) throw new Error('This xdelta patch copies from its own output, which cannot be read yet.');
		if (segmentPos + segmentSize > source.length) throw new Error('The patch was made for a different base game.');
		int();
		const targetLength = int();
		const deltaFlags = patch[i++];
		if (deltaFlags & 7) {
			throw new Error('This xdelta patch uses secondary compression, which cannot be read yet. Ask the hack author for a patch made with "-S none", or use a BPS patch.');
		}
		const dataLength = int();
		const instLength = int();
		const addrLength = int();
		if (!(windowFlags & 4)) throw new Error(NO_CHECKSUM);
		const checksum = ((patch[i] << 24) | (patch[i + 1] << 16) | (patch[i + 2] << 8) | patch[i + 3]) >>> 0;
		i += 4;
		let data = i;
		let inst = data + dataLength;
		const instEnd = inst + instLength;
		let addr = instEnd;
		i = addr + addrLength;
		if (i > patch.length) throw new Error('The patch is truncated.');
		total += targetLength;
		if (total > MAX_TARGET_SIZE) throw new Error('The patched game would be larger than 512 MB.');
		const target = new Uint8Array(targetLength);
		let out = 0;
		const near = [0, 0, 0, 0];
		let nearSlot = 0;
		const same = new Array(768).fill(0);
		const readInt = (from: 'inst' | 'addr') => {
			let value = 0;
			for (;;) {
				const b = patch[from === 'inst' ? inst++ : addr++];
				value = value * 128 + (b & 0x7f);
				if (!(b & 0x80)) return value;
			}
		};
		const run = (type: number, size: number, mode: number) => {
			if (!type) return;
			if (!size) size = readInt('inst');
			if (out + size > targetLength) throw new Error('The patch writes past the end of the game.');
			if (type === 1) {
				target.set(patch.subarray(data, data + size), out);
				data += size;
				out += size;
			} else if (type === 2) {
				target.fill(patch[data++], out, out + size);
				out += size;
			} else {
				const here = segmentSize + out;
				let address;
				if (mode === 0) {
					address = readInt('addr');
				} else if (mode === 1) {
					address = here - readInt('addr');
				} else if (mode < 6) {
					address = near[mode - 2] + readInt('addr');
				} else {
					address = same[(mode - 6) * 256 + patch[addr++]];
				}
				near[nearSlot] = address;
				nearSlot = (nearSlot + 1) % 4;
				same[address % 768] = address;
				if (address < 0 || address >= here) throw new Error('The patch was made for a different base game.');
				if (address + size <= segmentSize) {
					target.set(source.subarray(segmentPos + address, segmentPos + address + size), out);
					out += size;
				} else {
					for (let n = 0; n < size; n++, address++) {
						target[out++] = address < segmentSize ? source[segmentPos + address] : target[address - segmentSize];
					}
				}
			}
		};
		while (inst < instEnd) {
			const entry = table[patch[inst++]];
			run(entry.type1, entry.size1, entry.mode1);
			run(entry.type2, entry.size2, entry.mode2);
		}
		if (out !== targetLength) throw new Error('The patch is corrupt.');
		if (adler32(target) !== checksum) throw new Error('The patch was made for a different base game.');
		windows.push(target);
	}
	if (windows.length === 1) return windows[0];
	const result = new Uint8Array(total);
	let at = 0;
	for (const window of windows) {
		result.set(window, at);
		at += window.length;
	}
	return result;
}

export interface BspLimits {
	steps: number;
	fileSize: number;
	stack: number;
	depth: number;
	millis: number;
	patchSize: number;
}

export const BSP_LIMITS: BspLimits = {
	steps: 300_000_000,
	fileSize: 64 * 1024 * 1024,
	stack: 1 << 20,
	depth: 8,
	millis: 20_000,
	patchSize: 32 * 1024 * 1024,
};

export interface BspOptions extends Partial<BspLimits> {
	choose?: (labels: string[]) => number;
}

export interface BspOutcome {
	status: number;
	target: Uint8Array;
	messages: string[];
	menus: number;
	steps: number;
}

export class BspError extends Error {}

interface BspState {
	data: Uint8Array;
	length: number;
	pos: number;
	locked: boolean;
	sha: Buffer | null;
	steps: number;
	nextClock: number;
	deadline: number;
	messages: string[];
	menus: number;
	limits: BspLimits;
	choose: (labels: string[]) => number;
}

const BSP_GROUP_SIZES: [number, number, number[]][] = [
	[0x00, 0x01, [1]], [0x02, 0x09, [5, 2]], [0x0a, 0x0f, [2]], [0x10, 0x17, [6, 3]], [0x18, 0x19, [2]],
	[0x1a, 0x1b, [3, 2]],
	[0x1c, 0x1f, [5, 2]], [0x20, 0x57, [10, 7, 7, 4]], [0x58, 0x5f, [6, 3]], [0x60, 0x69, [5, 2]], [0x6a, 0x6b, [6, 3]],
	[0x6c, 0x6f, [9, 6, 6, 3]], [0x70, 0x73, [6, 6, 3, 3]], [0x74, 0x77, [7, 6, 4, 3]], [0x78, 0x7f, [9, 6, 6, 3]],
	[0x80, 0x82, [1]], [0x83, 0x83, [2]], [0x84, 0x87, [6, 3]], [0x88, 0x8b, [9, 6, 6, 3]], [0x8c, 0x8d, [6, 3]],
	[0x8e, 0x8f, [5, 2]], [0x90, 0x91, [2]], [0x92, 0x93, [1]], [0x94, 0x97, [10, 7, 7, 4]], [0x98, 0x9a, [3]],
	[0x9b, 0x9b, [2]], [0x9c, 0x9e, [3]], [0x9f, 0x9f, [2]], [0xa0, 0xa5, [5, 2]], [0xa6, 0xa7, [1]], [0xa8, 0xa9, [5, 2]],
	[0xaa, 0xaa, [2]], [0xac, 0xae, [2]], [0xaf, 0xaf, [3]], [0xb0, 0xbf, [11, 8, 8, 5]],
];
let bspSizes: Uint8Array | null = null;
const bspDecoder = new TextDecoder('utf-8', { fatal: true });

function bspInstructionSize(patch: Uint8Array, at: number): number {
	if (!bspSizes) {
		bspSizes = new Uint8Array(256);
		for (const [first, last, sizes] of BSP_GROUP_SIZES) {
			for (let op = first; op <= last; op++) bspSizes[op] = sizes[(op - first) % sizes.length];
		}
	}
	if (at >= patch.length) return 0;
	const op = patch[at];
	if (op !== 0xab) return bspSizes[op];
	if (at + 1 >= patch.length) return 0;
	const control = patch[at + 1];
	return (control & 0x80 ? 4 : 7) + (control & 31 ? 0 : 1);
}

export function looksLikeBsp(patch: Uint8Array): boolean {
	if (patch.length < 16 || patch.length > BSP_LIMITS.patchSize) return false;
	const magic = readU32(patch, 0);
	if (magic === 0x04034b50 || magic === 0xafbc7a37 || magic === 0x21726152 || (magic & 0xffff) === 0x8b1f) return false;
	if (patch.length >= 0x108 && readU32(patch, 0x104) === 0x6666edce) return false;
	if (readU32(patch, 4) === 0x51aeff24) return false;
	if (patch.length >= 0xc4 && readU32(patch, 0xc0) === 0x51aeff24) return false;
	let at = 0;
	for (let count = 0; count < 16; count++) {
		const size = bspInstructionSize(patch, at);
		if (!size || at + size > patch.length) return false;
		const op = patch[at];
		if (op === 0x01 || op === 0x03 || op === 0x06 || op === 0x07 || op === 0x83) return count > 0 || op === 0x06;
		if (op === 0x02 || op === 0x04) {
			at = readU32(patch, at + 1);
			if (at >= patch.length) return false;
		} else {
			at += size;
		}
	}
	return true;
}

function bspText(text: string) {
	return text.replace(/[^\x20-\x7e]+/g, ' ').trim().slice(0, 200);
}

function bspGrow(state: BspState, end: number) {
	if (end > state.limits.fileSize) throw new BspError('the patched game would be too large');
	if (end > state.data.length) {
		const grown = new Uint8Array(Math.min(state.limits.fileSize, Math.max(end, state.data.length * 2, 0x10000)));
		grown.set(state.data.subarray(0, state.length));
		state.data = grown;
	}
	if (end > state.length) state.length = end;
	state.sha = null;
}

function bspResize(state: BspState, length: number) {
	if (length < state.length) {
		state.data.fill(0, length, state.length);
		state.length = length;
		state.sha = null;
	} else {
		bspGrow(state, length);
	}
}

function runBsp(patch: Uint8Array, state: BspState, depth: number): number {
	const size = patch.length;
	const vars = new Uint32Array(256);
	const stack: number[] = [];
	const limits = state.limits;
	let buffer = '';
	let bufferFull = false;
	let ip = 0;
	const fail = (why: string): never => {
		throw new BspError(why);
	};
	const byteAt = (at: number) => {
		if (at >= size) fail('it reads past its own end');
		return patch[at];
	};
	const halfAt = (at: number) => {
		if (at + 2 > size) fail('it reads past its own end');
		return patch[at] | (patch[at + 1] << 8);
	};
	const wordAt = (at: number) => {
		if (at + 4 > size) fail('it reads past its own end');
		return (patch[at] | (patch[at + 1] << 8) | (patch[at + 2] << 16) | (patch[at + 3] << 24)) >>> 0;
	};
	const reg = () => byteAt(ip++);
	const imm = () => {
		const value = wordAt(ip);
		ip += 4;
		return value;
	};
	const any = (isVariable: number) => (isVariable ? vars[reg()] : imm());
	const spend = (amount: number) => {
		state.steps += amount;
		if (state.steps > limits.steps) fail('it takes too long to run');
		if (state.steps >= state.nextClock) {
			if (Date.now() > state.deadline) fail('it takes too long to run');
			state.nextClock = state.steps + 0x80000;
		}
	};
	const resize = (length: number) => {
		spend(Math.abs(length - state.length) >> 4);
		bspResize(state, length);
	};
	const push = (value: number) => {
		if (stack.length >= limits.stack) fail('its stack grows too large');
		stack.push(value);
	};
	const slot = (position: number) => {
		const signed = position | 0;
		if (signed >= 0) {
			if (signed >= stack.length) fail('it reads outside its stack');
			return stack.length - 1 - signed;
		}
		if (-signed > stack.length) fail('it reads outside its stack');
		return -signed - 1;
	};
	const advance = (amount: number) => {
		if (!state.locked) state.pos = (state.pos + amount) >>> 0;
	};
	const fileRead = (width: number) => {
		const at = state.pos;
		if (at + width > state.length) fail('it reads past the end of the game');
		const data = state.data;
		if (width === 1) return data[at];
		if (width === 2) return data[at] | (data[at + 1] << 8);
		return (data[at] | (data[at + 1] << 8) | (data[at + 2] << 16) | (data[at + 3] << 24)) >>> 0;
	};
	const fileWrite = (value: number, width: number) => {
		const at = state.pos;
		bspGrow(state, at + width);
		const data = state.data;
		data[at] = value;
		if (width > 1) data[at + 1] = value >>> 8;
		if (width > 2) {
			data[at + 2] = value >>> 16;
			data[at + 3] = value >>> 24;
		}
		advance(width);
	};
	const text = (at: number) => {
		let end = at;
		while (byteAt(end)) end++;
		spend(end - at);
		try {
			return bspDecoder.decode(patch.subarray(at, end));
		} catch {
			return fail('it contains invalid text');
		}
	};
	const say = (message: string) => {
		if (state.messages.length >= 64) state.messages.shift();
		state.messages.push(bspText(message));
	};
	const append = (piece: string) => {
		if (bufferFull) return;
		if (buffer.length + piece.length > 4096) {
			bufferFull = true;
			return;
		}
		buffer += piece;
	};
	const copy = (at: number, length: number, xor: boolean) => {
		if (at + length > size) fail('it reads past its own end');
		const start = state.pos;
		spend(length >> 4);
		bspGrow(state, start + length);
		const data = state.data;
		if (xor) {
			for (let i = 0; i < length; i++) data[start + i] ^= patch[at + i];
		} else {
			data.set(patch.subarray(at, at + length), start);
		}
		advance(length);
	};
	const ips = (start: number) => {
		let at = start;
		if (byteAt(at) !== 0x50 || byteAt(at + 1) !== 0x41 || byteAt(at + 2) !== 0x54 || byteAt(at + 3) !== 0x43 ||
			byteAt(at + 4) !== 0x48) fail('an embedded IPS patch is invalid');
		at += 5;
		for (;;) {
			spend(1);
			const offset = (byteAt(at) << 16) | (byteAt(at + 1) << 8) | byteAt(at + 2);
			at += 3;
			if (offset === 0x454f46) return at;
			const target = state.pos + offset;
			const length = (byteAt(at) << 8) | byteAt(at + 1);
			at += 2;
			if (length) {
				if (at + length > size) fail('it reads past its own end');
				spend(length >> 4);
				bspGrow(state, target + length);
				state.data.set(patch.subarray(at, at + length), target);
				at += length;
			} else {
				const count = (byteAt(at) << 8) | byteAt(at + 1);
				const value = byteAt(at + 2);
				at += 3;
				spend(count >> 4);
				bspGrow(state, target + count);
				state.data.fill(value, target, target + count);
			}
		}
	};
	const checkSha = (at: number) => {
		if (at + 20 > size) fail('it reads past its own end');
		if (!state.sha) {
			spend(state.length >> 3);
			state.sha = crypto.createHash('sha1').update(state.data.subarray(0, state.length)).digest();
		}
		let mask = 0;
		for (let i = 0; i < 20; i++) {
			if (state.sha[i] !== patch[at + i]) mask |= 1 << i;
		}
		return mask >>> 0;
	};

	for (;;) {
		if (++state.steps >= state.nextClock) {
			if (state.steps > limits.steps || Date.now() > state.deadline) fail('it takes too long to run');
			state.nextClock = state.steps + 0x80000;
		}
		if (ip >= size) fail('it runs past its own end');
		const op = patch[ip++];
		if (op >= 0x20 && op < 0x40) {
			const r = reg();
			const a = any(op & 2);
			const b = any(op & 1);
			switch ((op - 0x20) >> 2) {
			case 0: vars[r] = a + b; break;
			case 1: vars[r] = a - b; break;
			case 2: vars[r] = Math.imul(a, b); break;
			case 3:
				if (!b) fail('it divides by zero');
				vars[r] = Math.floor(a / b);
				break;
			case 4:
				if (!b) fail('it divides by zero');
				vars[r] = a % b;
				break;
			case 5: vars[r] = a & b; break;
			case 6: vars[r] = a | b; break;
			default: vars[r] = a ^ b;
			}
			continue;
		}
		if (op >= 0x40 && op < 0x58) {
			const value = vars[reg()];
			const other = any(op & 2);
			const to = any(op & 1);
			const kind = (op - 0x40) >> 2;
			const jump = kind === 0 ? value < other : kind === 1 ? value <= other : kind === 2 ? value > other :
				kind === 3 ? value >= other : kind === 4 ? value === other : value !== other;
			if (jump) ip = to;
			continue;
		}
		switch (op) {
		case 0x00: break;
		case 0x01:
			if (!stack.length) return 0;
			ip = stack.pop()!;
			break;
		case 0x02: case 0x03:
			ip = any(op & 1);
			break;
		case 0x04: case 0x05: {
			const to = any(op & 1);
			push(ip);
			ip = to;
			break;
		}
		case 0x06: case 0x07:
			return any(op & 1);
		case 0x08: case 0x09:
			push(any(op & 1));
			break;
		case 0x0a: {
			const r = reg();
			if (!stack.length) fail('it pops an empty stack');
			vars[r] = stack.pop()!;
			break;
		}
		case 0x0b:
			vars[reg()] = state.length;
			break;
		case 0x0c: case 0x0d: case 0x0e: {
			const r = reg();
			const width = 1 << (op - 0x0c);
			vars[r] = fileRead(width);
			advance(width);
			break;
		}
		case 0x0f:
			vars[reg()] = state.pos;
			break;
		case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: {
			const r = reg();
			const at = any(op & 1);
			vars[r] = op < 0x12 ? byteAt(at) : op < 0x14 ? halfAt(at) : wordAt(at);
			break;
		}
		case 0x16: case 0x17: {
			const r = reg();
			vars[r] = checkSha(any(op & 1));
			break;
		}
		case 0x18: fileWrite(reg(), 1); break;
		case 0x19: fileWrite(vars[reg()] & 0xff, 1); break;
		case 0x1a: {
			const value = halfAt(ip);
			ip += 2;
			fileWrite(value, 2);
			break;
		}
		case 0x1b: fileWrite(vars[reg()] & 0xffff, 2); break;
		case 0x1c: case 0x1d:
			fileWrite(any(op & 1), 4);
			break;
		case 0x1e: case 0x1f:
			resize(any(op & 1));
			break;
		case 0x58: case 0x59: case 0x5a: case 0x5b: case 0x5c: case 0x5d: case 0x5e: case 0x5f: {
			const value = vars[reg()];
			const to = any(op & 1);
			const kind = (op - 0x58) >> 1;
			if ((kind & 1) ? value !== 0 : value === 0) {
				if (kind >= 2) push(ip);
				ip = to;
			}
			break;
		}
		case 0x60: case 0x61: case 0x62: case 0x63: case 0x64: case 0x65: case 0x66: case 0x67: {
			const amount = any(op & 1);
			if (state.locked) break;
			const kind = (op - 0x60) >> 1;
			if (kind === 0) {
				state.pos = amount;
			} else if (kind === 1) {
				if (state.pos + amount > 0xffffffff) fail('it moves outside the game');
				state.pos += amount;
			} else if (kind === 2) {
				if (amount > state.pos) fail('it moves outside the game');
				state.pos -= amount;
			} else {
				if (amount > state.length) fail('it moves outside the game');
				state.pos = state.length - amount;
			}
			break;
		}
		case 0x68: case 0x69:
			say(text(any(op & 1)));
			break;
		case 0x6a: case 0x6b: {
			const r = reg();
			const table = any(op & 1);
			const labels: string[] = [];
			for (;;) {
				const pointer = wordAt(table + labels.length * 4);
				if (pointer === 0xffffffff) break;
				if (labels.length >= 256) fail('one of its menus is too long');
				labels.push(bspText(text(pointer)));
			}
			if (!labels.length) {
				vars[r] = 0xffffffff;
				break;
			}
			state.menus++;
			let choice = state.choose(labels);
			if (!Number.isInteger(choice) || choice < 0 || choice >= labels.length) choice = 0;
			say(`[menu: ${labels.join(' / ')}] -> ${labels[choice]}`);
			vars[r] = choice;
			break;
		}
		case 0x6c: case 0x6d: case 0x6e: case 0x6f: case 0x7c: case 0x7d: case 0x7e: case 0x7f: {
			const at = any(op & 2);
			const length = any(op & 1);
			copy(at, length, op < 0x70);
			break;
		}
		case 0x70: case 0x71: case 0x72: case 0x73: case 0x74: case 0x75: case 0x76: case 0x77:
		case 0x78: case 0x79: case 0x7a: case 0x7b: {
			const width = 1 << ((op - 0x70) >> 2);
			const count = any(op & 2);
			let value;
			if (op & 1) {
				value = vars[reg()];
			} else if (width === 1) {
				value = reg();
			} else if (width === 2) {
				value = halfAt(ip);
				ip += 2;
			} else {
				value = imm();
			}
			const start = state.pos;
			const total = count * width;
			bspGrow(state, start + total);
			spend(total >> 4);
			const data = state.data;
			if (width === 1) {
				data.fill(value & 0xff, start, start + total);
			} else {
				for (let i = 0; i < total; i += width) {
					data[start + i] = value;
					data[start + i + 1] = value >>> 8;
					if (width === 4) {
						data[start + i + 2] = value >>> 16;
						data[start + i + 3] = value >>> 24;
					}
				}
			}
			advance(total);
			break;
		}
		case 0x80: state.locked = true; break;
		case 0x81: state.locked = false; break;
		case 0x82: resize(state.pos); break;
		case 0x83: {
			const at = ip + 1 + 4 * vars[byteAt(ip)];
			if (at + 4 > size) fail('it reads past its own end');
			ip = wordAt(at);
			break;
		}
		case 0x84: case 0x85: {
			const r = reg();
			vars[r] = any(op & 1);
			break;
		}
		case 0x86: case 0x87: {
			const r = reg();
			vars[r] = ips(any(op & 1));
			break;
		}
		case 0x88: case 0x89: case 0x8a: case 0x8b: {
			const position = any(op & 2);
			const value = any(op & 1);
			stack[slot(position)] = value;
			break;
		}
		case 0x8c: case 0x8d: {
			const r = reg();
			vars[r] = stack[slot(any(op & 1))];
			break;
		}
		case 0x8e: case 0x8f: {
			const amount = any(op & 1) | 0;
			if (amount > 0) {
				if (stack.length + amount > limits.stack) fail('its stack grows too large');
				spend(amount >> 4);
				for (let i = 0; i < amount; i++) stack.push(0);
			} else {
				if (-amount > stack.length) fail('it pops an empty stack');
				stack.length += amount;
			}
			break;
		}
		case 0x90: case 0x91: {
			const value = vars[reg()];
			if ((value === 0) === (op === 0x90)) {
				if (!stack.length) return 0;
				ip = stack.pop()!;
			}
			break;
		}
		case 0x92: push(state.pos); break;
		case 0x93: {
			if (!stack.length) fail('it pops an empty stack');
			const value = stack.pop()!;
			if (!state.locked) state.pos = value;
			break;
		}
		case 0x94: case 0x95: case 0x96: case 0x97: {
			const r = reg();
			const at = any(op & 2);
			const length = any(op & 1);
			if (at + length > size) fail('it reads past its own end');
			if (depth >= limits.depth) fail('it nests too many patches');
			vars[r] = runBsp(patch.subarray(at, at + length), state, depth + 1);
			break;
		}
		case 0x98: case 0x99: case 0x9a: case 0x9c: case 0x9d: case 0x9e: {
			const r = reg();
			const pointer = reg();
			const kind = op & 3;
			const at = vars[pointer];
			const value = kind === 0 ? byteAt(at) : kind === 1 ? halfAt(at) : wordAt(at);
			if (r !== pointer) vars[pointer] = op < 0x9c ? at + (1 << kind) : at - (1 << kind);
			vars[r] = value;
			break;
		}
		case 0x9b: vars[reg()]++; break;
		case 0x9f: vars[reg()]--; break;
		case 0xa0: case 0xa1:
			append(text(any(op & 1)));
			break;
		case 0xa2: case 0xa3: {
			const code = any(op & 1);
			if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) fail('it contains invalid text');
			append(String.fromCodePoint(code));
			break;
		}
		case 0xa4: case 0xa5:
			append(String(any(op & 1)));
			break;
		case 0xa6:
			say(buffer);
			buffer = '';
			bufferFull = false;
			break;
		case 0xa7:
			buffer = '';
			bufferFull = false;
			break;
		case 0xa8: case 0xa9: {
			const length = any(op & 1);
			if (length > limits.stack) fail('its stack grows too large');
			spend(Math.abs(length - stack.length) >> 4);
			while (stack.length < length) stack.push(0);
			stack.length = length;
			break;
		}
		case 0xaa:
			vars[reg()] = stack.length;
			break;
		case 0xab: {
			const control = reg();
			const r = reg();
			const value = control & 0x80 ? vars[reg()] : imm();
			let count = control & 31;
			if (!count) count = vars[reg()] & 31;
			const kind = (control >> 5) & 3;
			if (kind === 0) vars[r] = value << count;
			else if (kind === 1) vars[r] = value >>> count;
			else if (kind === 2) vars[r] = count ? (value << count) | (value >>> (32 - count)) : value;
			else vars[r] = (value | 0) >> count;
			break;
		}
		case 0xac: case 0xad: case 0xae: {
			const r = reg();
			vars[r] = fileRead(1 << (op - 0xac));
			break;
		}
		case 0xaf: {
			const r = reg();
			vars[r] = vars[vars[reg()] & 0xff];
			break;
		}
		case 0xb0: case 0xb1: case 0xb2: case 0xb3: case 0xb4: case 0xb5: case 0xb6: case 0xb7:
		case 0xb8: case 0xb9: case 0xba: case 0xbb: case 0xbc: case 0xbd: case 0xbe: case 0xbf: {
			const low = reg();
			const high = reg();
			const a = any(op & 2);
			const b = any(op & 1);
			const kind = (op - 0xb0) >> 2;
			if (kind === 0) {
				if (low !== high) vars[low] = a + b;
				if (a + b > 0xffffffff) vars[high]++;
			} else if (kind === 1) {
				if (low !== high) vars[low] = a - b;
				if (a < b) vars[high]--;
			} else {
				let product = BigInt(a) * BigInt(b);
				if (kind === 3) product = (product + ((BigInt(vars[high]) << 32n) | BigInt(vars[low]))) & 0xffffffffffffffffn;
				const lowWord = Number(product & 0xffffffffn);
				const highWord = Number(product >> 32n);
				if (low === high) {
					vars[low] = kind === 3 ? lowWord : highWord;
				} else {
					vars[low] = lowWord;
					vars[high] = highWord;
				}
			}
			break;
		}
		default:
			fail('it uses an undefined instruction');
		}
	}
}

export function runBspPatch(patch: Uint8Array, source: Uint8Array, options: BspOptions = {}): BspOutcome {
	const limits: BspLimits = { ...BSP_LIMITS };
	for (const key of Object.keys(BSP_LIMITS) as (keyof BspLimits)[]) {
		const value = options[key];
		if (typeof value === 'number' && value >= 0) limits[key] = value;
	}
	if (patch.length > limits.patchSize) throw new BspError('the patch is too large');
	if (source.length > limits.fileSize) throw new BspError('the base game is too large');
	const data = new Uint8Array(Math.max(source.length, 0x10000));
	data.set(source);
	const state: BspState = {
		data, length: source.length, pos: 0, locked: false, sha: null, steps: 0, nextClock: 0x80000,
		deadline: Date.now() + limits.millis, messages: [], menus: 0, limits, choose: options.choose || (() => 0),
	};
	const status = runBsp(patch, state, 0);
	return {
		status, target: state.data.slice(0, state.length), messages: state.messages, menus: state.menus, steps: state.steps,
	};
}

export function applyBsp(patch: Uint8Array, source: Uint8Array, options: BspOptions = {}): BspOutcome {
	let outcome;
	try {
		outcome = runBspPatch(patch, source, options);
	} catch (e: any) {
		if (!(e instanceof BspError)) throw e;
		throw new Error(`This BSP patch could not be applied: ${e.message}. Upload the patch file only, never a ROM.`);
	}
	if (outcome.status) {
		throw new Error('The BSP patch refused this base game. It was probably made for a different base game.');
	}
	return outcome;
}

export function applyPatch(patch: Uint8Array, source: Uint8Array, options: BspOptions = {}): Uint8Array {
	const info = readPatchInfo(patch);
	if (info.format === 'ips') return applyIps(patch, source);
	if (info.format === 'xdelta') return applyVcdiff(patch, source);
	if (info.format === 'bsp') return applyBsp(patch, source, options).target;
	if (info.sourceSize !== source.length || info.sourceCrc !== crc32(source)) {
		throw new Error('The patch was made for a different base game.');
	}
	const target = info.format === 'ups' ? applyUps(patch, source, info) : applyBps(patch, source, info);
	if (crc32(target) !== info.targetCrc) {
		throw new Error('The patch did not apply cleanly (the result checksum does not match).');
	}
	return target;
}
