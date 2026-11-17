import {
	itemKind, readMechanics, slimMechanics, votePockets, type RawHack, type RawMove, type RawSpecies, type RawTypeMatchup,
} from './build';
import { Dex, toID } from '../../sim/dex';
import { readGen1Mechanics } from './mechanics-gen1';
import { readGen2Mechanics } from './mechanics-gen2';
import { extractPrism, isPrism } from './prism';
import { requireSignatures, signatureAnchor } from './signatures';

const DECODE: { [k: number]: string } = {
	0x7f: ' ', 0xe0: "'", 0xe3: '-', 0xe6: '?', 0xe7: '!', 0xe8: '.', 0xef: 'M', 0xf5: 'F', 0xba: 'e',
	0x9a: '(', 0x9b: ')', 0x9c: ':', 0xf4: ',', 0xf3: '/',
};
for (let i = 0; i < 26; i++) {
	DECODE[0x80 + i] = String.fromCharCode(65 + i);
	DECODE[0xa0 + i] = String.fromCharCode(97 + i);
}
for (let i = 0; i < 10; i++) DECODE[0xf6 + i] = String(i);
const ENCODE: { [k: string]: number } = {};
for (const code in DECODE) ENCODE[DECODE[code]] = Number(code);
for (let i = 0; i < 26; i++) {
	ENCODE[String.fromCharCode(65 + i)] = 0x80 + i;
	ENCODE[String.fromCharCode(97 + i)] = 0xa0 + i;
}
DECODE[0x54] = 'Poke';

function encode(text: string): Buffer {
	return Buffer.from([...text].map(ch => (ch === '@' ? 0x50 : ENCODE[ch])));
}

function decodeFixed(rom: Buffer, offset: number, len: number): string | null {
	let out = '';
	for (let i = 0; i < len; i++) {
		const b = rom[offset + i];
		if (b === 0x50) return out;
		const ch = DECODE[b];
		if (ch === undefined) return null;
		out += ch;
	}
	return out;
}

