import { toID } from '../../sim/dex';

export interface RawLearnset {
	levelup: { level: number, move: number }[];
	machines: number[];
	tutor: number[];
	egg: number[];
	other?: number[];
}
export interface LearnsetEntry {
	learnset: RawLearnset;
	evolvesFrom?: number;
	evolvesFromAll?: number[];
}
export interface LearnsetRead {
	status: 'read' | 'unreadable';
	note?: string;
	entries: Map<number, LearnsetEntry>;
}

interface Block {
	at: number;
	evolutionsEnd: number;
	moves: { level: number, move: number }[];
	blanks: number;
}
interface Table {
	start: number;
	count: number;
	origin: number;
	aligned: boolean;
}
type BlockReader = (rom: Buffer, at: number, limit: number) => Block | null;

const STOCK_HMS: { [id: string]: number } = {
	cut: 15, fly: 19, surf: 57, strength: 70, flash: 148, whirlpool: 250, waterfall: 127,
};
const GEN1_HMS = ['cut', 'fly', 'surf', 'strength', 'flash'];
const GEN2_HMS = ['cut', 'fly', 'surf', 'strength', 'flash', 'whirlpool', 'waterfall'];
const GEN1_EVOLUTIONS = [0, 3, 4, 3];
const GEN2_EVOLUTIONS = [0, 3, 3, 3, 3, 4];
const MACHINES = 50;

export function unreadable(note: string): LearnsetRead {
	return { status: 'unreadable', note, entries: new Map() };
}

function movesBlock(moveLimit: number, end = 0): BlockReader {
	return (rom, start, limit) => {
		let at = start;
		while (rom[at] !== end) {
			at++;
			if (at - start > 240 || at >= limit) return null;
		}
		const evolutionsEnd = at;
		at++;
		const moves: { level: number, move: number }[] = [];
		let blanks = 0;
		for (;;) {
			if (at >= limit) return null;
			const level = rom[at];
			if (level === end) return { at: start, evolutionsEnd, moves, blanks };
			const move = rom[at + 1];
			if (!level || level > 100 || move > moveLimit || moves.length >= 64 || at + 1 >= limit) return null;
			if (move) moves.push({ level, move });
			else if (++blanks > 1) return null;
			at += 2;
		}
	};
}

function evolutionsOf(
	rom: Buffer, block: Block, sizes: number[], wide = false
): { targets: number[], clean: boolean } {
	const targets: number[] = [];
	let at = block.at;
	while (at < block.evolutionsEnd) {
		let size = sizes[rom[at]];
		if (size < 0) {
			size = 1;
			while (at + size < block.evolutionsEnd && rom[at + size] !== 0xff) size++;
			size += 2;
		}
		if (!size || at + size > block.evolutionsEnd) return { targets, clean: false };
		targets.push(wide ? rom[at + size - 2] | (rom[at + size - 1] << 8) : rom[at + size - 1]);
		at += size;
	}
	return { targets, clean: true };
}

function evolutionSizes(rom: Buffer, blocks: (Block | null)[], known: number[], wide = false): number[] {
	const sizes = known.slice();
	const usual = wide ? 4 : 3;
	for (let kind = known.length; kind < 16; kind++) sizes[kind] = usual;
	const used = blocks.filter((block): block is Block => !!block && block.evolutionsEnd > block.at);
	const cleanCount = () => used.filter(block => evolutionsOf(rom, block, sizes, wide).clean).length;
	for (let pass = 0; pass < 2; pass++) {
		for (let kind = known.length; kind < 16; kind++) {
			let best = sizes[kind];
			let bestCount = cleanCount();
			for (const size of wide ? [4, 5, 6] : [3, 4, 5, -1]) {
				sizes[kind] = size;
				const count = cleanCount();
				if (count > bestCount) {
					best = size;
					bestCount = count;
				}
			}
			sizes[kind] = best;
		}
	}
	return sizes;
}

