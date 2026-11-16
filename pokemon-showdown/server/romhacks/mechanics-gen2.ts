import { requireSignatures, signatureAnchor, signatureSection } from './signatures';

type Status = 'same' | 'changed' | 'unreadable' | 'notfound' | 'dead';
type Fraction = [number, number];
type Range = [number, number];
type Val = number | number[] | number[][];
interface Vals { [name: string]: Val }
type TableKind = 'bytes' | 'list' | 'pairs' | 'triples' | 'typechart' | 'fracptrs' | 'items';
type MarkType = 'imm' | 'ptr' | 'call';
type SigDef = [number, number, string, { [name: string]: number }];
interface ProbeExtra {
	table?: TableKind;
	length?: number;
	farTable?: boolean;
	shiftPair?: number[];
	tail?: number[];
	back?: { opcode: number, window: number, name: string };
	incs?: number;
}
interface ProbeDef {
	id: string;
	kind: 'code' | 'fuzzy' | 'moves';
	count: number;
	types?: { [name: string]: MarkType };
	extra?: ProbeExtra;
}
interface Sig { tier: number; entry: number; pat: number[]; marks: { [name: string]: number } }
interface Refs { call: number; far: number; pointer: number }
interface Run {
	status: 'ok' | 'unreadable' | 'notfound';
	tier?: number;
	value?: Vals;
	at?: number[];
	entries?: number[];
	note?: string;
}
interface Budget { steps: number }
type Leaf = [string, unknown];

export interface Gen2Names {
	moves?: string[];
	items?: string[];
	types?: string[];
}
export interface Gen2ItemParams {
	powerBoost?: number;
	accuracyMinus255?: number;
	chance?: Fraction;
	healFraction?: Fraction;
	healFlat?: number;
	critStages?: number;
}
export interface Gen2Mechanics {
	critChances?: Fraction[];
	critMultiplier?: number;
	stab?: number;
	damageRoll?: { min: number, max: number, den: number };
	damageLevelDivisor?: number;
	damageDivisor?: number;
	statStages?: Fraction[];
	accuracyStages?: Fraction[];
	multiHit?: [number, number, number, number];
	weatherTurns?: { rain?: number, sun?: number, sand?: number };
	weatherMoveModifiers?: { weather: 'rain' | 'sun', type: string, multiplier: number }[];
	sandDamage?: Fraction;
	sandImmuneTypes?: string[];
	sleepTurns?: Range;
	restSleepTurns?: number;
	confusionTurns?: Range;
	confusionSelfHitChance?: Fraction;
	confusionSelfHitPower?: number;
	attractChance?: Fraction;
	fullParalysisChance?: Fraction;
	paralysisSpeed?: number;
	burnAttack?: number;
	thawChance?: Fraction;
	burnDamage?: Fraction;
	poisonDamage?: Fraction;
	toxicStep?: Fraction;
	leechSeedDamage?: Fraction;
	bindDamage?: Fraction;
	nightmareDamage?: Fraction;
	curseDamage?: Fraction;
	spikesDamage?: Fraction;
	screenTurns?: { reflect?: number, lightscreen?: number, safeguard?: number };
	trapTurns?: Range;
	disableTurns?: Range;
	encoreTurns?: Range;
	thrashTurns?: Range;
	bideTurns?: Range;
	perishCount?: number;
	futureSightTurns?: number;
	recoilFractions?: { quarter?: Fraction };
	substituteCost?: Fraction;
	thunderAccuracy?: { rain?: number | true, sun?: number | true };
	weatherHeal?: Fraction[];
	focusEnergyCritStages?: number;
	flailPower?: [number, number][];
	magnitudePower?: [number, number, number][];
	presentPower?: [number, number][];
	highCritMoves?: string[];
	items?: { [itemId: string]: Gen2ItemParams };
}
export interface Gen2ReportEntry { id: string; status: Status; base?: any; hack?: any }
export interface Gen2TypeCell { attack: string; defend: string; multiplier: number }
export interface Gen2MoveRow {
	index: number;
	effect: number;
	chance: number;
	baseEffect?: number;
	baseChance?: number;
	secondaryChance?: number;
	priority?: number;
}
export interface Gen2ItemRow {
	index: number;
	id: string;
	effect: number;
	param: number;
	baseEffect: number;
	baseParam: number;
}
export interface Gen2ProbeRow {
	id: string;
	status: 'same' | 'changed' | 'found' | 'unreadable' | 'notfound';
	referenced?: boolean;
	note?: string;
}
export interface Gen2MechanicsResult {
	engine: { kind: 'stock' | 'cfru' | 'expansion' | 'rewritten' | 'unknown', live: boolean, detail: string };
	values: Gen2Mechanics;
	report: Gen2ReportEntry[];
	typeChart?: Gen2TypeCell[];
	typeChartInfo?: {
		typeNames: string[],
		foresightIgnored?: { attack: string, defend: string }[],
		unsupported?: Gen2TypeCell[],
		reference: 'base' | 'gen6',
	};
	notes: string[];
	extras: {
		layout: 'binary' | 'rebuilt' | 'unknown',
		located: number,
		probes: Gen2ProbeRow[],
		moves: Gen2MoveRow[],
		itemChanges: Gen2ItemRow[],
		highCritMoveIndexes: number[],
	};
}

const TYPES: { [id: number]: string } = {
	0: 'Normal', 1: 'Fighting', 2: 'Flying', 3: 'Poison', 4: 'Ground', 5: 'Rock', 6: 'Bird', 7: 'Bug', 8: 'Ghost',
	9: 'Steel', 19: '???', 20: 'Fire', 21: 'Water', 22: 'Grass', 23: 'Electric', 24: 'Psychic', 25: 'Ice', 26: 'Dragon',
	27: 'Dark',
};
const MAX_ROM = 0x800000;
const MAX_STEPS = 24000000;
const MARKER = -1;

