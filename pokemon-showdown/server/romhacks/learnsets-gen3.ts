import { Dex, toID } from '../../sim/dex';

export interface Gen3LearnsetRow { index: number; name: string; baseStats?: { [stat: string]: number } }
export interface Gen3Learnset {
	levelup: { level: number, move: number }[];
	machines: number[];
	tutor: number[];
	egg: number[];
}
export interface Gen3SpeciesTable { start: number; stride: number; nameAt: number; count: number }
export interface Gen3LearnsetInput {
	rom: Buffer;
	base: Buffer | null;
	rows: Gen3LearnsetRow[];
	moves: { index: number, name: string }[];
	embedded: Gen3SpeciesTable | null;
	baseNames: () => { species: Gen3LearnsetRow[], moves: { index: number, name: string }[] } | null;
}
export interface Gen3LearnsetResult {
	status: 'read' | 'unreadable';
	note?: string;
	learnsets: Map<number, Gen3Learnset>;
	evolvesFrom: Map<number, number[]>;
	layout?: { [k: string]: any };
}

interface Game {
	rom: Buffer;
	speciesCount: number;
	moveCount: number;
	real: number[];
	names: string[];
	moveIds: string[];
	knownMoves: boolean[];
	targets: number[];
	official: Map<number, Set<string>> | null;
}

type LevelMove = { level: number, move: number };

function pointerAt(rom: Buffer, at: number): number {
	if (at < 0 || at + 4 > rom.length) return -1;
	const value = rom.readUInt32LE(at);
	if (value < 0x08000000 || value >= 0x08000000 + rom.length) return -1;
	return value - 0x08000000;
}

function scanTargets(rom: Buffer): number[] {
	const flags = new Uint8Array(rom.length);
	const targets: number[] = [];
	const end = rom.length - 3;
	const limit = rom.length;
	for (let at = 0; at < end; at += 4) {
		const high = rom[at + 3];
		if (high !== 8 && high !== 9) continue;
		const target = (rom[at] | (rom[at + 1] << 8) | (rom[at + 2] << 16)) + ((high - 8) << 24);
		if (target >= limit || flags[target]) continue;
		flags[target] = 1;
		targets.push(target);
	}
	return targets;
}

function makeGame(rom: Buffer, rows: Gen3LearnsetRow[], moves: { index: number, name: string }[]): Game {
	const names: string[] = [];
	const real: number[] = [];
	let speciesCount = 0;
	for (const row of rows) {
		names[row.index] = row.name;
		if (row.index >= speciesCount) speciesCount = row.index + 1;
		if (row.name && row.baseStats && Object.values(row.baseStats).some(Boolean)) real.push(row.index);
	}
	const moveIds: string[] = [''];
	const knownMoves: boolean[] = [false];
	const dex = Dex.mod('gen9');
	for (const move of moves) {
		const known = dex.moves.get(move.name);
		moveIds[move.index] = known.exists ? known.id : toID(move.name);
		knownMoves[move.index] = known.exists;
	}
	return {
		rom, speciesCount, moveCount: moveIds.length, real, names, moveIds, knownMoves,
		targets: scanTargets(rom), official: null,
	};
}

function officialMoves(game: Game): Map<number, Set<string>> {
	if (game.official) return game.official;
	const dex = Dex.mod('gen9');
	const known: number[] = [];
	for (const index of game.real) {
		const name = game.names[index];
		if (/^[A-Z]/.test(name) && dex.species.get(name).exists) known.push(index);
	}
	const official = new Map<number, Set<string>>();
	const step = Math.max(1, known.length / 160);
	for (let k = 0; k < known.length; k += step) {
		const index = known[Math.floor(k)];
		const species = dex.species.get(game.names[index]);
		const moves = new Set<string>();
		try {
			for (const entry of dex.species.getFullLearnset(species.id)) {
				for (const move in entry.learnset) moves.add(move);
			}
		} catch {
			continue;
		}
		if (moves.size) official.set(index, moves);
	}
	game.official = official;
	return official;
}

function parseLevelUp(game: Game, at: number, format: number, lenient = false): LevelMove[] | null {
	const rom = game.rom;
	const out: LevelMove[] = [];
	if (at < 0) return null;
	for (let n = 0; n < 256; n++) {
		let move: number;
		let level: number;
		if (format === 16) {
			if (at + n * 2 + 2 > rom.length) return null;
			const entry = rom.readUInt16LE(at + n * 2);
			if (entry === 0xffff) return out;
			move = entry & 0x1ff;
			level = entry >> 9;
			if (!level) {
				if (!lenient) return null;
				level = 1;
			}
			if (!move && level > 100) continue;
		} else if (format === 3) {
			if (at + n * 3 + 3 > rom.length) return null;
			move = rom.readUInt16LE(at + n * 3);
			level = rom[at + n * 3 + 2];
			if (level === 0xff && (move === 0 || move === 0xffff)) return out;
		} else {
			if (at + n * 4 + 4 > rom.length) return null;
			move = rom.readUInt16LE(at + n * 4);
			level = rom.readUInt16LE(at + n * 4 + 2);
			if (move === 0xffff) return level === 0 ? out : null;
		}
		if (!move && lenient) continue;
		if (!move || move >= game.moveCount || level > 255) return null;
		if (level <= 100) out.push({ level, move });
	}
	return null;
}

