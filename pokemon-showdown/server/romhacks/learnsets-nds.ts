import { Dex } from '../../sim/dex';
import { openNdsCode, type NdsCode } from './nds-code';

export interface NdsLearnset {
	levelup: { level: number, move: number }[];
	machines: number[];
	tutor: number[];
	egg: number[];
}
export interface NdsLearnsetRead {
	status: 'read' | 'unreadable';
	note?: string;
	learnsets: (NdsLearnset | undefined)[];
	evolvesFrom: (number | undefined)[];
}
export interface NdsLearnsetLayout {
	code: string;
	gen: 4 | 5;
	personal: Buffer[];
	indices: number[];
	moveLimit: number;
	speciesLimit: number;
	firstForm: number;
	formBase: (index: number) => number;
}

interface Paths {
	levelup: string; evolutions: string; egg?: string; tutorFile?: string; overlay: number; tutorOverlay: number;
}

const GEN4_LEVELUP = 'poketool/personal/wotbl.narc';
const GEN4_EVOLUTIONS = 'poketool/personal/evo.narc';
const PATHS: { [code: string]: Paths } = {
	ADA: { levelup: GEN4_LEVELUP, evolutions: GEN4_EVOLUTIONS, overlay: 5, tutorOverlay: -1 },
	APA: { levelup: GEN4_LEVELUP, evolutions: GEN4_EVOLUTIONS, overlay: 5, tutorOverlay: -1 },
	CPU: { levelup: GEN4_LEVELUP, evolutions: GEN4_EVOLUTIONS, overlay: 5, tutorOverlay: 5 },
	IPK: {
		levelup: 'a/0/3/3', evolutions: 'a/0/3/4', egg: 'a/2/2/9', tutorFile: 'fielddata/wazaoshie/waza_oshie.bin',
		overlay: -1, tutorOverlay: 1,
	},
	IPG: {
		levelup: 'a/0/3/3', evolutions: 'a/0/3/4', egg: 'a/2/2/9', tutorFile: 'fielddata/wazaoshie/waza_oshie.bin',
		overlay: -1, tutorOverlay: 1,
	},
	IRB: { levelup: 'a/0/1/8', evolutions: 'a/0/1/9', egg: 'a/1/2/3', overlay: -1, tutorOverlay: -1 },
	IRA: { levelup: 'a/0/1/8', evolutions: 'a/0/1/9', egg: 'a/1/2/3', overlay: -1, tutorOverlay: -1 },
	IRE: { levelup: 'a/0/1/8', evolutions: 'a/0/1/9', egg: 'a/1/2/4', overlay: -1, tutorOverlay: 36 },
	IRD: { levelup: 'a/0/1/8', evolutions: 'a/0/1/9', egg: 'a/1/2/4', overlay: -1, tutorOverlay: 36 },
};

const EGG_SPECIES = 20000;
const GEN4_MACHINES = 100;
const GEN5_MACHINES = 101;
const GEN5_TUTOR_MOVES = [
	'Grass Pledge', 'Fire Pledge', 'Water Pledge', 'Frenzy Plant', 'Blast Burn', 'Hydro Cannon', 'Draco Meteor',
];
const GEN5_TUTOR_SETS = 4;

const machineMoves = new Map<number, Set<number>>();

function stockMachineMoves(gen: number): Set<number> {
	let found = machineMoves.get(gen);
	if (found) return found;
	found = new Set<number>();
	const source = `${gen}M`;
	const table = Dex.data.Learnsets;
	for (const id in table) {
		const learnset = table[id].learnset;
		if (!learnset) continue;
		for (const [move, sources] of Object.entries(learnset)) {
			if ((sources as string[]).includes(source)) found.add(Dex.moves.get(move).num);
		}
	}
	machineMoves.set(gen, found);
	return found;
}

function fail(part: string): NdsLearnsetRead {
	return { status: 'unreadable', note: part, learnsets: [], evolvesFrom: [] };
}