function eggBlock(moveLimit: number, header = 0): BlockReader {
	return (rom, start, limit) => {
		const moves: { level: number, move: number }[] = [];
		if (header && rom[start] === 0xff) return { at: start, evolutionsEnd: start, moves, blanks: 0 };
		if (header && (!rom[start] || rom[start + 1] > 0x3f)) return null;
		let at = start + header;
		for (;;) {
			if (at >= limit) return null;
			const move = rom[at];
			if (move === 0xff) return { at: start, evolutionsEnd: start, moves, blanks: 0 };
			if (!move || move > moveLimit || moves.length >= 32) return null;
			moves.push({ level: 0, move });
			at++;
		}
	};
}

function targetOf(rom: Buffer, origin: number, at: number): number {
	const pointer = rom[at] | (rom[at + 1] << 8);
	return pointer < 0x4000 || pointer >= 0x8000 ? -1 : origin + pointer - 0x4000;
}

function sizeTable(rom: Buffer, origin: number, start: number, run: number): number {
	let lowest = Infinity;
	let count = 0;
	while (count < run && start + count * 2 < lowest) {
		const target = targetOf(rom, origin, start + count * 2);
		if (target > start && target < lowest) lowest = target;
		count++;
	}
	return count;
}

function findTables(rom: Buffer, least: number, read: BlockReader): Table[] {
	const tables: Table[] = [];
	const banks = rom.length >> 14;
	const known = new Int8Array(0x4000);
	const run = new Uint16Array(0x4002);
	for (let bank = 1; bank < banks; bank++) {
		const origin = bank << 14;
		known.fill(0);
		run.fill(0);
		let longest = 0;
		for (let at = 0x3ffe; at >= 0; at--) {
			const pointer = rom[origin + at] | (rom[origin + at + 1] << 8);
			if (pointer < 0x4000 || pointer >= 0x8000) continue;
			const target = pointer - 0x4000;
			if (!known[target]) known[target] = read(rom, origin + target, origin + 0x4000) ? 1 : -1;
			if (known[target] < 0) continue;
			run[at] = run[at + 2] + 1;
			if (run[at] > longest) longest = run[at];
		}
		if (longest < 40) continue;
		const covered = [0, 0];
		for (let at = 0; at < 0x3fff; at++) {
			if (run[at] < 40 || (at >= 2 && run[at - 2]) || at < covered[at & 1]) continue;
			let length = run[at];
			for (;;) {
				let joined = 0;
				for (let gap = 1; gap <= 2 && !joined; gap++) {
					const next = at + (length + gap) * 2;
					if (next < 0x3fff && run[next] >= 20) joined = gap + run[next];
				}
				if (!joined) break;
				length += joined;
			}
			covered[at & 1] = at + length * 2;
			if (length < least) continue;
			let start = origin + at;
			let count = sizeTable(rom, origin, start, length);
			let aligned = targetOf(rom, origin, start) === start + count * 2;
			for (let shift = 1; shift <= 8 && length - shift >= least && !aligned; shift++) {
				const shifted = origin + at + shift * 2;
				const size = sizeTable(rom, origin, shifted, length - shift);
				if (targetOf(rom, origin, shifted) !== shifted + size * 2) continue;
				start = shifted;
				count = size;
				aligned = true;
			}
			if (count >= least) tables.push({ start, count, origin, aligned });
		}
	}
	return tables;
}

function readTable(rom: Buffer, table: Table, read: BlockReader): (Block | null)[] {
	const blocks: (Block | null)[] = [];
	for (let i = 0; i < table.count; i++) {
		const target = targetOf(rom, table.origin, table.start + i * 2);
		blocks.push(target < 0 ? null : read(rom, target, table.origin + 0x4000));
	}
	return blocks;
}

function sameTables(rom: Buffer, tables: Table[], read: BlockReader): boolean {
	const content = (table: Table) => JSON.stringify(readTable(rom, table, read).map(block => (
		block && [[...rom.subarray(block.at, block.evolutionsEnd)], block.moves]
	)));
	const first = content(tables[0]);
	return tables.every(table => content(table) === first);
}