interface LevelUpTable { table: number; format: number; valid: number; filled: number }

function scoreLevelUp(game: Game, table: number, format: number): LevelUpTable {
	let valid = 0;
	let filled = 0;
	for (const index of game.real) {
		const list = parseLevelUp(game, pointerAt(game.rom, table + index * 4), format);
		if (!list) continue;
		valid++;
		if (list.length) filled++;
	}
	return { table, format, valid, filled };
}

function findLevelUp(game: Game): LevelUpTable[] {
	const found: LevelUpTable[] = [];
	const rom = game.rom;
	const probes = game.real.slice(0, 3);
	if (probes.length < 3) return found;
	for (const table of game.targets) {
		if (table + game.speciesCount * 4 > rom.length) continue;
		for (const format of [16, 3, 4]) {
			if (!probes.every(index => parseLevelUp(game, pointerAt(rom, table + index * 4), format)?.length)) continue;
			const score = scoreLevelUp(game, table, format);
			if (score.filled >= game.real.length * 0.5) found.push(score);
		}
	}
	return found.sort((a, b) => b.filled - a.filled);
}

interface EvolutionTable { table: number; perMon: number; valid: number; next: number }

function readEvolutions(game: Game, table: number, perMon: number, index: number): [number, number, number][] | null {
	const rom = game.rom;
	const out: [number, number, number][] = [];
	for (let slot = 0; slot < perMon; slot++) {
		const at = table + (index * perMon + slot) * 8;
		if (at + 8 > rom.length) return null;
		const method = rom.readUInt16LE(at);
		const param = rom.readUInt16LE(at + 2);
		const target = rom.readUInt16LE(at + 4);
		if (!method) {
			if (target) return null;
			continue;
		}
		if (method > 0xff || !target || target >= game.speciesCount) return null;
		out.push([method, param, target]);
	}
	return out;
}

function findEvolutions(game: Game): EvolutionTable[] {
	const found: EvolutionTable[] = [];
	const rom = game.rom;
	for (const table of game.targets) {
		if (table + 16 > rom.length) continue;
		if (rom.readUInt32LE(table) || rom.readUInt32LE(table + 4)) continue;
		for (let perMon = 1; perMon <= 32; perMon++) {
			const size = perMon * 8;
			if (table + size * game.speciesCount > rom.length) break;
			let quick = 0;
			for (let index = 1; index <= 24; index++) {
				const at = table + index * size;
				if (rom.readUInt16LE(at + 4) === index + 1 && rom[at] && !rom[at + 1]) quick++;
			}
			if (quick < 6) continue;
			let valid = 0;
			let next = 0;
			for (const index of game.real) {
				const list = readEvolutions(game, table, perMon, index);
				if (!list) continue;
				valid++;
				if (list.length && list[0][2] === index + 1) next++;
			}
			found.push({ table, perMon, valid, next });
		}
	}
	return found.sort((a, b) => b.valid - a.valid || b.next - a.next);
}

interface EggTable { table: number; species: number; length: number; moves: Map<number, number[]> }

function parseEggMoves(game: Game, table: number): EggTable | null {
	const rom = game.rom;
	const moves = new Map<number, number[]>();
	let current: number[] | null = null;
	for (let n = 0; n < 60000; n++) {
		const at = table + n * 2;
		if (at + 2 > rom.length) return null;
		const value = rom.readUInt16LE(at);
		if (value === 0xffff) return { table, species: moves.size, length: n, moves };
		if (value > 20000) {
			const species = value - 20000;
			if (species > 0x2000) return null;
			current = [];
			if (species < game.speciesCount && !moves.has(species)) moves.set(species, current);
		} else {
			if (!current || !value || value >= game.moveCount) return null;
			current.push(value);
		}
	}
	return null;
}

function findEggMoves(game: Game): EggTable[] {
	const found: EggTable[] = [];
	const rom = game.rom;
	for (const table of game.targets) {
		if (table & 1 || table + 4 > rom.length) continue;
		const first = rom.readUInt16LE(table);
		if (first <= 20000 || first >= 20000 + game.speciesCount) continue;
		const parsed = parseEggMoves(game, table);
		if (parsed && parsed.species >= 20) found.push(parsed);
	}
	return found.sort((a, b) => b.species - a.species);
}