function findMachines(
	code: NdsCode, base: NdsCode | null, count: number, gen: number, moveLimit: number
): number[] | null {
	const stock = stockMachineMoves(gen);
	const scan = (source: NdsCode) => {
		const buf = source.arm9;
		const words = buf.length >> 1;
		const pointers = new Set<number>();
		for (let at = 0; at + 4 <= buf.length; at += 4) {
			const value = buf.readUInt32LE(at) - source.arm9Ram;
			if (value >= 0 && value < buf.length && !(value & 1)) pointers.add(value >> 1);
		}
		let score = 0;
		let invalid = 0;
		let best = 0;
		let found: number[] = [];
		for (let i = 0; i < words; i++) {
			const value = buf.readUInt16LE(i * 2);
			if (stock.has(value)) score++;
			if (!value || value >= moveLimit) invalid++;
			if (i >= count) {
				const old = buf.readUInt16LE((i - count) * 2);
				if (stock.has(old)) score--;
				if (!old || old >= moveLimit) invalid--;
			}
			if (i < count - 1 || invalid || !pointers.has(i - count + 1)) continue;
			if (score > best) {
				best = score;
				found = [i - count + 1];
			} else if (score === best) {
				found.push(i - count + 1);
			}
		}
		return { best, found };
	};
	const hack = scan(code);
	if (hack.best < count * 0.6 || !hack.found.length) return null;
	let at = hack.found[0];
	if (hack.found.length > 1) {
		const clean = base ? scan(base) : null;
		if (!clean || clean.best !== count || clean.found.length !== 1 || !hack.found.includes(clean.found[0])) return null;
		at = clean.found[0];
	}
	const moves: number[] = [];
	for (let i = 0; i < count; i++) moves.push(code.arm9.readUInt16LE((at + i) * 2));
	return moves;
}

function overlayOrder(code: NdsCode, first: number): number[] {
	const order: number[] = [];
	if (first >= 0 && first < code.overlays.length) order.push(first);
	for (let i = 0; i < code.overlays.length; i++) {
		if (i !== first) order.push(i);
	}
	return order;
}

function parseEggs(buf: Buffer, at: number, layout: NdsLearnsetLayout): number[][] | null {
	const eggs: number[][] = [];
	let current: number[] | null = null;
	let last = 0;
	let entries = 0;
	for (; at + 2 <= buf.length; at += 2) {
		const value = buf.readUInt16LE(at);
		if (value === 0xffff) return entries >= 300 && eggs.length >= 50 ? eggs : null;
		entries++;
		if (value > EGG_SPECIES) {
			const species = value - EGG_SPECIES;
			if (species <= last || species >= layout.speciesLimit) return null;
			last = species;
			current = [];
			eggs[species] = current;
		} else {
			if (!current || !value || value >= layout.moveLimit) return null;
			current.push(value);
		}
	}
	return null;
}

function findEggs(code: NdsCode, first: number, layout: NdsLearnsetLayout): number[][] | null {
	for (const index of overlayOrder(code, first)) {
		const buf = code.overlay(index);
		if (!buf) continue;
		for (let at = 0; at + 600 <= buf.length; at += 2) {
			const value = buf.readUInt16LE(at);
			if (value <= EGG_SPECIES || value >= EGG_SPECIES + layout.speciesLimit) continue;
			const next = buf.readUInt16LE(at + 2);
			if (!next || next >= layout.moveLimit) continue;
			const eggs = parseEggs(buf, at, layout);
			if (eggs) return eggs;
		}
	}
	return null;
}

interface Run { buf: Buffer; ram: number; at: number; count: number }

function longestRun(
	code: NdsCode, first: number, stride: number, least: number, valid: (buf: Buffer, at: number) => boolean
): Run | null {
	let best: Run | null = null;
	for (const index of overlayOrder(code, first)) {
		const buf = code.overlay(index);
		if (!buf) continue;
		const ram = code.overlays[index].ram;
		for (let phase = 0; phase < stride; phase += 4) {
			let count = 0;
			let at = phase;
			for (; at + stride <= buf.length; at += stride) {
				if (valid(buf, at)) {
					count++;
					continue;
				}
				if (count >= least && (!best || count > best.count)) best = { buf, ram, at: at - count * stride, count };
				count = 0;
			}
			if (count >= least && (!best || count > best.count)) best = { buf, ram, at: at - count * stride, count };
		}
		if (best && index === first) return best;
	}
	return best;
}

