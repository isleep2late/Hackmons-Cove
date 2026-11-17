import * as fs from 'fs';
import * as path from 'path';
import { png, type SpriteIndices } from './sprites-gen3';
import { findGen1OrderByNames, findGen1Stats, findGen2Stats } from './gb';
import { signatureAnchor } from './signatures';

function reverseBits(b: number) {
	let out = 0;
	for (let i = 0; i < 8; i++) out |= ((b >> i) & 1) << (7 - i);
	return out;
}

function lz(rom: Buffer, start: number, maxSize: number, variant = false): Buffer | null {
	const out = Buffer.alloc(maxSize);
	let at = start;
	let written = 0;
	for (;;) {
		if (at >= rom.length) return null;
		const b = rom[at++];
		if (b === 0xff) break;
		let command = b >> 5;
		let length = (b & 0x1f) + 1;
		if (command === 7) {
			command = (b >> 2) & 7;
			length = (((b & (variant ? 1 : 3)) << 8) | rom[at++]) + 1;
		}
		if (variant && (command === 1 || command === 2)) length += command;
		if (written + length > maxSize) return null;
		if (command === 0) {
			rom.copy(out, written, at, at + length);
			at += length;
			written += length;
		} else if (command === 1) {
			out.fill(rom[at++], written, written + length);
			written += length;
		} else if (command === 2) {
			const pair = [rom[at++], rom[at++]];
			for (let i = 0; i < length; i++) out[written++] = pair[i & 1];
		} else if (command === 3) {
			written += length;
		} else {
			const a = rom[at++];
			let offset = a & 0x80 ? written - (a & 0x7f) - 1 : (a << 8) | rom[at++];
			if (offset < 0 || offset >= maxSize) return null;
			for (let i = 0; i < length; i++) {
				if (offset < 0 || offset >= maxSize) return null;
				if (command === 4) out[written++] = out[offset++];
				else if (command === 5) out[written++] = reverseBits(out[offset++]);
				else out[written++] = out[offset--];
			}
		}
	}
	return out.subarray(0, written);
}

function columnsToPixels(data: Buffer, tiles: number, canvas: number, bottom: boolean): Buffer {
	const pixels = Buffer.alloc(canvas * canvas);
	const left = Math.floor((canvas - tiles * 8) / 2 / 8) * 8;
	const top = bottom ? canvas - tiles * 8 : left;
	for (let tx = 0; tx < tiles; tx++) {
		for (let ty = 0; ty < tiles; ty++) {
			const tile = (tx * tiles + ty) * 16;
			if (tile + 16 > data.length) continue;
			for (let y = 0; y < 8; y++) {
				const low = data[tile + y * 2];
				const high = data[tile + y * 2 + 1];
				for (let x = 0; x < 8; x++) {
					const color = ((low >> (7 - x)) & 1) | (((high >> (7 - x)) & 1) << 1);
					pixels[(top + ty * 8 + y) * canvas + left + tx * 8 + x] = color;
				}
			}
		}
	}
	return pixels;
}

function keepWhite(pixels: Buffer, width: number, height: number): Buffer {
	const outside = new Uint8Array(width * height);
	const stack: number[] = [];
	const visit = (x: number, y: number) => {
		if (x < 0 || y < 0 || x >= width || y >= height) return;
		const i = y * width + x;
		if (outside[i] || pixels[i]) return;
		outside[i] = 1;
		stack.push(i);
	};
	for (let x = 0; x < width; x++) {
		visit(x, 0);
		visit(x, height - 1);
	}
	for (let y = 0; y < height; y++) {
		visit(0, y);
		visit(width - 1, y);
	}
	while (stack.length) {
		const i = stack.pop()!;
		const x = i % width;
		const y = (i - x) / width;
		visit(x + 1, y);
		visit(x - 1, y);
		visit(x, y + 1);
		visit(x, y - 1);
	}
	for (let i = 0; i < pixels.length; i++) {
		if (!pixels[i] && !outside[i]) pixels[i] = 4;
	}
	return pixels;
}

function gbPalette(rom: Buffer, at: number): Buffer {
	const out = Buffer.alloc(15, 248);
	const put = (i: number, r: number, g: number, b: number) => {
		out[i * 3] = r;
		out[i * 3 + 1] = g;
		out[i * 3 + 2] = b;
	};
	put(0, 248, 248, 248);
	for (let i = 0; i < 2; i++) {
		const color = rom.readUInt16LE(at + i * 2);
		put(i + 1, (color & 31) << 3, ((color >> 5) & 31) << 3, ((color >> 10) & 31) << 3);
	}
	put(3, 24, 24, 24);
	return out;
}

