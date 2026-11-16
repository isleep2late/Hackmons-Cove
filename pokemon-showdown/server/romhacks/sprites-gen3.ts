import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { signatureAnchor } from './signatures';

function isPointer(value: number, rom: Buffer) {
	return value >= 0x08000000 && value - 0x08000000 < rom.length;
}

function lz77(rom: Buffer, offset: number, maxSize: number): Buffer | null {
	if (offset < 0 || offset + 4 > rom.length || rom[offset] !== 0x10) return null;
	const size = rom[offset + 1] | (rom[offset + 2] << 8) | (rom[offset + 3] << 16);
	if (!size || size > maxSize) return null;
	const out = Buffer.alloc(size);
	let at = offset + 4;
	let written = 0;
	while (written < size) {
		if (at >= rom.length) return null;
		const flags = rom[at++];
		for (let bit = 7; bit >= 0 && written < size; bit--) {
			if (flags & (1 << bit)) {
				if (at + 1 >= rom.length) return null;
				const a = rom[at++];
				const b = rom[at++];
				const length = (a >> 4) + 3;
				const distance = (((a & 0xf) << 8) | b) + 1;
				if (distance > written) return null;
				for (let i = 0; i < length && written < size; i++, written++) out[written] = out[written - distance];
			} else {
				out[written++] = rom[at++];
			}
		}
	}
	return out;
}

function smolSize(rom: Buffer, at: number): number {
	if (at < 0 || at + 8 > rom.length) return -1;
	const head = rom.readUInt32LE(at);
	const mode = head & 15;
	if (mode < 1 || mode > 6 || !(head >>> 18) || !(rom.readUInt32LE(at + 4) >>> 19)) return -1;
	return ((head >>> 4) & 0x3fff) * 4;
}

function smol(rom: Buffer, offset: number, maxSize: number): Buffer | null {
	const size = smolSize(rom, offset);
	if (size <= 0 || size > maxSize) return null;
	const head = rom.readUInt32LE(offset);
	const next = rom.readUInt32LE(offset + 4);
	const mode = head & 15;
	const symSize = head >>> 18;
	const loSize = next >>> 19;
	const streamSize = (next >>> 6) & 0x1fff;
	let state = next & 63;
	const data = offset + 8;
	const loCoded = mode >= 4;
	const symCoded = mode !== 1 && mode !== 4;
	const delta = mode === 3 || mode === 6;
	const stream = data + (loCoded ? 12 : 0) + (symCoded ? 12 : 0);
	if (stream + streamSize * 4 > rom.length) return null;
	let bit = 0;
	const build = (at: number) => {
		const freqs = new Array(16).fill(0);
		for (let i = 0; i < 3; i++) {
			const packed = rom.readUInt32LE(at + i * 4);
			for (let j = 0; j < 5; j++) freqs[i * 5 + j] = (packed >>> (6 * j)) & 63;
			freqs[15] += (packed >>> 30) << (2 * i);
		}
		const table: number[][] = [];
		freqs.forEach((count, symbol) => {
			for (let j = 0; j < count; j++) {
				const value = count + j;
				const k = Math.max(0, 6 - Math.floor(Math.log2(value)));
				table.push([symbol, k, (value << k) - 64]);
			}
		});
		return table.length === 64 ? table : null;
	};
	const nibble = (table: number[][]) => {
		const [symbol, k, y] = table[state];
		let value = 0;
		for (let i = 0; i < k; i++, bit++) {
			value |= ((rom[stream + (bit >> 3)] >> (bit & 7)) & 1) << i;
		}
		state = (y + value) & 63;
		return symbol;
	};
	let leftover = stream + (loCoded || symCoded ? streamSize * 4 : 0);
	let lo: Buffer;
	const syms = new Uint16Array(symSize);
	if (loCoded) {
		const table = build(data);
		if (!table) return null;
		lo = Buffer.alloc(loSize);
		for (let i = 0; i < loSize; i++) {
			const low = nibble(table);
			lo[i] = low | (nibble(table) << 4);
		}
	}
	if (symCoded) {
		const table = build(data + (loCoded ? 12 : 0));
		if (!table) return null;
		let running = 0;
		for (let i = 0; i < symSize; i++) {
			let value = 0;
			for (let n = 0; n < 4; n++) {
				const symbol = nibble(table);
				running = delta ? (running + symbol) & 15 : symbol;
				value |= running << (n * 4);
			}
			syms[i] = value;
		}
	} else {
		if (leftover + symSize * 2 > rom.length) return null;
		for (let i = 0; i < symSize; i++) syms[i] = rom.readUInt16LE(leftover + i * 2);
		leftover += symSize * 2;
	}
	if (!loCoded) {
		if (leftover + loSize > rom.length) return null;
		lo = rom.subarray(leftover, leftover + loSize);
	}
	const out = new Uint16Array(size / 2);
	let written = 0;
	let read = 0;
	let at = 0;
	while (at < loSize && written < out.length) {
		let length = lo![at] & 0x7f;
		if (lo![at++] & 0x80) length |= lo![at++] << 7;
		let distance = lo![at] & 0x7f;
		if (lo![at++] & 0x80) distance |= lo![at++] << 7;
		if (length) {
			const value = syms[read++];
			out[written++] = value;
			if (distance > written) return null;
			for (let i = 0; i < length && written < out.length; i++, written++) {
				out[written] = distance === 1 ? value : out[written - distance];
			}
		} else {
			for (let i = 0; i < distance && written < out.length; i++) out[written++] = syms[read++];
		}
	}
	return Buffer.from(out.buffer, 0, size);
}