function distinct(values: number[]): boolean {
	return new Set(values).size === values.length;
}

function referenced(run: Run, stride: number): number[] {
	const low = (run.ram + run.at) >>> 0;
	const high = low + run.count * stride;
	const found = new Set<number>();
	for (let at = 0; at + 4 <= run.buf.length; at += 4) {
		const value = run.buf.readUInt32LE(at);
		if (value >= low && value < high && (value - low) % stride === 0) found.add((value - low) / stride);
	}
	return [...found].sort((a, b) => a - b);
}

function longestSegment(run: Run, stride: number, least: number): Run | null {
	const starts = referenced(run, stride);
	let best: Run | null = null;
	starts.forEach((start, i) => {
		const count = (i + 1 < starts.length ? starts[i + 1] : run.count) - start;
		if (count >= least && (!best || count > best.count)) best = { ...run, at: run.at + start * stride, count };
	});
	return best;
}

function bitList(mask: Buffer, at: number, bits: number, moves: number[], spare = false): number[] | null {
	const out: number[] = [];
	const bytes = Math.ceil(bits / 8);
	if (at < 0 || at + bytes > mask.length) return null;
	for (let bit = 0; bit < bytes * 8; bit++) {
		if (!(mask[at + (bit >> 3)] & (1 << (bit & 7)))) continue;
		if (bit >= moves.length) {
			if (spare) continue;
			return null;
		}
		if (!out.includes(moves[bit])) out.push(moves[bit]);
	}
	return out;
}

function compatIndex(index: number, layout: NdsLearnsetLayout): number {
	if (index >= layout.firstForm) return index - 3;
	return index < layout.speciesLimit ? index - 1 : -1;
}

function platinumTutors(code: NdsCode, layout: NdsLearnsetLayout, first: number): (number[] | undefined)[] | null {
	const found = longestRun(code, first, 12, 16, (buf, at) => {
		const move = buf.readUInt16LE(at);
		if (!move || move >= layout.moveLimit || buf.readUInt16LE(at + 6) || buf.readUInt32LE(at + 8) > 15) return false;
		return buf[at + 2] < 100 && buf[at + 3] < 100 && buf[at + 4] < 100 && buf[at + 5] < 100;
	});
	const run = found && longestSegment(found, 12, 16);
	if (!run || run.count > 64) return null;
	const moves: number[] = [];
	for (let i = 0; i < run.count; i++) moves.push(run.buf.readUInt16LE(run.at + i * 12));
	if (!distinct(moves)) return null;
	const width = Math.ceil(run.count / 8);
	const table = run.at + run.count * 12;
	const out: (number[] | undefined)[] = [];
	for (const i of layout.indices) {
		const slot = compatIndex(i, layout);
		if (slot < 0) continue;
		const list = bitList(run.buf, table + slot * width, run.count, moves);
		if (!list) return null;
		out[i] = list;
	}
	return out;
}

function heartGoldTutors(
	code: NdsCode, layout: NdsLearnsetLayout, first: number, file: Buffer | undefined
): (number[] | undefined)[] | null {
	if (!file?.length || file.length % 8 || file.length < 8 * 100) return null;
	const found = longestRun(code, first, 4, 24, (buf, at) => {
		const move = buf.readUInt16LE(at);
		return !!move && move < layout.moveLimit && buf[at + 2] < 100 && buf[at + 3] < 8;
	});
	const run = found && longestSegment(found, 4, 24);
	if (!run || run.count > 64) return null;
	const moves: number[] = [];
	for (let i = 0; i < run.count; i++) moves.push(run.buf.readUInt16LE(run.at + i * 4));
	if (!distinct(moves)) return null;
	const out: (number[] | undefined)[] = [];
	for (const i of layout.indices) {
		const slot = compatIndex(i, layout);
		if (slot < 0) continue;
		const list = bitList(file, slot * 8, 64, moves);
		if (!list) return null;
		out[i] = list;
	}
	return out;
}

