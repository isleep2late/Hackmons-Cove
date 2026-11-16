/*
 * Pokemon Prism reader. Prism is accepted as an import only (owner decision, 2026-11-16). Limitations:
 *   - Its battle engine is rewritten, so no battle mechanics are read from the ROM.
 *   - Battles run on the Generation 6 engine (ENGINE_GEN) with the hack's own type chart.
 *   - The Prism type has no matchups in the ROM's chart, so it is neutral everywhere.
 *   - Moves that exist only in Prism deal plain damage; their extra effects are not simulated.
 *   - Prism ships as a BSP patch, and BSP has no result checksum, so the patched ROM cannot be verified against
 *     a known hash. The owner accepted this risk on 2026-11-16. The BSP engine in patch.ts is a sandboxed
 *     interpreter bounded by step, time and memory limits (BSP_LIMITS).
 */
import type { RawHack, RawMove, RawSpecies, RawTypeMatchup } from './build';
import { Dex, toID } from '../../sim/dex';
import { signatureAnchor } from './signatures';

const END = 0x50;
const ENGINE_GEN = 6;

const CHARS: { [code: number]: string } = {
	0x54: 'Poke', 0x7f: ' ', 0x9a: '(', 0x9b: ')', 0x9c: ':', 0xba: 'e', 0xd0: "'d", 0xd1: "'l", 0xd2: "'m", 0xd3: "'r",
	0xd4: "'s", 0xd5: "'t", 0xd6: "'v", 0xe0: "'", 0xe3: '-', 0xe6: '?', 0xe7: '!', 0xe8: '.', 0xe9: '&', 0xea: 'e',
	0xef: 'M', 0xf3: '/', 0xf4: ',', 0xf5: 'F',
};
for (let i = 0; i < 26; i++) {
	CHARS[0x80 + i] = String.fromCharCode(65 + i);
	CHARS[0xa0 + i] = String.fromCharCode(97 + i);
}
for (let i = 0; i < 10; i++) CHARS[0xf6 + i] = String(i);
const CODES: { [ch: string]: number } = {};
for (const code in CHARS) {
	if (CHARS[code].length === 1 && !(CHARS[code] in CODES)) CODES[CHARS[code]] = Number(code);
}
CODES['e'] = 0xa4;
CODES["'"] = 0xe0;

function encode(text: string): Buffer {
	return Buffer.from([...text].map(ch => (ch === '@' ? END : CODES[ch])));
}

function counted(text: string): Buffer {
	return Buffer.concat([Buffer.from([text.length + 1]), encode(text)]);
}