function readList(rom: Buffer, start: number, max: number, maxLen = 24): string[] {
	const out: string[] = [];
	let at = start;
	while (out.length < max) {
		let text = '';
		let ok = false;
		let unknown = 0;
		for (let i = 0; i <= maxLen && at + i < rom.length; i++) {
			const b = rom[at + i];
			if (b === 0x50) {
				at += i + 1;
				ok = unknown < 3 && (unknown === 0 || text.length > 4);
				break;
			}
			const ch = DECODE[b];
			if (ch === undefined) unknown++;
			text += ch === undefined ? '?' : ch;
		}
		if (!ok) break;
		out.push(text.trim());
	}
	return out;
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

function findText(rom: Buffer, upper: string): number {
	const title = upper.toLowerCase().replace(/(^|[ @-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
	for (const form of [upper, title]) {
		const at = rom.indexOf(encode(form));
		if (at >= 0) return at;
	}
	return -1;
}

const TYPE_FIXES: { [k: string]: string } = {
	fight: 'Fighting', electr: 'Electric', psychc: 'Psychic', curset: '???', '': '???',
};

function cleanTypeName(name: string) {
	const id = name.toLowerCase().replace(/[^a-z]/g, '');
	if (id in TYPE_FIXES) return TYPE_FIXES[id];
	return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function scanTypeNames(rom: Buffer): string[] {
	const anchor = findText(rom, 'FIRE@WATER@GRASS@ELECTRIC@');
	if (anchor < 0) return [];
	const bank = anchor >> 14;
	const bankStart = bank << 14;
	const nameAt = (pointer: number, entry: number) => {
		if (bank && (pointer < 0x4000 || pointer >= 0x8000)) return null;
		const target = bank ? bankStart + pointer - 0x4000 : pointer;
		if (target < 1 || target >= rom.length || (rom[target - 1] !== 0x50 && target !== entry + 2)) return null;
		const text = decodeFixed(rom, target, 10);
		if (text === null || text.length < 2 || text.length > 9 || rom[target + text.length] !== 0x50) return null;
		return /^[A-Za-z?-]+$/.test(text) ? text : null;
	};
	let best: string[] = [];
	for (let at = bankStart; at + 2 <= bankStart + 0x4000; at++) {
		const names: string[] = [];
		while (names.length < 64) {
			const name = nameAt(rom.readUInt16LE(at + names.length * 2), at + names.length * 2);
			if (name === null) break;
			names.push(name);
		}
		if (names.length > best.length) best = names;
		if (names.length > 4) at += names.length * 2 - 1;
	}
	return best.length >= 15 ? best.map(cleanTypeName) : [];
}

function scanTypeChart(rom: Buffer, typeCount: number, typeName: (id: number) => string): RawTypeMatchup[] {
	let bestStart = -1;
	let bestLength = 0;
	for (let at = 0; at + 3 < rom.length; at++) {
		const multiplier = rom[at + 2];
		if (multiplier > 40 || multiplier % 5) continue;
		let length = 0;
		let cursor = at;
		while (cursor + 2 < rom.length && length < 400) {
			if (rom[cursor] === 0xfe) {
				cursor++;
				continue;
			}
			const m = rom[cursor + 2];
			if (rom[cursor] >= 0x30 || rom[cursor + 1] >= 0x30 || m > 40 || m % 5) break;
			if (!rom[cursor] && !rom[cursor + 1] && !m) break;
			length++;
			cursor += 3;
		}
		if (length >= 60 && (rom[cursor] === 0xff || length >= 100) && length > bestLength) {
			bestLength = length;
			bestStart = at;
		}
		if (length > 8) at = cursor;
	}
	if (bestStart < 0) return [];
	const chart: RawTypeMatchup[] = [];
	for (let at = bestStart; rom[at] !== 0xff && chart.length < bestLength; at += 3) {
		if (rom[at] === 0xfe) {
			at -= 2;
			continue;
		}
		chart.push({ attack: typeName(rom[at]), defend: typeName(rom[at + 1]), multiplier: rom[at + 2] / 10 });
	}
	return chart;
}

function readTypeNames(rom: Buffer): string[] {
	const strings = findText(rom, 'NORMAL@FIGHTING@FLYING@');
	if (strings < 0) return scanTypeNames(rom);
	const bank = strings >> 14;
	const toOffset = (pointer: number) => (bank ? (bank << 14) | (pointer & 0x3fff) : pointer);
	const names: string[] = [];
	let table = strings;
	while (table - 2 >= 0 && names.length < 64) {
		const target = toOffset(rom.readUInt16LE(table - 2));
		if (target < strings || target > strings + 0x300) break;
		if (target !== strings && rom[target - 1] !== 0x50) break;
		const text = decodeFixed(rom, target, 16);
		if (text === null) break;
		names.unshift(text);
		table -= 2;
	}
	return names.map(name => {
		const id = name.toLowerCase().replace(/[^a-z]/g, '');
		if (id in TYPE_FIXES) return TYPE_FIXES[id];
		return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
	});
}

const GEN1_TYPES: { [k: number]: string } = {
	0: 'Normal', 1: 'Fighting', 2: 'Flying', 3: 'Poison', 4: 'Ground', 5: 'Rock', 6: 'Bird', 7: 'Bug', 8: 'Ghost',
	9: 'Steel', 0x13: '???', 0x14: 'Fire', 0x15: 'Water', 0x16: 'Grass', 0x17: 'Electric', 0x18: 'Psychic', 0x19: 'Ice',
	0x1a: 'Dragon', 0x1b: 'Dark',
};

function readTypeChart(rom: Buffer, signature: Buffer, typeName: (id: number) => string): RawTypeMatchup[] {
	const start = rom.indexOf(signature);
	if (start < 0) return [];
	const chart: RawTypeMatchup[] = [];
	for (let at = start; at + 2 < rom.length && chart.length < 600; at += 3) {
		if (rom[at] === 0xff) break;
		if (rom[at] === 0xfe) {
			at -= 2;
			continue;
		}
		const multiplier = rom[at + 2];
		if (![0, 5, 20].includes(multiplier)) return [];
		chart.push({ attack: typeName(rom[at]), defend: typeName(rom[at + 1]), multiplier: multiplier / 10 });
	}
	return chart;
}

export function findGen1Stats(rom: Buffer): number {
	for (let at = 0; at + 28 * 150 < rom.length; at++) {
		if (rom[at] !== 1 || rom[at + 28] !== 2 || rom[at + 56] !== 3) continue;
		let count = 0;
		while (rom[at + count * 28] === count + 1) count++;
		if (count >= 100) return at;
	}
	return -1;
}

export function findGen2Stats(rom: Buffer): number {
	const anchored = rom.indexOf(signatureAnchor('bulbasaurEntryGen2'));
	if (anchored >= 0 && rom[anchored + 32] === 2 && rom[anchored + 64] === 3) return anchored;
	for (let at = 0; at + 32 * 250 < rom.length; at++) {
		if (rom[at] !== 1 || rom[at + 32] !== 2 || rom[at + 64] !== 3) continue;
		let count = 0;
		while (rom[at + count * 32] === count + 1) count++;
		if (count >= 200) return at;
	}
	return -1;
}

function findGen1Names(rom: Buffer): number {
	const fits = (at: number) => {
		let ended = false;
		for (let i = 0; i < 10; i++) {
			const b = rom[at + i];
			if (b === 0x50) ended = true;
			else if (ended || DECODE[b] === undefined) return false;
		}
		return rom[at] !== 0x50 && rom[at] !== 0x7f;
	};
	for (let at = 0; at + 1900 < rom.length; at++) {
		if (!fits(at) || !fits(at + 10) || !fits(at + 20)) continue;
		let count = 0;
		while (count < 256 && fits(at + count * 10)) count++;
		if (count >= 150) return at;
		at += count * 10;
	}
	return -1;
}

export function findGen1Order(rom: Buffer): number {
	for (let at = 0; at + 190 < rom.length; at++) {
		if (!rom[at] || rom[at] > 190) continue;
		const seen = new Set<number>();
		let i = 0;
		for (; i < 190; i++) {
			const value = rom[at + i];
			if (value > 190) break;
			if (value) seen.add(value);
		}
		if (i === 190 && seen.size >= 140 && seen.has(1) && seen.has(2) && seen.has(150)) return at;
		if (i < 190) at += i;
	}
	return -1;
}

export function findGen1OrderSized(rom: Buffer, names: number): number {
	let count = 0;
	while (count < 255 && decodeFixed(rom, names + count * 10, 10) !== null) count++;
	if (count < 100 || rom.length < count) return -1;
	const tally = new Uint32Array(256);
	const tied: number[] = [];
	let repeats = 0;
	let fewest = 3;
	for (let end = 0; end < rom.length; end++) {
		const added = rom[end];
		if (tally[added]++ && added) repeats++;
		if (end >= count) {
			const dropped = rom[end - count];
			if (--tally[dropped] && dropped) repeats--;
		}
		if (end < count - 1 || repeats > fewest || (repeats === fewest && tied.length >= 16)) continue;
		const distinct = count - tally[0] - repeats;
		if (distinct < 100) continue;
		let stray = false;
		for (let value = 255; value > distinct && !stray; value--) stray = tally[value] > 0;
		if (stray) continue;
		if (repeats < fewest) tied.length = 0;
		fewest = repeats;
		tied.push(end - count + 1);
	}
	if (tied.length < 2) return tied.length ? tied[0] : -1;
	let best = -1;
	let bestClashes = Infinity;
	for (const at of tied) {
		const empty = new Set<string>();
		const filled = new Set<string>();
		for (let i = 0; i < count; i++) (rom[at + i] ? filled : empty).add(decodeFixed(rom, names + i * 10, 10)!);
		let clashes = 0;
		for (const name of empty) if (filled.has(name)) clashes++;
		if (clashes < bestClashes) {
			bestClashes = clashes;
			best = at;
		}
	}
	return best;
}

export function findGen1OrderByNames(rom: Buffer): number {
	const stock = findText(rom, 'RHYDON@@@@KANGASKHAN');
	if (stock >= 0) return findGen1OrderSized(rom, stock);
	const usual = findGen1Order(rom);
	if (usual >= 0) return usual;
	const names = findGen1Names(rom);
	return names < 0 ? -1 : findGen1OrderSized(rom, names);
}

function findMoveRecords(rom: Buffer, stride: number, count: number): number {
	let found = -1;
	for (let at = 0; at + count * stride <= rom.length; at++) {
		if (rom[at] !== 1 || rom[at + stride] !== 2 || rom[at + 2 * stride] !== 3) continue;
		let i = 3;
		while (i < count && rom[at + i * stride] === i + 1) i++;
		if (i < count) continue;
		let sane = 0;
		for (let k = 0; k < count; k++) {
			const pp = rom[at + k * stride + 5];
			if (pp >= 5 && pp <= 40 && pp % 5 === 0 && rom[at + k * stride + 3] < 0x40) sane++;
		}
		if (sane < count * 0.95) continue;
		if (found >= 0) return -1;
		found = at;
	}
	return found;
}

const POLISHED_END = 0x53;
type Token = string | number;

function polishedList(rom: Buffer, inside: number): { start: number, entries: Token[][] } {
	let start = inside;
	for (;;) {
		let at = start - 2;
		let length = 0;
		while (at >= 0 && rom[at] !== POLISHED_END && length < 20) {
			at--;
			length++;
		}
		if (length >= 20 || length === 0) break;
		start = at + 1;
	}
	const entries: Token[][] = [];
	let cursor = start;
	while (entries.length < 1000) {
		let end = cursor;
		while (rom[end] !== POLISHED_END && end - cursor < 24) end++;
		if (end - cursor >= 24 || end === cursor) break;
		const tokens: Token[] = [];
		for (let i = cursor; i < end; i++) tokens.push(DECODE[rom[i]] === undefined || rom[i] === 0x54 ? rom[i] : DECODE[rom[i]]);
		entries.push(tokens);
		cursor = end + 1;
	}
	return { start, entries };
}

function polishedNames(lists: Token[][][], pools: string[][]): string[][] {
	const learned = new Map<number, string>();
	const escape = (text: string) => text.replace(/[^a-z0-9]/g, '');
	for (let pass = 0; pass < 6; pass++) {
		let progress = false;
		lists.forEach((entries, which) => {
			for (const tokens of entries) {
				const unknown = tokens.filter(token => typeof token === 'number' && !learned.has(token));
				if (unknown.length !== 1) continue;
				const pattern = tokens.map(token => {
					if (typeof token === 'string') return escape(token.toLowerCase());
					return learned.has(token) ? learned.get(token) : '([a-z]{1,3})';
				}).join('');
				const regex = new RegExp(`^${pattern}$`);
				const hits = pools[which].map(id => regex.exec(id)).filter(Boolean);
				if (hits.length !== 1) continue;
				learned.set(unknown[0] as number, hits[0]![1]);
				progress = true;
			}
		});
		if (!progress) break;
	}
	return lists.map(entries => entries.map(tokens => {
		let out = '';
		for (const token of tokens) {
			if (typeof token === 'string') {
				out += token;
			} else {
				const text = learned.get(token) || '';
				out += /[A-Za-z]$/.test(out) ? text : text.charAt(0).toUpperCase() + text.slice(1);
			}
		}
		return out.trim();
	}));
}

function scanPockets(rom: Buffer, names: string[]): RawHack['itemPockets'] {
	const kinds = names.map(itemKind);
	const pick = (kind: string, count: number) => {
		const out: number[] = [];
		kinds.forEach((entry, item) => {
			if (entry === kind && out.length < count) out.push(item);
		});
		return out;
	};
	const keys = pick('key', 3);
	const machines = pick('tm', 3);
	const held = pick('held', 12);
	if (keys.length < 3 || machines.length < 3 || held.length < 12) return undefined;
	for (const stride of [7, 6, 8, 5, 9, 10]) {
		const last = rom.length - names.length * stride;
		for (let at = 0; at < last; at++) {
			const key = rom[at + keys[0] * stride];
			const machine = rom[at + machines[0] * stride];
			if (key === machine || rom[at + keys[1] * stride] !== key || rom[at + machines[1] * stride] !== machine) continue;
			if (rom[at + keys[2] * stride] !== key || rom[at + machines[2] * stride] !== machine) continue;
			let leaked = 0;
			for (const item of held) {
				const value = rom[at + item * stride];
				if (value === key || value === machine) leaked++;
			}
			if (leaked > 1) continue;
			const pockets = votePockets(names, 0, 1, item => rom[at + item * stride]);
			if (pockets) return pockets;
		}
	}
	return undefined;
}

function scanKeyPocket(rom: Buffer, names: string[]): RawHack['itemPockets'] {
	const kinds = names.map(itemKind);
	const keys: number[] = [];
	const held: number[] = [];
	kinds.forEach((kind, item) => {
		if (kind === 'key') keys.push(item);
		if (kind === 'held') held.push(item);
	});
	if (keys.length < 5 || held.length < 20) return undefined;
	for (const stride of [7, 6, 8, 5, 9, 10]) {
		const last = rom.length - names.length * stride;
		for (let at = 0; at < last; at++) {
			const key = rom[at + keys[0] * stride];
			if (!key || key > 8 || rom[at + keys[1] * stride] !== key || rom[at + keys[2] * stride] !== key) continue;
			if (rom[at + held[0] * stride] === key || rom[at + held[1] * stride] === key) continue;
			if (keys.filter(item => rom[at + item * stride] === key).length < keys.length * 0.7) continue;
			if (held.filter(item => rom[at + item * stride] === key).length > held.length * 0.05) continue;
			const values = new Set(names.map((name, item) => rom[at + item * stride]));
			if (values.size > 8) continue;
			const carried = new Map<number, number>();
			for (const item of held) carried.set(rom[at + item * stride], (carried.get(rom[at + item * stride]) || 0) + 1);
			return names.map((name, item) => {
				const value = rom[at + item * stride];
				return value !== key && (carried.get(value) || 0) >= 2 ? 'held' : 'key';
			});
		}
	}
	return undefined;
}

function extractPolished(rom: Buffer, names: number, base: Buffer | null): RawHack {
	const notes: string[] = [];
	const dex = Dex.mod('gen9');
	const terminated = (text: string) => Buffer.concat([Buffer.from([POLISHED_END]), encode(text), Buffer.from([POLISHED_END])]);
	const listWith = (text: string, least: number) => {
		let best: { start: number, entries: Token[][] } | null = null;
		for (const hit of findAll(rom, terminated(text))) {
			const list = polishedList(rom, hit + 1);
			if (list.entries.length >= least && (!best || list.entries.length > best.entries.length)) best = list;
		}
		return best;
	};

	const speciesNames: string[] = [];
	let gap = 0;
	for (let i = 0; i < 1000; i++) {
		let text = '';
		let odd = 0;
		for (let k = 0; k < 10; k++) {
			const b = rom[names + i * 10 + k];
			if (b === POLISHED_END) break;
			if (DECODE[b] === undefined) odd++;
			text += DECODE[b] || '';
		}
		if (odd > 2 || text.trim().length < 3) {
			if (i < 200 || ++gap > 2) break;
			speciesNames.push('');
			continue;
		}
		gap = 0;
		if (odd && text.trim() === 'Nidoran') text = speciesNames.includes('Nidoran-F') ? 'Nidoran-M' : 'Nidoran-F';
		speciesNames.push(text.trim());
	}
	while (speciesNames.length && !speciesNames[speciesNames.length - 1]) speciesNames.pop();
	const statsAt = rom.indexOf(signatureAnchor('bulbasaurStats'));
	const nextAt = statsAt < 0 ? -1 : rom.indexOf(signatureAnchor('ivysaurStats'), statsAt);
	const stride = nextAt - statsAt;
	const hasStats = statsAt >= 0 && stride >= 20 && stride <= 64;
	if (!hasStats) notes.push('Base stats were not found; stats and types are taken from the official games.');

	const typeVotes: { [type: string]: number }[] = [];
	const official: (Species | null)[] = speciesNames.map(name => {
		const species = dex.species.get(name);
		return species.exists ? species : null;
	});
	if (hasStats) {
		official.forEach((species, i) => {
			if (!species) return;
			const at = statsAt + i * stride;
			[species.types[0], species.types[1] || species.types[0]].forEach((type, slot) => {
				const id = rom[at + 6 + slot];
				if (!typeVotes[id]) typeVotes[id] = {};
				typeVotes[id][type] = (typeVotes[id][type] || 0) + 1;
			});
		});
	}
	const typeNames: string[] = [];
	typeVotes.forEach((votes, id) => {
		typeNames[id] = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0];
	});
	const typeName = (id: number) => typeNames[id] || '???';

	const abilityList = listWith('Drizzle', 60);
	const moveList = listWith('Cut', 150);
	const itemList = listWith('Master Ball', 100);
	const pools = [
		dex.moves.all().map(move => move.id as string), dex.abilities.all().map(ability => ability.id as string),
		dex.items.all().map(item => item.id as string),
	];
	const [moveNames, abilityNames, itemNames] = polishedNames(
		[moveList?.entries || [], abilityList?.entries || [], itemList?.entries || []], pools
	);
	const lead = toID(moveNames[0]) === 'karatechop' ? 1 : 0;
	const keyItems = itemNames.findIndex(name => toID(name) === 'cancel');

	let slot = -1;
	let bias = 0;
	if (hasStats && abilityNames.length) {
		const ids = abilityNames.map(toID);
		let bestVotes = 0;
		for (let o = 8; o + 3 <= stride; o++) {
			for (const shift of [0, 1]) {
				let votes = 0;
				official.forEach((species, i) => {
					if (species && ids[rom[statsAt + i * stride + o] - shift] === toID(species.abilities[0])) votes++;
				});
				if (votes > bestVotes) {
					bestVotes = votes;
					slot = o;
					bias = shift;
				}
			}
		}
		if (bestVotes < official.length * 0.3) slot = -1;
	}

	const species: RawSpecies[] = speciesNames.map((name, i) => {
		const entry: RawSpecies = { index: i + 1, name };
		if (hasStats) {
			const at = statsAt + i * stride;
			entry.baseStats = {
				hp: rom[at], atk: rom[at + 1], def: rom[at + 2], spe: rom[at + 3], spa: rom[at + 4], spd: rom[at + 5],
			};
			entry.types = [typeName(rom[at + 6]), typeName(rom[at + 7])];
			if (slot >= 0) entry.abilities = [0, 1, 2].map(k => abilityNames[rom[at + slot + k] - bias] || '');
		}
		return entry;
	});

	const votes = new Map<string, number>();
	let used = 0;
	for (let k = 0; k < moveNames.length && used < 60; k++) {
		const move = dex.moves.get(moveNames[k]);
		if (!move.exists || move.basePower < 20 || move.accuracy === true) continue;
		used++;
		const accuracy = Math.floor(move.accuracy * 255 / 100);
		for (let at = 0; at + 4 < rom.length; at++) {
			if (rom[at] !== move.basePower || rom[at + 3] !== move.pp) continue;
			if (Math.abs(rom[at + 2] - accuracy) > 2 && rom[at + 2] !== move.accuracy) continue;
			for (let size = 5; size <= 9; size++) {
				const key = `${at - k * size},${size}`;
				votes.set(key, (votes.get(key) || 0) + 1);
			}
		}
	}
	let moveData = -1;
	let moveStride = 7;
	let bestVotes = 5;
	for (const [key, count] of votes) {
		if (count > bestVotes) {
			bestVotes = count;
			[moveData, moveStride] = key.split(',').map(Number);
		}
	}
	if (moveData < 0 && moveNames.length) {
		notes.push('Move data was not found; power, accuracy, PP and type are taken from the official games.');
	}
	let categoryAt = -2;
	let percent = 0;
	if (moveData >= 0) {
		moveNames.forEach((name, k) => {
			const move = dex.moves.get(name);
			if (move.exists && move.accuracy !== true && move.accuracy < 100) {
				percent += rom[moveData + k * moveStride + 2] === move.accuracy ? 1 : -1;
			}
		});
		const categories = ['Physical', 'Special', 'Status'];
		let bestScore = 0.5;
		for (let o = -2; o < moveStride - 2; o++) {
			const right = [0, 0, 0];
			const total = [0, 0, 0];
			moveNames.forEach((name, k) => {
				const move = dex.moves.get(name);
				if (!move.exists) return;
				const wanted = categories.indexOf(move.category);
				const value = o === 1 ? rom[moveData + k * moveStride + 1] >> 6 : rom[moveData + k * moveStride + o];
				total[wanted]++;
				if (value === wanted) right[wanted]++;
			});
			const score = Math.min(...right.map((count, i) => (total[i] ? count / total[i] : 0)));
			if (score > bestScore) {
				bestScore = score;
				categoryAt = o;
			}
		}
		if (bestScore === 0.5) categoryAt = -3;
	}
	const hasSplit = moveData >= 0 && categoryAt > -3;
	if (lead) {
		moveNames.unshift('Pound');
		if (moveData >= 0) moveData -= moveStride;
	}
	const moves: RawMove[] = moveNames.map((name, k) => {
		const entry: RawMove = { index: k + 1, name };
		if (moveData >= 0) {
			const at = moveData + k * moveStride;
			entry.basePower = rom[at];
			entry.type = typeName(rom[at + 1] & 0x3f);
			entry.accuracy = percent > 0 ? (rom[at + 2] > 100 ? 0 : rom[at + 2]) : Math.round(rom[at + 2] * 100 / 255);
			entry.pp = rom[at + 3];
			if (hasSplit) {
				const value = categoryAt === 1 ? rom[at + 1] >> 6 : rom[at + categoryAt];
				entry.category = (['Physical', 'Special', 'Status'] as const)[value] || 'Status';
			}
		}
		return entry;
	});

	const mechanics = readMechanics(notes, () => slimMechanics(readGen2Mechanics(rom, base)));
	return {
		mechanics: mechanics || undefined,
		baseGame: 'Crystal',
		baseGen: 2,
		species,
		moves,
		abilities: abilityNames,
		items: itemNames,
		itemPockets: keyItems < 0 ? scanPockets(rom, itemNames) : itemNames.map((name, i) => (i > keyItems ? 'key' : 'held')),
		typeBasedCategories: !hasSplit,
		notes,
	};
}

export function isGB(rom: Buffer): boolean {
	return rom.length >= 0x80000 && rom.length <= 0x800000 && rom.readUInt32BE(0x104) === 0xceed6666;
}

export function extractGB(rom: Buffer, base: Buffer | null = null): RawHack {
	requireSignatures();
	const polished = rom.indexOf(Buffer.concat([
		encode('Bulbasaur'), Buffer.from([POLISHED_END]), encode('Ivysaur'), Buffer.from([POLISHED_END, POLISHED_END, POLISHED_END]),
	]));
	if (polished >= 0) return extractPolished(rom, polished, base);
	if (isPrism(rom)) {
		const raw = extractPrism(rom);
		if (raw.items.length) raw.itemPockets = scanPockets(rom, raw.items) || scanKeyPocket(rom, raw.items);
		raw.mechanics = readMechanics(raw.notes, () => slimMechanics(readGen2Mechanics(rom, base))) || undefined;
		return raw;
	}
	const notes: string[] = [];
	const typeNames = readTypeNames(rom);
	const typeName = (id: number) => typeNames[id] || GEN1_TYPES[id] || '???';

	const gen2Stats = findGen2Stats(rom);
	const isGen2 = gen2Stats >= 0;
	const title = rom.toString('latin1', 0x134, 0x143).replace(/[^A-Za-z :.!-]/g, ' ').trim();

	const species: RawSpecies[] = [];
	if (isGen2) {
		let names = findText(rom, 'BULBASAUR@IVYSAUR@@@');
		if (names < 0) {
			const second = findText(rom, 'IVYSAUR@@@VENUSAUR@@');
			names = second >= 10 ? second - 10 : findGen1Names(rom);
		}
		if (names < 0) throw new Error('No Pokemon name table was found in this game.');
		for (let i = 0; i < 255; i++) {
			const name = decodeFixed(rom, names + i * 10, 10);
			if (name === null) break;
			const at = gen2Stats + i * 32;
			const entry: RawSpecies = { index: i + 1, name: name.trim() };
			if (rom[at] === i + 1) {
				entry.baseStats = {
					hp: rom[at + 1], atk: rom[at + 2], def: rom[at + 3], spe: rom[at + 4], spa: rom[at + 5], spd: rom[at + 6],
				};
				entry.types = [typeName(rom[at + 7] & 0x3f), typeName(rom[at + 8] & 0x3f)];
			}
			species.push(entry);
		}
	} else {
		let names = findText(rom, 'RHYDON@@@@KANGASKHAN');
		let order = rom.indexOf(signatureAnchor('pokedexOrderGen1'));
		let stats = rom.indexOf(signatureAnchor('bulbasaurEntryGen1'));
		if (names < 0) {
			names = findGen1Names(rom);
			order = findGen1Order(rom);
			if (order < 0 && names >= 0) order = findGen1OrderSized(rom, names);
			stats = findGen1Stats(rom);
			if (stats < 0) names = -1;
		} else if (order < 0) {
			order = findGen1OrderSized(rom, names);
			if (stats < 0) stats = findGen1Stats(rom);
		} else if (stats < 0) {
			stats = findGen1Stats(rom);
		}
		if (names < 0 || order < 0) throw new Error('No Pokemon name table was found in this game.');
		if (stats < 0 || rom[stats + 28] !== 2) notes.push('Base stats were not found; stats and types are taken from the official games.');
		const mew = rom.indexOf(signatureAnchor('mewStats'));
		const seen = new Set<number>();
		for (let i = 0; i < 255; i++) {
			const name = decodeFixed(rom, names + i * 10, 10);
			if (name === null) break;
			const dexNumber = rom[order + i];
			if (!dexNumber || seen.has(dexNumber)) continue;
			seen.add(dexNumber);
			const entry: RawSpecies = { index: dexNumber, name: name.trim() };
			let at = stats >= 0 ? stats + (dexNumber - 1) * 28 : -1;
			if (at >= 0 && rom[at] !== dexNumber && dexNumber === 151) at = mew;
			if (at >= 0 && rom[at] === dexNumber) {
				entry.baseStats = {
					hp: rom[at + 1], atk: rom[at + 2], def: rom[at + 3], spe: rom[at + 4], spa: rom[at + 5], spd: rom[at + 5],
				};
				entry.types = [typeName(rom[at + 6]), typeName(rom[at + 7])];
			}
			species.push(entry);
		}
		species.sort((a, b) => a.index - b.index);
	}

	const moveNamesAt = findText(rom, 'POUND@KARATE CHOP@');
	const moveNames = moveNamesAt >= 0 ? readList(rom, moveNamesAt, 255) : [];
	if (!moveNames.length) notes.push('Move names were not found; moves are taken from the official games.');
	const stride = isGen2 ? 7 : 6;
	let moveData = -1;
	for (const hit of findAll(rom, signatureAnchor('poundMoveGen2'), 4096)) {
		if (rom[hit + 4] === 255 && rom[hit + 5] === 35 && rom[hit + stride] === 2 && rom[hit + stride + 2] === 50 &&
			rom[hit + stride + 5] === 25 && rom[hit + 2 * stride] === 3 && rom[hit + 2 * stride + 2] === 15) {
			moveData = hit;
			break;
		}
	}
	if (moveData < 0 && moveNames.length >= 150) moveData = findMoveRecords(rom, stride, Math.min(moveNames.length, 165));
	if (moveData < 0 && moveNames.length) {
		notes.push('Move data was not found; power, accuracy, PP and type are taken from the official games.');
	}
	let hasSplit = false;
	if (moveData >= 0) {
		for (let i = 0; i < moveNames.length; i++) {
			if (rom[moveData + i * stride + 3] >= 0x40) hasSplit = true;
		}
	}
	const moves: RawMove[] = [];
	moveNames.forEach((name, i) => {
		const entry: RawMove = { index: i + 1, name };
		if (moveData >= 0) {
			const at = moveData + i * stride;
			entry.basePower = rom[at + 2];
			entry.type = typeName(rom[at + 3] & 0x3f);
			entry.accuracy = Math.round(rom[at + 4] * 100 / 255);
			entry.pp = rom[at + 5];
			entry.effect = rom[at + 1];
			if (hasSplit) entry.category = (['Physical', 'Special', 'Status', 'Status'] as const)[rom[at + 3] >> 6];
		}
		moves.push(entry);
	});

	let items: string[] = [];
	if (isGen2) {
		const itemsAt = findText(rom, 'MASTER BALL@ULTRA BALL@');
		if (itemsAt >= 0) items = readList(rom, itemsAt, 255);
	}

	const chartSignature = signatureAnchor(isGen2 ? 'typeChartGen2' : 'typeChartGen1');
	let typeChart = readTypeChart(rom, chartSignature, id => typeName(id & 0x3f));
	if (!typeChart.length && typeNames.length) typeChart = scanTypeChart(rom, typeNames.length, typeName);
	let mechanics: RawHack['mechanics'];
	if (isGen2) {
		const read = readMechanics(notes, () => readGen2Mechanics(rom, base, {
			moves: moveNames.length ? moveNames : undefined, items: items.length ? items : undefined,
			types: typeNames.length ? typeNames : undefined,
		}));
		if (read) {
			mechanics = slimMechanics(read);
			if (read.typeChart && read.typeChart.length >= 20) typeChart = read.typeChart;
			if (moveData >= 0) {
				for (const row of read.extras.moves) {
					const move = moves[row.index - 1];
					if (!move || move.index !== row.index) continue;
					move.effect = row.effect;
					if (row.secondaryChance !== undefined) move.secondaryChance = row.secondaryChance;
					if (row.priority !== undefined) move.priority = row.priority;
				}
			}
		}
	} else {
		const read = readMechanics(notes, () => readGen1Mechanics(rom, base, {
			typeName: typeNames.length ? (id: number) => {
				const name = typeNames[id & 0x3f] || '';
				return name === '???' ? '' : name;
			} : undefined,
			moveId: moveNames.length ? (index: number) => toID(moveNames[index - 1] || '') : undefined,
		}));
		if (read) {
			mechanics = slimMechanics(read);
			if (read.typeChart && read.typeChart.length >= 20) typeChart = read.typeChart;
			const status = (id: string) => read.report.find(entry => entry.id === id)?.status;
			if (moveData >= 0) {
				for (const side of read.extras.sideEffects) {
					if (side.status !== 'changed' || side.secondaryChance === undefined) continue;
					for (const move of moves) {
						if (move.effect === undefined || !side.effectIds.includes(move.effect)) continue;
						move.secondaryChance = side.secondaryChance;
					}
				}
				const priority = read.extras.priority;
				if (priority && status('info.priority') === 'changed') {
					for (const move of moves) {
						move.priority = move.index === priority.firstMoveId ? 1 : move.index === priority.lastMoveId ? -1 : 0;
					}
				}
			}
		}
	}
	if (!typeChart.length) notes.push('The type chart was not found; the official chart is used.');

	return {
		mechanics,
		baseGame: title || (isGen2 ? 'Gold/Silver/Crystal' : 'Red/Blue/Yellow'),
		baseGen: isGen2 ? 2 : 1,
		species,
		moves,
		abilities: [],
		items,
		itemPockets: items.length ? scanPockets(rom, items) : undefined,
		typeBasedCategories: !hasSplit,
		typeChart,
		keepBaseEngine: true,
		notes,
	};
}