function unpack(rom: Buffer, offset: number, maxSize: number): Buffer | null {
	return offset >= 0 && offset < rom.length && rom[offset] === 0x10 ? lz77(rom, offset, maxSize) : smol(rom, offset, maxSize);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type: string, data: Buffer): Buffer {
	const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
	const out = Buffer.alloc(body.length + 8);
	out.writeUInt32BE(data.length, 0);
	body.copy(out, 4);
	out.writeUInt32BE((zlib as any).crc32(body) >>> 0, body.length + 4);
	return out;
}

export function png(pixels: Buffer, width: number, height: number, palette: Buffer): Buffer {
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8;
	header[9] = 3;
	const rows = Buffer.alloc((width + 1) * height);
	for (let y = 0; y < height; y++) pixels.copy(rows, y * (width + 1) + 1, y * width, (y + 1) * width);
	return Buffer.concat([
		PNG_SIGNATURE, chunk('IHDR', header), chunk('PLTE', palette), chunk('tRNS', Buffer.from([0])),
		chunk('IDAT', zlib.deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
	]);
}

export function tilesToPixels(tiles: Buffer, width: number, height: number): Buffer {
	const pixels = Buffer.alloc(width * height);
	const tilesWide = width / 8;
	for (let tile = 0; tile * 32 + 32 <= tiles.length && tile < tilesWide * (height / 8); tile++) {
		const tx = (tile % tilesWide) * 8;
		const ty = Math.floor(tile / tilesWide) * 8;
		for (let y = 0; y < 8; y++) {
			for (let x = 0; x < 8; x++) {
				const byte = tiles[tile * 32 + y * 4 + (x >> 1)];
				pixels[(ty + y) * width + tx + x] = x & 1 ? byte >> 4 : byte & 0xf;
			}
		}
	}
	return pixels;
}

export function toPalette(raw: Buffer, offset = 0): Buffer {
	const out = Buffer.alloc(48);
	for (let i = 0; i < 16; i++) {
		const color = raw.readUInt16LE(offset + i * 2);
		out[i * 3] = (color & 31) << 3;
		out[i * 3 + 1] = ((color >> 5) & 31) << 3;
		out[i * 3 + 2] = ((color >> 10) & 31) << 3;
	}
	return out;
}

function bottomRowScore(rom: Buffer, table: number): number {
	let touching = 0;
	for (let i = 1; i <= 40; i++) {
		const data = lz77(rom, rom.readUInt32LE(table + i * 8) - 0x08000000, 0x2000);
		if (!data) continue;
		const pixels = tilesToPixels(data.subarray(0, 0x800), 64, 64);
		for (let x = 0; x < 64; x++) {
			if (pixels[63 * 64 + x]) {
				touching++;
				break;
			}
		}
	}
	return touching;
}

function outlineLuma(pixels: Buffer, palette: Buffer): number {
	let total = 0;
	let count = 0;
	for (let y = 0; y < 64; y++) {
		for (let x = 0; x < 64; x++) {
			const index = pixels[y * 64 + x];
			if (!index) continue;
			if (x > 0 && x < 63 && y > 0 && y < 63 && pixels[y * 64 + x - 1] && pixels[y * 64 + x + 1] &&
				pixels[(y - 1) * 64 + x] && pixels[(y + 1) * 64 + x]) continue;
			total += palette[index * 3] * 2 + palette[index * 3 + 1] * 5 + palette[index * 3 + 2];
			count++;
		}
	}
	return count >= 40 ? total / count / 8 : -1;
}

export interface SpriteIndices { species: { [id: string]: number }; items: { [id: string]: number } }

export function extractGen3Sprites(
	rom: Buffer, indices: SpriteIndices, outDir: string, table?: { start: number, stride: number, nameAt: number }
) {
	const result = { pokemon: 0, icons: 0, items: 0, overworld: 0 };
	const write = (kind: string, id: string, data: Buffer) => {
		const dir = path.join(outDir, kind);
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(path.join(dir, `${id}.png`), data);
	};

	const lzSize = (pointer: number) => {
		if (!isPointer(pointer, rom)) return -1;
		const at = pointer - 0x08000000;
		if (rom[at] !== 0x10) return -1;
		return rom[at + 1] | (rom[at + 2] << 8) | (rom[at + 3] << 16);
	};
	const findRuns = (isEntry: (at: number) => boolean, stride: number, minRun: number) => {
		const runs: { start: number, length: number }[] = [];
		for (let at = 0; at + stride <= rom.length; at += 4) {
			if (rom[at + 3] !== 0x08 && rom[at + 3] !== 0x09) continue;
			if (!isEntry(at)) continue;
			let length = 1;
			while (at + (length + 1) * stride <= rom.length && isEntry(at + length * stride)) length++;
			if (length >= minRun) runs.push({ start: at, length });
			at += length * stride - 4;
		}
		return runs;
	};
	const taggedBase = (run: { start: number, length: number }, tagAt: number, minTag: number) => {
		for (let k = 0; k + 3 < run.length; k++) {
			const tag = rom.readUInt16LE(run.start + k * 8 + tagAt);
			if (tag < minTag) continue;
			if (rom.readUInt16LE(run.start + (k + 1) * 8 + tagAt) !== tag + 1) continue;
			if (rom.readUInt16LE(run.start + (k + 2) * 8 + tagAt) !== tag + 2) continue;
			return { entry: run.start + k * 8, tag };
		}
		return null;
	};
	const picRuns = findRuns(at => {
		const size = lzSize(rom.readUInt32LE(at));
		return size >= 0x800 && size <= 0x2000 && size % 0x800 === 0 && rom.readUInt16LE(at + 4) % 0x800 === 0 &&
			rom.readUInt16LE(at + 4) > 0;
	}, 8, 100);
	const picTables: number[] = [];
	for (const run of picRuns.sort((a, b) => b.length - a.length).slice(0, 2).sort((a, b) => a.start - b.start)) {
		const anchor = taggedBase(run, 6, 0);
		picTables.push(anchor && anchor.tag < 500 ? anchor.entry - anchor.tag * 8 : run.start);
	}
	const paletteRuns = findRuns(at => lzSize(rom.readUInt32LE(at)) === 0x20 && rom.readUInt16LE(at + 6) === 0, 8, 60)
		.sort((a, b) => b.length - a.length);
	const palettes: number[] = [];
	let shinyAt = -1;
	let paletteCount = 0;
	const coverage = new Map<number, { total: number, count: number, minTag: number }>();
	for (const run of paletteRuns) {
		const anchor = taggedBase(run, 4, 0);
		if (!anchor) continue;
		const firstTag = anchor.tag - (anchor.entry - run.start) / 8;
		if (firstTag < 0 || firstTag > 3000 || (firstTag >= 400 && firstTag % 500 === 0)) continue;
		const base = anchor.entry - anchor.tag * 8;
		const entry = coverage.get(base) || { total: 0, count: 0, minTag: firstTag };
		entry.minTag = Math.min(entry.minTag, firstTag);
		entry.total += run.length;
		entry.count = Math.max(entry.count, firstTag + run.length);
		coverage.set(base, entry);
	}
	let bestTotal = 0;
	for (const [base, entry] of coverage) {
		if (entry.minTag > 1) continue;
		if (entry.total > bestTotal || (entry.total === bestTotal && base > (palettes[0] || 0))) {
			bestTotal = entry.total;
			palettes[0] = base;
			paletteCount = entry.count;
		}
	}
	if (palettes.length) {
		const shinyAnchors = paletteRuns.filter(run => run.start > palettes[0])
			.map(run => taggedBase(run, 4, Math.max(400, paletteCount)))
			.filter(anchor => anchor && anchor.tag < 10000 && anchor.entry - anchor.tag * 8 !== palettes[0])
			.map(anchor => anchor!).sort((a, b) => a.tag - b.tag);
		if (shinyAnchors.length) {
			const anchor = shinyAnchors[0];
			let base = anchor.tag;
			if (anchor.tag % 500 !== 0 && anchor.tag !== paletteCount) base = Math.floor(anchor.tag / 500) * 500;
			shinyAt = anchor.entry - (anchor.tag - base) * 8;
		}
	}
	if (picTables.length >= 2 && palettes.length) {
		let front = picTables[0];
		let back = picTables[1];
		const listed = ['BPR', 'BPG'].includes(rom.toString('latin1', 0xac, 0xaf)) ?
			[0x128, 0x12c, 0x130, 0x134].map(at => rom.readUInt32LE(at) - 0x08000000) : [];
		if (listed[0] === back && listed[1] === front) {
			[front, back] = [back, front];
		} else if (listed[0] !== front || listed[1] !== back) {
			if (bottomRowScore(rom, front) < bottomRowScore(rom, back)) [front, back] = [back, front];
			listed.length = 0;
		}
		if (listed.length && listed[2] === palettes[0] && listed[3] > 0 && listed[3] < rom.length) shinyAt = listed[3];
		const paletteTable = palettes[0];
		const ordered = Object.values(indices.species).sort((a, b) => a - b);
		const every = Math.max(1, Math.floor(ordered.length / 60));
		const sample = ordered.filter((index, i) => i % every === 0);
		const colorsAt = (colorTable: number, index: number) => {
			if (colorTable + index * 8 + 4 > rom.length) return null;
			const raw = lz77(rom, rom.readUInt32LE(colorTable + index * 8) - 0x08000000, 0x40);
			return raw && raw.length >= 32 ? toPalette(raw) : null;
		};
		const coherent = (colorTable: number) => {
			let tested = 0;
			let wins = 0;
			sample.forEach((index, i) => {
				const data = lz77(rom, rom.readUInt32LE(front + index * 8) - 0x08000000, 0x4000);
				const own = colorsAt(colorTable, index);
				if (!data || data.length < 0x800 || !own) return;
				const pixels = tilesToPixels(data.subarray(0, 0x800), 64, 64);
				const mine = outlineLuma(pixels, own);
				if (mine < 0) return;
				let darker = 0;
				let compared = 0;
				for (const shift of [5, 11, 17, 23, 29, 37]) {
					const foreign = colorsAt(colorTable, sample[(i + shift) % sample.length]);
					const theirs = foreign ? outlineLuma(pixels, foreign) : -1;
					if (theirs < 0) continue;
					compared++;
					if (mine <= theirs) darker++;
				}
				if (!compared) return;
				tested++;
				if (darker === compared) wins++;
			});
			return tested >= 12 && wins >= tested * 0.5;
		};
		const trusted = coherent(paletteTable);
		const picSpecies = trusted ? indices.species : {};
		for (const id in picSpecies) {
			const index = picSpecies[id];
			const paletteRaw = lz77(rom, rom.readUInt32LE(paletteTable + index * 8) - 0x08000000, 0x100);
			if (!paletteRaw || paletteRaw.length < 32) continue;
			const palette = toPalette(paletteRaw);
			const frontData = lz77(rom, rom.readUInt32LE(front + index * 8) - 0x08000000, 0x4000);
			if (!frontData || frontData.length < 0x800) continue;
			write('front', id, png(tilesToPixels(frontData.subarray(0, 0x800), 64, 64), 64, 64, palette));
			const backData = lz77(rom, rom.readUInt32LE(back + index * 8) - 0x08000000, 0x4000);
			if (backData && backData.length >= 0x800) {
				write('back', id, png(tilesToPixels(backData.subarray(0, 0x800), 64, 64), 64, 64, palette));
			}
			if (shinyAt >= 0) {
				const shinyRaw = lz77(rom, rom.readUInt32LE(shinyAt + index * 8) - 0x08000000, 0x100);
				if (shinyRaw && shinyRaw.length >= 32) {
					const shiny = toPalette(shinyRaw);
					write('front-shiny', id, png(tilesToPixels(frontData.subarray(0, 0x800), 64, 64), 64, 64, shiny));
					if (backData && backData.length >= 0x800) {
						write('back-shiny', id, png(tilesToPixels(backData.subarray(0, 0x800), 64, 64), 64, 64, shiny));
					}
				}
			}
			result.pokemon++;
		}
	}

	if (!result.pokemon && table) {
		const sample = Object.values(indices.species).filter((index, i) => i % 7 === 0).slice(0, 60);
		const pics: number[] = [];
		const colors: number[] = [];
		const target = (index: number, o: number) => {
			const pointer = rom.readUInt32LE(table.start + index * table.stride + o);
			return isPointer(pointer, rom) ? pointer - 0x08000000 : -1;
		};
		const rawColors = (at: number) => {
			if (at < 0 || at + 32 > rom.length || rom.readUInt32LE(at + 28) === 0) return false;
			for (let i = 0; i < 16; i++) {
				if (rom[at + i * 2 + 1] & 0x80) return false;
			}
			return smolSize(rom, at) < 0 || smolSize(rom, at) > 0x4000;
		};
		for (let o = (table.nameAt + 3) & ~3; o + 4 <= table.stride; o += 4) {
			let picVotes = 0;
			let colorVotes = 0;
			for (const index of sample) {
				const at = target(index, o);
				const size = at >= 0 && rom[at] === 0x10 ? lzSize(at + 0x08000000) : smolSize(rom, at);
				if (size >= 0x800 && size <= 0x4000 && size % 0x800 === 0) picVotes++;
				else if (size === 0x20 || (pics.length >= 2 && rawColors(at))) colorVotes++;
			}
			if (picVotes >= sample.length * 0.6) pics.push(o);
			else if (colorVotes >= sample.length * 0.6 && pics.length >= 2) colors.push(o);
		}
		const frontAt = pics[0];
		const backAt = pics.length >= 4 ? pics[2] : pics[1];
		const colorsOf = (index: number, o: number) => {
			const at = target(index, o);
			if (at < 0) return null;
			if (rom[at] === 0x10) {
				const packed = lz77(rom, at, 0x40);
				return packed && packed.length >= 32 ? toPalette(packed) : null;
			}
			return at + 32 <= rom.length ? toPalette(rom, at) : null;
		};
		for (const id in pics.length >= 2 && colors.length ? indices.species : {}) {
			const index = indices.species[id];
			const palette = colorsOf(index, colors[0]);
			const frontData = unpack(rom, target(index, frontAt), 0x4000);
			if (!palette || !frontData || frontData.length < 0x800) continue;
			const backData = unpack(rom, target(index, backAt), 0x4000);
			const hasBack = !!backData && backData.length >= 0x800;
			write('front', id, png(tilesToPixels(frontData.subarray(0, 0x800), 64, 64), 64, 64, palette));
			if (hasBack) write('back', id, png(tilesToPixels(backData.subarray(0, 0x800), 64, 64), 64, 64, palette));
			const shiny = colors.length > 1 ? colorsOf(index, colors[1]) : null;
			if (shiny) {
				write('front-shiny', id, png(tilesToPixels(frontData.subarray(0, 0x800), 64, 64), 64, 64, shiny));
				if (hasBack) write('back-shiny', id, png(tilesToPixels(backData.subarray(0, 0x800), 64, 64), 64, 64, shiny));
			}
			result.pokemon++;
		}
		let walkAt = -1;
		for (let o = (table.nameAt + 3) & ~3; o + 44 <= table.stride && walkAt < 0; o += 4) {
			let votes = 0;
			for (const index of sample) {
				const at = table.start + index * table.stride + o;
				const width = rom.readUInt16LE(at + 8);
				const height = rom.readUInt16LE(at + 10);
				if (rom.readUInt16LE(at) === 0xffff && [16, 32, 64].includes(width) && [16, 32, 64].includes(height) &&
					rom.readUInt16LE(at + 6) === width * height / 2) votes++;
			}
			if (votes >= sample.length * 0.5) walkAt = o;
		}
		let walkColors = colors.find(o => o > walkAt + 28);
		for (let o = walkAt + 36; walkAt >= 0 && !walkColors && o + 4 <= table.stride; o += 4) {
			const seen = new Set<number>();
			let votes = 0;
			for (const index of sample) {
				const at = target(index, o);
				if (at < 0 || at + 32 > rom.length) continue;
				let plain = rom.readUInt32LE(at + 4) !== 0;
				for (let i = 0; i < 16 && plain; i++) plain = !(rom[at + i * 2 + 1] & 0x80);
				if (plain) votes++;
				seen.add(at);
			}
			if (votes >= sample.length * 0.6 && seen.size >= sample.length * 0.3) walkColors = o;
		}
		for (const id in walkAt >= 0 && walkColors ? indices.species : {}) {
			const index = indices.species[id];
			const at = table.start + index * table.stride + walkAt;
			const width = rom.readUInt16LE(at + 8);
			const height = rom.readUInt16LE(at + 10);
			const size = width * height / 2;
			const images = target(index, walkAt + 28);
			if (images < 0 || !size || size !== rom.readUInt16LE(at + 6) || ![16, 32, 64].includes(width)) continue;
			const frameAt = isPointer(rom.readUInt32LE(images), rom) ? rom.readUInt32LE(images) - 0x08000000 : -1;
			if (frameAt < 0 || frameAt + size > rom.length) continue;
			let frame: Buffer | null = null;
			const packedSize = rom[frameAt] === 0x10 ? lzSize(frameAt + 0x08000000) : smolSize(rom, frameAt);
			if (packedSize >= size && packedSize <= 0x4000 && packedSize % size === 0) frame = unpack(rom, frameAt, 0x4000);
			if (!frame) frame = rom.subarray(frameAt, frameAt + size);
			const palette = colorsOf(index, walkColors!);
			if (!palette || frame.length < size || frame.subarray(0, size).every(byte => !byte)) continue;
			write('overworld', id, png(tilesToPixels(frame.subarray(0, size), width, height), width, height, palette));
			result.overworld++;
		}
	}

	let iconPalettes = -1;
	for (let at = 0; at + 24 <= rom.length; at += 4) {
		if (rom.readUInt32LE(at + 4) === 0xdac0 && rom.readUInt32LE(at + 12) === 0xdac1 && rom.readUInt32LE(at + 20) === 0xdac2 &&
			isPointer(rom.readUInt32LE(at), rom)) {
			iconPalettes = at;
			break;
		}
	}
	let iconTable = -1;
	if (iconPalettes >= 0 && rom.toString('latin1', 0xac, 0xaf) === 'BPE') {
		const iconRuns = findRuns(at => {
			const pointer = rom.readUInt32LE(at);
			const next = rom.readUInt32LE(at + 4);
			return isPointer(pointer, rom) && (next === pointer + 0x400 || next === pointer);
		}, 4, 100).sort((a, b) => b.length - a.length);
		const iconRun = iconRuns.find(run => rom.readUInt32LE(run.start) === rom.readUInt32LE(run.start + 4));
		if (iconRun) iconTable = iconRun.start;
	}
	if (iconTable >= 0) {
		const speciesCount = Math.max(...Object.values(indices.species)) + 1;
		const signature = rom.indexOf(signatureAnchor('gen3IconPaletteIndices'));
		let paletteIndices = signature > 0 && speciesCount ? signature - 1 : -1;
		const listed = Math.floor((iconPalettes - iconTable) / 5);
		if (listed >= 100 && iconPalettes > iconTable) {
			const after = iconTable + listed * 4;
			let small = 0;
			for (let i = 0; i < listed; i++) {
				if (rom[after + i] < 8) small++;
			}
			if (small === listed && isPointer(rom.readUInt32LE(after - 4), rom)) paletteIndices = after;
		}
		const iconPalette = (n: number) => {
			const pointer = rom.readUInt32LE(iconPalettes + n * 8);
			return isPointer(pointer, rom) ? toPalette(rom, pointer - 0x08000000) : null;
		};
		const smooth = (pixels: Buffer) => {
			let blank = 0;
			let same = 0;
			for (let i = 0; i < pixels.length; i++) {
				if (!pixels[i]) blank++;
				if (i % 32 && pixels[i] === pixels[i - 1]) same++;
			}
			return blank >= 300 && same >= 620;
		};
		let usable = 0;
		for (const index of Object.values(indices.species)) {
			const pointer = rom.readUInt32LE(iconTable + index * 4);
			if (!isPointer(pointer, rom) || pointer - 0x08000000 + 0x200 > rom.length) continue;
			if (smooth(tilesToPixels(rom.subarray(pointer - 0x08000000, pointer - 0x08000000 + 0x200), 32, 32))) usable++;
		}
		for (const id in usable >= Object.keys(indices.species).length / 2 ? indices.species : {}) {
			const index = indices.species[id];
			const pointer = rom.readUInt32LE(iconTable + index * 4);
			if (!isPointer(pointer, rom) || pointer - 0x08000000 + 0x200 > rom.length) continue;
			if (!smooth(tilesToPixels(rom.subarray(pointer - 0x08000000, pointer - 0x08000000 + 0x200), 32, 32))) continue;
			const palette = iconPalette(paletteIndices >= 0 ? rom[paletteIndices + index] : 0) || iconPalette(0);
			if (!palette) continue;
			const tiles = rom.subarray(pointer - 0x08000000, pointer - 0x08000000 + 0x200);
			write('icon', id, png(tilesToPixels(tiles, 32, 32), 32, 32, palette));
			result.icons++;
		}
	}

	let itemTable = -1;
	const isItemEntry = (at: number) => {
		const image = rom.readUInt32LE(at);
		const palette = rom.readUInt32LE(at + 4);
		if (!isPointer(image, rom) || !isPointer(palette, rom)) return false;
		const imageAt = image - 0x08000000;
		const paletteAt = palette - 0x08000000;
		return rom[imageAt] === 0x10 && rom.readUInt16LE(imageAt + 1) === 0x120 && rom[paletteAt] === 0x10 &&
			rom.readUInt16LE(paletteAt + 1) === 0x20;
	};
	for (let at = 0; at + 96 <= rom.length; at += 4) {
		if (rom[at + 3] !== 0x08 && rom[at + 3] !== 0x09) continue;
		let run = 0;
		while (run < 12 && isItemEntry(at + run * 8)) run++;
		if (run === 12) {
			itemTable = at;
			break;
		}
	}
	const packedSize = (at: number) => {
		if (at < 0 || at + 8 > rom.length) return -1;
		return rom[at] === 0x10 ? rom[at + 1] | (rom[at + 2] << 8) | (rom[at + 3] << 16) : smolSize(rom, at);
	};
	const recordColors = (at: number) => {
		if (at < 0 || at + 32 > rom.length) return null;
		if (packedSize(at) === 0x20) {
			const packed = unpack(rom, at, 0x40);
			if (packed && packed.length >= 32) return toPalette(packed);
		}
		for (let i = 0; i < 16; i++) {
			if (rom[at + i * 2 + 1] & 0x80) return null;
		}
		return rom.subarray(at + 2, at + 32).some(byte => byte > 0) ? toPalette(rom, at) : null;
	};
	const isRecordIcon = (at: number) => {
		if ((rom[at + 3] !== 0x08 && rom[at + 3] !== 0x09) || (rom[at + 7] !== 0x08 && rom[at + 7] !== 0x09)) return false;
		const image = rom.readUInt32LE(at);
		const colors = rom.readUInt32LE(at + 4);
		return isPointer(image, rom) && isPointer(colors, rom) && packedSize(image - 0x08000000) === 0x120 &&
			colors - 0x08000000 + 32 <= rom.length;
	};
	const recordIcons: number[] = [];
	for (let at = 0; at + 8 <= rom.length; at += 4) {
		if (isRecordIcon(at)) recordIcons.push(at);
	}
	const gaps = new Map<number, number>();
	for (let i = 1; i < recordIcons.length; i++) {
		const gap = recordIcons[i] - recordIcons[i - 1];
		gaps.set(gap, (gaps.get(gap) || 0) + 1);
	}
	let recordStride = 0;
	for (const [gap, count] of gaps) {
		if (count >= 100 && count > (gaps.get(recordStride) || 0)) recordStride = gap;
	}
	let recordStart = -1;
	if (recordStride > 8 && recordStride <= 0x100) {
		const known = new Set(recordIcons);
		let best = 0;
		let length = 0;
		for (let i = 0; i < recordIcons.length; i++) {
			length = i && recordIcons[i] - recordIcons[i - 1] === recordStride ? length + 1 : 1;
			if (length > best) {
				best = length;
				recordStart = recordIcons[i] - (length - 1) * recordStride;
			}
		}
		for (let at = recordStart - recordStride, missing = 0; at >= 0 && missing < 16; at -= recordStride) {
			if (known.has(at)) {
				recordStart = at;
				missing = 0;
			} else {
				missing++;
			}
		}
		for (const id in indices.items) {
			const at = recordStart + indices.items[id] * recordStride;
			if (!known.has(at)) continue;
			const image = unpack(rom, rom.readUInt32LE(at) - 0x08000000, 0x200);
			const palette = recordColors(rom.readUInt32LE(at + 4) - 0x08000000);
			if (!image || image.length < 0x120 || !palette) continue;
			write('item', id, png(tilesToPixels(image, 24, 24), 24, 24, palette));
			result.items++;
		}
	}
	if (itemTable >= 0 && recordStart < 0) {
		for (const id in indices.items) {
			const at = itemTable + indices.items[id] * 8;
			if (at + 8 > rom.length || !isItemEntry(at)) continue;
			const image = lz77(rom, rom.readUInt32LE(at) - 0x08000000, 0x200);
			const paletteRaw = lz77(rom, rom.readUInt32LE(at + 4) - 0x08000000, 0x40);
			if (!image || !paletteRaw || paletteRaw.length < 32) continue;
			write('item', id, png(tilesToPixels(image, 24, 24), 24, 24, toPalette(paletteRaw)));
			result.items++;
		}
	}
	return result;
}