function machineMoves(
	rom: Buffer, names: string[], hms: string[], moveLimit: number
): { at: number, problem: string } {
	const ids = names.map(toID);
	const tails: number[][] = [];
	const named = hms.map(id => ids.indexOf(id as ReturnType<typeof toID>) + 1);
	if (named.every(Boolean)) tails.push(named);
	const stock = hms.map(id => STOCK_HMS[id]);
	if (!tails.length || tails[0].join() !== stock.join()) tails.push(stock);
	for (const tail of tails) {
		const needle = Buffer.from(tail);
		const found: number[] = [];
		let from = MACHINES;
		for (;;) {
			const hit = rom.indexOf(needle, from);
			if (hit < 0) break;
			from = hit + 1;
			const seen = new Set<number>();
			let valid = true;
			for (let i = hit - MACHINES; i < hit && valid; i++) {
				if (!rom[i] || rom[i] > moveLimit) valid = false;
				seen.add(rom[i]);
			}
			if (!valid || seen.size < MACHINES - 5) continue;
			const size = MACHINES + tail.length;
			if (found.some(at => rom.compare(rom, at, at + size, hit - MACHINES, hit - MACHINES + size) === 0)) continue;
			found.push(hit - MACHINES);
		}
		if (found.length === 1) return { at: found[0], problem: '' };
		if (found.length > 1) return { at: -1, problem: 'more than one TM and HM move list was found' };
	}
	return { at: -1, problem: 'the TM and HM move list was not found' };
}

function flagged(rom: Buffer, at: number, bytes: number): number[] {
	const out: number[] = [];
	for (let i = 0; i < bytes * 8; i++) {
		if (rom[at + (i >> 3)] & (1 << (i & 7))) out.push(i);
	}
	return out;
}

function distinct(values: number[]): number[] {
	return [...new Set(values)];
}

type Parents = Map<number, number[]>;

function addParent(parents: Parents, child: number, parent: number) {
	const known = parents.get(child);
	if (!known) parents.set(child, [parent]);
	else if (!known.includes(parent)) known.push(parent);
}

function setParents(entries: Map<number, LearnsetEntry>, parents: Parents) {
	for (const [child, known] of parents) {
		const entry = entries.get(child);
		const others = known.filter(parent => parent !== child);
		if (!entry || !others.length) continue;
		entry.evolvesFrom = others[0];
		if (others.length > 1) entry.evolvesFromAll = others;
	}
}

function climbs(
	parents: Parents, total: (species: number) => number | undefined
): { links: number, falls: number, selves: number } {
	let links = 0;
	let falls = 0;
	let selves = 0;
	for (const [child, known] of parents) {
		for (const parent of known) {
			if (child === parent) selves++;
			const before = total(parent);
			const after = total(child);
			if (before === undefined || after === undefined) continue;
			links++;
			if (after < before) falls++;
		}
	}
	return { links, falls, selves };
}

function pickTable(
	rom: Buffer, tables: Table[], read: BlockReader, what: string
): { table: Table | null, problem: string } {
	if (!tables.length) return { table: null, problem: `the ${what} table was not found` };
	if (tables.length > 1 && !sameTables(rom, tables, read)) {
		return { table: null, problem: `more than one ${what} table was found` };
	}
	return { table: tables[0], problem: '' };
}

function pickRead(reads: LearnsetRead[]): LearnsetRead {
	const good = reads.filter(read => read.status === 'read');
	if (!good.length) return reads[0] || unreadable('the evolution and level-up move table was not found');
	const content = (read: LearnsetRead) => JSON.stringify([...read.entries]);
	const first = content(good[0]);
	if (good.some(read => content(read) !== first)) {
		return unreadable('more than one evolution and level-up move table was found');
	}
	return good[0];
}

function evolutionProblem(
	table: Table, parents: Parents, total: (species: number) => number | undefined,
	counts: { used: number, learners: number, strays: number, dirty: number }
): string {
	const climb = climbs(parents, total);
	if (counts.learners < Math.min(60, counts.used * 0.5)) return 'too few species have level-up moves';
	if (counts.dirty > Math.max(1, Math.floor(counts.used * 0.02))) return 'the evolution data has an unknown layout';
	if (counts.strays > 2) return 'the evolution data names unknown species';
	if (climb.selves > 2) return 'the evolution data is out of step with the species list';
	if (climb.falls > climb.links * 0.15) return 'the evolution data is out of step with the species list';
	if (climb.links < 10 && !table.aligned) return 'the evolution and level-up move table could not be confirmed';
	return '';
}