function gen1Pic(rom: Buffer, start: number): { pixels: Buffer, width: number, height: number } | null {
	let at = start * 8;
	const limit = Math.min(rom.length, start + 0x1000) * 8;
	const bit = () => {
		if (at >= limit) throw new Error('overrun');
		const value = (rom[at >> 3] >> (7 - (at & 7))) & 1;
		at++;
		return value;
	};
	const bits = (n: number) => {
		let value = 0;
		for (let i = 0; i < n; i++) value = (value << 1) | bit();
		return value;
	};
	try {
		const tilesWide = bits(4);
		const tilesHigh = bits(4);
		if (!tilesWide || !tilesHigh || tilesWide > 7 || tilesHigh > 7) return null;
		const width = tilesWide * 8;
		const height = tilesHigh * 8;
		const order = bit();
		const plane = () => {
			const out = new Uint8Array(width * height);
			const total = width * height / 2;
			let written = 0;
			const put = (pair: number) => {
				const column = Math.floor(written / height);
				const row = written % height;
				out[row * width + column * 2] = pair >> 1;
				out[row * width + column * 2 + 1] = pair & 1;
				written++;
			};
			let rle = bit() === 0;
			while (written < total) {
				if (rle) {
					let length = 1;
					while (bit()) length++;
					const count = (1 << length) - 2 + bits(length) + 1;
					for (let i = 0; i < count && written < total; i++) put(0);
				} else {
					for (;;) {
						const pair = bits(2);
						if (!pair) break;
						put(pair);
						if (written >= total) break;
					}
				}
				rle = !rle;
			}
			return out;
		};
		const delta = (data: Uint8Array) => {
			for (let y = 0; y < height; y++) {
				let state = 0;
				for (let x = 0; x < width; x++) {
					if (data[y * width + x]) state ^= 1;
					data[y * width + x] = state;
				}
			}
		};
		const first = plane();
		let mode = bit();
		if (mode) mode += bit();
		const second = plane();
		delta(first);
		if (mode !== 1) delta(second);
		if (mode !== 0) {
			for (let i = 0; i < second.length; i++) second[i] ^= first[i];
		}
		const low = order ? second : first;
		const high = order ? first : second;
		const pixels = Buffer.alloc(width * height);
		for (let i = 0; i < pixels.length; i++) pixels[i] = (high[i] << 1) | low[i];
		return { pixels, width, height };
	} catch {
		return null;
	}
}

