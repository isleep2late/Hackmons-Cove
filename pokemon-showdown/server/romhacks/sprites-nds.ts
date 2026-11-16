import * as fs from 'fs';
import * as path from 'path';
import { findFile, readNarc, GAMES } from './nds';
import { png, tilesToPixels, toPalette, type SpriteIndices } from './sprites-gen3';
import { signatureAnchor } from './signatures';

const GEN4_PICS: { [code: string]: string } = {
	ADA: 'poketool/pokegra/pokegra.narc', APA: 'poketool/pokegra/pokegra.narc', CPU: 'poketool/pokegra/pl_pokegra.narc',
	IPK: 'a/0/0/4', IPG: 'a/0/0/4',
};

const GEN4_FORM_PICS: { [code: string]: { file: string, palettes: number[] } } = {
	ADA: { file: 'poketool/pokegra/otherpoke.narc', palettes: [134, 152] },
	APA: { file: 'poketool/pokegra/otherpoke.narc', palettes: [134, 152] },
	CPU: { file: 'poketool/pokegra/pl_otherpoke.narc', palettes: [154, 172, 244, 228, 232] },
	IPK: { file: 'a/1/1/4', palettes: [158, 176, 248, 232, 236] },
	IPG: { file: 'a/1/1/4', palettes: [158, 176, 248, 232, 236] },
};
const GEN4_FORM_SLOTS: { [index: number]: [number, number, number] } = {
	496: [2, 0, 0], 497: [4, 0, 0], 498: [6, 0, 0], 499: [80, 1, 2], 500: [82, 1, 4], 501: [152, 2, 2], 502: [136, 3, 2],
	503: [140, 4, 2], 504: [142, 4, 4], 505: [144, 4, 6], 506: [146, 4, 8], 507: [148, 4, 10],
};

function decodeGen4(file: Buffer, backwards: boolean): Buffer | null {
	if (file.length < 0x30 + 0x1900 || file.toString('latin1', 0, 4) !== 'RGCN') return null;
	const words = new Uint16Array(0xc80);
	for (let i = 0; i < 0xc80; i++) words[i] = file.readUInt16LE(0x30 + i * 2);
	if (backwards) {
		let seed = words[0xc7f];
		for (let i = 0xc7f; i >= 0; i--) {
			words[i] ^= seed & 0xffff;
			seed = (Math.imul(seed, 0x41c64e6d) + 0x6073) >>> 0;
		}
	} else {
		let seed = words[0];
		for (let i = 0; i < 0xc80; i++) {
			words[i] ^= seed & 0xffff;
			seed = (Math.imul(seed, 0x41c64e6d) + 0x6073) >>> 0;
		}
	}
	const pixels = Buffer.alloc(80 * 80);
	for (let y = 0; y < 80; y++) {
		for (let x = 0; x < 80; x++) {
			const word = words[y * 40 + (x >> 2)];
			pixels[y * 80 + x] = (word >> ((x & 3) * 4)) & 0xf;
		}
	}
	return pixels;
}

function nclr(file: Buffer): Buffer | null {
	if (file.length < 0x28 + 32 || file.toString('latin1', 0, 4) !== 'RLCN') return null;
	return toPalette(file, 0x28);
}

function lz11(data: Buffer): Buffer | null {
	if (data.length < 5 || data[0] !== 0x11) return null;
	const size = data[1] | (data[2] << 8) | (data[3] << 16);
	if (!size || size > 0x100000) return null;
	const out = Buffer.alloc(size);
	let at = 4;
	let written = 0;
	while (written < size) {
		if (at >= data.length) return null;
		const flags = data[at++];
		for (let bit = 7; bit >= 0 && written < size; bit--) {
			if (!(flags & (1 << bit))) {
				out[written++] = data[at++];
				continue;
			}
			const b0 = data[at++];
			let length;
			let distance;
			if (b0 >> 4 === 0) {
				const b1 = data[at++];
				const b2 = data[at++];
				length = (((b0 & 0xf) << 4) | (b1 >> 4)) + 0x11;
				distance = (((b1 & 0xf) << 8) | b2) + 1;
			} else if (b0 >> 4 === 1) {
				const b1 = data[at++];
				const b2 = data[at++];
				const b3 = data[at++];
				length = (((b0 & 0xf) << 12) | (b1 << 4) | (b2 >> 4)) + 0x111;
				distance = (((b2 & 0xf) << 8) | b3) + 1;
			} else {
				const b1 = data[at++];
				length = (b0 >> 4) + 1;
				distance = (((b0 & 0xf) << 8) | b1) + 1;
			}
			if (distance > written) return null;
			for (let i = 0; i < length && written < size; i++, written++) out[written] = out[written - distance];
		}
	}
	return out;
}