export function readGen1Learnsets(rom: Buffer, layout: {
	stats: number, mew: number, order: number, internal: number, moveNames: string[],
}): LearnsetRead {
	const { stats } = layout;
	if (stats < 0 || rom[stats + 28] !== 2) return unreadable('the base stats were not found');
	const moveLimit = layout.moveNames.length || 255;
	const read = movesBlock(moveLimit);
	const machines = machineMoves(rom, layout.moveNames, GEN1_HMS, moveLimit);
	if (machines.at < 0) return unreadable(machines.problem);
	return pickRead(findTables(rom, Math.min(150, layout.internal), read).map(table => (
		readGen1Table(rom, layout, table, machines.at)
	)));
}

function readGen1Table(rom: Buffer, layout: {
	stats: number, mew: number, order: number, internal: number, moveNames: string[],
}, table: Table, machinesAt: number): LearnsetRead {
	const { stats, mew, order } = layout;
	const moveLimit = layout.moveNames.length || 255;
	const blocks = readTable(rom, table, movesBlock(moveLimit));

	const dexOf = (internal: number) => (internal >= 1 && internal <= layout.internal ? rom[order + internal - 1] : 0);
	const record = (dexNumber: number) => {
		let at = stats + (dexNumber - 1) * 28;
		if (rom[at] !== dexNumber && dexNumber === 151) at = mew;
		return at >= 0 && rom[at] === dexNumber ? at : -1;
	};
	const total = (dexNumber: number) => {
		const at = record(dexNumber);
		return at < 0 ? undefined : rom[at + 1] + rom[at + 2] + rom[at + 3] + rom[at + 4] + rom[at + 5] * 2;
	};

	const used = new Map<number, Block>();
	const seen = new Set<number>();
	for (let internal = 1; internal <= layout.internal; internal++) {
		const dexNumber = dexOf(internal);
		if (!dexNumber || seen.has(dexNumber)) continue;
		seen.add(dexNumber);
		const block = blocks[internal - 1];
		if (block && record(dexNumber) >= 0) used.set(dexNumber, block);
	}
	const sizes = evolutionSizes(rom, [...used.values()], GEN1_EVOLUTIONS);
	const entries = new Map<number, LearnsetEntry>();
	const parents: Parents = new Map();
	const counts = { used: used.size, learners: 0, strays: 0, dirty: 0 };
	for (const [dexNumber, block] of used) {
		const at = record(dexNumber);
		const levelup: { level: number, move: number }[] = [];
		for (let i = 0; i < 4; i++) {
			const move = rom[at + 15 + i];
			if (move > moveLimit) counts.strays++;
			if (move && move <= moveLimit && !levelup.some(entry => entry.move === move)) levelup.push({ level: 1, move });
		}
		for (const entry of block.moves) {
			if (!levelup.some(known => known.level === entry.level && known.move === entry.move)) levelup.push(entry);
		}
		if (block.moves.length) counts.learners++;
		counts.strays += block.blanks;
		const taught = flagged(rom, at + 20, 7).filter(i => i < MACHINES + GEN1_HMS.length);
		entries.set(dexNumber, {
			learnset: { levelup, machines: distinct(taught.map(i => rom[machinesAt + i])), tutor: [], egg: [] },
		});
		const evolutions = evolutionsOf(rom, block, sizes);
		if (!evolutions.clean) counts.dirty++;
		for (const target of evolutions.targets) {
			const child = dexOf(target);
			if (!child || record(child) < 0) counts.strays++;
			else addParent(parents, child, dexNumber);
		}
	}
	const problem = evolutionProblem(table, parents, total, counts);
	if (problem) return unreadable(problem);
	setParents(entries, parents);
	return { status: 'read', entries };
}