const PROBE_DEFS: ProbeDef[] = [
	{
		id: 'crit.chances', kind: 'code', count: 1,
		types: { table: 'ptr' },
		extra: { table: 'bytes', length: 7 },
	},
	{
		id: 'crit.moves', kind: 'code', count: 1,
		types: { table: 'ptr' },
		extra: { table: 'list' },
	},
	{
		id: 'crit.stageBonuses', kind: 'code', count: 1,
		types: { species1: 'imm', item1: 'imm', bonus1: 'imm', species2: 'imm', item2: 'imm', bonus2: 'imm' },
	},
	{
		id: 'crit.multiplier', kind: 'code', count: 1,
	},
	{
		id: 'damage.roll', kind: 'code', count: 1,
		types: { min: 'imm', div: 'imm' },
	},
	{
		id: 'stab', kind: 'code', count: 1,
	},
	{
		id: 'typechart', kind: 'code', count: 1,
		types: { table: 'ptr' },
		extra: { table: 'typechart' },
	},
	{
		id: 'weather.rainTurns', kind: 'code', count: 1,
		types: { turns: 'imm' },
	},
	{
		id: 'weather.sunTurns', kind: 'code', count: 1,
		types: { turns: 'imm' },
	},
	{
		id: 'weather.sandTurns', kind: 'code', count: 1,
		types: { turns: 'imm' },
	},
	{
		id: 'weather.typeModifiers', kind: 'code', count: 1,
		types: { table: 'ptr' },
		extra: { table: 'triples' },
	},
	{
		id: 'weather.sandDamage', kind: 'code', count: 1,
		types: { immune1: 'imm', immune2: 'imm', immune3: 'imm', frac: 'call' },
	},
	{
		id: 'sleep.turns', kind: 'code', count: 1,
		types: { mask: 'imm', reject: 'imm' },
		extra: { back: { opcode: 6, window: 12, name: 'mask' } },
	},
	{
		id: 'sleep.restTurns', kind: 'code', count: 1,
		types: { counter: 'imm' },
	},
	{
		id: 'confusion.turns', kind: 'code', count: 1,
		types: { mask: 'imm' },
		extra: { incs: 2 },
	},
	{
		id: 'confusion.selfHitChance', kind: 'code', count: 2,
		types: { chance: 'imm' },
	},
	{
		id: 'confusion.selfHitPower', kind: 'code', count: 1,
		types: { power: 'imm' },
	},
	{
		id: 'attract.immobileChance', kind: 'code', count: 2,
		types: { chance: 'imm' },
	},
	{
		id: 'paralysis.fullChance', kind: 'code', count: 2,
		types: { chance: 'imm' },
	},
	{
		id: 'paralysis.speedShift', kind: 'code', count: 2,
		extra: { shiftPair: [203, 63, 203, 24], tail: [34, 176] },
	},
	{
		id: 'burn.attackShift', kind: 'code', count: 2,
		extra: { shiftPair: [203, 63, 203, 24], tail: [34, 176] },
	},
	{
		id: 'freeze.thawChance', kind: 'code', count: 2,
		types: { chance: 'imm' },
	},
	{
		id: 'multihit', kind: 'code', count: 1,
		types: { mask1: 'imm', threshold: 'imm', mask2: 'imm' },
	},
	{
		id: 'trap.turns', kind: 'code', count: 1,
		types: { mask: 'imm' },
		extra: { incs: 3 },
	},
	{
		id: 'trap.damage', kind: 'code', count: 1,
		types: { frac: 'call' },
	},
	{
		id: 'encore.turns', kind: 'code', count: 1,
		types: { mask: 'imm' },
		extra: { incs: 3 },
	},
	{
		id: 'disable.turns', kind: 'code', count: 1,
		types: { mask: 'imm' },
	},
	{
		id: 'screens.turns', kind: 'code', count: 1,
		types: { lightScreen: 'imm', reflect: 'imm' },
	},
	{
		id: 'safeguard.turns', kind: 'code', count: 1,
		types: { turns: 'imm' },
	},
	{
		id: 'perish.count', kind: 'code', count: 1,
		types: { player: 'imm', enemy: 'imm' },
	},
	{
		id: 'futuresight.count', kind: 'code', count: 1,
		types: { count: 'imm' },
	},
	{
		id: 'leftovers.heal', kind: 'code', count: 1,
		types: { frac: 'call' },
	},
	{
		id: 'residual.poisonBurn', kind: 'code', count: 1,
		types: { frac: 'call', toxicFrac: 'call' },
	},
	{
		id: 'residual.leechSeed', kind: 'code', count: 1,
		types: { frac: 'call' },
	},
	{
		id: 'residual.nightmare', kind: 'code', count: 1,
		types: { frac: 'call' },
	},
	{
		id: 'residual.curse', kind: 'code', count: 1,
		types: { frac: 'call' },
	},
	{
		id: 'spikes.damage', kind: 'code', count: 1,
		types: { frac: 'call', immuneType: 'imm' },
	},
	{
		id: 'recoil.shift', kind: 'code', count: 1,
		extra: { shiftPair: [203, 56, 203, 25], tail: [120, 177, 32, 1, 12] },
	},
	{
		id: 'drain', kind: 'code', count: 1,
	},
	{
		id: 'substitute.shift', kind: 'code', count: 1,
		extra: { shiftPair: [203, 63, 203, 24], tail: [43, 43] },
	},
	{
		id: 'thunder.accuracy', kind: 'code', count: 1,
		types: { sun: 'imm', rain: 'imm' },
	},
	{
		id: 'weatherHeal.fractions', kind: 'code', count: 1,
		types: { table: 'ptr', bank: 'imm' },
		extra: { table: 'fracptrs', length: 4 },
	},
	{
		id: 'rampage.turns', kind: 'code', count: 1,
		types: { mask: 'imm' },
		extra: { incs: 1 },
	},
	{
		id: 'bide.turns', kind: 'code', count: 1,
		types: { mask: 'imm' },
		extra: { incs: 2 },
	},
	{
		id: 'priority', kind: 'code', count: 1,
		types: { lastMove: 'imm', lastPriority: 'imm', table: 'ptr', base: 'imm' },
		extra: { table: 'pairs' },
	},
	{
		id: 'items.attributes', kind: 'code', count: 1,
		types: { table: 'ptr', stride: 'imm', bank: 'imm' },
		extra: { table: 'items', farTable: true },
	},
	{
		id: 'items.typeBoost', kind: 'code', count: 1,
		types: { table: 'ptr', add: 'imm', div: 'imm' },
		extra: { table: 'pairs' },
	},
	{
		id: 'hiddenpower', kind: 'code', count: 1,
		types: { powerBase: 'imm', skip1: 'imm', skip2: 'imm', skipBy: 'imm' },
	},
	{
		id: 'damage.formula', kind: 'code', count: 1,
		types: { levelDiv: 'imm', div: 'imm' },
	},
	{ id: 'statStages', kind: 'fuzzy', count: 2 },
	{ id: 'accuracyStages', kind: 'fuzzy', count: 1 },
	{ id: 'flailPower', kind: 'fuzzy', count: 1 },
	{ id: 'magnitudePower', kind: 'fuzzy', count: 1 },
	{ id: 'presentPower', kind: 'fuzzy', count: 1 },
	{ id: 'moves.effects', kind: 'moves', count: 1 },
];

interface Gen2Signatures {
	signatures: { [id: string]: SigDef[] };
	stock: { [id: string]: Vals };
	maxHpShape: number[];
}
const signatures = () => signatureSection<Gen2Signatures>('gen2');

interface Probe {
	id: string;
	kind: 'code' | 'fuzzy' | 'moves';
	count: number;
	types: { [name: string]: MarkType };
	extra: ProbeExtra;
	sigs: Sig[];
	bytes: number[];
}

let compiled: Probe[] | null = null;

function probeList(): Probe[] {
	if (compiled) return compiled;
	compiled = PROBE_DEFS.map(def => ({
		id: def.id,
		kind: def.kind,
		count: def.count,
		types: def.types || {},
		extra: def.extra || {},
		sigs: (signatures().signatures[def.id] || []).map(([tier, entry, hex, marks]) => {
			const pat: number[] = [];
			for (let i = 0; i < hex.length; i += 2) {
				const pair = hex.slice(i, i + 2);
				pat.push(pair === '??' ? -1 : parseInt(pair, 16));
			}
			return { tier, entry, pat, marks };
		}),
		bytes: def.kind === 'fuzzy' ? signatures().stock[def.id].table as number[] : [],
	}));
	return compiled;
}

const num = (v: Vals, key: string) => v[key] as number;
const list = (v: Vals, key = 'table') => v[key] as number[];
const rows = (v: Vals, key = 'table') => v[key] as number[][];

function u16(rom: Buffer, at: number): number {
	return at >= 0 && at + 1 < rom.length ? rom[at] | (rom[at + 1] << 8) : 0;
}

function spend(budget: Budget, steps: number) {
	budget.steps += steps;
	if (budget.steps > MAX_STEPS) throw new Error('step limit reached');
}

function findSig(rom: Buffer, pat: number[], budget: Budget, limit = 16): number[] {
	let bestStart = 0, bestLen = 0, runStart = -1;
	for (let i = 0; i <= pat.length; i++) {
		if (i < pat.length && pat[i] >= 0) {
			if (runStart < 0) runStart = i;
		} else if (runStart >= 0) {
			if (i - runStart > bestLen) {
				bestLen = i - runStart;
				bestStart = runStart;
			}
			runStart = -1;
		}
	}
	const hits: number[] = [];
	if (!bestLen) return hits;
	const anchor = Buffer.from(pat.slice(bestStart, bestStart + bestLen));
	let from = 0;
	while (hits.length < limit) {
		const found = rom.indexOf(anchor, from);
		if (found < 0) break;
		spend(budget, pat.length);
		from = found + 1;
		const start = found - bestStart;
		if (start < 0 || start + pat.length > rom.length) continue;
		let ok = true;
		for (let i = 0; i < pat.length; i++) {
			if (pat[i] >= 0 && rom[start + i] !== pat[i]) {
				ok = false;
				break;
			}
		}
		if (ok) hits.push(start);
	}
	return hits;
}

function toOffset(address: number, bank: number): number {
	if (address < 0x4000) return address;
	if (address >= 0x8000 || !bank) return -1;
	return bank * 0x4000 + address - 0x4000;
}