function extractGen1Sprites(rom: Buffer, indices: SpriteIndices, outDir: string) {
	const result = { pokemon: 0, icons: 0, items: 0, size: 56 };
	let stats = rom.indexOf(signatureAnchor('bulbasaurEntryGen1'));
	let order = rom.indexOf(signatureAnchor('pokedexOrderGen1'));
	if (order < 0) order = findGen1OrderByNames(rom);
	if (stats < 0) stats = findGen1Stats(rom);
	if (stats < 0 || order < 0 || rom[stats + 28] !== 2) return result;
	const internal: { [dex: number]: number } = {};
	for (let i = 0; i < 255; i++) {
		const dexNumber = rom[order + i];
		if (dexNumber && !(dexNumber in internal)) internal[dexNumber] = i + 1;
	}
	const mew = rom.indexOf(signatureAnchor('mewStats'));
	const gray = signatureAnchor('grayShades');
	const banks = Math.floor(rom.length / 0x4000);
	const load = (pointer: number, index: number, dims: number | null, given = 0) => {
		if (pointer < 0x4000 || pointer >= 0x8000) return null;
		const usual = index === 0x15 ? 1 : index < 0x1f ? 9 : index < 0x4a ? 0xa : index < 0x74 ? 0xb : index < 0x99 ? 0xc : 0xd;
		for (const bank of [given || usual]) {
			const at = bank * 0x4000 + pointer - 0x4000;
			if (at >= rom.length || (dims !== null && rom[at] !== dims)) continue;
			const pic = gen1Pic(rom, at);
			if (pic) return pic;
		}
		return null;
	};
	const write = (kind: string, id: string, data: Buffer) => {
		const dir = path.join(outDir, kind);
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(path.join(dir, `${id}.png`), data);
	};
	for (const id in indices.species) {
		const dexNumber = indices.species[id];
		let at = stats + (dexNumber - 1) * 28;
		if (rom[at] !== dexNumber && dexNumber === 151) at = mew;
		if (at < 0 || rom[at] !== dexNumber || !internal[dexNumber]) continue;
		const rawBank = rom[at + 27];
		const listed = rawBank > 0 && rawBank < banks ? rawBank : 0;
		const packedAt = listed * 0x4000 + rom.readUInt16LE(at + 11) - 0x4000;
		const packed = listed > 0 && rom[packedAt] === rom[at + 10] && [0x55, 0x66, 0x77].includes(rom[packedAt]);
		if (listed && !packed) {
			const raw = (pointer: number) => {
				const start = rawBank * 0x4000 + pointer - 0x4000;
				if (pointer < 0x4000 || pointer >= 0x8000 || start + 784 > rom.length) return null;
				return columnsToPixels(rom.subarray(start, start + 784), 7, 56, true);
			};
			const rawFront = raw(rom.readUInt16LE(at + 11));
			const rawBack = raw(rom.readUInt16LE(at + 13));
			if (!rawFront) continue;
			write('front', id, png(keepWhite(rawFront, 56, 56), 56, 56, gray));
			write('front-shiny', id, png(keepWhite(rawFront, 56, 56), 56, 56, gray));
			if (rawBack) {
				write('back', id, png(keepWhite(rawBack, 56, 56), 56, 56, gray));
				write('back-shiny', id, png(keepWhite(rawBack, 56, 56), 56, 56, gray));
			}
			result.pokemon++;
			continue;
		}
		const front = load(rom.readUInt16LE(at + 11), internal[dexNumber], rom[at + 10], listed);
		if (!front) continue;
		const canvas = Buffer.alloc(56 * 56);
		const left = ((8 - (front.width >> 3)) >> 1) * 8;
		const top = 56 - front.height;
		for (let y = 0; y < front.height; y++) {
			front.pixels.copy(canvas, (top + y) * 56 + left, y * front.width, (y + 1) * front.width);
		}
		write('front', id, png(keepWhite(canvas, 56, 56), 56, 56, gray));
		write('front-shiny', id, png(keepWhite(canvas, 56, 56), 56, 56, gray));
		const back = load(rom.readUInt16LE(at + 13), internal[dexNumber], 0x44, listed);
		if (back) {
			write('back', id, png(keepWhite(back.pixels, back.width, back.height), back.width, back.height, gray));
			write('back-shiny', id, png(keepWhite(back.pixels, back.width, back.height), back.width, back.height, gray));
		}
		result.pokemon++;
	}
	return result;
}

function writeMenuSprites(rom: Buffer, indices: SpriteIndices, outDir: string): number {
	let pointers = -1;
	let kinds = 0;
	for (let at = 0x4000; at + 80 < rom.length && pointers < 0; at++) {
		let run = 0;
		while (run < 80) {
			const here = rom.readUInt16LE(at + run * 2);
			if (here < 0x4000 || here >= 0x8000 || rom.readUInt16LE(at + run * 2 + 2) - here !== 0x80) break;
			run++;
		}
		if (run >= 30) {
			pointers = at - 2;
			kinds = run + 2;
		}
	}
	if (pointers < 251) return 0;
	const table = pointers - 251;
	for (let i = 0; i < 251; i++) {
		if (!rom[table + i] || rom[table + i] >= kinds) return 0;
	}
	const colors = Buffer.alloc(48);
	signatureAnchor('menuIconColors').copy(colors);
	const bank = pointers & ~0x3fff;
	let written = 0;
	for (const id in indices.species) {
		const index = indices.species[id];
		if (index < 1 || index > 251) continue;
		const at = bank + rom.readUInt16LE(pointers + rom[table + index - 1] * 2) - 0x4000;
		if (at + 0x40 > rom.length) continue;
		const pixels = Buffer.alloc(256);
		for (let tile = 0; tile < 4; tile++) {
			for (let y = 0; y < 8; y++) {
				const low = rom[at + tile * 16 + y * 2];
				const high = rom[at + tile * 16 + y * 2 + 1];
				for (let x = 0; x < 8; x++) {
					const value = ((low >> (7 - x)) & 1) | (((high >> (7 - x)) & 1) << 1);
					pixels[((tile >> 1) * 8 + y) * 16 + (tile & 1) * 8 + x] = value;
				}
			}
		}
		const dir = path.join(outDir, 'overworld');
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(path.join(dir, `${id}.png`), png(pixels, 16, 16, colors));
		written++;
	}
	return written;
}