export function readGen2Learnsets(rom: Buffer, layout: { stats: number, moveNames: string[] }): LearnsetRead {
	const { stats } = layout;
	if (stats < 0) return unreadable('the base stats were not found');
	const moveLimit = layout.moveNames.length || 251;
	const read = movesBlock(moveLimit);
	const readEggs = eggBlock(moveLimit);
	const eggTables = findTables(rom, 240, readEggs).filter(table => {
		const lists = readTable(rom, table, readEggs);
		const filled = lists.filter(list => list?.moves.length).length;
		return filled >= 20 && filled <= lists.length * 0.7;
	});
	const eggs = pickTable(rom, eggTables, readEggs, 'egg move');
	if (!eggs.table) return unreadable(eggs.problem);
	const machines = machineMoves(rom, layout.moveNames, GEN2_HMS, moveLimit);
	if (machines.at < 0) return unreadable(machines.problem);
	const taughtCount = MACHINES + GEN2_HMS.length;
	let listed = taughtCount;
	while (listed < 64 && rom[machines.at + listed]) listed++;
	if (listed >= 64) return unreadable('the TM and HM move list has no end');
	for (let i = taughtCount; i < listed; i++) {
		if (rom[machines.at + i] > moveLimit) return unreadable('the move tutor list holds unknown moves');
	}
	const eggLists = readTable(rom, eggs.table, readEggs);
	return pickRead(findTables(rom, 240, read).map(table => (
		readGen2Table(rom, layout, table, eggLists, machines.at, listed)
	)));
}

function readGen2Table(
	rom: Buffer, layout: { stats: number, moveNames: string[] }, table: Table, eggLists: (Block | null)[],
	machinesAt: number, listed: number
): LearnsetRead {
	const { stats } = layout;
	const moveLimit = layout.moveNames.length || 251;
	const taughtCount = MACHINES + GEN2_HMS.length;
	const blocks = readTable(rom, table, movesBlock(moveLimit));

	const record = (species: number) => {
		const at = stats + (species - 1) * 32;
		return species >= 1 && rom[at] === species ? at : -1;
	};
	const total = (species: number) => {
		const at = record(species);
		return at < 0 ? undefined : rom[at + 1] + rom[at + 2] + rom[at + 3] + rom[at + 4] + rom[at + 5] + rom[at + 6];
	};
	const used = new Map<number, Block>();
	const count = Math.min(table.count, eggLists.length, 255);
	for (let species = 1; species <= count; species++) {
		const block = blocks[species - 1];
		if (block && eggLists[species - 1] && record(species) >= 0) used.set(species, block);
	}
	const sizes = evolutionSizes(rom, [...used.values()], GEN2_EVOLUTIONS);
	const entries = new Map<number, LearnsetEntry>();
	const parents: Parents = new Map();
	const counts = { used: used.size, learners: 0, strays: 0, dirty: 0 };
	for (const [species, block] of used) {
		const at = record(species);
		const levelup: { level: number, move: number }[] = [];
		for (const entry of block.moves) {
			if (!levelup.some(known => known.level === entry.level && known.move === entry.move)) levelup.push(entry);
		}
		if (levelup.length) counts.learners++;
		counts.strays += block.blanks;
		const taught = flagged(rom, at + 24, 8).filter(i => i < listed);
		entries.set(species, {
			learnset: {
				levelup,
				machines: distinct(taught.filter(i => i < taughtCount).map(i => rom[machinesAt + i])),
				tutor: distinct(taught.filter(i => i >= taughtCount).map(i => rom[machinesAt + i])),
				egg: distinct(eggLists[species - 1]!.moves.map(entry => entry.move)),
			},
		});
		const evolutions = evolutionsOf(rom, block, sizes);
		if (!evolutions.clean) counts.dirty++;
		for (const child of evolutions.targets) {
			if (!used.has(child)) counts.strays++;
			else addParent(parents, child, species);
		}
	}
	const problem = evolutionProblem(table, parents, total, counts);
	if (problem) return unreadable(problem);
	let hatchers = 0;
	let grown = 0;
	for (const [species, entry] of entries) {
		if (!entry.learnset.egg.length) continue;
		hatchers++;
		if (parents.has(species)) grown++;
	}
	if (grown > hatchers * 0.15) return unreadable('the egg move table is out of step with the species list');
	setParents(entries, parents);
	return { status: 'read', entries };
}

const FIELD_MOVES = new Set([
	'cut', 'fly', 'surf', 'strength', 'flash', 'whirlpool', 'waterfall', 'rocksmash', 'dive', 'rockclimb', 'defog',
]);