function fracShift(rom: Buffer, off: number, depth: number): number | null {
	if (off < 0 || off + 24 > rom.length || depth > 3) return null;
	if (rom[off] !== 0xcd) {
		const shape = signatures().maxHpShape;
		for (let i = 0; i < shape.length; i++) {
			if (shape[i] >= 0 && rom[off + i] !== shape[i]) return null;
		}
		return 0;
	}
	let shift = fracShift(rom, toOffset(u16(rom, off + 1), off >> 14), depth + 1);
	if (shift === null) return null;
	let at = off + 3;
	for (;;) {
		if (shift > 16) return null;
		if (rom[at] === 0xcb && rom[at + 1] === 0x38 && rom[at + 2] === 0xcb && rom[at + 3] === 0x19) {
			shift++;
			at += 4;
		} else if (rom[at] === 0xcb && rom[at + 1] === 0x39) {
			shift++;
			at += 2;
		} else {
			break;
		}
	}
	if (rom[at] !== 0x79 || (rom[at + 1] !== 0xa7 && rom[at + 1] !== 0xb0)) return null;
	const longTail = rom[at + 2] === 0x20 && rom[at + 3] === 0x01 && rom[at + 4] === 0x0c && rom[at + 5] === 0xc9;
	const shortTail = rom[at + 2] === 0xc0 && rom[at + 3] === 0x0c && rom[at + 4] === 0xc9;
	return longTail || shortTail ? shift : null;
}

function readTable(rom: Buffer, off: number, extra: ProbeExtra, values: Vals): Val | null {
	if (off < 0 || off >= rom.length) return null;
	const kind = extra.table;
	const bankEnd = Math.min((off & ~0x3fff) + 0x4000, rom.length);
	if (kind === 'bytes') return Array.from(rom.subarray(off, off + (extra.length || 0)));
	if (kind === 'list') {
		const out: number[] = [];
		for (let at = off; at < bankEnd && out.length <= 64; at++) {
			if (rom[at] === 0xff) return out;
			out.push(rom[at]);
		}
		return null;
	}
	if (kind === 'pairs' || kind === 'triples' || kind === 'typechart') {
		const width = kind === 'pairs' ? 2 : 3;
		const out: number[][] = [];
		let at = off;
		while (at + width <= bankEnd && out.length <= 400) {
			if (rom[at] === 0xff) return out;
			if (kind === 'typechart' && rom[at] === 0xfe) {
				out.push([MARKER]);
				at++;
				continue;
			}
			out.push(Array.from(rom.subarray(at, at + width)));
			at += width;
		}
		return null;
	}
	if (kind === 'fracptrs') {
		const out: number[] = [];
		for (let i = 0; i < (extra.length || 0); i++) {
			const shift = fracShift(rom, toOffset(u16(rom, off + i * 2), num(values, 'bank')), 0);
			if (shift === null) return null;
			out.push(shift);
		}
		return out;
	}
	if (kind === 'items') {
		const out: number[][] = [];
		const stride = num(values, 'stride');
		if (!(stride > 0)) return null;
		for (let i = 0; i < 255 && off + i * stride + 2 <= bankEnd; i++) {
			out.push([rom[off + i * stride], rom[off + i * stride + 1]]);
		}
		return out;
	}
	return null;
}

const inRange = (v: number, lo: number, hi: number) => Number.isInteger(v) && v >= lo && v <= hi;
const isMask = (v: number) => [1, 3, 7, 15, 31].includes(v);
const ratiosRise = (bytes: number[]) => {
	let last = 0;
	for (let i = 0; i < bytes.length; i += 2) {
		if (!bytes[i] || !bytes[i + 1]) return false;
		const ratio = bytes[i] / bytes[i + 1];
		if (ratio <= last) return false;
		last = ratio;
	}
	return bytes[12] === bytes[13];
};
const turnsOk = (v: Vals) => inRange(num(v, 'turns'), 1, 255);
const chanceOk = (v: Vals) => inRange(num(v, 'chance'), 1, 255);
const shiftOk = (v: Vals) => inRange(num(v, 'shift'), 1, 3);
const fracOk = (v: Vals) => inRange(num(v, 'frac'), 1, 5);
const maskOk = (v: Vals) => isMask(num(v, 'mask'));
const VALID: { [id: string]: (v: Vals) => boolean } = {
	'crit.chances': v => list(v).length === 7 && list(v).every((b, i) => b >= 1 && (!i || b >= list(v)[i - 1])),
	'crit.moves': v => list(v).length >= 1 && list(v).length <= 40 && new Set(list(v)).size === list(v).length &&
		list(v).every(b => b >= 1),
	'crit.stageBonuses': v => inRange(num(v, 'bonus1'), 1, 6) && inRange(num(v, 'bonus2'), 1, 6) &&
		num(v, 'species1') > 0 && num(v, 'species2') > 0,
	'damage.roll': v => inRange(num(v, 'min'), 1, 255) && num(v, 'div') >= num(v, 'min'),
	'typechart': v => rows(v).length >= 30 && rows(v).every(
		e => e[0] === MARKER || (e[0] < 0x40 && e[1] < 0x40 && e[2] <= 40 && e[2] % 5 === 0)
	),
	'weather.rainTurns': turnsOk,
	'weather.sunTurns': turnsOk,
	'weather.sandTurns': turnsOk,
	'weather.typeModifiers': v => rows(v).length >= 1 && rows(v).length <= 16 &&
		rows(v).every(e => inRange(e[0], 1, 8) && e[1] < 0x40 && inRange(e[2], 1, 40)),
	'weather.sandDamage': v => fracOk(v) && num(v, 'immune1') < 0x40 && num(v, 'immune2') < 0x40 &&
		num(v, 'immune3') < 0x40,
	'sleep.turns': v => maskOk(v) && num(v, 'reject') <= num(v, 'mask'),
	'sleep.restTurns': v => inRange(num(v, 'counter'), 2, 7),
	'confusion.turns': maskOk,
	'confusion.selfHitChance': chanceOk,
	'confusion.selfHitPower': v => inRange(num(v, 'power'), 1, 250),
	'attract.immobileChance': chanceOk,
	'paralysis.fullChance': chanceOk,
	'paralysis.speedShift': shiftOk,
	'burn.attackShift': shiftOk,
	'freeze.thawChance': chanceOk,
	'multihit': v => isMask(num(v, 'mask1')) && isMask(num(v, 'mask2')) &&
		inRange(num(v, 'threshold'), 0, num(v, 'mask1') + 1) && num(v, 'mask1') <= 3 && num(v, 'mask2') <= 3,
	'trap.turns': maskOk,
	'trap.damage': fracOk,
	'encore.turns': maskOk,
	'disable.turns': maskOk,
	'screens.turns': v => inRange(num(v, 'lightScreen'), 1, 255) && inRange(num(v, 'reflect'), 1, 255),
	'safeguard.turns': turnsOk,
	'perish.count': v => inRange(num(v, 'player'), 1, 15) && inRange(num(v, 'enemy'), 1, 15),
	'futuresight.count': v => inRange(num(v, 'count'), 1, 15),
	'leftovers.heal': fracOk,
	'residual.poisonBurn': v => fracOk(v) && inRange(num(v, 'toxicFrac'), 1, 5),
	'residual.leechSeed': fracOk,
	'residual.nightmare': fracOk,
	'residual.curse': fracOk,
	'spikes.damage': v => fracOk(v) && num(v, 'immuneType') < 0x40,
	'recoil.shift': shiftOk,
	'substitute.shift': shiftOk,
	'thunder.accuracy': v => inRange(num(v, 'sun'), 1, 255) && inRange(num(v, 'rain'), 1, 255),
	'weatherHeal.fractions': v => list(v).length === 4 && list(v).every(s => inRange(s, 0, 5)),
	'rampage.turns': maskOk,
	'bide.turns': maskOk,
	'priority': v => rows(v).length <= 32 && rows(v).every(e => e[1] <= 7) && num(v, 'base') <= 7 &&
		num(v, 'lastPriority') <= 7,
	'items.attributes': v => inRange(num(v, 'stride'), 5, 12) && rows(v).length >= 100,
	'items.typeBoost': v => rows(v).length >= 1 && rows(v).length <= 32 && rows(v).every(e => e[1] < 0x40) &&
		num(v, 'add') > 0 && num(v, 'div') > 0,
	'hiddenpower': v => inRange(num(v, 'powerBase'), 0, 200) && num(v, 'skip1') < num(v, 'skip2') &&
		num(v, 'skipBy') < 0x40,
	'damage.formula': v => inRange(num(v, 'levelDiv'), 1, 50) && inRange(num(v, 'div'), 1, 255),
	'statStages': v => ratiosRise(list(v)),
	'accuracyStages': v => ratiosRise(list(v)),
	'flailPower': v => list(v).every((b, i) => b > 0 && (i < 2 || (i % 2 ? b <= list(v)[i - 2] : b > list(v)[i - 2]))),
	'magnitudePower': v => list(v)[18] === 255 &&
		list(v).every((b, i) => b > 0 && (i < 3 || i % 3 === 2 || b >= list(v)[i - 3])),
	'presentPower': v => {
		const t = list(v);
		return t[6] === 255 && t[0] < t[2] && t[2] < t[4] && t[1] > 0 && t[3] > 0 && t[5] > 0;
	},
};