function shardTutors(code: NdsCode, layout: NdsLearnsetLayout, first: number): number[][] | null {
	const run = longestRun(code, first, 12, 40, (buf, at) => {
		const move = buf.readUInt32LE(at);
		return !!move && move < layout.moveLimit && buf.readUInt32LE(at + 4) < 100 && buf.readUInt32LE(at + 8) < 32;
	});
	if (!run) return null;
	const starts = referenced(run, 12);
	if (starts.length < GEN5_TUTOR_SETS) return null;
	const groups = new Map<number, number[]>();
	starts.forEach((start, i) => {
		const end = i + 1 < starts.length ? starts[i + 1] : run.count;
		const group: number[] = [];
		for (let entry = start; entry < end; entry++) group.push(run.buf.readUInt32LE(run.at + entry * 12));
		if (group.length <= 32 && distinct(group)) groups.set((run.ram + run.at + start * 12) >>> 0, group);
	});
	for (let at = 0; at + GEN5_TUTOR_SETS * 4 <= run.buf.length; at += 4) {
		const sets: number[][] = [];
		for (let i = 0; i < GEN5_TUTOR_SETS; i++) {
			const group = groups.get(run.buf.readUInt32LE(at + i * 4));
			if (!group || sets.includes(group)) break;
			sets.push(group);
		}
		if (sets.length === GEN5_TUTOR_SETS) return sets;
	}
	return null;
}