function taughtField(rom: Buffer, stats: number, stride: number, count: number): { at: number, bits: number } {
	let best = { at: 0, bits: 0 };
	for (let i = 0; i < count; i++) {
		const end = stats + (i + 1) * stride;
		const last = rom[end - 1];
		if (!last || (last & (last + 1))) continue;
		let full = 0;
		while (full < stride - 9 && rom[end - 2 - full] === 0xff) full++;
		const bits = full * 8 + Math.log2(last + 1);
		if (bits > best.bits) best = { at: stride - full - 1, bits };
	}
	return best;
}

function taughtList(
	rom: Buffer, names: string[], length: number, moveLimit: number
): { at: number, machines: number, problem: string } {
	const ids = names.map(toID);
	const needle = ['cut', 'fly', 'surf', 'strength'].map(id => ids.indexOf(id as ReturnType<typeof toID>) + 1);
	if (!needle.every(Boolean)) {
		return { at: -1, machines: 0, problem: 'the HM moves were not found among the move names' };
	}
	const found: { at: number, machines: number }[] = [];
	let from = 0;
	for (;;) {
		const hit = rom.indexOf(Buffer.from(needle), from);
		if (hit < 0) break;
		from = hit + 1;
		let end = hit;
		while (rom[end] && rom[end] <= moveLimit && end - hit < length) end++;
		const at = end - length;
		if (rom[end] || at < 0 || hit - at < 20) continue;
		let valid = true;
		for (let i = at; i < hit && valid; i++) valid = !!rom[i] && rom[i] <= moveLimit;
		if (!valid) continue;
		let machines = hit - at;
		while (machines < length && FIELD_MOVES.has(ids[rom[at + machines] - 1])) machines++;
		if (found.some(known => rom.compare(rom, known.at, known.at + length, at, at + length) === 0)) continue;
		found.push({ at, machines });
	}
	if (found.length === 1) return { ...found[0], problem: '' };
	return {
		at: -1, machines: 0,
		problem: found.length ? 'more than one TM and HM move list was found' : 'the TM and HM move list was not found',
	};
}

export function readPolishedLearnsets(rom: Buffer, layout: {
	stats: number, stride: number, names: string[], moveNames: string[],
}): LearnsetRead {
	const { stats, stride, names } = layout;
	if (stats < 0 || stride < 20) return unreadable('the base stats were not found');
	const moveLimit = layout.moveNames.length || 255;
	const field = taughtField(rom, stats, stride, names.length);
	if (field.bits < 40) return unreadable('the TM and HM compatibility flags were not found');
	const list = taughtList(rom, layout.moveNames, field.bits, moveLimit);
	if (list.at < 0) return unreadable(list.problem);
	const readEggs = eggBlock(moveLimit, 2);
	const least = Math.min(240, names.length);
	const eggTables = findTables(rom, least, readEggs).filter(table => (
		readTable(rom, table, readEggs).filter(found => found?.moves.length).length >= 20
	));
	const eggs = pickTable(rom, eggTables, readEggs, 'egg move');
	if (!eggs.table) return unreadable(eggs.problem);
	const eggLists = readTable(rom, eggs.table, readEggs);
	const read = movesBlock(moveLimit, 0xff);
	return pickRead(findTables(rom, least, read).map(table => (
		readPolishedTable(rom, layout, table, eggLists, field, list)
	)));
}

function plainTarget(value: number): number {
	const flags = value >> 8;
	if (flags & 0xc0) return -1;
	return (flags & 0x1f) > 1 ? 0 : (value & 0xff) | ((flags & 0x20) << 3);
}