const JUMPS = new Set([0xcd, 0xc3, 0xc2, 0xca, 0xd2, 0xda, 0xc4, 0xcc, 0xd4, 0xdc]);

function refsTo(rom: Buffer, entry: number): Refs | null {
	if (entry < 0) return null;
	const bank = entry >> 14;
	const address = bank ? 0x4000 + (entry & 0x3fff) : entry;
	const lo = address & 0xff, hi = address >> 8;
	const out: Refs = { call: 0, far: 0, pointer: 0 };
	const word = (at: number) => at >= 0 && at + 1 < rom.length && rom[at + 1] >= 0x40 && rom[at + 1] < 0x80;
	const tableLike = (at: number) => {
		let before = 0, after = 0;
		while (before < 5 && word(at - 2 * (before + 1))) before++;
		while (after < 5 && word(at + 2 * (after + 1))) after++;
		return before >= 5 || after >= 5 || (before >= 3 && after >= 3);
	};
	const scan = (start: number, end: number, local: boolean) => {
		const stop = Math.min(end, rom.length);
		for (let at = Math.max(start, 0); at + 1 < stop; at++) {
			if (rom[at] !== lo || rom[at + 1] !== hi) continue;
			if (local && JUMPS.has(rom[at - 1])) {
				out.call++;
			} else if (rom[at - 1] === 0x21 &&
				((rom[at - 3] === 0x3e && rom[at - 2] === bank) || (rom[at + 2] === 0x3e && rom[at + 3] === bank))) {
				out.far++;
			} else if (local || tableLike(at)) {
				out.pointer++;
			}
		}
	};
	if (bank) {
		scan(bank * 0x4000, bank * 0x4000 + 0x4000, true);
		scan(0, bank * 0x4000, false);
		scan(bank * 0x4000 + 0x4000, rom.length, false);
	} else {
		scan(0, 0x4000, true);
	}
	return out;
}

function canon(v: Vals): string {
	return JSON.stringify(Object.keys(v).sort().map(key => [key, v[key]]));
}

function runCode(rom: Buffer, probe: Probe, budget: Budget): Run {
	for (const tier of [1, 2]) {
		const found = new Map<number, { start: number, sig: Sig }>();
		for (const sig of probe.sigs) {
			if (sig.tier !== tier) continue;
			for (const start of findSig(rom, sig.pat, budget)) {
				const key = start + sig.pat.length;
				if (!found.has(key)) found.set(key, { start, sig });
			}
		}
		if (!found.size) continue;
		if (found.size !== probe.count) {
			return { status: 'unreadable', note: `signature matched ${found.size} places, expected ${probe.count}` };
		}
		const decoded: { values: Vals, start: number, entry: number }[] = [];
		for (const { start, sig } of found.values()) {
			const values: Vals = {};
			const bank = start >> 14;
			let bad = '';
			for (const name in sig.marks) {
				const at = start + sig.marks[name];
				values[name] = probe.types[name] === 'imm' ? rom[at] : u16(rom, at);
			}
			for (const name in sig.marks) {
				const type = probe.types[name];
				if (type === 'call') {
					const shift = fracShift(rom, toOffset(num(values, name), bank), 0);
					if (shift === null) bad = `${name}: the called routine is not a known max-HP fraction helper`;
					values[name] = shift === null ? -1 : shift;
				} else if (type === 'ptr') {
					const tableBank = probe.extra.farTable ? num(values, 'bank') : bank;
					const table = readTable(rom, toOffset(num(values, name), tableBank), probe.extra, values);
					if (table === null) bad = `${name}: the table did not decode`;
					values[name] = table === null ? [] : table;
				}
			}
			const pair = probe.extra.shiftPair;
			if (pair) {
				let at = start + sig.pat.length;
				let shift = 0;
				while (shift < 16 && pair.every((b, i) => rom[at + i] === b)) {
					shift++;
					at += pair.length;
				}
				if (!(probe.extra.tail || []).every((b, i) => rom[at + i] === b)) {
					bad = 'shift sequence is followed by unexpected code';
				}
				values.shift = shift;
			}
			const back = probe.extra.back;
			if (back) {
				let seen = false;
				for (let at = Math.max(start - back.window, 0); at < start - 1; at++) {
					if (rom[at] === back.opcode) {
						values[back.name] = rom[at + 1];
						seen = true;
						break;
					}
				}
				if (!seen && values[back.name] === undefined) {
					bad = `${back.name}: the instruction that sets it was not found`;
				}
			}
			if (probe.extra.incs) values.add = probe.extra.incs;
			if (!Object.keys(values).length) values.present = 1;
			const valid = VALID[probe.id];
			if (!bad && valid && !valid(values)) bad = 'value failed the sanity check';
			if (bad) return { status: 'unreadable', note: bad };
			decoded.push({ values, start, entry: start - sig.entry });
		}
		const first = canon(decoded[0].values);
		if (decoded.some(d => canon(d.values) !== first)) {
			return { status: 'unreadable', note: 'the copies of this code disagree' };
		}
		return {
			status: 'ok', tier, value: decoded[0].values,
			at: decoded.map(d => d.start), entries: decoded.map(d => d.entry),
		};
	}
	return { status: 'notfound' };
}

function runFuzzy(rom: Buffer, probe: Probe): Run {
	const want = probe.bytes;
	const need = Math.ceil(want.length * 0.7);
	const valid = VALID[probe.id];
	const hits: { at: number, value: Vals }[] = [];
	for (let at = 0; at + want.length <= rom.length && hits.length < 8; at++) {
		let same = 0;
		for (let i = 0; i < want.length; i++) {
			if (rom[at + i] === want[i]) same++;
			else if (want.length - i - 1 + same < need) break;
		}
		if (same < need) continue;
		const value: Vals = { table: Array.from(rom.subarray(at, at + want.length)) };
		if (valid(value)) {
			hits.push({ at, value });
			at += want.length - 1;
		}
	}
	if (!hits.length) return { status: 'notfound' };
	if (hits.length !== probe.count) {
		return { status: 'unreadable', note: `table matched ${hits.length} places, expected ${probe.count}` };
	}
	const text = canon(hits[0].value);
	if (hits.some(h => canon(h.value) !== text)) {
		return { status: 'unreadable', note: 'the copies of this table disagree' };
	}
	return { status: 'ok', value: hits[0].value, at: hits.map(h => h.at) };
}

function runMoves(rom: Buffer, budget: Budget): Run {
	const anchor = signatureAnchor('poundMoveGen2');
	let from = 0;
	for (;;) {
		const hit = rom.indexOf(anchor, from);
		if (hit < 0) return { status: 'notfound' };
		spend(budget, 1);
		from = hit + 1;
		if (rom[hit + 4] === 255 && rom[hit + 5] === 35 && rom[hit + 7] === 2 && rom[hit + 9] === 50 &&
			rom[hit + 14] === 3 && rom[hit + 16] === 15) {
			const table: number[][] = [];
			for (let i = 0; i < 255 && rom[hit + i * 7] === i + 1; i++) {
				table.push([rom[hit + i * 7 + 1], rom[hit + i * 7 + 6]]);
			}
			if (table.length < 100) return { status: 'unreadable', note: 'move table is too short' };
			return { status: 'ok', value: { table }, at: [hit] };
		}
	}
}

function probeAll(rom: Buffer, budget: Budget): { [id: string]: Run } {
	const out: { [id: string]: Run } = {};
	for (const probe of probeList()) {
		if (probe.kind === 'code') out[probe.id] = runCode(rom, probe, budget);
		else if (probe.kind === 'fuzzy') out[probe.id] = runFuzzy(rom, probe);
		else out[probe.id] = runMoves(rom, budget);
	}
	return out;
}

function referenced(rom: Buffer, run: Run): boolean | undefined {
	if (run.status !== 'ok' || !run.entries) return undefined;
	return run.entries.some(entry => {
		const refs = refsTo(rom, entry);
		return !!refs && refs.call + refs.far + refs.pointer > 0;
	});
}