function decodeGen5(file: Buffer): Buffer | null {
	const data = lz11(file);
	if (!data || data.length < 0x30 + 4608 || data.toString('latin1', 0, 4) !== 'RGCN') return null;
	const tiles = data.subarray(0x30, 0x30 + 4608);
	const pixels = Buffer.alloc(96 * 96);
	const blocks = [[0, 0, 8, 8], [64, 0, 4, 8], [0, 64, 8, 4], [64, 64, 4, 4]];
	let tile = 0;
	for (const [left, top, wide, tall] of blocks) {
		const block = tilesToPixels(tiles.subarray(tile * 32, (tile + wide * tall) * 32), wide * 8, tall * 8);
		for (let y = 0; y < tall * 8; y++) block.copy(pixels, (top + y) * 96 + left, y * wide * 8, (y + 1) * wide * 8);
		tile += wide * tall;
	}
	return pixels;
}

function unpackProgram(rom: Buffer): Buffer | null {
	const start = rom.readUInt32LE(0x20);
	const size = rom.readUInt32LE(0x2c);
	if (start + size > rom.length || size < 0x1000) return null;
	const packed = rom.subarray(start, start + size);
	const lengths = packed.readUInt32LE(size - 8);
	const extra = packed.readUInt32LE(size - 4);
	const header = lengths >>> 24;
	const coded = lengths & 0xffffff;
	if (!extra || extra > 0x400000 || coded > size || header < 8 || header > 0x10) return packed;
	const out = Buffer.alloc(size + extra);
	packed.copy(out, 0, 0, size);
	let from = size - header;
	let to = size + extra;
	const stop = size - coded;
	while (from > stop) {
		const flags = packed[--from];
		for (let bit = 7; bit >= 0 && from > stop; bit--) {
			if (flags & (1 << bit)) {
				const a = packed[--from];
				const b = packed[--from];
				const distance = (((a & 15) << 8) | b) + 3;
				for (let i = 0; i < (a >> 4) + 3 && to > 0; i++) {
					to--;
					out[to] = out[to + distance];
				}
			} else if (to > 0) {
				out[--to] = packed[--from];
			}
		}
	}
	return out;
}

function followerTable(program: Buffer): number {
	const steps = signatureAnchor('followerTableSteps');
	for (let at = 0; at + 1000 < program.length; at += 2) {
		if (program.readUInt16LE(at) !== 0 || program.readUInt16LE(at + 2) !== 1) continue;
		let fits = true;
		for (let i = 0; i < steps.length && fits; i++) {
			fits = program.readUInt16LE(at + i * 2 + 2) - program.readUInt16LE(at + i * 2) === steps[i];
		}
		if (fits) return at;
	}
	return -1;
}

function followerPicture(file: Buffer, frame: number): Buffer | null {
	if (file.length < 0x40 || file.toString('latin1', 0, 4) !== 'BTX0') return null;
	const block = file.readUInt32LE(0x10);
	if (block + 0x3c > file.length) return null;
	const info = block + file.readUInt16LE(block + 0x0e);
	const data = block + file.readUInt32LE(block + 0x14);
	const colors = block + file.readUInt32LE(block + 0x38);
	const count = file[info + 1];
	if (!count) return null;
	const entry = info + 16 + count * 4 + Math.min(frame, count - 1) * 8;
	if (entry + 4 > file.length) return null;
	const at = data + (file.readUInt16LE(entry) << 3);
	const params = file.readUInt16LE(entry + 2);
	const width = 8 << ((params >> 4) & 7);
	const height = 8 << ((params >> 7) & 7);
	if (((params >> 10) & 7) !== 3 || width > 64 || height > 64 || at + width * height / 2 > file.length) return null;
	if (colors + 32 > file.length) return null;
	const pixels = Buffer.alloc(width * height);
	for (let i = 0; i < pixels.length; i++) {
		const byte = file[at + (i >> 1)];
		pixels[i] = i & 1 ? byte >> 4 : byte & 15;
	}
	return png(pixels, width, height, toPalette(file, colors));
}