export function readNdsLearnsets(rom: Buffer, baseRom: Buffer | null, layout: NdsLearnsetLayout): NdsLearnsetRead {
	const paths = PATHS[layout.code];
	const code = openNdsCode(rom);
	if (!paths || !code) return fail('the game files could not be opened');
	const base = baseRom ? openNdsCode(baseRom) : null;
	const { gen, personal, moveLimit } = layout;

	const levelFiles = code.narc(paths.levelup);
	if (!levelFiles || levelFiles.length < layout.speciesLimit) return fail('the level-up move table was not found');
	const evolutionFiles = code.narc(paths.evolutions);
	if (!evolutionFiles || evolutionFiles.length < layout.speciesLimit) return fail('the evolution table was not found');

	const machineCount = gen === 4 ? GEN4_MACHINES : GEN5_MACHINES;
	const table = findMachines(code, base, machineCount, gen, moveLimit);
	if (!table) return fail('the TM and HM move list was not found');
	const machines = gen === 4 ? table : [...table.slice(0, 92), ...table.slice(98, 101), ...table.slice(92, 98)];
	const machineAt = gen === 4 ? 0x1c : 0x28;

	let eggs: number[][] | null = null;
	if (gen === 4) {
		const members = paths.egg ? code.narc(paths.egg) : null;
		if (members?.length) eggs = parseEggs(members[0], 0, layout);
		if (!eggs) eggs = findEggs(code, paths.overlay, layout);
	} else {
		const members = paths.egg ? code.narc(paths.egg) : null;
		if (members && members.length >= layout.speciesLimit) {
			eggs = [];
			for (let i = 1; i < layout.speciesLimit; i++) {
				const file = members[i];
				if (file.length < 2) continue;
				const count = file.readUInt16LE(0);
				if (2 + count * 2 > file.length) return fail('the egg move table has an unknown layout');
				const list: number[] = [];
				for (let j = 0; j < count; j++) {
					const move = file.readUInt16LE(2 + j * 2);
					if (!move || move >= moveLimit) return fail('the egg move table has an unknown layout');
					list.push(move);
				}
				eggs[i] = list;
			}
		}
	}
	if (!eggs) return fail('the egg move table was not found');

	let tutors: (number[] | undefined)[] = [];
	let shards: number[][] | null = null;
	const special = GEN5_TUTOR_MOVES.map(name => Dex.moves.get(name).num);
	if (layout.code === 'CPU') {
		const found = platinumTutors(code, layout, paths.tutorOverlay);
		if (!found) return fail('the move tutor table was not found');
		tutors = found;
	} else if (paths.tutorFile) {
		const found = heartGoldTutors(code, layout, paths.tutorOverlay, code.files().get(paths.tutorFile));
		if (!found) return fail('the move tutor table was not found');
		tutors = found;
	} else if (gen === 5 && paths.tutorOverlay >= 0) {
		shards = shardTutors(code, layout, paths.tutorOverlay);
		if (!shards) return fail('the move tutor table was not found');
	}

	const learnsets: (NdsLearnset | undefined)[] = [];
	const evolvesFrom: (number | undefined)[] = [];
	for (const i of layout.indices) {
		if (i < 1) continue;
		if (i >= personal.length || i >= levelFiles.length) return fail('the level-up move table has an unknown layout');
		const entry = personal[i];
		const levels = levelFiles[i];
		const levelup: { level: number, move: number }[] = [];
		let ended = false;
		if (gen === 4) {
			for (let at = 0; at + 2 <= levels.length; at += 2) {
				const value = levels.readUInt16LE(at);
				if (value === 0xffff) {
					ended = true;
					break;
				}
				levelup.push({ level: value >> 9, move: value & 0x1ff });
			}
		} else {
			for (let at = 0; at + 4 <= levels.length; at += 4) {
				const move = levels.readUInt16LE(at);
				const level = levels.readUInt16LE(at + 2);
				if (move === 0xffff && level === 0xffff) {
					ended = true;
					break;
				}
				levelup.push({ level, move });
			}
		}
		if (!ended && levels.length) return fail('the level-up move table has an unknown layout');
		if (levelup.some(step => !step.move || step.move >= moveLimit || step.level > 100)) {
			return fail('the level-up move table has an unknown layout');
		}

		if (entry.length < machineAt + 13) return fail('the TM and HM compatibility data has an unknown layout');
		const machineList = bitList(entry, machineAt, machineCount, machines, true);
		if (!machineList) return fail('the TM and HM compatibility data has an unknown layout');

		let tutor = tutors[i] || [];
		if (gen === 5) {
			if (entry.length < 0x3c) return fail('the move tutor data has an unknown layout');
			const first = bitList(entry, 0x38, 32, special);
			if (!first) return fail('the move tutor data has an unknown layout');
			tutor = first;
			if (shards) {
				if (entry.length < 0x4c) return fail('the move tutor data has an unknown layout');
				for (let word = 0; word < shards.length; word++) {
					const list = bitList(entry, 0x3c + word * 4, 32, shards[word]);
					if (!list) return fail('the move tutor data has an unknown layout');
					for (const move of list) {
						if (!tutor.includes(move)) tutor.push(move);
					}
				}
			}
		}

		const species = i >= layout.firstForm ? layout.formBase(i) : i;
		learnsets[i] = { levelup, machines: machineList, tutor, egg: (species && eggs[species]) || [] };
	}
	for (let i = 1; i < layout.speciesLimit; i++) {
		const evolutions: Buffer = evolutionFiles[i];
		for (let at = 0; at + 6 <= evolutions.length && at < 42; at += 6) {
			const method = evolutions.readUInt16LE(at);
			const target = evolutions.readUInt16LE(at + 4);
			if (!method || !target || target >= layout.speciesLimit || target === i) continue;
			if (evolvesFrom[target] === undefined) evolvesFrom[target] = i;
		}
	}
	for (const i of layout.indices) {
		if (i < layout.firstForm) continue;
		const species = layout.formBase(i);
		if (species && evolvesFrom[species] !== undefined) evolvesFrom[i] = evolvesFrom[species];
	}
	return { status: 'read', learnsets, evolvesFrom };
}