const HELD_EFFECTS: { [effect: number]: string } = {
	1: 'restores HP when HP is low', 3: 'restores a little HP every turn', 6: 'restores PP when a move runs out',
	8: 'makes wild Pokemon appear less often', 10: 'cures poison', 11: 'cures freezing', 12: 'cures a burn', 13: 'cures sleep',
	14: 'cures paralysis', 15: 'cures any status problem', 16: 'cures confusion', 20: 'prevents poison', 21: 'prevents burns',
	22: 'prevents freezing', 23: 'prevents sleep', 24: 'prevents paralysis', 25: 'prevents confusion', 31: 'raises Attack',
	32: 'raises Defense', 33: 'raises Speed', 34: 'raises Special Attack', 35: 'raises Special Defense', 36: 'raises accuracy',
	37: 'raises evasion', 42: 'raises the Defense of Ditto', 50: 'boosts Normal-type moves', 51: 'boosts Fighting-type moves',
	52: 'boosts Flying-type moves', 53: 'boosts Poison-type moves', 54: 'boosts Ground-type moves', 55: 'boosts Rock-type moves',
	56: 'boosts Bug-type moves', 57: 'boosts Ghost-type moves', 58: 'boosts Fire-type moves', 59: 'boosts Water-type moves',
	60: 'boosts Grass-type moves', 61: 'boosts Electric-type moves', 62: 'boosts Psychic-type moves', 63: 'boosts Ice-type moves',
	64: 'boosts Dragon-type moves', 65: 'boosts Dark-type moves', 66: 'boosts Steel-type moves',
	70: 'raises the catch rate (an effect the official games never use)', 72: 'guarantees escape from wild battles',
	73: 'raises the critical-hit rate', 74: 'sometimes lets the holder move first', 75: 'may make the target flinch',
	76: 'doubles prize money', 77: 'lowers the accuracy of moves used on the holder', 79: 'may leave the holder with 1 HP',
};

function heldEffectText(effect: number): string {
	if (!effect) return 'no held effect';
	const text = HELD_EFFECTS[effect];
	return text ? `"${text}"` : `a held effect this reader does not know (number ${effect})`;
}

function itemLabel(name: string): string {
	const text = name.trim();
	if (/[a-z]/.test(text)) return text;
	return text.toLowerCase().replace(
		/(^|[ -])([a-z])/g, (all, lead: string, letter: string) => lead + letter.toUpperCase()
	);
}