function precision(game: Game, read: (index: number) => number[] | null): [number, number] {
	let hits = 0;
	let total = 0;
	for (const [index, moves] of officialMoves(game)) {
		const list = read(index);
		if (!list) continue;
		for (const move of list) {
			if (!game.knownMoves[move]) continue;
			total++;
			if (moves.has(game.moveIds[move])) hits++;
		}
	}
	return [hits, total];
}

function moveRun(game: Game, at: number, cap: number, distinct = false): number {
	const rom = game.rom;
	const seen = new Set<number>();
	let n = 0;
	while (n < cap && at + n * 2 + 2 <= rom.length) {
		const move = rom.readUInt16LE(at + n * 2);
		if (!move || move >= game.moveCount) break;
		if (distinct) {
			if (seen.has(move)) break;
			seen.add(move);
		}
		n++;
	}
	return n;
}

interface Compatibility {
	table: number; width: number; list: number; count: number; hits: number; total: number; loose?: boolean;
}

function readBits(game: Game, compat: Compatibility, index: number): number[] | null {
	const rom = game.rom;
	const at = compat.table + index * compat.width;
	if (at < 0 || at + compat.width > rom.length) return null;
	const out: number[] = [];
	for (let byte = 0; byte < compat.width; byte++) {
		const value = rom[at + byte];
		if (!value) continue;
		for (let bit = 0; bit < 8; bit++) {
			if (!(value & (1 << bit))) continue;
			const slot = byte * 8 + bit;
			if (slot >= compat.count) {
				if (compat.loose) continue;
				return null;
			}
			const move = rom.readUInt16LE(compat.list + slot * 2);
			if (move >= game.moveCount) return null;
			if (move) out.push(move);
		}
	}
	return out;
}

function scoreCompatibility(
	game: Game, table: number, width: number, list: number, count: number
): Compatibility | null {
	const compat = { table, width, list, count, hits: 0, total: 0 };
	let broken = false;
	const [hits, total] = precision(game, index => {
		const moves = broken ? null : readBits(game, compat, index);
		if (!moves) broken = true;
		return moves;
	});
	if (broken) return null;
	compat.hits = hits;
	compat.total = total;
	return compat;
}

function validCompatibility(game: Game, compat: Compatibility, blankFirst = true): boolean {
	const rom = game.rom;
	if (compat.table < 0 || compat.list < 0 || compat.table + compat.width * game.speciesCount > rom.length) return false;
	if (blankFirst && rom.subarray(compat.table, compat.table + compat.width).some(byte => byte !== 0)) return false;
	let filled = 0;
	for (const index of game.real) {
		const moves = readBits(game, compat, index);
		if (!moves) return false;
		if (moves.length) filled++;
	}
	return filled >= game.real.length * 0.5;
}

function ratio(compat: { hits: number, total: number } | null): number {
	return compat?.total ? compat.hits / compat.total : 0;
}

const POPCOUNT = new Uint8Array(256);
for (let value = 1; value < 256; value++) POPCOUNT[value] = POPCOUNT[value >> 1] + (value & 1);

interface ListMasks { known: Uint8Array; can: Uint8Array[]; rows: number[] }

function listMasks(game: Game, list: number, count: number): ListMasks {
	const rom = game.rom;
	const known = new Uint8Array(32);
	const can: Uint8Array[] = [];
	const rows: number[] = [];
	const moves: number[] = [];
	for (let slot = 0; slot < count && slot < 256; slot++) {
		const move = rom.readUInt16LE(list + slot * 2);
		moves.push(move);
		if (game.knownMoves[move]) known[slot >> 3] |= 1 << (slot & 7);
	}
	let seen = 0;
	for (const [index, official] of officialMoves(game)) {
		if (seen++ % 8) continue;
		const mask = new Uint8Array(32);
		moves.forEach((move, slot) => {
			if (game.knownMoves[move] && official.has(game.moveIds[move])) mask[slot >> 3] |= 1 << (slot & 7);
		});
		rows.push(index);
		can.push(mask);
	}
	return { known, can, rows };
}

function quickScore(game: Game, masks: ListMasks, table: number, width: number, count: number): number {
	const rom = game.rom;
	let hits = 0;
	let total = 0;
	for (let k = 0; k < masks.rows.length; k++) {
		const at = table + masks.rows[k] * width;
		if (at + width > rom.length) return 0;
		const can = masks.can[k];
		for (let byte = 0; byte < width; byte++) {
			const value = rom[at + byte];
			if (!value) continue;
			if (byte * 8 + 8 > count && value >> Math.max(0, count - byte * 8)) return 0;
			total += POPCOUNT[value & masks.known[byte]];
			hits += POPCOUNT[value & can[byte]];
		}
	}
	return total >= 30 ? hits / total : 0;
}

