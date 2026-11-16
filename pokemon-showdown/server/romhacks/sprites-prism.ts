import * as fs from 'fs';
import * as path from 'path';
import { png, type SpriteIndices } from './sprites-gen3';
import { signatureAnchor } from './signatures';

function reverseBits(b: number) {
	let out = 0;
	for (let i = 0; i < 8; i++) out |= ((b >> i) & 1) << (7 - i);
	return out;
}

function lz(rom: Buffer, start: number, maxSize: number): Buffer | null {
	const out = Buffer.alloc(maxSize);
	let length = 0;
	let at = start;
	for (;;) {
		if (at >= rom.length) return null;
		const control = rom[at++];
		if (control === 0xff) return out.subarray(0, length);
		let command = control >> 5;
		let count = control & 0x1f;
		if (command === 7) {
			command = (control >> 2) & 7;
			count = ((control & 3) << 8) | rom[at++];
		}
		count++;
		if (length + count > maxSize || at + 2 > rom.length) return null;
		if (command === 0) {
			if (at + count > rom.length) return null;
			rom.copy(out, length, at, at + count);
			at += count;
			length += count;
		} else if (command === 1) {
			out.fill(rom[at++], length, length + count);
			length += count;
		} else if (command === 2) {
			for (let i = 0; i < count; i++) out[length++] = rom[at + (i & 1)];
			at += 2;
		} else if (command === 3) {
			out.fill(0, length, length + count);
			length += count;
		} else if (command <= 6) {
			let offset = rom[at++];
			if (offset & 0x80) {
				offset = length - (offset & 0x7f) - 1;
			} else {
				offset = (offset << 8) | rom[at++];
			}
			if (offset < 0 || offset >= length) return null;
			for (let i = 0; i < count; i++) {
				if (command === 4) {
					out[length++] = out[offset + i];
				} else if (command === 5) {
					out[length++] = reverseBits(out[offset + i]);
				} else {
					if (offset - i < 0) return null;
					out[length++] = out[offset - i];
				}
			}
		} else {
			return null;
		}
	}
}

function columnsToPixels(data: Buffer, tiles: number, canvas: number, bottom: boolean): Buffer {
	const pixels = Buffer.alloc(canvas * canvas);
	const left = Math.floor((canvas - tiles * 8) / 2 / 8) * 8;
	const top = bottom ? canvas - tiles * 8 : left;
	for (let tx = 0; tx < tiles; tx++) {
		for (let ty = 0; ty < tiles; ty++) {
			const tile = (tx * tiles + ty) * 16;
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

function palette(rom: Buffer, at: number): Buffer {
	const out = Buffer.alloc(15, 248);
	for (let i = 0; i < 2; i++) {
		const color = rom.readUInt16LE(at + i * 2);
		out[(i + 1) * 3] = (color & 31) << 3;
		out[(i + 1) * 3 + 1] = ((color >> 5) & 31) << 3;
		out[(i + 1) * 3 + 2] = ((color >> 10) & 31) << 3;
	}
	out.fill(24, 9, 12);
	return out;
}

function findPicTable(rom: Buffer): number {
	for (let table = 0x4000; table + 1536 <= rom.length; table += 0x4000) {
		let count = 0;
		while (count < 512) {
			const bank = rom[table + count * 3];
			const address = rom.readUInt16LE(table + count * 3 + 1);
			if (!bank || bank >= 0x80 || address < 0x4000 || address >= 0x8000) break;
			count++;
		}
		if (count >= 500) return table;
	}
	return -1;
}

export function extractPrismSprites(rom: Buffer, indices: SpriteIndices, outDir: string) {
	const result = { pokemon: 0, icons: 0, items: 0, size: 56, overworld: 0 };
	const stats = rom.indexOf(signatureAnchor('bulbasaurStats'));
	const next = stats < 0 ? -1 : rom.indexOf(signatureAnchor('ivysaurStats'), stats);
	const stride = next - stats;
	const table = findPicTable(rom);
	const bulbasaur = rom.indexOf(signatureAnchor('bulbasaurPalette'));
	if (stats < 0 || stride < 17 || stride > 64 || table < 0 || bulbasaur < 8) return result;
	const palettes = bulbasaur - 8;
	const load = (entry: number, tiles: number) => {
		const address = rom.readUInt16LE(entry + 1);
		if (address < 0x4000 || address >= 0x8000) return null;
		const data = lz(rom, rom[entry] * 0x4000 + (address - 0x4000), 0x2000);
		return data && data.length >= tiles * tiles * 16 ? data : null;
	};
	const write = (kind: string, id: string, data: Buffer) => {
		const dir = path.join(outDir, kind);
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(path.join(dir, `${id}.png`), data);
	};
	for (const id in indices.species) {
		const index = indices.species[id];
		if (index < 1 || index > 256) continue;
		const size = rom[stats + (index - 1) * stride + 16] & 0xf;
		if (size < 5 || size > 7) continue;
		const front = load(table + (index - 1) * 6, size);
		const back = load(table + (index - 1) * 6 + 3, 6);
		if (!front) continue;
		const normal = palette(rom, palettes + index * 8);
		const shiny = palette(rom, palettes + index * 8 + 4);
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
	return result;
}