function rowsToPixels(data: Buffer, start: number, columns: number, rows: number): Buffer {
	const width = columns * 8;
	const pixels = Buffer.alloc(width * rows * 8);
	for (let tile = 0; tile < columns * rows; tile++) {
		const at = start + tile * 16;
		if (at + 16 > data.length) break;
		const left = (tile % columns) * 8;
		const top = Math.floor(tile / columns) * 8;
		for (let y = 0; y < 8; y++) {
			const low = data[at + y * 2];
			const high = data[at + y * 2 + 1];
			for (let x = 0; x < 8; x++) {
				pixels[(top + y) * width + left + x] = ((low >> (7 - x)) & 1) | (((high >> (7 - x)) & 1) << 1);
			}
		}
	}
	return pixels;
}

const POLISHED_OVERWORLD_COLORS = [
	[31, 7, 1], [10, 9, 31], [7, 23, 3], [15, 10, 3], [18, 4, 18], [13, 13, 13], [31, 10, 11], [3, 23, 21],
	[25, 25, 0], [31, 13, 0], [4, 18, 31], [20, 20, 20], [10, 10, 10],
];

function extractPolishedSprites(rom: Buffer, indices: SpriteIndices, outDir: string) {
	const result = { pokemon: 0, icons: 0, items: 0, size: 56, overworld: 0 };
	const banks = rom.length >> 14;
	const unpack = (bank: number, address: number) => {
		if (address < 0x4000 || address >= 0x8000 || !bank || bank >= banks) return null;
		return lz(rom, bank * 0x4000 + address - 0x4000, 0x2000, true);
	};
	const entryOk = (at: number, stride: number) => {
		if (at + stride > rom.length || !rom[at] || rom[at] >= banks) return false;
		for (let k = 1; k < stride; k += 2) {
			const address = rom.readUInt16LE(at + k);
			if (address < 0x4000 || address >= 0x8000) return false;
		}
		return true;
	};
	const pointerTable = (stride: number, least: number, accept: (at: number) => boolean) => {
		for (let at = 0x4000; at + stride * least <= rom.length; at++) {
			if (!entryOk(at, stride) || !entryOk(at + stride * (least - 1), stride)) continue;
			let count = 0;
			while (entryOk(at + count * stride, stride)) count++;
			if (count < least) continue;
			let good = true;
			for (let i = 0; i < 8 && good; i++) good = accept(at + i * stride);
			if (good) return { at, count };
		}
		return null;
	};
	const sized = (at: number, slot: number, size: number) => {
		const data = unpack(rom[at], rom.readUInt16LE(at + slot));
		return !!data && data.length === size;
	};
	const pics = pointerTable(7, 200, at => {
		const front = unpack(rom[at], rom.readUInt16LE(at + 1));
		const back = unpack(rom[at], rom.readUInt16LE(at + 3));
		return !!front && !!back && front.length >= 400 && front.length % 16 === 0 && back.length >= 576;
	});
	if (!pics) return null;

	const checked = Math.min(pics.count, 254);
	const tiles: number[] = [];
	for (let i = 0; i < checked; i++) {
		const front = unpack(rom[pics.at + i * 7], rom.readUInt16LE(pics.at + i * 7 + 1));
		tiles.push(front ? front.length >> 4 : 0);
	}
	const sizeAt = (table: number, index: number) => {
		const pair = rom[table + (index >> 1)];
		return index & 1 ? pair & 15 : pair >> 4;
	};
	let sizes = -1;
	const span = Math.ceil(checked / 2);
	for (let at = 0x4000, run = 0; at < rom.length && sizes < 0; at++) {
		const high = rom[at] >> 4;
		const low = rom[at] & 15;
		run = high >= 5 && high <= 7 && low >= 5 && low <= 7 ? run + 1 : 0;
		if (run < span) continue;
		const start = at - span + 1;
		const seen = new Set<number>();
		let fits = true;
		for (let i = 0; i < checked && fits; i++) {
			const size = sizeAt(start, i);
			seen.add(size);
			if (tiles[i] < size * size) fits = false;
		}
		if (fits && seen.size === 3) sizes = start;
	}
	if (sizes < 0) return null;

	const tinted = (at: number, test: (r: number, g: number, b: number) => boolean) => {
		for (let i = 0; i < 2; i++) {
			const color = rom.readUInt16LE(at + i * 2);
			if (test(color & 31, (color >> 5) & 31, (color >> 10) & 31)) return true;
		}
		return false;
	};
	let palettes = -1;
	for (let at = 0x4000; at + 8 * 256 <= rom.length && palettes < 0; at++) {
		if (!rom[at] || rom.readUInt32LE(at) !== rom.readUInt32LE(at + 4)) continue;
		if (!tinted(at + 6 * 8, (r, g, b) => r >= 24 && g >= 8 && g <= 22 && b <= 12)) continue;
		if (!tinted(at + 7 * 8, (r, g, b) => b >= 18 && r <= 18 && b > r)) continue;
		if (!tinted(at + 25 * 8, (r, g, b) => r >= 24 && g >= 20 && b <= 14)) continue;
		let valid = true;
		for (let i = 0; i < 255 * 4 && valid; i++) valid = rom.readUInt16LE(at + i * 2) < 0x8000;
		if (valid) palettes = at;
	}
	if (palettes < 0) return null;

	const minis = pointerTable(7, 200, at => sized(at, 1, 128) && sized(at, 5, 128));
	let overworldColors = -1;
	const colorCode = rom.indexOf(signatureAnchor('overworldColorCode'));
	if (colorCode >= 3 && rom[colorCode - 3] === 0x21) {
		const address = rom.readUInt16LE(colorCode - 2);
		if (address >= 0x4000 && address < 0x8000) overworldColors = (colorCode & ~0x3fff) + address - 0x4000;
	}
	const items = pointerTable(3, 100, at => sized(at, 1, 144));
	let itemPalettes = -1;
	const paletteCode = signatureAnchor('itemPaletteCode');
	const nextCode = (from: number) => (items ? rom.indexOf(paletteCode, from) : -1);
	for (let code = nextCode(3); code >= 3 && itemPalettes < 0; code = nextCode(code + 1)) {
		const address = rom.readUInt16LE(code - 2);
		if (rom[code - 3] !== 0x01 || address < 0x4000 || address >= 0x8000) continue;
		if (rom[code + 9] !== 0x01 || rom.readUInt16LE(code + 10) !== 4) continue;
		itemPalettes = (code & ~0x3fff) + address - 0x4000;
	}

	const write = (kind: string, id: string, data: Buffer) => {
		const dir = path.join(outDir, kind);
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(path.join(dir, `${id}.png`), data);
	};
	for (const id in indices.species) {
		const index = indices.species[id] - 1;
		if (index < 0 || index >= pics.count) continue;
		const entry = pics.at + index * 7;
		const size = sizeAt(sizes, index);
		const colorsAt = palettes + (index + 1) * 8;
		if (size < 5 || size > 7 || colorsAt + 8 > rom.length) continue;
		const front = unpack(rom[entry], rom.readUInt16LE(entry + 1));
		if (!front || front.length < size * size * 16) continue;
		const back = unpack(rom[entry], rom.readUInt16LE(entry + 3));
		const normal = gbPalette(rom, colorsAt);
		const shiny = gbPalette(rom, colorsAt + 4);
		const frontPixels = keepWhite(columnsToPixels(front, size, 56, true), 56, 56);
		write('front', id, png(frontPixels, 56, 56, normal));
		write('front-shiny', id, png(frontPixels, 56, 56, shiny));
		if (back && back.length >= 576) {
			const backPixels = keepWhite(columnsToPixels(back, 6, 48, false), 48, 48);
			write('back', id, png(backPixels, 48, 48, normal));
			write('back-shiny', id, png(backPixels, 48, 48, shiny));
		}
		result.pokemon++;
		if (!minis || index >= minis.count) continue;
		const miniEntry = minis.at + index * 7;
		const mini = unpack(rom[miniEntry], rom.readUInt16LE(miniEntry + 1));
		if (mini && mini.length >= 64) {
			write('icon', id, png(rowsToPixels(mini, 0, 2, 2), 16, 16, normal));
			result.icons++;
		}
		const walker = overworldColors >= 0 ? unpack(rom[miniEntry], rom.readUInt16LE(miniEntry + 5)) : null;
		const main = POLISHED_OVERWORLD_COLORS[rom[overworldColors + index] >> 4];
		if (walker && walker.length >= 64 && main) {
			const light = main[0] === main[1] && main[1] >= 20 ? [27, 31, 27] : [31, 19, 10];
			const colors = Buffer.from([248, 248, 248, ...light.map(c => c << 3), ...main.map(c => c << 3), 24, 24, 24]);
			write('overworld', id, png(rowsToPixels(walker, 0, 2, 2), 16, 16, colors));
			result.overworld++;
		}
	}
	if (items && itemPalettes >= 0) {
		for (const id in indices.items) {
			const index = indices.items[id];
			if (index < 1 || index >= items.count) continue;
			const entry = items.at + index * 3;
			const icon = unpack(rom[entry], rom.readUInt16LE(entry + 1));
			if (icon?.length !== 144) continue;
			const pixels = rowsToPixels(icon, 0, 3, 3);
			for (const corner of [0, 23, 23 * 24, 24 * 24 - 1]) pixels[corner] = 0;
			keepWhite(pixels, 24, 24);
			write('item', id, png(pixels, 24, 24, gbPalette(rom, itemPalettes + index * 4)));
			result.items++;
		}
	}
	return result;
}

