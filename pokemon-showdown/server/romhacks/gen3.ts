import { readMechanics, slimMechanics, votePockets, type RawHack, type RawMove, type RawSpecies } from './build';
import { readGen3Mechanics, readGen3TypeChart } from './mechanics-gen3';
import { readGen3Learnsets, type Gen3LearnsetResult } from './learnsets-gen3';
import { requireSignatures, signatureAnchor, signatureSection } from './signatures';
import { Dex, toID } from '../../sim/dex';

const DECODE: { [k: number]: string } = {
	0x00: ' ', 0x1b: 'e', 0xab: '!', 0xac: '?', 0xad: '.', 0xae: '-', 0xb0: '.', 0xb1: '"', 0xb2: '"',
	0xb3: "'", 0xb4: "'", 0xb5: 'M', 0xb6: 'F', 0xb8: ',', 0xba: '/', 0xf0: ':',
};
for (let i = 0; i < 10; i++) DECODE[0xa1 + i] = String(i);
for (let i = 0; i < 26; i++) {
	DECODE[0xbb + i] = String.fromCharCode(65 + i);
	DECODE[0xd5 + i] = String.fromCharCode(97 + i);
}
const ENCODE: { [k: string]: number } = {};
for (const code in DECODE) ENCODE[DECODE[code]] = Number(code);
ENCODE["'"] = 0xb4;
ENCODE['.'] = 0xad;
ENCODE['"'] = 0xb1;

function encode(text: string, terminate = true): Buffer {
	const out = [];
	for (const ch of text) out.push(ENCODE[ch]);
	if (terminate) out.push(0xff);
	return Buffer.from(out);
}

function decode(rom: Buffer, offset: number, maxLen: number): string | null {
	let out = '';
	for (let i = 0; i < maxLen; i++) {
		if (offset + i >= rom.length) return null;
		const b = rom[offset + i];
		if (b === 0xff) return out;
		const ch = DECODE[b];
		if (ch === undefined) return null;
		out += ch;
	}
	return null;
}