function plausibleBits(game: Game, table: number, width: number): boolean {
	const rom = game.rom;
	let seen = 0;
	let rows = 0;
	let filled = 0;
	let set = 0;
	for (const index of officialMoves(game).keys()) {
		if (seen++ % 8) continue;
		const at = table + index * width;
		if (at + width > rom.length) return false;
		let row = 0;
		for (let byte = 0; byte < width; byte++) {
			let value = rom[at + byte];
			while (value) {
				row++;
				value &= value - 1;
			}
		}
		rows++;
		if (row) filled++;
		set += row;
	}
	return filled >= rows * 0.8 && set >= rows * width * 0.4 && set <= rows * width * 6;
}

function findMachines(game: Game): Compatibility | null {
	const rom = game.rom;
	const lists: [number, number][] = [];
	const tables: number[] = [];
	for (const at of game.targets) {
		if (at + 64 > rom.length) continue;
		if (!(at & 1) && moveRun(game, at, 50, true) >= 50) lists.push([at, moveRun(game, at, 256)]);
		if (!rom.readUInt32LE(at) && !rom.readUInt32LE(at + 4) && (rom.readUInt32LE(at + 8) || rom.readUInt32LE(at + 16))) {
			tables.push(at);
		}
	}
	if (!lists.length || officialMoves(game).size < 40) return null;
	const found: Compatibility[] = [];
	const masks = lists.map(([list, run]) => listMasks(game, list, Math.min(run, 128)));
	for (const table of tables) {
		for (const width of [8, 16]) {
			if (table + width * game.speciesCount > rom.length || !plausibleBits(game, table, width)) continue;
			for (let k = 0; k < lists.length; k++) {
				const [list, run] = lists[k];
				const count = Math.min(run, width * 8);
				if (quickScore(game, masks[k], table, width, count) < 0.8) continue;
				const score = scoreCompatibility(game, table, width, list, count);
				if (score && score.total >= 200 && score.hits >= score.total * 0.85) found.push(score);
			}
		}
	}
	found.sort((a, b) => ratio(b) - ratio(a));
	const best = found[0];
	if (!best || !validCompatibility(game, best)) return null;
	for (const other of found.slice(1)) {
		if (other.table === best.table && other.width === best.width && sameMoves(game, other, best)) continue;
		if (ratio(other) > ratio(best) - 0.03) return null;
	}
	return best;
}

function sameMoves(game: Game, a: Compatibility, b: Compatibility): boolean {
	const count = Math.min(a.count, b.count);
	return game.rom.compare(game.rom, a.list, a.list + count * 2, b.list, b.list + count * 2) === 0;
}

function tutorTable(list: number, count: number, width: number): number {
	const end = list + count * 2;
	return width === 2 ? end : (end + 3) & ~3;
}

function findTutors(game: Game): Compatibility | null {
	const rom = game.rom;
	if (officialMoves(game).size < 40) return null;
	const found: Compatibility[] = [];
	for (const list of game.targets) {
		if (list & 1 || list + 64 > rom.length) continue;
		const count = moveRun(game, list, 128, true);
		if (count < 8) continue;
		const masks = listMasks(game, list, count);
		for (const width of [2, 4, 8, 16]) {
			if (width * 8 < count) continue;
			const table = tutorTable(list, count, width);
			if (table + width * game.speciesCount > rom.length) continue;
			if (rom.subarray(table, table + width).some(byte => byte !== 0)) continue;
			if (quickScore(game, masks, table, width, count) < 0.8) continue;
			const score = scoreCompatibility(game, table, width, list, count);
			if (score && score.total >= 60 && score.hits >= score.total * 0.85) found.push(score);
		}
	}
	found.sort((a, b) => ratio(b) - ratio(a));
	const best = found[0];
	if (!best || !validCompatibility(game, best)) return null;
	for (const other of found.slice(1)) {
		if (other.list !== best.list && ratio(other) > ratio(best) - 0.03) return null;
	}
	return best;
}

function parseMoveList(game: Game, at: number, end: number): number[] | null {
	const rom = game.rom;
	const out: number[] = [];
	if (at < 0) return null;
	for (let n = 0; n < 1024; n++) {
		if (at + n * 2 + 2 > rom.length) return null;
		const move = rom.readUInt16LE(at + n * 2);
		if (move === end) return out;
		if (!move || move >= game.moveCount) return null;
		out.push(move);
	}
	return null;
}

interface TeachableTable { table: number; end: number; valid: number; filled: number; hits: number; total: number }