function readPolishedTable(
	rom: Buffer, layout: { stats: number, stride: number, names: string[], moveNames: string[] }, table: Table,
	eggLists: (Block | null)[], field: { at: number, bits: number }, list: { at: number, machines: number }
): LearnsetRead {
	const { stats, stride, names } = layout;
	const moveLimit = layout.moveNames.length || 255;
	const blocks = readTable(rom, table, movesBlock(moveLimit, 0xff));
	const count = Math.min(names.length, table.count, eggLists.length);
	const record = (species: number) => (
		species >= 1 && species <= count && names[species - 1] ? stats + (species - 1) * stride : -1
	);
	const total = (species: number) => {
		const at = record(species);
		return at < 0 ? undefined : rom[at] + rom[at + 1] + rom[at + 2] + rom[at + 3] + rom[at + 4] + rom[at + 5];
	};
	const used = new Map<number, Block>();
	let missing = 0;
	for (let species = 1; species <= count; species++) {
		if (record(species) < 0) continue;
		const block = blocks[species - 1];
		if (block && eggLists[species - 1]) used.set(species, block);
		else missing++;
	}
	const evolutionMoves = table.start - table.count;
	const sizes = evolutionSizes(rom, [...used.values()], [0], true);
	const entries = new Map<number, LearnsetEntry>();
	const parents: Parents = new Map();
	const counts = { used: used.size, learners: 0, strays: 0, dirty: missing };
	for (const [species, block] of used) {
		const at = record(species);
		const levelup: { level: number, move: number }[] = [];
		for (const entry of block.moves) {
			if (!levelup.some(known => known.level === entry.level && known.move === entry.move)) levelup.push(entry);
		}
		if (levelup.length) counts.learners++;
		counts.strays += block.blanks;
		const taught = flagged(rom, at + field.at, stride - field.at);
		if (taught.some(i => i >= field.bits)) counts.strays++;
		const learnset: RawLearnset = {
			levelup,
			machines: distinct(taught.filter(i => i < list.machines).map(i => rom[list.at + i])),
			tutor: distinct(taught.filter(i => i >= list.machines && i < field.bits).map(i => rom[list.at + i])),
			egg: distinct(eggLists[species - 1]!.moves.map(entry => entry.move)),
		};
		const gained = rom[evolutionMoves + species - 1];
		if (gained) learnset.other = [gained];
		entries.set(species, { learnset });
		const evolutions = evolutionsOf(rom, block, sizes, true);
		if (!evolutions.clean) counts.dirty++;
		for (const value of evolutions.targets) {
			const child = plainTarget(value);
			if (!child) continue;
			if (!used.has(child)) counts.strays++;
			else addParent(parents, child, species);
		}
	}
	const problem = evolutionProblem(table, parents, total, counts);
	if (problem) return unreadable(problem);
	let gainers = 0;
	let unevolved = 0;
	let rooted = 0;
	for (const [species, entry] of entries) {
		const gained = entry.learnset.other?.[0];
		if (gained) {
			gainers++;
			if (gained > moveLimit || !parents.has(species)) unevolved++;
		}
		let root = species;
		for (let step = 0; step < 4; step++) {
			const parent = parents.get(root)?.[0];
			if (!parent || parent === root) break;
			root = parent;
		}
		const eggList = eggLists[species - 1]!;
		if (!eggList.moves.length || plainTarget(rom[eggList.at] | (rom[eggList.at + 1] << 8)) === root) rooted++;
	}
	if (gainers < 10 || unevolved > gainers * 0.1) return unreadable('the evolution move list was not found');
	if (rooted < entries.size * 0.85) return unreadable('the egg move table is out of step with the species list');
	setParents(entries, parents);
	return { status: 'read', entries };
}

export function guarded(read: () => LearnsetRead): LearnsetRead {
	try {
		return read();
	} catch {
		return unreadable('the moveset data has an unknown layout');
	}
}

export function attachLearnsets<T extends { index: number }>(species: T[], read: LearnsetRead): {
	learnsetStatus: 'read' | 'unreadable', learnsetNote?: string,
} {
	if (read.status !== 'read') {
		return {
			learnsetStatus: 'unreadable',
			learnsetNote: `The movesets of this game could not be read: ${read.note || 'unknown layout'}.`,
		};
	}
	for (const entry of species) {
		const found = read.entries.get(entry.index);
		if (!found) continue;
		const target = entry as T & { learnset?: RawLearnset, evolvesFrom?: number, evolvesFromAll?: number[] };
		target.learnset = found.learnset;
		if (found.evolvesFrom !== undefined) target.evolvesFrom = found.evolvesFrom;
		if (found.evolvesFromAll) target.evolvesFromAll = found.evolvesFromAll;
	}
	return { learnsetStatus: 'read' };
}