function titleCase(text: string) {
	return text.toLowerCase().replace(/(^|[ -])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

function variants(text: string): Buffer[] {
	const forms = new Set([text.toUpperCase(), titleCase(text)]);
	return [...forms].map(form => encode(form));
}

function findAll(rom: Buffer, needle: Buffer, limit = 64): number[] {
	const hits = [];
	let from = 0;
	while (hits.length < limit) {
		const at = rom.indexOf(needle, from);
		if (at < 0) break;
		hits.push(at);
		from = at + 1;
	}
	return hits;
}

function matchesAt(rom: Buffer, offset: number, text: string): boolean {
	for (const needle of variants(text)) {
		if (offset >= 0 && offset + needle.length <= rom.length &&
			rom.compare(needle, 0, needle.length, offset, offset + needle.length) === 0) return true;
	}
	return false;
}

interface Table { start: number; stride: number; count: number; loose?: boolean }

function findNameTable(
	rom: Buffer, first: string, second: string, firstIndex: number, strides: number[], maxLen: number, cap: number
): Table | null {
	let best: Table | null = null;
	for (const needle of variants(first)) {
		for (const hit of findAll(rom, needle)) {
			for (const stride of strides) {
				if (!matchesAt(rom, hit + stride, second)) continue;
				const start = hit - firstIndex * stride;
				if (start < 0) continue;
				let count = firstIndex + 2;
				while (count < cap) {
					const text = decode(rom, start + count * stride, Math.min(maxLen, stride));
					if (text === null || /^[a-z]/.test(text)) break;
					count++;
				}
				if (!best || count > best.count) best = { start, stride, count };
			}
		}
	}
	return best;
}

function findWideStride(
	rom: Buffer, first: string, second: string, maxStride: number, firstIndex = 1, stop: RegExp | null = null
): Table | null {
	let best: Table | null = null;
	for (const needle of variants(first)) {
		for (const hit of findAll(rom, needle)) {
			for (const next of variants(second)) {
				const at = rom.indexOf(next, hit + needle.length);
				if (at < 0 || at - hit > maxStride) continue;
				const stride = at - hit;
				const start = hit - firstIndex * stride;
				if (start < 0) continue;
				const maxLen = Math.min(stride, 24);
				let count = firstIndex + 2;
				while (count < 3000) {
					const text = decode(rom, start + count * stride, maxLen);
					if (text === null || (stop && stop.test(text))) break;
					count++;
				}
				if (!best || count > best.count) best = { start, stride, count };
			}
		}
	}
	return best;
}

function decodeLoose(rom: Buffer, offset: number, maxLen: number): string | null {
	let out = '';
	for (let i = 0; i < maxLen; i++) {
		if (offset + i >= rom.length) return null;
		const b = rom[offset + i];
		if (b === 0xff) return out;
		out += DECODE[b] || '';
	}
	return null;
}

function looseTable(rom: Buffer, start: number, stride: number): Table {
	let count = 1;
	let blank = 0;
	let last = 0;
	while (count < 3000) {
		const text = decodeLoose(rom, start + count * stride, stride);
		if (text === null) break;
		if (text.trim()) {
			blank = 0;
			last = count;
		} else if (++blank > 64) {
			break;
		}
		count++;
	}
	return { start, stride, count: last + 1, loose: true };
}

function findHeaderNameTable(rom: Buffer): Table | null {
	const header = signatureAnchor('gen3UnnamedSpecies');
	let best: Table | null = null;
	for (const hit of findAll(rom, header)) {
		const table = looseTable(rom, hit, 11);
		let named = 0;
		for (let i = 1; i < table.count; i++) {
			if (/^[A-Z][A-Za-z'. -]{2,}$/.test(decode(rom, hit + i * 11, 11) || '')) named++;
		}
		if (named >= 100 && (!best || table.count > best.count)) best = table;
	}
	return best;
}

interface Directory { names: number; moveNames: number; stats: number; abilityNames: number; items: number; moves: number }

function readDirectory(rom: Buffer): Directory | null {
	if (!['BPR', 'BPG'].includes(rom.toString('latin1', 0xac, 0xaf))) return null;
	const directory = {
		names: pointerAt(rom, 0x144), moveNames: pointerAt(rom, 0x148), stats: pointerAt(rom, 0x1bc),
		abilityNames: pointerAt(rom, 0x1c0), items: pointerAt(rom, 0x1c8), moves: pointerAt(rom, 0x1cc),
	};
	return Object.values(directory).some(value => value < 0) ? null : directory;
}

function pointerAt(rom: Buffer, at: number): number {
	if (at < 0 || at + 4 > rom.length) return -1;
	const value = rom.readUInt32LE(at);
	if (value < 0x08000000 || value >= 0x08000000 + rom.length) return -1;
	return value - 0x08000000;
}

function findPointers(rom: Buffer, target: number, limit = 16): number[] {
	const needle = Buffer.alloc(4);
	needle.writeUInt32LE(0x08000000 + target);
	return findAll(rom, needle, limit * 4).filter(at => at % 4 === 0).slice(0, limit);
}

interface PointerTable { first: number; stride: number; before: number; after: number }

function findPointerTable(
	rom: Buffer, first: string, second: string, maxStride: number, minStride: number, signed = false
): PointerTable | null {
	let best: PointerTable | null = null;
	const named = (at: number) => {
		const target = pointerAt(rom, at);
		if (target < 0) return false;
		const text = decode(rom, target, 40);
		return text !== null && text.length > 0;
	};
	for (const needle of variants(first)) {
		for (const hit of findAll(rom, needle)) {
			for (const from of findPointers(rom, hit)) {
				for (const next of variants(second)) {
					for (const nextHit of findAll(rom, next)) {
						for (const to of findPointers(rom, nextHit)) {
							const gap = to - from;
							if (Math.abs(gap) < minStride || Math.abs(gap) > maxStride || (gap < 0 && !signed)) continue;
							const stride = Math.abs(gap);
							let after = 0;
							let empty = 0;
							for (let k = 1; k < 4000 && empty < 800; k++) {
								const at = from + k * stride;
								if (named(at)) {
									after = k;
									empty = 0;
								} else if (at + 4 <= rom.length && rom.readUInt32LE(at) === 0) {
									empty++;
								} else {
									break;
								}
							}
							let before = 0;
							while (before < 4000 && named(from - (before + 1) * stride)) before++;
							const table = { first: from, stride: gap, before, after };
							if (!best || before + after > best.before + best.after) best = table;
						}
					}
				}
			}
		}
	}
	return best;
}

interface StatAnchors { gen3StatAnchors: [number, number[], number[]][] }

function statAnchors(): [number, number[], number[]][] {
	const anchors = signatureSection<StatAnchors>('anchors').gen3StatAnchors.slice();
	const seen = new Set(anchors.map(anchor => anchor[1].join()));
	for (const mod of ['gen9', 'gen5', 'gen3']) {
		const dex = Dex.mod(mod);
		const byNum: Species[] = [];
		for (const species of dex.species.all()) {
			if (species.num > 0 && species.num <= 251 && species.name === species.baseSpecies) byNum[species.num] = species;
		}
		for (let num = 1; num < 250 && anchors.length < 90; num += 3) {
			const a = byNum[num];
			const b = byNum[num + 1];
			if (!a || !b) continue;
			const stats = (species: Species) => {
				const base = species.baseStats;
				return [base.hp, base.atk, base.def, base.spe, base.spa, base.spd];
			};
			if (seen.has(stats(a).join())) continue;
			seen.add(stats(a).join());
			anchors.push([num, stats(a), stats(b)]);
		}
	}
	return anchors;
}

function findStatTable(rom: Buffer, strides: number[]): Table | null {
	let fallback: Table | null = null;
	let tried = 0;
	for (const [index, sig, nextSig] of statAnchors()) {
		if (fallback && ++tried > 12) break;
		const needle = Buffer.from(sig);
		const nextNeedle = Buffer.from(nextSig);
		const seen = new Set<number>();
		for (const hit of findAll(rom, needle, 256)) {
			if (rom[hit + 6] > 40 || rom[hit + 7] > 40) continue;
			for (const stride of strides) {
				const next = hit + stride;
				if (next + 8 > rom.length) continue;
				if (rom.compare(nextNeedle, 0, 6, next, next + 6) !== 0) continue;
				const start = hit - index * stride;
				if (start < 0 || seen.has(start)) continue;
				seen.add(start);
				const table = { start, stride, count: 0 };
				if (findPointers(rom, start, 1).length) return table;
				if (!fallback) fallback = table;
				break;
			}
		}
	}
	return fallback;
}

function plainStatRow(rom: Buffer, at: number): boolean {
	if (rom.subarray(at, at + 6).includes(0)) return false;
	return rom[at + 6] < 40 && rom[at + 7] < 40 && rom[at + 19] <= 5 && rom[at + 20] <= 15 && rom[at + 21] <= 15;
}

const VANILLA_TYPES = [
	'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', '???', 'Fire', 'Water', 'Grass',
	'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark',
];
const TYPE_NAMES: { [k: string]: string } = {
	normal: 'Normal', fight: 'Fighting', fightng: 'Fighting', fighting: 'Fighting', flying: 'Flying', poison: 'Poison',
	ground: 'Ground', rock: 'Rock', bug: 'Bug', ghost: 'Ghost', steel: 'Steel', fire: 'Fire', water: 'Water',
	grass: 'Grass', electr: 'Electric', electric: 'Electric', psychc: 'Psychic', psychic: 'Psychic', ice: 'Ice',
	dragon: 'Dragon', dark: 'Dark', fairy: 'Fairy', stellar: 'Stellar',
};

let typeTableFound = false;

function readTypes(rom: Buffer): string[] {
	const table = findNameTable(rom, 'NORMAL', 'FIGHT', 0, [7], 7, 32) ||
		findNameTable(rom, 'NORMAL', 'FIGHTING', 1, [7, 8, 9, 10, 12, 13, 16], 16, 32);
	const types = VANILLA_TYPES.slice();
	types[23] = 'Fairy';
	typeTableFound = !!table;
	if (!table) return types;
	const out: string[] = [];
	for (let i = 0; i < table.count; i++) {
		const name = decode(rom, table.start + i * table.stride, table.stride) || '';
		out.push(TYPE_NAMES[name.toLowerCase().replace(/[^a-z]/g, '')] || '???');
	}
	return out;
}

function readNames(rom: Buffer, table: Table | null, maxLen: number): string[] {
	if (!table) return [];
	const names = [];
	for (let i = 0; i < table.count; i++) {
		const read = table.loose ? decodeLoose : decode;
		names.push((read(rom, table.start + i * table.stride, Math.min(maxLen, table.stride)) || '').trim());
	}
	return names;
}

export function isGen3(rom: Buffer): boolean {
	if (rom.length < 0x1000000 || rom[0xb2] !== 0x96) return false;
	const code = rom.toString('latin1', 0xac, 0xaf);
	return ['BPR', 'BPG', 'BPE', 'AXV', 'AXP'].includes(code);
}

function pointerNames(rom: Buffer, table: PointerTable): string[] {
	const names = [''];
	for (let i = 0; i <= table.after; i++) {
		names.push((decode(rom, pointerAt(rom, table.first + i * table.stride), 40) || '').trim());
	}
	return names;
}

function voteMoveTable(
	rom: Buffer, names: string[], typeIds: (type: string) => number
): { start: number, stride: number, powerAt: number, typeAt: number } | null {
	const dex = Dex.mod('gen9');
	const votes = new Map<string, number>();
	let used = 0;
	for (let i = 1; i < names.length && i < 355 && used < 60; i += 2) {
		const move = dex.moves.get(names[i]);
		if (!move.exists || move.basePower < 20 || move.accuracy === true || move.gen > 3) continue;
		const type = typeIds(move.type);
		if (type < 0) continue;
		used++;
		const shapes: [number[], number, number, number][] = [
			[[move.basePower, type, move.accuracy, move.pp], 1, 1, 2],
			[[move.basePower & 255, move.basePower >> 8, type, move.accuracy, move.pp], 0, 0, 2],
			[[move.basePower, type, 0, move.accuracy, move.pp], 0, 0, 1],
		];
		for (const [needle, lead, powerAt, typeAt] of shapes) {
			for (const hit of findAll(rom, Buffer.from(needle), 48)) {
				for (let stride = 8; stride <= 64; stride += 2) {
					const start = hit - lead - i * stride;
					if (start < 0) continue;
					const key = `${start},${stride},${powerAt},${typeAt}`;
					votes.set(key, (votes.get(key) || 0) + 1);
				}
			}
		}
	}
	let best = '';
	let bestVotes = 0;
	for (const [key, count] of votes) {
		if (count > bestVotes) {
			best = key;
			bestVotes = count;
		}
	}
	if (bestVotes < 6) return null;
	const [start, stride, powerAt, typeAt] = best.split(',').map(Number);
	return { start, stride, powerAt, typeAt };
}

const officialCache = new Map<string, Buffer[]>();

function officialStats(name: string): Buffer[] {
	const id = toID(name);
	let sigs = officialCache.get(id);
	if (sigs) return sigs;
	sigs = [];
	const seen = new Set<string>();
	for (const mod of ['gen9', 'gen5', 'gen3']) {
		const species = Dex.mod(mod).species.get(id);
		if (!species.exists || species.num <= 0) continue;
		const base = species.baseStats;
		const sig = [base.hp, base.atk, base.def, base.spe, base.spa, base.spd];
		if (seen.has(sig.join())) continue;
		seen.add(sig.join());
		sigs.push(Buffer.from(sig));
	}
	officialCache.set(id, sigs);
	return sigs;
}

function mostCommon(values: number[]): [number, number] {
	const tally = new Map<number, number>();
	let best = 0;
	let bestCount = 0;
	for (const value of values) {
		const count = (tally.get(value) || 0) + 1;
		tally.set(value, count);
		if (count > bestCount) {
			best = value;
			bestCount = count;
		}
	}
	return [best, bestCount];
}

interface SpeciesTable { start: number; stride: number; nameAt: number; count: number }
interface Row { index: number; at: number; name: string }

function findEmbeddedSpecies(rom: Buffer): SpeciesTable | null {
	const found: [number, number, number][] = [];
	for (const species of Dex.mod('gen9').species.all()) {
		if (species.num < 1 || species.num > 493 || species.name !== species.baseSpecies) continue;
		if (species.num % 16 !== 9 && species.num % 16 !== 10) continue;
		if (!/^[A-Za-z]+$/.test(species.name)) continue;
		const sigs = officialStats(species.name);
		for (const needle of variants(species.name)) {
			for (const hit of findAll(rom, needle, 16)) {
				const from = Math.max(0, hit - 0x80);
				const before = rom.subarray(from, hit);
				for (const sig of sigs) {
					const at = before.lastIndexOf(sig);
					if (at < 0) continue;
					found.push([species.num, from + at, hit - from - at]);
					break;
				}
			}
		}
	}
	const [nameAt, agree] = mostCommon(found.map(entry => entry[2]));
	if (agree < 4) return null;
	const hits = found.filter(entry => entry[2] === nameAt);
	const sizes: number[] = [];
	for (const a of hits) {
		for (const b of hits) {
			const gap = b[0] - a[0];
			if (gap < 1 || gap > 16) continue;
			const size = (b[1] - a[1]) / gap;
			if (Number.isInteger(size) && size > nameAt && size <= 0x400) sizes.push(size);
		}
	}
	const [stride, sizeVotes] = mostCommon(sizes);
	if (sizeVotes < 2) return null;
	const [start, startVotes] = mostCommon(hits.map(entry => entry[1] - entry[0] * stride).filter(value => value >= 0));
	if (startVotes < 4) return null;
	let count = 1;
	let empty = 0;
	let last = 0;
	while (count < 4000) {
		const at = start + count * stride;
		if (at + stride > rom.length) break;
		if (rom.subarray(at, at + nameAt + 4).every(byte => byte === 0)) {
			if (++empty > 1500) break;
		} else {
			if (!decode(rom, at + nameAt, 20) || rom[at + 6] > 40 || rom[at + 7] > 40) break;
			empty = 0;
			last = count;
		}
		count++;
	}
	return { start, stride, nameAt, count: last + 1 };
}

function voteStatTable(rom: Buffer, names: string[]): Table | null {
	const dex = Dex.mod('gen9');
	const starts: number[] = [];
	let used = 0;
	for (let i = 1; i < names.length && used < 80; i++) {
		const species = dex.species.get(names[i]);
		if (!species.exists || species.name !== species.baseSpecies) continue;
		used++;
		for (const sig of officialStats(species.name)) {
			for (const hit of findAll(rom, sig, 8)) {
				if (rom[hit + 6] <= 40 && rom[hit + 7] <= 40 && hit >= i * 28) starts.push(hit - i * 28);
			}
		}
	}
	const [start, votes] = mostCommon(starts);
	return votes >= 5 ? { start, stride: 28, count: 0 } : null;
}

function findStatTableByShape(rom: Buffer, wanted: number): Table | null {
	const ratios = new Set([0, 31, 63, 127, 191, 223, 225, 254, 255]);
	let best: Table | null = null;
	for (const [stride, at] of [[28, 16], [36, 18]]) {
		const fits = (entry: number) => entry + stride <= rom.length && rom[entry + 6] < 32 && rom[entry + 7] < 32 &&
			ratios.has(rom[entry + at]) && rom[entry + at + 3] < 6 && rom[entry + at + 4] > 0 && rom[entry + at + 4] < 16 &&
			rom[entry + at + 5] > 0 && rom[entry + at + 5] < 16 && rom[entry] > 0 && rom[entry + 1] > 0;
		for (let entry = 0; entry + stride <= rom.length; entry += 4) {
			if (!ratios.has(rom[entry + at]) || !fits(entry)) continue;
			let count = 1;
			while (fits(entry + count * stride)) count++;
			if (count >= 150 && count >= wanted * 0.2 && (!best || count > best.count) && entry >= stride) {
				best = { start: entry - stride, stride, count };
			}
			if (count >= 8) entry += (count - 1) * stride - ((count - 1) * stride) % 4;
		}
	}
	return best;
}

function voteTypes(rom: Buffer, rows: Row[]): string[] {
	const dex = Dex.mod('gen9');
	const tally: { [type: string]: number }[] = [];
	for (const row of rows) {
		const species = dex.species.get(row.name);
		if (!species.exists || row.at < 0) continue;
		if (!officialStats(species.name).some(sig => rom.compare(sig, 0, 6, row.at, row.at + 6) === 0)) continue;
		[species.types[0], species.types[1] || species.types[0]].forEach((type, slot) => {
			const id = rom[row.at + 6 + slot];
			if (!tally[id]) tally[id] = {};
			tally[id][type] = (tally[id][type] || 0) + 1;
		});
	}
	const out: string[] = [];
	tally.forEach((votes, id) => {
		const best = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0];
		if (votes[best] >= 2) out[id] = best;
	});
	return out;
}

function voteAbilitySlots(
	rom: Buffer, rows: Row[], abilityNames: string[], limit: number
): { at: number, wide: boolean } | null {
	const dex = Dex.mod('gen9');
	const ids = abilityNames.map(toID);
	const wanted: [number, string][] = [];
	for (const row of rows) {
		const species = dex.species.get(row.name);
		if (species.exists && row.at >= 0 && wanted.length < 400) wanted.push([row.at, toID(species.abilities[0])]);
	}
	if (wanted.length < 20) return null;
	let best: { at: number, wide: boolean } | null = null;
	let bestVotes = 0;
	for (const wide of [true, false]) {
		for (let at = 8; at + (wide ? 6 : 2) <= limit; at += wide ? 2 : 1) {
			let votes = 0;
			for (const [rowAt, ability] of wanted) {
				const value = wide ? rom.readUInt16LE(rowAt + at) : rom[rowAt + at];
				if (value && ids[value] === ability) votes++;
			}
			if (votes > bestVotes) {
				best = { at, wide };
				bestVotes = votes;
			}
		}
	}
	return bestVotes >= Math.max(10, wanted.length * 0.3) ? best : null;
}

function bits(rom: Buffer, at: number, bit: number, width: number): number {
	const byte = at + (bit >> 3);
	if (byte < 0 || byte + 4 > rom.length) return 0;
	return (rom.readUInt32LE(byte) >>> (bit & 7)) & ((1 << width) - 1);
}

interface MoveLayout {
	power: number; powerWidth: number; type: number; accuracy: number; pp: number; category: number; priority: number;
}

const CATEGORIES = ['Physical', 'Special', 'Status'] as const;

function voteMoveFields(rom: Buffer, rows: Row[], size: number, typeName: (id: number) => string): MoveLayout {
	const dex = Dex.mod('gen9');
	const known: [number, Move][] = [];
	for (const row of rows) {
		const move = dex.moves.get(row.name);
		if (move.exists && known.length < 600) known.push([row.at, move]);
	}
	const pick = <T>(width: number, wanted: (move: Move) => T | null, convert: (raw: number) => T): [number, number] => {
		const targets: [number, T][] = [];
		for (const [at, move] of known) {
			const value = wanted(move);
			if (value !== null) targets.push([at, value]);
		}
		let best = -1;
		let bestVotes = 0;
		for (let bit = 0; bit + width <= size * 8; bit++) {
			let votes = 0;
			for (const [at, value] of targets) {
				if (convert(bits(rom, at, bit, width)) === value) votes++;
			}
			if (votes > bestVotes) {
				best = bit;
				bestVotes = votes;
			}
		}
		return bestVotes >= Math.max(8, targets.length * 0.5) ? [best, bestVotes] : [-1, 0];
	};
	const pickCategory = () => {
		let best = -1;
		let bestScore = 0;
		for (let bit = 0; bit + 2 <= size * 8; bit++) {
			const right = [0, 0, 0];
			const total = [0, 0, 0];
			for (const [at, move] of known) {
				const wanted = CATEGORIES.indexOf(move.category);
				total[wanted]++;
				if (bits(rom, at, bit, 2) === wanted) right[wanted]++;
			}
			const score = Math.min(...right.map((count, i) => (total[i] ? count / total[i] : 0)));
			if (score > bestScore) {
				best = bit;
				bestScore = score;
			}
		}
		return bestScore >= 0.5 ? best : -1;
	};
	const plain = (raw: number) => raw;
	const strong = (move: Move) => (move.basePower >= 10 ? move.basePower : null);
	const nine = pick(9, strong, plain);
	const eight = pick(8, strong, plain);
	const wide = nine[1] >= eight[1];
	return {
		power: wide ? nine[0] : eight[0],
		powerWidth: wide ? 9 : 8,
		type: pick(5, move => move.type as string, typeName)[0],
		accuracy: pick(7, move => (move.accuracy === true ? null : move.accuracy), plain)[0],
		pp: pick(6, move => move.pp, plain)[0],
		category: pickCategory(),
		priority: pick(4, move => (move.priority ? move.priority : null), raw => (raw > 7 ? raw - 16 : raw))[0],
	};
}

function pointedName(rom: Buffer, table: Table, index: number): string {
	const at = table.start + index * table.stride;
	const id = rom.readUInt16LE(at + 14);
	if (table.stride !== 44 || (rom[at + 3] !== 8 && rom[at + 3] !== 9) || !id || id > index + 64 || rom[at + 26] > 8) {
		return '';
	}
	const target = pointerAt(rom, at);
	const text = target < 0 ? null : decode(rom, target, 40);
	return text && /^[A-Z0-9]/.test(text) ? text.trim() : '';
}

function itemNames(rom: Buffer, table: Table, maxLen: number): string[] {
	return readNames(rom, table, maxLen).map((name, i) => pointedName(rom, table, i) || name);
}

function growItems(rom: Buffer, table: Table, maxLen: number): Table {
	let count = table.count;
	let last = count - 1;
	let blank = 0;
	while (count < 3000) {
		const at = table.start + count * table.stride;
		if (at + table.stride > rom.length) break;
		if (pointedName(rom, table, count)) {
			blank = 0;
			last = count++;
			continue;
		}
		let text: string | null = null;
		let odd = 0;
		let length = 0;
		for (; length < maxLen; length++) {
			const b = rom[at + length];
			if (b === 0xff) {
				text = decodeLoose(rom, at, maxLen);
				break;
			}
			if (DECODE[b] === undefined) odd++;
		}
		if (text === null && rom.subarray(at, at + maxLen).some(byte => byte !== 0)) break;
		if (text !== null && (odd > Math.max(1, length / 2) || /^[a-z]/.test(text))) break;
		if (text?.trim()) {
			blank = 0;
			last = count;
		} else if (++blank > 64) {
			break;
		}
		count++;
	}
	return { start: table.start, stride: table.stride, count: last + 1, loose: true };
}

function findItemTable(rom: Buffer): Table | null {
	let best: Table | null = null;
	for (const needle of variants('MASTER BALL')) {
		for (const hit of findAll(rom, needle)) {
			if (hit < 44 || !matchesAt(rom, hit + 44, 'ULTRA BALL')) continue;
			const table = growItems(rom, { start: hit - 44, stride: 44, count: 3 }, 14);
			if (!best || table.count > best.count) best = table;
		}
	}
	return best && best.count >= 50 ? best : null;
}

function saneMoveTable(rom: Buffer, start: number, count: number): boolean {
	const rows = Math.min(count - 1, 354);
	if (rows < 100 || start + (rows + 1) * 12 > rom.length) return false;
	let sane = 0;
	for (let i = 1; i <= rows; i++) {
		const at = start + i * 12;
		const pp = rom[at + 4];
		if (pp >= 1 && pp <= 64 && pp % 5 === 0 && rom[at + 3] <= 100 && rom[at + 2] < 32) sane++;
	}
	return sane >= rows * 0.9;
}

export function extractGen3(rom: Buffer, base: Buffer | null = null): RawHack {
	requireSignatures();
	const notes: string[] = [];
	const types = readTypes(rom);
	let typeName = (id: number) => types[id] || '???';
	const early = readMechanics([], () => readGen3Mechanics(rom, base, {}));
	const chartRead = early?.typeChart ? early : readMechanics([], () => readGen3TypeChart(rom, base));
	const chartNames = (chartRead?.typeChart && chartRead.typeChartInfo?.typeNames) || [];
	let fillState = 0;
	const named = (id: number) => {
		const name = typeName(id);
		if (name !== '???' || !chartNames.length) return name;
		if (!fillState) {
			let agree = 0;
			let differ = 0;
			for (let other = 0; other < 32; other++) {
				const own = typeName(other);
				if (own === '???' || !chartNames[other]) continue;
				if (own === chartNames[other]) agree++;
				else differ++;
			}
			fillState = agree >= 10 && !differ ? 1 : 2;
		}
		const filled = chartNames[id] || '';
		return fillState === 1 && /^[A-Z][a-z]{2,11}$/.test(filled) ? filled : name;
	};

	let abilityTable = findNameTable(rom, 'STENCH', 'DRIZZLE', 1, [13, 17, 16, 14, 15, 18, 20], 20, 1024);
	if (!abilityTable || abilityTable.count < 60) {
		const wider = findWideStride(rom, 'STENCH', 'DRIZZLE', 0x60, 1, /^[a-z]|[.,!]/);
		if (wider && (!abilityTable || wider.count > abilityTable.count)) abilityTable = wider;
	}
	let abilityNames = readNames(rom, abilityTable, 24);
	if (abilityNames.length < 60) {
		const pointers = findPointerTable(rom, 'STENCH', 'DRIZZLE', 0x100, 4);
		if (pointers && pointers.after >= abilityNames.length) abilityNames = pointerNames(rom, pointers);
	}
	if (!abilityNames.length) notes.push('Ability names were not found; abilities are taken from the official games.');

	let nameTable = findNameTable(rom, 'BULBASAUR', 'IVYSAUR', 1, [11, 13, 12, 14, 16], 16, 3000);
	if (nameTable && nameTable.count < 100) nameTable = null;
	const embedded = nameTable ? null : findEmbeddedSpecies(rom);
	const directory = readDirectory(rom);
	let pointedNames: string[] | null = null;
	if (!nameTable && !embedded) {
		const pointers = findPointerTable(rom, 'BULBASAUR', 'IVYSAUR', 0x40, 4);
		if (pointers && pointers.after >= 100) pointedNames = pointerNames(rom, pointers);
	}
	if (!nameTable && !embedded && !pointedNames) {
		nameTable = (directory && looseTable(rom, directory.names, 11)) || findHeaderNameTable(rom) ||
			findWideStride(rom, 'BULBASAUR', 'IVYSAUR', 0x800);
	}
	if (!nameTable && !embedded && !pointedNames) throw new Error('No Pokemon name table was found in this game.');

	const rows: Row[] = [];
	let statStride = 28;
	let slotLimit = 28;
	if (embedded) {
		statStride = embedded.stride;
		slotLimit = embedded.nameAt;
		for (let i = 1; i < embedded.count; i++) {
			const at = embedded.start + i * embedded.stride;
			const name = (decode(rom, at + embedded.nameAt, 20) || '').trim();
			if (name) rows.push({ index: i, at, name });
		}
	} else {
		const speciesNames = pointedNames || readNames(rom, nameTable, 16);
		const statStrides = [28];
		if (nameTable && nameTable.stride > 28) statStrides.push(nameTable.stride);
		for (let stride = 30; stride <= 0x400; stride += 2) statStrides.push(stride);
		let statTable = null;
		if (nameTable?.loose) {
			statTable = directory ? { start: directory.stats, stride: 28, count: 0 } : voteStatTable(rom, speciesNames);
		}
		if (!statTable) statTable = findStatTable(rom, statStrides) || voteStatTable(rom, speciesNames);
		if (!statTable) statTable = findStatTableByShape(rom, speciesNames.length);
		if (!statTable) notes.push('Base stats were not found; stats and types are taken from the official games.');
		if (statTable) statStride = slotLimit = statTable.stride;
		for (let i = 1; i < speciesNames.length; i++) {
			let at = statTable ? statTable.start + i * statTable.stride : -1;
			if (at + statStride > rom.length || (statTable && statTable.count && i > statTable.count)) at = -1;
			rows.push({ index: i, at, name: speciesNames[i] });
		}
		if (statStride === 28) {
			const dex = Dex.mod('gen9');
			const filled = rows.filter(row => row.at >= 0 && rom.subarray(row.at, row.at + 6).some(byte => byte !== 0));
			const known = filled.filter(row => /^[A-Z][A-Za-z]/.test(row.name) && dex.species.get(row.name).exists);
			const odd = known.filter(row => !plainStatRow(rom, row.at));
			if (known.length >= 100 && odd.length <= known.length * 0.1) {
				for (const row of filled) {
					if (!plainStatRow(rom, row.at)) row.at = -1;
				}
			}
		}
	}
	const hasStats = rows.some(row => row.at >= 0);

	let hasTypes = statStride === 28 || typeTableFound;
	if (hasStats && (embedded || !hasTypes)) {
		const voted = voteTypes(rom, rows);
		if (voted.filter(Boolean).length >= 10) {
			typeName = (id: number) => voted[id] || '???';
			hasTypes = true;
		} else if (embedded) {
			hasTypes = false;
		}
	}

	let slots: number[] | null = null;
	let innateAt = -1;
	let wideAbilities = false;
	if (hasStats && abilityNames.length) {
		const find = (name: string) => abilityNames.findIndex(entry => entry.toLowerCase() === name);
		const overgrow = find('overgrow');
		const blaze = find('blaze');
		const first = rows.find(row => row.index === 1);
		const fourth = rows.find(row => row.index === 4);
		if (!embedded && first && fourth && overgrow > 0 && blaze > 0) {
			if (statStride === 28 && rom[first.at + 22] === overgrow && rom[fourth.at + 22] === blaze) {
				slots = [22, 23, 26];
			} else {
				for (let o = 8; o + 6 <= statStride; o += 2) {
					if (rom.readUInt16LE(first.at + o) === overgrow && rom.readUInt16LE(fourth.at + o) === blaze) {
						slots = [o, o + 2, o + 4];
						wideAbilities = true;
						break;
					}
				}
			}
		}
		if (!slots) {
			const voted = voteAbilitySlots(rom, rows, abilityNames, slotLimit);
			if (voted) {
				wideAbilities = voted.wide;
				slots = voted.wide ? [voted.at, voted.at + 2, voted.at + 4] :
					[voted.at, voted.at + 1, statStride === 28 ? 26 : voted.at + 1];
			}
		}
		if (!slots && !embedded && (statStride === 28 || statStride === 36)) {
			wideAbilities = statStride === 36;
			slots = wideAbilities ? [24, 26, 28] : [22, 23, 26];
		}
		if (slots && wideAbilities) {
			for (const at of [slots[0] - 10, slots[0] + 8]) {
				if (at < 8 || at + 6 > slotLimit) continue;
				let filled = 0;
				let valid = 0;
				let total = 0;
				for (const row of rows) {
					if (row.at < 0 || !rom[row.at] || total >= 400) continue;
					total++;
					const ids = [0, 2, 4].map(o => rom.readUInt16LE(row.at + at + o));
					if (ids.every(id => id < abilityNames.length)) valid++;
					if (ids[0] && ids[0] < abilityNames.length) filled++;
				}
				if (total >= 50 && valid >= total * 0.95 && filled >= total * 0.6) innateAt = at;
			}
			if (innateAt >= 0) notes.push('Innate abilities of this hack are always active alongside the chosen ability.');
		}
		if (!slots) notes.push('Ability slots were not found; abilities are taken from the official games.');
	}

	const species: RawSpecies[] = [];
	for (const row of rows) {
		const entry: RawSpecies = { index: row.index, name: row.name };
		const at = row.at;
		if (at >= 0) {
			entry.baseStats = {
				hp: rom[at], atk: rom[at + 1], def: rom[at + 2], spe: rom[at + 3], spa: rom[at + 4], spd: rom[at + 5],
			};
			if (hasTypes) entry.types = [named(rom[at + 6]), named(rom[at + 7])];
			if (slots) {
				const ids = slots.map(o => (wideAbilities ? rom.readUInt16LE(at + o) : rom[at + o]));
				entry.abilities = ids.map(id => abilityNames[id] || '');
				if (innateAt >= 0) {
					entry.innates = [0, 2, 4].map(o => abilityNames[rom.readUInt16LE(at + innateAt + o)] || '');
				}
			}
		}
		species.push(entry);
	}

	let moveNameTable = findNameTable(rom, 'POUND', 'KARATE CHOP', 1, [13, 17, 16, 14, 15, 18, 20], 20, 2048);
	const movePointers = moveNameTable ? null : findPointerTable(rom, 'POUND', 'KARATE CHOP', 0x100, 16);
	const pointed = !!movePointers && movePointers.after >= 100;
	if (!moveNameTable && !pointed) {
		moveNameTable = findWideStride(rom, 'POUND', 'KARATE CHOP', 0x80) ||
			(directory && looseTable(rom, directory.moveNames, 13));
	}
	const moves: RawMove[] = [];
	let hasSplit = false;
	if (pointed) {
		const moveRows: Row[] = [];
		for (let i = 0; i <= movePointers.after; i++) {
			const at = movePointers.first + i * movePointers.stride;
			moveRows.push({ index: i + 1, at, name: (decode(rom, pointerAt(rom, at), 40) || '').trim() });
		}
		const layout = voteMoveFields(rom, moveRows, movePointers.stride, typeName);
		hasSplit = layout.category >= 0;
		if (layout.pp < 0 || layout.power < 0) {
			notes.push('Move data was not found; power, accuracy, PP and type are taken from the official games.');
		}
		for (const row of moveRows) {
			const entry: RawMove = { index: row.index, name: row.name };
			if (layout.pp >= 0 && layout.power >= 0) {
				entry.basePower = bits(rom, row.at, layout.power, layout.powerWidth);
				entry.pp = bits(rom, row.at, layout.pp, 6);
				if (layout.type >= 0) entry.type = named(bits(rom, row.at, layout.type, 5));
				if (layout.accuracy >= 0) entry.accuracy = bits(rom, row.at, layout.accuracy, 7);
				if (layout.priority >= 0) {
					const raw = bits(rom, row.at, layout.priority, 4);
					entry.priority = raw > 7 ? raw - 16 : raw;
				}
				if (hasSplit) entry.category = CATEGORIES[bits(rom, row.at, layout.category, 2)];
			}
			moves.push(entry);
		}
	} else {
		const moveNames = readNames(rom, moveNameTable, 20);
		if (!moveNameTable) notes.push('Move names were not found; moves are taken from the official games.');
		let moveData = -1;
		let moveStride = 12;
		let powerAt = 1;
		let typeAt = 2;
		search: for (const wide of [false, true]) {
			const pound = Buffer.from(wide ? [40, 0] : [0x00, 40]);
			const power = wide ? 0 : 1;
			for (const hit of findAll(rom, pound, 100000)) {
				if (rom[hit + 3] !== 100 || rom[hit + 4] !== 35 || rom[hit + 2] > 40) continue;
				for (const stride of [12, 8, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 14, 18, 22, 26, 30]) {
					if (rom[hit + stride + power] !== 50 || rom[hit + stride + 3] !== 100 || rom[hit + stride + 4] !== 25) continue;
					if (rom[hit + 2 * stride + power] !== 15 || rom[hit + 2 * stride + 3] !== 85 || rom[hit + 2 * stride + 4] !== 10) continue;
					if (stride !== 12 && rom[hit + 4 * stride + power] !== 80) continue;
					moveData = hit - stride;
					moveStride = stride;
					powerAt = power;
					break search;
				}
			}
		}
		const live = early ? early.moveTableOffset : -1;
		const stock = moveData < 0 || moveStride === 12;
		if (live > 0x100 && live !== moveData && stock && saneMoveTable(rom, live, moveNames.length)) {
			moveData = live;
			moveStride = 12;
			powerAt = 1;
			typeAt = 2;
		}
		if (moveData < 0 && directory && moveNameTable?.loose) moveData = directory.moves;
		if (moveData < 0 && moveNames.length) {
			const voted = voteMoveTable(rom, moveNames, type => {
				for (let id = 0; id < 32; id++) {
					if (typeName(id) === type) return id;
				}
				return -1;
			});
			if (voted) {
				moveData = voted.start;
				moveStride = voted.stride;
				powerAt = voted.powerAt;
				typeAt = voted.typeAt;
			}
		}
		if (moveData < 0 && moveNames.length) {
			notes.push('Move data was not found; power, accuracy, PP and type are taken from the official games.');
		}
		let splitAt = -1;
		let priorityAt = -1;
		if (moveData >= 0) {
			const field = (index: number, offset: number) => rom[moveData + index * moveStride + offset];
			for (let offset = 5; offset < moveStride + 1; offset++) {
				if (splitAt < 0 && field(1, offset) === 0 && field(45, offset) === 2 && field(53, offset) === 1 &&
					field(14, offset) === 2 && field(33, offset) === 0 && field(52, offset) === 1 && field(94, offset) === 1) {
					splitAt = offset;
				}
				if (priorityAt < 0 && field(1, offset) === 0 && field(98, offset) === 1 && field(68, offset) === 0xfb &&
					field(33, offset) === 0 && field(18, offset) === 0xfa) {
					priorityAt = offset;
				}
			}
		}
		let layout: MoveLayout | null = null;
		if (moveData >= 0 && (splitAt < 0 || priorityAt < 0)) {
			const moveRows = moveNames.map((name, index) => ({ index, at: moveData + index * moveStride, name }));
			layout = voteMoveFields(rom, moveRows.slice(1), moveStride, typeName);
		}
		hasSplit = splitAt >= 0 || (!!layout && layout.category >= 0);
		for (let i = 1; i < moveNames.length; i++) {
			const entry: RawMove = { index: i, name: moveNames[i] };
			if (moveData >= 0) {
				const at = moveData + i * moveStride;
				entry.basePower = rom[at + powerAt];
				entry.type = named(rom[at + typeAt]);
				entry.accuracy = rom[at + 3];
				entry.pp = rom[at + 4];
				if (priorityAt >= 0) {
					entry.priority = rom.readInt8(at + priorityAt);
				} else if (layout && layout.priority >= 0) {
					const raw = bits(rom, at, layout.priority, 4);
					entry.priority = raw > 7 ? raw - 16 : raw;
				}
				if (moveStride === 12) entry.contact = !!(rom[at + 8] & 1);
				if (splitAt >= 0) {
					entry.category = CATEGORIES[rom[at + splitAt]];
				} else if (layout && layout.category >= 0) {
					entry.category = CATEGORIES[bits(rom, at, layout.category, 2)];
				}
			}
			moves.push(entry);
		}
	}

	let items: string[] = [];
	const itemTable = findItemTable(rom);
	let itemBase = -1;
	let itemStride = 44;
	if (itemTable) {
		items = itemNames(rom, itemTable, 14).slice(1);
		itemBase = itemTable.start + 44;
	} else {
		const inline = [
			findWideStride(rom, 'MASTER BALL', 'ULTRA BALL', 0x80), findWideStride(rom, 'GREAT BALL', 'ULTRA BALL', 0x80, 2),
		].find(table => table && table.count >= 50);
		const listed = !inline && directory ? looseTable(rom, directory.items, 44) : null;
		if (listed && listed.count >= 50) {
			items = readNames(rom, listed, 14).slice(1);
			itemBase = listed.start + 44;
		}
		const itemPointers = inline || items.length ? null : findPointerTable(rom, 'MASTER BALL', 'ULTRA BALL', 0x80, 16, true);
		if (inline) {
			items = itemNames(rom, growItems(rom, inline, 24), 24).slice(1);
			itemStride = inline.stride;
			itemBase = inline.start + itemStride;
		} else if (itemPointers && itemPointers.before + itemPointers.after >= 50) {
			const size = Math.abs(itemPointers.stride);
			const lead = itemPointers.stride < 0 ? 3 : 0;
			for (let i = -lead; i <= itemPointers.after; i++) {
				items.push((decode(rom, pointerAt(rom, itemPointers.first + i * size), 40) || '').trim());
			}
			itemStride = size;
			itemBase = itemPointers.first - lead * size;
		}
	}
	const itemPockets = itemBase < 0 ? undefined : votePockets(items, -itemStride, itemStride, (item, at) => {
		const offset = itemBase + item * itemStride + at;
		return offset >= 0 && offset + 2 <= rom.length ? rom.readUInt16LE(offset) : -1;
	});

	const read = readMechanics(notes, () => readGen3Mechanics(rom, base, { itemNames: ['', ...items] }));
	if (read) {
		const byIndex = new Map<number, RawMove>();
		for (const move of moves) byIndex.set(move.index, move);
		for (const row of read.moveChances) {
			const move = byIndex.get(row.index);
			if (move?.pp === undefined || !(row.chance > 0) || !(row.baseChance > 0)) continue;
			move.secondaryChance = row.chance;
			move.effect = row.effect;
		}
	}

	let learned: Gen3LearnsetResult;
	try {
		learned = readGen3Learnsets({
			rom, base, rows: species, moves, embedded,
			baseNames: () => {
				if (!base) return null;
				const speciesTable = findNameTable(base, 'BULBASAUR', 'IVYSAUR', 1, [11], 11, 3000);
				const moveTable = findNameTable(base, 'POUND', 'KARATE CHOP', 1, [13], 13, 2048);
				if (!speciesTable || !moveTable) return null;
				const dex = Dex.mod('gen9');
				return {
					species: readNames(base, speciesTable, 11).map((name, index) => (
						{ index, name, baseStats: dex.species.get(name).exists ? { hp: 1 } : undefined }
					)).slice(1),
					moves: readNames(base, moveTable, 13).map((name, index) => ({ index, name })).slice(1),
				};
			},
		});
	} catch {
		learned = {
			status: 'unreadable', note: 'The movesets of this game could not be read.',
			learnsets: new Map(), evolvesFrom: new Map(),
		};
	}
	if (learned.status === 'read') {
		for (const entry of species) {
			const learnset = learned.learnsets.get(entry.index);
			if (learnset) entry.learnset = learnset;
			const from = learned.evolvesFrom.get(entry.index);
			if (!from?.length) continue;
			entry.evolvesFrom = from[0];
			if (from.length > 1) entry.evolvesFromAll = from;
		}
	}

	const code = rom.toString('latin1', 0xac, 0xb0);
	const baseNames: { [k: string]: string } = {
		BPR: 'FireRed', BPG: 'LeafGreen', BPE: 'Emerald', AXV: 'Ruby', AXP: 'Sapphire',
	};
	const hack: RawHack = {
		mechanics: read ? slimMechanics(read) : undefined,
		typeChart: read?.typeChart,
		baseGame: baseNames[code.slice(0, 3)] || code,
		baseGen: 3,
		speciesTable: embedded || undefined,
		species,
		moves,
		abilities: abilityNames.slice(1),
		items,
		itemPockets,
		typeBasedCategories: !hasSplit,
		notes,
	};
	return Object.assign(
		hack, learned.status === 'read' ? { learnsetStatus: learned.status } :
		{ learnsetStatus: learned.status, learnsetNote: learned.note }
	);
}