function scoreTeachable(game: Game, table: number, end: number): TeachableTable {
	let valid = 0;
	let filled = 0;
	for (const index of game.real) {
		const list = parseMoveList(game, pointerAt(game.rom, table + index * 4), end);
		if (!list) continue;
		valid++;
		if (list.length >= 4) filled++;
	}
	return { table, end, valid, filled, hits: 0, total: 0 };
}

function findTeachable(game: Game, levelUp: number): TeachableTable | null {
	const rom = game.rom;
	const probes = game.real.slice(0, 3);
	if (probes.length < 3 || officialMoves(game).size < 40) return null;
	let best: TeachableTable | null = null;
	for (const table of game.targets) {
		if (table === levelUp || table + game.speciesCount * 4 > rom.length) continue;
		for (const end of [0xffff, 0]) {
			if (!probes.every(index => parseMoveList(game, pointerAt(rom, table + index * 4), end))) continue;
			const score = scoreTeachable(game, table, end);
			if (score.valid < game.real.length * 0.97 || score.filled < game.real.length * 0.5) continue;
			[score.hits, score.total] = precision(game, index => parseMoveList(game, pointerAt(rom, table + index * 4), end));
			if (score.total < 400 || score.hits < score.total * 0.6) continue;
			if (best && best.table !== score.table && Math.abs(ratio(best) - ratio(score)) < 0.03) return null;
			if (!best || ratio(score) > ratio(best)) best = score;
		}
	}
	return best;
}

function references(rom: Buffer, target: number): number[] {
	const needle = Buffer.alloc(4);
	needle.writeUInt32LE(0x08000000 + target);
	const sites: number[] = [];
	let from = 0;
	while (sites.length < 64) {
		const at = rom.indexOf(needle, from);
		if (at < 0) break;
		if (!(at & 3)) sites.push(at);
		from = at + 1;
	}
	return sites;
}

function follow(base: Buffer, rom: Buffer, target: number): number {
	if (target < 0) return -1;
	const sites = references(base, target);
	const tally = new Map<number, number>();
	for (const site of sites) {
		const value = pointerAt(rom, site);
		if (value >= 0) tally.set(value, (tally.get(value) || 0) + 1);
	}
	let best = -1;
	let bestCount = 0;
	for (const [value, count] of tally) {
		if (count > bestCount) {
			best = value;
			bestCount = count;
		}
	}
	return bestCount * 2 > sites.length ? best : -1;
}

function codeIntact(base: Buffer, rom: Buffer, target: number): boolean {
	const sites = references(base, target);
	if (!sites.length) return false;
	return sites.every(site => {
		const from = Math.max(0, site - 0x60);
		return site + 4 <= rom.length && base.compare(rom, from, site + 4, from, site + 4) === 0;
	});
}

interface Layout {
	levelUp: LevelUpTable | null;
	evolutions: EvolutionTable | null;
	eggs: EggTable | null;
	machines: Compatibility | null;
	teachable: TeachableTable | null;
	tutors: Compatibility | null;
	tutorCodeIntact?: boolean;
	problems: string[];
}

function levelUpMoves(game: Game, table: LevelUpTable, index: number): LevelMove[] | null {
	return parseLevelUp(game, pointerAt(game.rom, table.table + index * 4), table.format);
}

function readLevelUp(game: Game, at: number, format: number): LevelMove[] | null {
	const strict = parseLevelUp(game, at, format);
	if (strict) return strict;
	const loose = parseLevelUp(game, at, format, true);
	return loose?.length ? loose : null;
}

function pickLevelUp(game: Game, found: LevelUpTable[]): LevelUpTable | null {
	const good = found.filter(entry => entry.valid >= game.real.length * 0.97 && entry.filled >= game.real.length * 0.9);
	if (good.length <= 1) return good[0] || null;
	if (officialMoves(game).size < 40) return null;
	const scored = good.map(entry => {
		const [hits, total] = precision(game, index => (levelUpMoves(game, entry, index) || []).map(move => move.move));
		return { entry, score: total ? hits / total : 0 };
	}).sort((a, b) => b.score - a.score);
	if (scored[1].score > scored[0].score - 0.03) {
		const same = game.real.every(index =>
			pointerAt(game.rom, scored[0].entry.table + index * 4) === pointerAt(game.rom, scored[1].entry.table + index * 4));
		if (!same) return null;
	}
	return scored[0].entry;
}

function pickEvolutions(game: Game, found: EvolutionTable[]): EvolutionTable | null {
	const good = found.filter(entry => entry.valid >= game.real.length * 0.8 && entry.next >= game.real.length * 0.1);
	good.sort((a, b) => b.next - a.next || b.valid - a.valid);
	return good[0] || null;
}

function pickEggs(found: EggTable[]): EggTable | null {
	const best = found[0];
	if (!best) return null;
	for (const other of found.slice(1)) {
		if (other.table < best.table || other.table >= best.table + best.length * 2) return null;
	}
	return best;
}