function isChar(b: number) {
	return b === 0x54 || b >= 0x7f;
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

function countedList(rom: Buffer, inside: number): string[] {
	let start = inside;
	for (;;) {
		let at = start - 1;
		let length = 1;
		while (at > 0 && isChar(rom[at]) && length < 26) {
			at--;
			length++;
		}
		if (length < 2 || rom[at] !== length) break;
		start = at;
	}
	const entries: string[] = [];
	let cursor = start;
	while (entries.length < 1024 && cursor < rom.length) {
		const length = rom[cursor];
		if (length < 2 || length > 25 || cursor + length > rom.length) break;
		let text = '';
		let valid = true;
		for (let i = 1; i < length; i++) {
			const b = rom[cursor + i];
			if (!isChar(b)) {
				valid = false;
				break;
			}
			text += CHARS[b] || '';
		}
		if (!valid) break;
		entries.push(text.trim());
		cursor += length;
	}
	return entries;
}

function listWith(rom: Buffer, needle: Buffer, least: number): string[] {
	let best: string[] = [];
	for (const hit of findAll(rom, needle)) {
		const list = countedList(rom, hit);
		if (list.length >= least && list.length > best.length) best = list;
	}
	return best;
}

function speciesNamesAt(rom: Buffer): number {
	return rom.indexOf(Buffer.concat([encode('Bulbasaur@Ivysaur@@@'), encode('Venusaur@@')]));
}

function moveNamesAt(rom: Buffer): number {
	return rom.indexOf(Buffer.concat([counted('Pound'), counted('Karate Chop')]));
}

export function isPrism(rom: Buffer): boolean {
	if (rom.length < 0x100000 || rom.readUInt32BE(0x104) !== 0xceed6666) return false;
	if (speciesNamesAt(rom) < 0 || moveNamesAt(rom) < 0) return false;
	const stats = rom.indexOf(signatureAnchor('bulbasaurStats'));
	const next = stats < 0 ? -1 : rom.indexOf(signatureAnchor('ivysaurStats'), stats);
	return next - stats >= 16 && next - stats <= 64 && next - stats !== 32;
}

function cleanTypeName(name: string) {
	if (!/[A-Za-z]/.test(name)) return '???';
	return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function readTypeNames(rom: Buffer): string[] {
	const strings = rom.indexOf(encode('Normal@Fighting@Flying@'));
	if (strings < 0) return [];
	const bank = strings >> 14;
	const targets: number[] = [];
	let table = strings;
	while (table - 2 >= 0 && targets.length < 64) {
		const target = (bank << 14) | (rom.readUInt16LE(table - 2) & 0x3fff);
		if (target < strings || target > strings + 0x300) break;
		if (target !== strings && rom[target - 1] !== END) break;
		targets.unshift(target);
		table -= 2;
	}
	return targets.map((target, id) => {
		if (id && target === targets[0]) return '';
		let text = '';
		for (let i = 0; i < 16; i++) {
			const b = rom[target + i];
			if (b === END) break;
			text += CHARS[b] || '';
		}
		return cleanTypeName(text.trim());
	});
}

const CHART_FACTS: [string, string, 'strong' | 'weak' | 'none' | 'plain'][] = [
	['Water', 'Fire', 'strong'], ['Fire', 'Water', 'weak'], ['Normal', 'Normal', 'plain'], ['Normal', 'Ghost', 'none'],
	['Fire', 'Grass', 'strong'], ['Grass', 'Water', 'strong'], ['Electric', 'Water', 'strong'],
	['Ground', 'Electric', 'strong'],
	['Fighting', 'Normal', 'strong'], ['Ice', 'Dragon', 'strong'], ['Psychic', 'Fighting', 'strong'],
	['Rock', 'Flying', 'strong'],
	['Water', 'Grass', 'weak'], ['Grass', 'Fire', 'weak'], ['Normal', 'Rock', 'weak'], ['Electric', 'Grass', 'weak'],
	['Fighting', 'Flying', 'weak'], ['Psychic', 'Psychic', 'weak'], ['Electric', 'Ground', 'none'],
	['Ground', 'Flying', 'none'],
	['Fire', 'Normal', 'plain'], ['Water', 'Normal', 'plain'], ['Normal', 'Fire', 'plain'],
];

function readTypeMatrix(rom: Buffer, typeNames: string[]): RawTypeMatchup[] {
	const count = typeNames.length;
	const facts: [number, number, 'strong' | 'weak' | 'none' | 'plain'][] = [];
	for (const [attack, defend, kind] of CHART_FACTS) {
		const a = typeNames.indexOf(attack);
		const d = typeNames.indexOf(defend);
		if (a < 0 || d < 0) return [];
		facts.push([a, d, kind]);
	}
	const rowBytes = Math.ceil(count / 4);
	const size = rowBytes * count;
	let found = -1;
	const values = { strong: 0, weak: 0, none: 0, plain: 0 };
	for (let base = 0; base + size <= rom.length && found < 0; base++) {
		const value = (a: number, d: number) => (rom[base + a * rowBytes + (d >> 2)] >> ((d & 3) * 2)) & 3;
		const strong = value(facts[0][0], facts[0][1]);
		const weak = value(facts[1][0], facts[1][1]);
		if (strong === weak) continue;
		const plain = value(facts[2][0], facts[2][1]);
		if (plain === strong || plain === weak) continue;
		const none = value(facts[3][0], facts[3][1]);
		if (none === strong || none === weak || none === plain) continue;
		values.strong = strong;
		values.weak = weak;
		values.plain = plain;
		values.none = none;
		let fits = true;
		for (const [a, d, kind] of facts) {
			if (value(a, d) !== values[kind]) {
				fits = false;
				break;
			}
		}
		if (fits) found = base;
	}
	if (found < 0) return [];
	const usable = (name: string) => !!name && name !== '???' && name !== 'Bird';
	const chart: RawTypeMatchup[] = [];
	for (let a = 0; a < count; a++) {
		if (!usable(typeNames[a])) continue;
		for (let d = 0; d < count; d++) {
			if (!usable(typeNames[d])) continue;
			const value = (rom[found + a * rowBytes + (d >> 2)] >> ((d & 3) * 2)) & 3;
			if (value === values.plain) continue;
			const multiplier = value === values.strong ? 2 : value === values.weak ? 0.5 : 0;
			chart.push({ attack: typeNames[a], defend: typeNames[d], multiplier });
		}
	}
	return chart;
}

export function extractPrism(rom: Buffer): RawHack {
	const notes: string[] = [];
	const dex = Dex.mod('gen9');

	const names = speciesNamesAt(rom);
	if (names < 0) throw new Error('No Pokemon name table was found in this game.');
	const speciesNames: string[] = [];
	for (let i = 0; i < 1000; i++) {
		let text = '';
		let valid = true;
		let ended = false;
		for (let k = 0; k < 10; k++) {
			const b = rom[names + i * 10 + k];
			if (b === END) {
				ended = true;
			} else if (ended || !isChar(b)) {
				valid = false;
				break;
			} else {
				text += CHARS[b] || '';
			}
		}
		if (!valid || !text.trim()) break;
		speciesNames.push(text.trim());
	}

	const statsAt = rom.indexOf(signatureAnchor('bulbasaurStats'));
	const nextAt = statsAt < 0 ? -1 : rom.indexOf(signatureAnchor('ivysaurStats'), statsAt);
	const stride = nextAt - statsAt;
	const hasStats = statsAt >= 0 && stride >= 16 && stride <= 64;
	if (!hasStats) notes.push('Base stats were not found; stats and types are taken from the official games.');

	const official: (Species | null)[] = speciesNames.map(name => {
		const species = dex.species.get(name);
		return species.exists ? species : null;
	});
	const typeVotes: { [type: string]: number }[] = [];
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
	const typeNames = readTypeNames(rom);
	if (typeNames.length < 15) {
		typeNames.length = 0;
		typeVotes.forEach((votes, id) => {
			typeNames[id] = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0];
		});
		for (let id = 0; id < typeNames.length; id++) typeNames[id] = typeNames[id] || '';
		notes.push('Type names were not found; types are matched against the official games.');
	}
	const typeName = (id: number) => (typeNames[id] && typeNames[id] !== 'Bird' ? typeNames[id] : '???');

	const moveNames = listWith(rom, Buffer.concat([counted('Pound'), counted('Karate Chop')]), 100);
	const abilityNames = listWith(rom, counted('Drizzle'), 40);
	const itemNames = listWith(rom, Buffer.concat([counted('Master Ball'), counted('Ultra Ball')]), 50)
		.map(name => (/^Item [0-9A-F]{1,2}$/.test(name) ? '' : name));
	if (!moveNames.length) notes.push('Move names were not found; moves are taken from the official games.');

	let slot = -1;
	let bias = 0;
	if (hasStats && abilityNames.length) {
		const ids = abilityNames.map(toID);
		let bestVotes = 0;
		for (let o = 8; o + 2 <= stride; o++) {
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
	if (abilityNames.length && slot < 0) {
		notes.push('Ability slots were not found; abilities are taken from the official games.');
	}

	const species: RawSpecies[] = [];
	speciesNames.forEach((name, i) => {
		const entry: RawSpecies = { index: i + 1, name };
		if (hasStats) {
			const at = statsAt + i * stride;
			entry.baseStats = {
				hp: rom[at], atk: rom[at + 1], def: rom[at + 2], spe: rom[at + 3], spa: rom[at + 4], spd: rom[at + 5],
			};
			entry.types = [typeName(rom[at + 6]), typeName(rom[at + 7])];
			if (!official[i] && entry.types.every(type => type === '???')) return;
			if (slot >= 0) entry.abilities = [0, 1].map(k => abilityNames[rom[at + slot + k] - bias] || '').concat('');
		}
		species.push(entry);
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
	let percent = 0;
	let hasSplit = false;
	if (moveData >= 0) {
		const right = [0, 0, 0];
		const total = [0, 0, 0];
		moveNames.forEach((name, k) => {
			const move = dex.moves.get(name);
			if (!move.exists) return;
			if (move.accuracy !== true && move.accuracy < 100) {
				percent += rom[moveData + k * moveStride + 2] === move.accuracy ? 1 : -1;
			}
			const wanted = ['Physical', 'Special', 'Status'].indexOf(move.category);
			total[wanted]++;
			if (rom[moveData + k * moveStride + 1] >> 6 === wanted) right[wanted]++;
		});
		hasSplit = Math.min(...right.map((count, i) => (total[i] ? count / total[i] : 0))) > 0.5;
	}
	const moves: RawMove[] = moveNames.map((name, k) => {
		const entry: RawMove = { index: k + 1, name };
		if (moveData >= 0) {
			const at = moveData + k * moveStride;
			entry.basePower = rom[at];
			entry.type = typeName(rom[at + 1] & 0x3f);
			entry.accuracy = percent > 0 ? (rom[at + 2] > 100 ? 0 : rom[at + 2]) : Math.round(rom[at + 2] * 100 / 255);
			entry.pp = rom[at + 3];
			if (hasSplit) entry.category = (['Physical', 'Special', 'Status'] as const)[rom[at + 1] >> 6] || 'Status';
		}
		return entry;
	});

	const typeChart = hasStats ? readTypeMatrix(rom, typeNames) : [];
	if (!typeChart.length) notes.push('The type chart was not found; the official chart is used.');
	const ownEngine = typeChart.length >= 20;
	if (ownEngine) {
		notes.push(
			`This is a Crystal total conversion with abilities, a physical/special split and its own types; ` +
			`it is simulated on Generation ${ENGINE_GEN} mechanics with the hack's type chart.`
		);
		notes.push(
			`This hack is supported as an import only: its battle engine is rewritten, so none of its own battle ` +
			`mechanics are read and battles follow Generation ${ENGINE_GEN} rules. The Prism type is neutral against ` +
			`everything, and moves that exist only in this hack deal plain damage with no extra effect.`
		);
	}

	return {
		baseGame: 'Crystal',
		baseGen: 2,
		engineGen: ownEngine ? ENGINE_GEN : undefined,
		species,
		moves,
		abilities: abilityNames,
		items: itemNames,
		typeBasedCategories: !hasSplit,
		typeChart,
		keepBaseEngine: ownEngine,
		notes,
	};
}