export function extractGBSprites(rom: Buffer, indices: SpriteIndices, outDir: string) {
	const result = { pokemon: 0, icons: 0, items: 0, size: 56, overworld: 0 };
	const stats = findGen2Stats(rom);
	if (stats < 0 && rom.indexOf(signatureAnchor('polishedBulbasaurStats')) >= 0) {
		const polished = extractPolishedSprites(rom, indices, outDir);
		if (polished) return polished;
	}
	if (stats < 0) return extractGen1Sprites(rom, indices, outDir);
	const validTable = (table: number) => {
		for (let i = 0; i < 20; i++) {
			const address = rom.readUInt16LE(table + i * 3 + 1);
			if (address < 0x4000 || address >= 0x8000) return false;
		}
		return true;
	};
	let table = -1;
	let palettes = -1;
	let fixBank: (bank: number) => number = bank => bank;
	if (rom.length > 0x120000 + 1600 && validTable(0x120000)) {
		table = 0x120000;
		palettes = 0xa8ce;
		fixBank = bank => bank + 0x36;
	} else if (validTable(0x48000)) {
		table = 0x48000;
		palettes = 0xad3d;
		fixBank = bank => (bank === 0x13 ? 0x1f : bank === 0x14 ? 0x20 : bank === 0x1f ? 0x2e : bank);
	}
	if (table < 0) return result;
	const bulbasaur = rom.indexOf(signatureAnchor('bulbasaurPalette'));
	if (bulbasaur >= 8) palettes = bulbasaur - 8;
	if (indices.species['charizard']) {
		let orange = false;
		for (let i = 0; i < 2; i++) {
			const color = rom.readUInt16LE(palettes + indices.species['charizard'] * 8 + i * 2);
			const r = color & 31;
			const g = (color >> 5) & 31;
			const b = (color >> 10) & 31;
			if (r >= 24 && g >= 8 && g <= 22 && b <= 12) orange = true;
		}
		if (!orange) return result;
	}
	const write = (kind: string, id: string, data: Buffer) => {
		const dir = path.join(outDir, kind);
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(path.join(dir, `${id}.png`), data);
	};
	const load = (entry: number, tiles: number) => {
		const bank = fixBank(rom[entry]);
		const address = rom.readUInt16LE(entry + 1);
		if (address < 0x4000 || address >= 0x8000) return null;
		const data = lz(rom, bank * 0x4000 + (address - 0x4000), 0x2000);
		return data && data.length >= tiles * tiles * 16 ? data : null;
	};
	for (const id in indices.species) {
		const index = indices.species[id];
		if (index < 1 || index > 253 || index === 201) continue;
		const size = rom[stats + (index - 1) * 32 + 17] & 0xf;
		if (size < 5 || size > 7) continue;
		const front = load(table + (index - 1) * 6, size);
		const back = load(table + (index - 1) * 6 + 3, 6);
		if (!front) continue;
		const normal = gbPalette(rom, palettes + index * 8);
		const shiny = gbPalette(rom, palettes + index * 8 + 4);
		const frontPixels = columnsToPixels(front, size, 56, true);
		write('front', id, png(keepWhite(frontPixels, 56, 56), 56, 56, normal));
		write('front-shiny', id, png(keepWhite(frontPixels, 56, 56), 56, 56, shiny));
		if (back) {
			const backPixels = columnsToPixels(back, 6, 48, false);
			write('back', id, png(keepWhite(backPixels, 48, 48), 48, 48, normal));
			write('back-shiny', id, png(keepWhite(backPixels, 48, 48), 48, 48, shiny));
		}
		result.pokemon++;
	}
	result.overworld = writeMenuSprites(rom, indices, outDir);
	return result;
}