function locate(game: Game): Layout {
	const problems: string[] = [];
	const levelUp = pickLevelUp(game, findLevelUp(game));
	if (!levelUp) {
		problems.push('the level-up moveset table was not found, or it uses moves that are not in the move list');
		return { levelUp, evolutions: null, eggs: null, machines: null, teachable: null, tutors: null, problems };
	}
	const evolutions = pickEvolutions(game, findEvolutions(game));
	const eggs = pickEggs(findEggMoves(game));
	if (!eggs) problems.push('the egg move table was not found');
	const teachable = findTeachable(game, levelUp.table);
	const machines = teachable ? null : findMachines(game);
	if (!teachable && !machines) problems.push('the TM and HM compatibility table was not found');
	const tutors = teachable ? null : findTutors(game);
	return { levelUp, evolutions, eggs, machines, teachable, tutors, problems };
}

function bestWidth(
	game: Game, table: number, list: number, widths: number[], stock: Compatibility
): Compatibility | null {
	let best: Compatibility | null = null;
	let plain: Compatibility | null = null;
	const scored = officialMoves(game).size >= 40;
	for (const width of widths) {
		const count = width === stock.width ? stock.count : width * 8;
		const compat: Compatibility = { table, width, list, count, hits: 0, total: 0, loose: width === stock.width };
		if (list + count * 2 > game.rom.length || !validCompatibility(game, compat, false)) continue;
		if (!scored) {
			if (width === stock.width) return compat;
			continue;
		}
		[compat.hits, compat.total] = precision(game, index => readBits(game, compat, index));
		if (width === stock.width) plain = compat;
		if (compat.total >= 60 && ratio(compat) > ratio(best)) best = compat;
	}
	if (best && ratio(best) >= 0.5) return best;
	return plain && (!best || best === plain) ? plain : null;
}

function erased(rom: Buffer, base: Buffer, target: number): boolean {
	const sites = references(base, target);
	return sites.length > 0 && sites.every(site => rom.subarray(site - 32, site + 4).every(byte => byte === 0));
}

function locateFromBase(game: Game, base: Buffer, stock: Layout): Layout | null {
	const rom = game.rom;
	if (!stock.levelUp) return null;
	const table = follow(base, rom, stock.levelUp.table);
	if (table < 0) return null;
	let levelUp: LevelUpTable | null = null;
	for (const format of [16, 3, 4]) {
		const score = scoreLevelUp(game, table, format);
		if (!levelUp || score.filled > levelUp.filled) levelUp = score;
	}
	if (!levelUp || levelUp.valid < game.real.length * 0.97 || levelUp.filled < game.real.length * 0.9) return null;
	const problems: string[] = [];

	let evolutions: EvolutionTable | null = null;
	const evolutionTable = stock.evolutions ? follow(base, rom, stock.evolutions.table) : -1;
	if (evolutionTable >= 0) {
		const found: EvolutionTable[] = [];
		for (let perMon = 1; perMon <= 32; perMon++) {
			if (evolutionTable + perMon * 8 * game.speciesCount > rom.length) break;
			let valid = 0;
			let next = 0;
			for (const index of game.real) {
				const list = readEvolutions(game, evolutionTable, perMon, index);
				if (!list) continue;
				valid++;
				if (list.length && list[0][2] === index + 1) next++;
			}
			found.push({ table: evolutionTable, perMon, valid, next });
		}
		evolutions = pickEvolutions(game, found);
	}

	let eggs: EggTable | null = null;
	const eggTable = stock.eggs ? follow(base, rom, stock.eggs.table) : -1;
	if (eggTable >= 0) eggs = parseEggMoves(game, eggTable);
	if (!eggs) problems.push('the egg move table was not found');

	let machines: Compatibility | null = null;
	if (stock.machines) {
		const compat = follow(base, rom, stock.machines.table);
		const list = follow(base, rom, stock.machines.list);
		if (compat >= 0 && list >= 0) machines = bestWidth(game, compat, list, [8, 12, 16, 20, 24, 32], stock.machines);
	}
	if (!machines) problems.push('the TM and HM compatibility table was not found');

	let tutors: Compatibility | null = null;
	let tutorCodeIntact = false;
	if (stock.tutors) {
		const compat = follow(base, rom, stock.tutors.table);
		const list = follow(base, rom, stock.tutors.list);
		if (compat >= 0 && list >= 0) {
			tutors = bestWidth(game, compat, list, [2, 4, 8, 12, 16, 20, 24, 32], stock.tutors);
		}
		const removed = erased(rom, base, stock.tutors.list) && erased(rom, base, stock.tutors.table);
		if (!tutors && !removed) problems.push('the move tutor table was not found');
		tutorCodeIntact = codeIntact(base, rom, stock.tutors.list) && codeIntact(base, rom, stock.tutors.table);
	}
	return { levelUp, evolutions, eggs, machines, teachable: null, tutors, tutorCodeIntact, problems };
}