function toID(text: string | undefined): string {
	return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function gbText(text: string, end = 0x50): Buffer {
	const out: number[] = [];
	for (const ch of text) {
		const code = ch.charCodeAt(0);
		if (ch === '@') out.push(end);
		else if (ch === ' ') out.push(0x7f);
		else if (code >= 97) out.push(0xa0 + code - 97);
		else out.push(0x80 + code - 65);
	}
	return Buffer.from(out);
}

const SILENT = new Set([0x7f, 0xe0, 0xe3, 0xe6, 0xe7, 0xe8, 0x9a, 0x9b, 0x9c, 0xf4, 0xf3]);

function readNames(rom: Buffer, anchor: string): string[] {
	let at = rom.indexOf(gbText(anchor));
	const out: string[] = [];
	if (at < 0) return out;
	while (out.length < 255) {
		let text = '';
		let ok = false;
		let unknown = 0;
		for (let i = 0; i <= 24 && at + i < rom.length; i++) {
			const b = rom[at + i];
			if (b === 0x50) {
				at += i + 1;
				ok = unknown < 3 && (unknown === 0 || text.length > 4);
				break;
			}
			if (b >= 0x80 && b <= 0x99) text += String.fromCharCode(97 + b - 0x80);
			else if (b >= 0xa0 && b <= 0xb9) text += String.fromCharCode(97 + b - 0xa0);
			else if (b >= 0xf6) text += String(b - 0xf6);
			else if (b === 0x54) text += 'poke';
			else if (b === 0xba) text += 'e';
			else if (b === 0xef) text += 'm';
			else if (b === 0xf5) text += 'f';
			else if (SILENT.has(b)) text += ' ';
			else unknown++;
		}
		if (!ok) break;
		out.push(text);
	}
	return out;
}

interface Context {
	typeName: (id: number) => string;
	moveId: (index: number) => string;
	itemId: (index: number) => string;
}

const frac = (shift: number): Fraction => [1, 2 ** shift];
const chance = (n: number): Fraction => [n, 256];

function pairsOf(table: number[], width: number): number[][] {
	const out: number[][] = [];
	for (let i = 0; i + width <= table.length; i += width) out.push(table.slice(i, i + width));
	return out;
}

function gcd(a: number, b: number): number {
	while (b) [a, b] = [b, a % b];
	return a;
}

function convert(id: string, v: Vals, ref: Vals | undefined, ctx: Context): Leaf[] {
	switch (id) {
	case 'crit.chances': return [['critChances', list(v).map(chance)]];
	case 'crit.moves': {
		const ids = list(v).map(ctx.moveId);
		return ids.every(Boolean) ? [['highCritMoves', ids]] : [['info.highCritMoveIndexes', list(v)]];
	}
	case 'crit.stageBonuses': {
		const out: Leaf[] = [['focusEnergyCritStages', 1]];
		for (const n of ['1', '2']) {
			const item = num(ref || v, 'item' + n);
			const itemId = ctx.itemId(item);
			const moved = !!ref &&
				(num(ref, 'item' + n) !== num(v, 'item' + n) || num(ref, 'species' + n) !== num(v, 'species' + n));
			if (itemId) out.push([`items.${itemId}.critStages`, moved ? null : num(v, 'bonus' + n)]);
		}
		out.push(['info.critSpeciesItemBonuses', [
			[num(v, 'species1'), num(v, 'item1'), num(v, 'bonus1')],
			[num(v, 'species2'), num(v, 'item2'), num(v, 'bonus2')],
		]]);
		return out;
	}
	case 'crit.multiplier': return [['critMultiplier', 2]];
	case 'stab': return [['stab', 1.5]];
	case 'damage.roll': return [['damageRoll', { min: num(v, 'min'), max: 255, den: num(v, 'div') }]];
	case 'damage.formula': return [['damageLevelDivisor', num(v, 'levelDiv')], ['damageDivisor', num(v, 'div')]];
	case 'weather.rainTurns': return [['weatherTurns.rain', num(v, 'turns')]];
	case 'weather.sunTurns': return [['weatherTurns.sun', num(v, 'turns')]];
	case 'weather.sandTurns': return [['weatherTurns.sand', num(v, 'turns')]];
	case 'weather.typeModifiers': {
		const table = rows(v);
		if (!table.every(e => e[0] === 1 || e[0] === 2)) return [['weatherMoveModifiers', null]];
		return [['weatherMoveModifiers', table.map(e => ({
			weather: e[0] === 1 ? 'rain' : 'sun', type: ctx.typeName(e[1]), multiplier: e[2] / 10,
		}))]];
	}
	case 'weather.sandDamage': return [
		['sandDamage', frac(num(v, 'frac'))],
		['sandImmuneTypes', [num(v, 'immune1'), num(v, 'immune2'), num(v, 'immune3')].map(ctx.typeName)],
	];
	case 'sleep.turns': {
		const lost: number[] = [];
		for (let r = 1; r <= num(v, 'mask'); r++) if (r !== num(v, 'reject')) lost.push(r);
		const contiguous = lost.length > 0 && lost[lost.length - 1] - lost[0] === lost.length - 1;
		return [['sleepTurns', contiguous ? [lost[0], lost[lost.length - 1]] : null]];
	}
	case 'sleep.restTurns': return [['restSleepTurns', num(v, 'counter') - 1]];
	case 'confusion.turns': return [['confusionTurns', [num(v, 'add') - 1, num(v, 'add') + num(v, 'mask') - 1]]];
	case 'confusion.selfHitChance': return [['confusionSelfHitChance', chance(num(v, 'chance'))]];
	case 'confusion.selfHitPower': return [['confusionSelfHitPower', num(v, 'power')]];
	case 'attract.immobileChance': return [['attractChance', chance(256 - num(v, 'chance'))]];
	case 'paralysis.fullChance': return [['fullParalysisChance', chance(num(v, 'chance'))]];
	case 'paralysis.speedShift': return [['paralysisSpeed', 1 / 2 ** num(v, 'shift')]];
	case 'burn.attackShift': return [['burnAttack', 1 / 2 ** num(v, 'shift')]];
	case 'freeze.thawChance': return [['thawChance', chance(num(v, 'chance'))]];
	case 'multihit': {
		const weights = [0, 0, 0, 0];
		for (let a = 0; a <= num(v, 'mask1'); a++) {
			if (a < num(v, 'threshold')) {
				weights[a] += num(v, 'mask2') + 1;
			} else {
				for (let b = 0; b <= num(v, 'mask2'); b++) weights[b]++;
			}
		}
		const divisor = weights.reduce(gcd);
		return [['multiHit', weights.map(w => w / divisor)]];
	}
	case 'trap.turns': return [['trapTurns', [num(v, 'add'), num(v, 'add') + num(v, 'mask')]]];
	case 'trap.damage': return [['bindDamage', frac(num(v, 'frac'))]];
	case 'encore.turns': return [['encoreTurns', [num(v, 'add'), num(v, 'add') + num(v, 'mask')]]];
	case 'disable.turns': return [['disableTurns', [2, num(v, 'mask') + 1]]];
	case 'screens.turns': return [
		['screenTurns.lightscreen', num(v, 'lightScreen')], ['screenTurns.reflect', num(v, 'reflect')],
	];
	case 'safeguard.turns': return [['screenTurns.safeguard', num(v, 'turns')]];
	case 'perish.count': return [['perishCount', num(v, 'player') === num(v, 'enemy') ? num(v, 'player') : null]];
	case 'futuresight.count': return [['futureSightTurns', num(v, 'count')]];
	case 'residual.poisonBurn': return [
		['burnDamage', frac(num(v, 'frac'))], ['poisonDamage', frac(num(v, 'frac'))],
		['toxicStep', frac(num(v, 'toxicFrac'))],
	];
	case 'residual.leechSeed': return [['leechSeedDamage', frac(num(v, 'frac'))]];
	case 'residual.nightmare': return [['nightmareDamage', frac(num(v, 'frac'))]];
	case 'residual.curse': return [['curseDamage', frac(num(v, 'frac'))]];
	case 'spikes.damage': return [
		['spikesDamage', frac(num(v, 'frac'))], ['info.spikesImmuneType', ctx.typeName(num(v, 'immuneType'))],
	];
	case 'recoil.shift': return [['recoilFractions.quarter', frac(num(v, 'shift'))]];
	case 'drain': return [['info.drain', [1, 2]]];
	case 'substitute.shift': return [['substituteCost', frac(num(v, 'shift'))]];
	case 'thunder.accuracy': {
		const percent = (n: number) => (n === 255 ? true : Math.round(n * 100 / 255));
		return [['thunderAccuracy.rain', percent(num(v, 'rain'))], ['thunderAccuracy.sun', percent(num(v, 'sun'))]];
	}
	case 'weatherHeal.fractions': return [['weatherHeal', list(v).map(frac)]];
	case 'rampage.turns': return [['thrashTurns', [num(v, 'add') + 1, num(v, 'add') + num(v, 'mask') + 1]]];
	case 'bide.turns': return [['bideTurns', [num(v, 'add') + 1, num(v, 'add') + num(v, 'mask') + 1]]];
	case 'priority': return [['info.priority', {
		byEffect: rows(v), base: num(v, 'base'), lastMove: num(v, 'lastMove'), lastPriority: num(v, 'lastPriority'),
	}]];
	case 'items.typeBoost': return [['info.items.typeBoost', {
		add: num(v, 'add'), div: num(v, 'div'), types: rows(v).map(e => [e[0], ctx.typeName(e[1])]),
	}]];
	case 'hiddenpower': return [['info.hiddenpower', {
		minPower: num(v, 'powerBase') + 1, skip1: num(v, 'skip1'), skip2: num(v, 'skip2'), skipBy: num(v, 'skipBy'),
	}]];
	case 'statStages': return [['statStages', pairsOf(list(v), 2)]];
	case 'accuracyStages': return [['accuracyStages', pairsOf(list(v), 2)]];
	case 'flailPower': return [['flailPower', pairsOf(list(v), 2)]];
	case 'magnitudePower': return [['magnitudePower', pairsOf(list(v), 3)]];
	case 'presentPower': return [['presentPower', pairsOf(list(v).slice(0, 6), 2)]];
	}
	return [];
}

const SPECIAL = new Set(['typechart', 'items.attributes', 'leftovers.heal', 'moves.effects']);
const RANK: { [status: string]: number } = { same: 0, changed: 1, notfound: 2, dead: 3, unreadable: 4 };
const worst = (a: Status, b: Status): Status => (RANK[b] > RANK[a] ? b : a);

interface Chart { cells: Map<string, number>; foresight: string[] }

function chartOf(table: number[][]): Chart {
	const cells = new Map<string, number>();
	const foresight: string[] = [];
	let marked = false;
	for (const row of table) {
		if (row[0] === MARKER) {
			marked = true;
			continue;
		}
		const key = `${row[0]}>${row[1]}`;
		const earlier = cells.get(key);
		cells.set(key, (earlier === undefined ? 1 : earlier) * row[2] / 10);
		if (marked && !foresight.includes(key)) foresight.push(key);
	}
	for (const key of Array.from(cells.keys())) {
		if (cells.get(key) === 1) cells.delete(key);
	}
	return { cells, foresight };
}

function chartText(chart: Chart): string {
	const cells = Array.from(chart.cells.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
	return JSON.stringify([cells, chart.foresight.slice().sort()]);
}

function setPath(target: { [key: string]: any }, path: string, value: unknown) {
	const parts = path.split('.');
	let at = target;
	for (let i = 0; i + 1 < parts.length; i++) {
		if (!Object.prototype.hasOwnProperty.call(at, parts[i])) at[parts[i]] = {};
		at = at[parts[i]];
	}
	at[parts[parts.length - 1]] = value;
}

function emptyResult(kind: 'rewritten' | 'unknown', detail: string, notes: string[] = []): Gen2MechanicsResult {
	return {
		engine: { kind, live: false, detail },
		values: {},
		report: [],
		notes,
		extras: { layout: 'unknown', located: 0, probes: [], moves: [], itemChanges: [], highCritMoveIndexes: [] },
	};
}

const LOGO = 0xceed6666;
const counted = (text: string) => Buffer.concat([Buffer.from([text.length + 1]), gbText(text)]);

function strings(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	return value.map(entry => (typeof entry === 'string' ? entry : ''));
}

function movePriority(priority: Vals, effect: number, index: number): number {
	if (index === num(priority, 'lastMove')) return num(priority, 'lastPriority') - num(priority, 'base');
	const row = rows(priority).find(e => e[0] === effect);
	return (row ? row[1] : num(priority, 'base')) - num(priority, 'base');
}

function examine(rom: Buffer, base: Buffer | null, names: Gen2Names): Gen2MechanicsResult {
	if (!Buffer.isBuffer(rom) || rom.length < 0x8000 || rom.length > MAX_ROM) {
		return emptyResult('unknown', 'Not a Game Boy ROM of a supported size.');
	}
	if (base && (!Buffer.isBuffer(base) || base.length < 0x8000 || base.length > MAX_ROM)) base = null;
	const budget: Budget = { steps: 0 };
	const all = probeList();
	const hackRun = probeAll(rom, budget);
	const located = all.filter(probe => hackRun[probe.id].status === 'ok').length;
	const title = rom.toString('latin1', 0x134, 0x13f);
	const game = title.startsWith('POKEMON_GLD') ? 'Gold' : title.startsWith('POKEMON_SLV') ? 'Silver' :
		title.startsWith('PM_CRYSTAL') ? 'Crystal' : '';

	if (located < all.length * 0.6) {
		const found = `${located} of ${all.length} stock battle-engine probes were located`;
		let engine = '';
		if (rom.includes(gbText('Bulbasaur@Ivysaur@', 0x53))) {
			engine = 'Polished Crystal';
		} else if (rom.includes(Buffer.concat([counted('Pound'), counted('Karate Chop')]))) {
			engine = 'Prism';
		} else if (rom.readUInt32BE(0x104) === LOGO && (game || rom.includes(signatureAnchor('bulbasaurEntryGen2')))) {
			engine = 'a replaced battle engine';
		}
		if (!engine) return emptyResult('unknown', `No Gen 2 battle engine was recognised (${found}).`);
		const label = engine === 'a replaced battle engine' ? 'Replaced (unknown)' : engine;
		const result = emptyResult('rewritten', `${label}: ${found}.`, [
			`This game runs on ${engine}, not the stock Gen 2 battle engine, so its battle mechanics were not read.`,
		]);
		result.extras.located = located;
		result.extras.probes = all.map(probe => {
			const status = hackRun[probe.id].status;
			return { id: probe.id, status: status === 'ok' ? 'found' : status };
		});
		return result;
	}

	const baseRun = base ? probeAll(base, budget) : null;
	const moveNames = strings(names.moves) || readNames(rom, 'POUND@KARATE CHOP@');
	const itemNames = strings(names.items) || readNames(rom, 'MASTER BALL@ULTRA BALL@');
	const itemIds = itemNames.map(toID);
	const itemCount: { [id: string]: number } = {};
	for (const id of itemIds) itemCount[id] = (itemCount[id] || 0) + 1;
	const typeNames = strings(names.types) || [];
	const ctx: Context = {
		typeName: id => typeNames[id] || TYPES[id] || `Type${id}`,
		moveId: index => toID(moveNames[index - 1]),
		itemId: index => {
			const id = itemIds[index - 1] || '';
			return id && id !== 'terusama' && itemCount[id] === 1 ? id : '';
		},
	};

	const live: { [id: string]: boolean | undefined } = {};
	const inPlace: { [id: string]: boolean } = {};
	let moved = 0, compared = 0;
	for (const probe of all) {
		const mine = hackRun[probe.id];
		if (probe.kind === 'code') live[probe.id] = referenced(rom, mine);
		const theirs = baseRun?.[probe.id];
		if (mine.status !== 'ok' || theirs?.status !== 'ok') continue;
		compared++;
		inPlace[probe.id] = String(mine.at) === String(theirs.at);
		if (!inPlace[probe.id]) moved++;
	}
	const layout = !baseRun ? 'unknown' : moved > compared / 2 ? 'rebuilt' : 'binary';
	const baseLive: { [id: string]: boolean | undefined } = {};
	const adjust = (id: string, status: Status): Status => {
		if (live[id] !== false || (status !== 'same' && status !== 'changed')) return status;
		if (!inPlace[id] || !base || !baseRun) return status;
		if (!(id in baseLive)) baseLive[id] = referenced(base, baseRun[id]);
		return baseLive[id] ? 'dead' : status;
	};
	const reference = (id: string): Vals | undefined => {
		if (baseRun?.[id].status === 'ok') return baseRun[id].value;
		return signatures().stock[id];
	};

	const values: { [key: string]: any } = {};
	const report: Gen2ReportEntry[] = [];
	const notes: string[] = [];
	const push = (id: string, status: Status, baseValue: unknown, hackValue: unknown) => {
		if (report.some(entry => entry.id === id)) return;
		const entry: Gen2ReportEntry = { id, status };
		if (baseValue !== undefined) entry.base = baseValue;
		if (hackValue !== undefined && hackValue !== null && (status === 'same' || status === 'changed')) {
			entry.hack = hackValue;
			if (!id.startsWith('info.')) setPath(values, id, hackValue);
		}
		report.push(entry);
	};
	const probeRows: Gen2ProbeRow[] = [];
	let same = 0, changed = 0;

	for (const probe of all) {
		const mine = hackRun[probe.id];
		let strict: Vals | undefined = signatures().stock[probe.id];
		if (baseRun) strict = baseRun[probe.id].status === 'ok' ? baseRun[probe.id].value : undefined;
		const row: Gen2ProbeRow = { id: probe.id, status: mine.status === 'ok' ? 'found' : mine.status };
		if (mine.status === 'ok' && mine.value && strict) {
			row.status = canon(strict) === canon(mine.value) ? 'same' : 'changed';
		}
		if (live[probe.id] !== undefined) row.referenced = live[probe.id];
		if (mine.note) row.note = mine.note;
		else if (mine.tier === 2) row.note = 'matched with relaxed jump offsets';
		probeRows.push(row);
		if (row.status === 'same') same++;
		if (row.status === 'changed') changed++;
		if (SPECIAL.has(probe.id)) continue;

		const ref = reference(probe.id);
		const refLeaves = ref ? convert(probe.id, ref, ref, ctx) : [];
		if (mine.status !== 'ok' || !mine.value) {
			const status: Status = mine.status === 'ok' ? 'unreadable' : mine.status;
			if (!refLeaves.length) push(`info.probe.${probe.id}`, status, undefined, undefined);
			for (const [path, value] of refLeaves) push(path, status, value === null ? undefined : value, undefined);
			continue;
		}
		for (const [path, value] of convert(probe.id, mine.value, ref, ctx)) {
			const refLeaf = refLeaves.find(leaf => leaf[0] === path);
			const baseValue = refLeaf && refLeaf[1] !== null ? refLeaf[1] : undefined;
			let status: Status = 'changed';
			if (value === null) status = 'unreadable';
			else if (baseValue !== undefined && JSON.stringify(baseValue) === JSON.stringify(value)) status = 'same';
			push(path, path.startsWith('info.') ? status : adjust(probe.id, status), baseValue, value);
		}
	}

	const attrHack = hackRun['items.attributes'];
	const attrBaseRun = baseRun ? baseRun['items.attributes'] : undefined;
	const attrBase = attrBaseRun?.status === 'ok' ? attrBaseRun.value : undefined;
	const boostHack = hackRun['items.typeBoost'];
	const boostBase = reference('items.typeBoost');
	const leftHack = hackRun['leftovers.heal'];
	const leftBase = reference('leftovers.heal');
	let leftStatus: Status = leftHack.status === 'ok' ? 'unreadable' : leftHack.status;
	let leftValue: Fraction | undefined;
	if (leftHack.status === 'ok' && leftHack.value) {
		leftValue = frac(num(leftHack.value, 'frac'));
		const equal = !!leftBase && num(leftBase, 'frac') === num(leftHack.value, 'frac');
		leftStatus = adjust('leftovers.heal', equal ? 'same' : 'changed');
	}
	const leftBaseValue = leftBase ? frac(num(leftBase, 'frac')) : undefined;
	const itemChanges: Gen2ItemRow[] = [];
	let leftoversDone = false;
	const baseItemIds = base ? readNames(base, 'MASTER BALL@ULTRA BALL@').map(toID) : [];
	const baseSlots: { [id: string]: number } = {};
	for (const [slot, id] of baseItemIds.entries()) baseSlots[id] = id in baseSlots ? -1 : slot;
	const attrKnown = new Set(attrBase ? rows(attrBase).map(row => `${row[0]}:${row[1]}`) : []);
	const attrFamiliar = attrHack.status === 'ok' && attrHack.value ?
		rows(attrHack.value).filter(row => attrKnown.has(`${row[0]}:${row[1]}`)).length : 0;
	const attrTrusted = attrHack.status === 'ok' && !!attrHack.value && !!attrBase &&
		attrFamiliar * 2 >= rows(attrHack.value).length;
	if (attrHack.status === 'ok' && attrHack.value && attrBase && !attrTrusted) {
		push('info.items.attributes', 'unreadable', undefined, undefined);
		notes.push('The item table was found but most of its rows match no base game item, so it was not compared.');
	} else if (attrHack.status === 'ok' && attrHack.value && attrBase) {
		const hackRows = rows(attrHack.value);
		const baseRows = rows(attrBase);
		const hackItemIds = new Set(itemIds);
		const baseRowFor = (slot: number, id: string) => {
			const own = id && Object.prototype.hasOwnProperty.call(baseSlots, id) ? baseSlots[id] : -2;
			if (own >= 0) return baseRows[own];
			if (own === -2 && id && hackItemIds.has(baseItemIds[slot])) return undefined;
			return baseRows[slot];
		};
		const boostOf = (table: Vals | undefined, effect: number) => (
			table ? rows(table).find(e => e[0] === effect) : undefined
		);
		const kindOf = (effect: number, table: Vals | undefined) => {
			if (effect === 1) return 'healFlat';
			if (effect === 3) return 'healFraction';
			if (effect === 74 || effect === 75 || effect === 79) return 'chance';
			if (effect === 77) return 'accuracyMinus255';
			return boostOf(table, effect) ? 'powerBoost' : '';
		};
		const boostNow = boostHack.status === 'ok' ? boostHack.value : undefined;
		const tableStatus = adjust('items.attributes', 'same');
		for (let i = 0; i < hackRows.length; i++) {
			const [effect, param] = hackRows[i];
			const id = ctx.itemId(i + 1);
			const baseRow = baseRowFor(i, id);
			if (!baseRow) continue;
			const [baseEffect, baseParam] = baseRow;
			if (effect !== baseEffect || param !== baseParam) {
				itemChanges.push({ index: i + 1, id: id || toID(itemNames[i]), effect, param, baseEffect, baseParam });
			}
			if (!id) continue;
			const label = itemLabel(itemNames[i] || id);
			const kind = kindOf(effect, boostNow || boostBase);
			const baseKind = kindOf(baseEffect, boostBase);
			const before = { effect: baseEffect, param: baseParam };
			const after = { effect, param };
			if (effect !== baseEffect) {
				notes.push(
					`${label}'s held effect was changed from ${heldEffectText(baseEffect)} to ${heldEffectText(effect)}` +
					(kind || baseKind ? '.' : `; this is not applied in battles, where ${label} keeps its official behaviour.`)
				);
				if (kind || baseKind) push(`items.${id}`, 'unreadable', before, undefined);
				else push(`info.items.${id}.heldEffect`, 'changed', before, after);
				continue;
			}
			if (!kind) {
				if (param !== baseParam) push(`info.items.${id}.param`, 'changed', baseParam, param);
				continue;
			}
			const path = `items.${id}.${kind}`;
			if (kind === 'healFraction') {
				leftoversDone = true;
				push(path, worst(leftStatus, tableStatus), leftBaseValue, leftValue);
			} else if (kind === 'powerBoost') {
				const baseBoost = boostBase ? (num(boostBase, 'add') + baseParam) / num(boostBase, 'div') : undefined;
				if (!boostNow) {
					push(path, boostHack.status === 'ok' ? 'unreadable' : boostHack.status, baseBoost, undefined);
					continue;
				}
				const typeNow = boostOf(boostNow, effect);
				const typeBase = boostOf(boostBase, effect);
				if (!typeNow || !typeBase || typeNow[1] !== typeBase[1]) {
					if (typeNow && typeBase) {
						notes.push(
							`${label} boosts ${ctx.typeName(typeNow[1])}-type moves in this hack instead of ` +
							`${ctx.typeName(typeBase[1])}-type moves.`
						);
					}
					push(`items.${id}`, 'unreadable', before, undefined);
					continue;
				}
				const boost = (num(boostNow, 'add') + param) / num(boostNow, 'div');
				const status = worst(adjust('items.typeBoost', boost === baseBoost ? 'same' : 'changed'), tableStatus);
				push(path, status, baseBoost, boost);
			} else {
				const value = kind === 'chance' ? chance(param) : param;
				const baseValue = kind === 'chance' ? chance(baseParam) : baseParam;
				push(path, worst(param === baseParam ? 'same' : 'changed', tableStatus), baseValue, value);
			}
		}
	} else {
		push('info.items.attributes', attrHack.status === 'ok' ? 'unreadable' : attrHack.status, undefined, undefined);
		if (attrHack.status === 'ok') {
			notes.push('The item table was read but could not be compared because no clean base table was available.');
		}
	}
	if (!leftoversDone) push('items.leftovers.healFraction', leftStatus, leftBaseValue, leftValue);

	const moveRows: Gen2MoveRow[] = [];
	const movesHack = hackRun['moves.effects'];
	const movesBaseRun = baseRun ? baseRun['moves.effects'] : undefined;
	const movesBase = movesBaseRun?.status === 'ok' && movesBaseRun.value ?
		rows(movesBaseRun.value) : undefined;
	if (movesHack.status === 'ok' && movesHack.value) {
		const table = rows(movesHack.value);
		const priorityHack = hackRun['priority'].status === 'ok' ? hackRun['priority'].value : undefined;
		const priorityBase = baseRun?.['priority'].status === 'ok' ? baseRun['priority'].value : undefined;
		let differ = 0;
		table.forEach(([effect, chanceByte], i) => {
			const row: Gen2MoveRow = { index: i + 1, effect, chance: chanceByte };
			const before = movesBase?.[i];
			if (before) {
				row.baseEffect = before[0];
				row.baseChance = before[1];
				if (before[0] !== effect || before[1] !== chanceByte) differ++;
				if (before[0] === effect && before[1] !== chanceByte) {
					row.secondaryChance = (chanceByte + 0.5) * 100 / 255;
				}
				if (priorityHack && priorityBase) {
					const priority = movePriority(priorityHack, effect, i + 1);
					if (priority !== movePriority(priorityBase, before[0], i + 1)) row.priority = priority;
				}
			}
			moveRows.push(row);
		});
		if (movesBase) {
			push('info.moves.effects', differ ? 'changed' : 'same', undefined, { rows: table.length, changedRows: differ });
		} else {
			push('info.moves.effects', 'unreadable', undefined, undefined);
		}
	} else {
		push('info.moves.effects', movesHack.status === 'ok' ? 'unreadable' : movesHack.status, undefined, undefined);
	}

	const critMoves = hackRun['crit.moves'];
	const result: Gen2MechanicsResult = {
		engine: {
			kind: 'stock',
			live: true,
			detail: `${game || 'Gen 2'} battle engine, ${located} of ${all.length} probes located ` +
				`(${same} same, ${changed} changed)` +
				(layout === 'unknown' ? '' : layout === 'binary' ? ', code in place' : ', code rebuilt'),
		},
		values,
		report,
		notes,
		extras: {
			layout,
			located,
			probes: probeRows,
			moves: moveRows,
			itemChanges,
			highCritMoveIndexes: critMoves.status === 'ok' && critMoves.value ? list(critMoves.value).slice() : [],
		},
	};

	const chartHack = hackRun['typechart'];
	if (chartHack.status !== 'ok' || !chartHack.value) {
		push('typeChart', chartHack.status === 'ok' ? 'unreadable' : chartHack.status, undefined, undefined);
		return result;
	}
	const chart = chartOf(rows(chartHack.value));
	const chartBaseRun = baseRun ? baseRun['typechart'] : undefined;
	const chartBase = chartBaseRun?.status === 'ok' && chartBaseRun.value ?
		chartOf(rows(chartBaseRun.value)) : null;
	const cell = (key: string) => {
		const [attack, defend] = key.split('>').map(Number);
		return { attack: ctx.typeName(attack), defend: ctx.typeName(defend) };
	};
	const cells: Gen2TypeCell[] = [];
	const unsupported: Gen2TypeCell[] = [];
	const used = new Set<number>();
	chart.cells.forEach((multiplier, key) => {
		const entry = { ...cell(key), multiplier };
		if (multiplier === 0 || multiplier === 0.5 || multiplier === 2) cells.push(entry);
		else unsupported.push(entry);
		for (const id of key.split('>').map(Number)) used.add(id);
	});
	const chartNames: string[] = [];
	const top = Math.max(27, ...Array.from(used));
	for (let id = 0; id <= top; id++) chartNames.push(typeNames[id] || TYPES[id] || (used.has(id) ? `Type${id}` : ''));
	let status: Status = 'unreadable';
	if (!chartBase) {
		push('typeChart', status, undefined, undefined);
		notes.push('The type chart was read but could not be compared because no clean base chart was available.');
	} else if (chartText(chart) === chartText(chartBase)) {
		status = adjust('typechart', 'same');
		push('typeChart', status, undefined, undefined);
	} else {
		const before: Gen2TypeCell[] = [];
		const after: Gen2TypeCell[] = [];
		for (const key of new Set([...Array.from(chart.cells.keys()), ...Array.from(chartBase.cells.keys())])) {
			const now = chart.cells.get(key);
			const was = chartBase.cells.get(key);
			if (now === was) continue;
			before.push({ ...cell(key), multiplier: was === undefined ? 1 : was });
			after.push({ ...cell(key), multiplier: now === undefined ? 1 : now });
		}
		status = adjust('typechart', 'changed');
		const entry: Gen2ReportEntry = { id: 'typeChart', status, base: before };
		if (status === 'changed') entry.hack = after;
		report.push(entry);
	}
	if (status === 'same' || status === 'changed' || !chartBase) {
		result.typeChart = cells;
		result.typeChartInfo = {
			typeNames: chartNames,
			foresightIgnored: chart.foresight.filter(key => chart.cells.get(key) === 0).map(cell),
			unsupported,
			reference: 'base',
		};
	}
	return result;
}

export function readGen2Mechanics(rom: Buffer, base: Buffer | null, names: Gen2Names = {}): Gen2MechanicsResult {
	requireSignatures();
	try {
		return examine(rom, base, names || {});
	} catch (err) {
		const reason = err instanceof Error ? err.message : 'unexpected error';
		return emptyResult('unknown', `The battle engine could not be examined (${reason}).`);
	}
}