export function extractNDSSprites(rom: Buffer, indices: SpriteIndices, outDir: string) {
	const result = { pokemon: 0, icons: 0, items: 0, size: 80, overworld: 0 };
	const code = rom.toString('latin1', 0x0c, 0x0f);
	const game = GAMES[code];
	if (!game) return result;
	const write = (kind: string, id: string, data: Buffer) => {
		const dir = path.join(outDir, kind);
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(path.join(dir, `${id}.png`), data);
	};
	if (game.gen === 5) {
		result.size = 96;
		const archive = findFile(rom, 'a/0/0/4');
		if (!archive) return result;
		const entries = readNarc(archive);
		for (const id in indices.species) {
			const index = indices.species[id];
			if (index < 1 || index > 649 || index * 20 + 19 >= entries.length) continue;
			const pick = (a: number, b: number) => (entries[index * 20 + a].length ? entries[index * 20 + a] : entries[index * 20 + b]);
			const front = decodeGen5(pick(0, 1));
			const back = decodeGen5(pick(9, 10));
			const normal = nclr(entries[index * 20 + 18]);
			const shiny = nclr(entries[index * 20 + 19]);
			if (!front || !normal) continue;
			write('front', id, png(front, 96, 96, normal));
			if (back) write('back', id, png(back, 96, 96, normal));
			write('front-shiny', id, png(front, 96, 96, shiny || normal));
			if (back) write('back-shiny', id, png(back, 96, 96, shiny || normal));
			result.pokemon++;
		}
		return result;
	}
	const file = findFile(rom, GEN4_PICS[code]);
	if (!file) return result;
	const files = readNarc(file);
	const backwards = code === 'ADA' || code === 'APA';
	for (const id in indices.species) {
		const index = indices.species[id];
		if (index < 1 || index > 493 || index * 6 + 5 >= files.length) continue;
		const pick = (a: number, b: number) => (files[index * 6 + a].length ? files[index * 6 + a] : files[index * 6 + b]);
		const front = decodeGen4(pick(3, 2), backwards);
		const back = decodeGen4(pick(1, 0), backwards);
		const normal = nclr(files[index * 6 + 4]);
		const shiny = nclr(files[index * 6 + 5]);
		if (!front || !normal) continue;
		write('front', id, png(front, 80, 80, normal));
		if (back) write('back', id, png(back, 80, 80, normal));
		write('front-shiny', id, png(front, 80, 80, shiny || normal));
		if (back) write('back-shiny', id, png(back, 80, 80, shiny || normal));
		result.pokemon++;
	}
	const other = GEN4_FORM_PICS[code];
	const otherFile = other ? findFile(rom, other.file) : null;
	const otherFiles = otherFile ? readNarc(otherFile) : [];
	for (const id in otherFiles.length ? indices.species : {}) {
		const slot = GEN4_FORM_SLOTS[indices.species[id]];
		if (!slot || slot[1] >= other.palettes.length) continue;
		const colors = other.palettes[slot[1]] + slot[2];
		if (slot[0] + 1 >= otherFiles.length || colors + 1 >= otherFiles.length) continue;
		const front = decodeGen4(otherFiles[slot[0] + 1], backwards);
		const back = decodeGen4(otherFiles[slot[0]], backwards);
		const normal = nclr(otherFiles[colors]);
		const shiny = nclr(otherFiles[colors + 1]);
		if (!front || !normal) continue;
		write('front', id, png(front, 80, 80, normal));
		if (back) write('back', id, png(back, 80, 80, normal));
		write('front-shiny', id, png(front, 80, 80, shiny || normal));
		if (back) write('back-shiny', id, png(back, 80, 80, shiny || normal));
		result.pokemon++;
	}
	if (code === 'IPK' || code === 'IPG') {
		const followers = findFile(rom, 'a/0/8/1');
		const program = unpackProgram(rom);
		const table = program ? followerTable(program) : -1;
		if (followers && program && table >= 0) {
			const pictures = readNarc(followers);
			for (const id in indices.species) {
				const index = indices.species[id];
				if (index < 1 || index > 493) continue;
				const file = pictures[297 + program.readUInt16LE(table + (index - 1) * 2)];
				const picture = file ? followerPicture(file, 2) : null;
				if (!picture) continue;
				write('overworld', id, picture);
				result.overworld++;
			}
		}
	}
	return result;
}