interface EmbeddedLayout { levelUp: number; teachable: number; eggs: number; evolutions: number; evolutionSize: number }

function embeddedEvolutions(game: Game, at: number, size: number): [number, number, number][] | null {
	const rom = game.rom;
	const out: [number, number, number][] = [];
	if (at < 0) return null;
	for (let n = 0; n < 64; n++) {
		const entry = at + n * size;
		if (entry + size > rom.length) return null;
		const method = rom.readUInt16LE(entry);
		if (method === 0xffff) return out;
		const target = rom.readUInt16LE(entry + 4);
		if (method === 0xfffe) {
			if (target && target < game.speciesCount) out.push([method, rom.readUInt16LE(entry + 2), target]);
			continue;
		}
		if (!method || method > 0xff || !target || target >= game.speciesCount || rom.readUInt16LE(entry + 6)) return null;
		if (size === 12 && rom.readUInt32LE(entry + 8) && pointerAt(rom, entry + 8) < 0) return null;
		out.push([method, rom.readUInt16LE(entry + 2), target]);
	}
	return null;
}

function locateEmbedded(game: Game, table: Gen3SpeciesTable): EmbeddedLayout | null {
	const rom = game.rom;
	const row = (index: number) => table.start + index * table.stride;
	const wanted = game.real.length * 0.97;
	for (let offset = 0; offset + 8 <= table.stride; offset += 4) {
		let levels = 0;
		let lists = 0;
		for (const index of game.real) {
			const list = parseLevelUp(game, pointerAt(rom, row(index) + offset), 4);
			if (list?.length) levels++;
			if (parseMoveList(game, pointerAt(rom, row(index) + offset + 4), 0xffff)) lists++;
		}
		if (levels < wanted || lists < wanted) continue;
		const layout: EmbeddedLayout = { levelUp: offset, teachable: offset + 4, eggs: -1, evolutions: -1, evolutionSize: 0 };
		for (const field of [offset + 8, offset + 12]) {
			if (field + 4 > table.stride) break;
			let filled = 0;
			let moves = 0;
			const evolved = [0, 0];
			for (const index of game.real) {
				const at = row(index) + field;
				if (!rom.readUInt32LE(at)) continue;
				filled++;
				const target = pointerAt(rom, at);
				if (parseMoveList(game, target, 0xffff)) moves++;
				[8, 12].forEach((size, slot) => {
					if (embeddedEvolutions(game, target, size)?.length) evolved[slot]++;
				});
			}
			if (filled < 20) continue;
			if (layout.eggs < 0 && field === offset + 8 && moves >= filled * 0.97) {
				layout.eggs = field;
			} else if (layout.evolutions < 0 && Math.max(...evolved) >= filled * 0.9) {
				layout.evolutions = field;
				layout.evolutionSize = evolved[0] >= evolved[1] ? 8 : 12;
			}
		}
		return layout;
	}
	return null;
}

function unique(moves: number[]): number[] {
	return [...new Set(moves)];
}

function setEvolution(evolvesFrom: Map<number, number[]>, from: number, to: number) {
	if (from === to) return;
	const parents = evolvesFrom.get(to);
	if (parents?.includes(from)) return;
	const seen = new Set<number>();
	const queue = [from];
	while (queue.length) {
		const walk = queue.pop()!;
		if (walk === to) return;
		if (seen.has(walk)) continue;
		seen.add(walk);
		queue.push(...evolvesFrom.get(walk) || []);
	}
	if (parents) parents.push(from);
	else evolvesFrom.set(to, [from]);
}

const STARTER_TUTORS: [number, string][] = [[3, 'frenzyplant'], [6, 'blastburn'], [9, 'hydrocannon']];

export function readGen3Learnsets(input: Gen3LearnsetInput): Gen3LearnsetResult {
	const learnsets = new Map<number, Gen3Learnset>();
	const evolvesFrom = new Map<number, number[]>();
	const fail = (reason: string, layout?: any): Gen3LearnsetResult => ({
		status: 'unreadable', note: `The movesets of this game could not be read: ${reason}.`,
		learnsets: new Map(), evolvesFrom: new Map(), layout,
	});
	const rom = input.rom;
	const game = makeGame(rom, input.rows, input.moves);
	if (game.real.length < 20 || game.moveCount < 100) return fail('too few Pokemon or moves were found');
	const checks: [string, number, number][] = [];
	const check = (label: string, read: (index: number) => number[] | null) => {
		const [hits, total] = precision(game, read);
		checks.push([label, hits, total]);
	};
	let debug: any;

	if (input.embedded) {
		const table = input.embedded;
		const layout = locateEmbedded(game, table);
		if (!layout) return fail('the moveset fields of the Pokemon table were not found');
		debug = layout;
		const row = (index: number) => table.start + index * table.stride;
		let broken = 0;
		for (const index of game.real) {
			if (layout.evolutions >= 0 && rom.readUInt32LE(row(index) + layout.evolutions)) {
				const list = embeddedEvolutions(game, pointerAt(rom, row(index) + layout.evolutions), layout.evolutionSize);
				for (const [, , target] of list || []) setEvolution(evolvesFrom, index, target);
			}
			const levelup = readLevelUp(game, pointerAt(rom, row(index) + layout.levelUp), 4);
			const machines = parseMoveList(game, pointerAt(rom, row(index) + layout.teachable), 0xffff);
			let egg: number[] | null = [];
			if (layout.eggs >= 0 && rom.readUInt32LE(row(index) + layout.eggs)) {
				egg = parseMoveList(game, pointerAt(rom, row(index) + layout.eggs), 0xffff);
			}
			if (!levelup || !machines || !egg) {
				broken++;
				continue;
			}
			learnsets.set(index, { levelup, machines: unique(machines), tutor: [], egg: unique(egg) });
		}
		if (broken > game.real.length * 0.03) return fail('the moveset lists of the Pokemon table do not validate', debug);
		if (layout.eggs < 0) return fail('the egg move lists were not found', debug);
	} else {
		let layout: Layout | null = null;
		let stock: Layout | null = null;
		if (input.base) {
			const names = input.base === rom ? null : input.baseNames();
			if (names) {
				stock = locate(makeGame(input.base, names.species, names.moves));
				layout = locateFromBase(game, input.base, stock);
			}
		}
		const followed = !!layout;
		if (!layout) layout = locate(game);
		debug = { followed, ...layout, eggs: layout.eggs && { table: layout.eggs.table, species: layout.eggs.species } };
		const code = rom.toString('latin1', 0xac, 0xaf);
		const hasTutors = code !== 'AXV' && code !== 'AXP';
		if (!followed && layout.levelUp && hasTutors && !layout.teachable && !layout.tutors) {
			layout.problems.push('the move tutor table was not found');
		}
		if (layout.problems.length) return fail(layout.problems.join('; '), debug);
		const { levelUp, eggs, machines, teachable, tutors, evolutions } = layout;
		if (!levelUp || !eggs) return fail('the moveset tables were not found', debug);
		const specials = new Map<number, number>();
		const frlg = code === 'BPR' || code === 'BPG';
		if (frlg && tutors?.count === 15 && (followed ? layout.tutorCodeIntact : input.base === rom)) {
			for (const [index, id] of STARTER_TUTORS) {
				const move = game.moveIds.indexOf(id);
				if (move > 0) specials.set(index, move);
			}
		}
		for (const index of game.real) {
			if (evolutions) {
				const list = readEvolutions(game, evolutions.table, evolutions.perMon, index);
				for (const [method, , target] of list || []) {
					if (method < 0xf0) setEvolution(evolvesFrom, index, target);
				}
			}
			const levelup = readLevelUp(game, pointerAt(rom, levelUp.table + index * 4), levelUp.format);
			if (!levelup) continue;
			let machineMoves: number[] | null = [];
			if (machines) {
				machineMoves = readBits(game, machines, index);
			} else if (teachable) {
				machineMoves = parseMoveList(game, pointerAt(rom, teachable.table + index * 4), teachable.end);
			}
			const tutorMoves = tutors ? readBits(game, tutors, index) : [];
			if (!machineMoves || !tutorMoves) continue;
			const special = specials.get(index);
			if (special) tutorMoves.push(special);
			learnsets.set(index, {
				levelup, machines: unique(machineMoves), tutor: unique(tutorMoves), egg: unique(eggs.moves.get(index) || []),
			});
		}
		if (learnsets.size < game.real.length * 0.97) return fail('the moveset tables do not validate', debug);
	}

	check('level-up', index => learnsets.get(index)?.levelup.map(move => move.move) || null);
	check('machine', index => learnsets.get(index)?.machines || null);
	check('tutor', index => learnsets.get(index)?.tutor || null);
	check('egg', index => learnsets.get(index)?.egg || null);
	debug = { ...debug, checks };
	if (debug.followed === false && officialMoves(game).size >= 40) {
		for (const [label, hits, total] of checks) {
			if (total >= 100 && hits < total * 0.5) return fail(`the ${label} moves read do not look like movesets`, debug);
		}
	}
	return { status: 'read', learnsets, evolvesFrom, layout: debug };
}
