import { openNdsCode, readNarcSafe, type NdsCode } from './nds-code';
import { requireSignatures, signatureSection } from './signatures';

export type Fraction = [number, number];
export type Range = [number, number];
export type StatKey = 'atk' | 'def' | 'spa' | 'spd' | 'spe';

export interface RomHackItemParams {
	powerBoost?: number;
	accuracyMod?: number;
	accuracyMinus255?: number;
	chance?: Fraction;
	healFraction?: Fraction;
	healFlat?: number;
	critStages?: number;
}

export interface NdsRomHackMechanics {
	critChances?: Fraction[];
	critMultiplier?: number;
	stab?: number;
	damageRoll?: { min: number, max: number, den: number };
	damageLevelDivisor?: number;
	damageDivisor?: number;
	statStages?: Fraction[];
	accuracyStages?: Fraction[];
	multiHit?: [number, number, number, number];
	protectRates?: Fraction[];
	natureMultipliers?: { plus?: Fraction, minus?: Fraction };
	natures?: { [natureId: string]: { plus?: StatKey, minus?: StatKey } };
	weatherTurns?: { rain?: number, sun?: number, sand?: number, hail?: number };
	weatherRockTurns?: { rain?: number, sun?: number, sand?: number, hail?: number };
	abilityWeatherTurns?: number;
	weatherMoveModifiers?: { weather: 'rain' | 'sun', type: string, multiplier: number }[];
	sandDamage?: Fraction;
	hailDamage?: Fraction;
	sleepTurns?: Range;
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
	nightmareDamage?: Fraction;
	curseDamage?: Fraction;
	screenTurns?: { reflect?: number, lightscreen?: number, safeguard?: number, mist?: number };
	screenClayTurns?: number;
	trapTurns?: Range;
	trapTurnsGripClaw?: number;
	recoilFractions?: { quarter?: Fraction, third?: Fraction, half?: Fraction };
	items?: { [itemId: string]: RomHackItemParams };
}

export type MechanicsStatus = 'same' | 'changed' | 'unreadable' | 'notfound' | 'dead';

export interface MechanicsReportEntry {
	id: string;
	status: MechanicsStatus;
	base?: any;
	hack?: any;
}

export interface NdsTypeMatchup { attack: string; defend: string; multiplier: number }

export interface NdsMoveExtra {
	effect: number;
	secondaryChance?: number;
	target: number;
	flags: number;
	priority: number;
	critRatio?: number;
	alwaysCrit?: boolean;
	effectCategory?: number;
	hits?: [number, number];
	status?: number;
	statusChance?: number;
	statusTurnMode?: number;
	turns?: [number, number];
	flinchChance?: number;
	recoilPercent?: number;
	drainPercent?: number;
	healPercent?: number;
	statChanges?: { stat: number, stages: number, chance: number }[];
}

export interface NdsNames {
	types?: string[];
	moves?: string[];
	items?: string[];
	abilities?: string[];
}

export interface NdsMechanicsResult {
	engine: { kind: 'stock' | 'cfru' | 'expansion' | 'rewritten' | 'unknown', live: boolean, detail: string };
	values: NdsRomHackMechanics;
	report: MechanicsReportEntry[];
	typeChart?: NdsTypeMatchup[];
	typeChartInfo?: {
		typeNames: string[],
		foresightIgnored?: { attack: string, defend: string }[],
		unsupported?: { attack: string, defend: string, multiplier: number }[],
		reference: 'base' | 'gen6',
	};
	notes: string[];
	typeChartCells?: { attack: number, defend: number, multiplier: number }[];
	fairySlot?: number;
	moves: { [index: number]: NdsMoveExtra };
	baseMoves: { [index: number]: NdsMoveExtra };
	changedMoves: number[];
	itemHold: { [key: string]: { base: number[], hack: number[] } };
	rawMoveFields: { [index: number]: { effect: number, secondaryChance?: number, critRatio?: number } };
	effects: {
		movesRemoved: number[], movesEdited: number[], movesAdded: number[],
		abilitiesEdited: number[], itemsEdited: number[],
	};
	debug: any;
}

type Raw = any;
type Caps = { [name: string]: number };
interface Budget { steps: number }
interface RawProbe { id: string; status: MechanicsStatus; base: Raw; hack: Raw; where?: string; note?: string }

const CHART_STEPS = 4000000;
const SEARCH_STEPS = 4000000;
const MODULE_BYTES = 0x2000000;

function same(a: Raw, b: Raw): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

function toID(text: string): string {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function emptyResult(kind: 'unknown' | 'rewritten', detail: string): NdsMechanicsResult {
	return {
		engine: { kind, live: false, detail }, values: {}, report: [], notes: [], moves: {}, baseMoves: {}, changedMoves: [],
		itemHold: {}, rawMoveFields: {},
		effects: { movesRemoved: [], movesEdited: [], movesAdded: [], abilitiesEdited: [], itemsEdited: [] },
		debug: null,
	};
}

class Builder {
	values: { [key: string]: any } = {};
	report: MechanicsReportEntry[] = [];
	notes: string[] = [];

	entry(id: string, status: MechanicsStatus, base: Raw, hack: Raw) {
		const row: MechanicsReportEntry = { id, status };
		if (base !== undefined && base !== null) row.base = base;
		if (hack !== undefined && hack !== null) row.hack = hack;
		this.report.push(row);
		if (id.startsWith('info.') || id === 'typeChart') return;
		if (status !== 'same' && status !== 'changed') return;
		const parts = id.split('.');
		let target = this.values;
		for (let i = 0; i < parts.length - 1; i++) {
			if (!target[parts[i]]) target[parts[i]] = {};
			target = target[parts[i]];
		}
		target[parts[parts.length - 1]] = hack;
	}

	derive(id: string, sources: (RawProbe | undefined)[], compute: (values: Raw[]) => Raw) {
		const list: RawProbe[] = [];
		for (const source of sources) {
			if (!source) return;
			list.push(source);
		}
		const attempt = (side: 'base' | 'hack'): Raw => {
			if (list.some(source => source[side] === null || source[side] === undefined)) return undefined;
			try {
				const value = compute(list.map(source => source[side]));
				return value === null ? undefined : value;
			} catch {
				return undefined;
			}
		};
		const base = attempt('base');
		if (list.some(source => source.status === 'unreadable')) return this.entry(id, 'unreadable', base, undefined);
		if (list.some(source => source.status === 'notfound' || source.status === 'dead') || base === undefined) {
			return this.entry(id, 'notfound', base, undefined);
		}
		const hack = attempt('hack');
		if (hack === undefined) return this.entry(id, 'unreadable', base, undefined);
		this.entry(id, same(base, hack) ? 'same' : 'changed', base, hack);
	}

	killStock() {
		this.values = {};
		for (const row of this.report) {
			if (row.id.startsWith('info.')) continue;
			if (row.status === 'same' || row.status === 'changed') row.status = 'dead';
		}
	}
}

const FAIRY_ATTACK: { [type: string]: number } = {
	Fighting: 2, Dragon: 2, Dark: 2, Fire: 0.5, Poison: 0.5, Steel: 0.5,
};
const FAIRY_DEFEND: { [type: string]: number } = { Fighting: 0.5, Bug: 0.5, Dark: 0.5, Dragon: 0, Poison: 2, Steel: 2 };

function looksLikeFairy(
	cells: { attack: number, defend: number, multiplier: number }[], slot: number, canonical: string[]
): boolean {
	const attack: { [type: string]: number } = {};
	const defend: { [type: string]: number } = {};
	for (const cell of cells) {
		if (cell.attack === slot && cell.defend === slot) return false;
		if (cell.attack === slot) attack[canonical[cell.defend] || '?'] = cell.multiplier;
		if (cell.defend === slot) defend[canonical[cell.attack] || '?'] = cell.multiplier;
	}
	const equal = (a: { [type: string]: number }, b: { [type: string]: number }) =>
		Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => a[key] === b[key]);
	return equal(attack, FAIRY_ATTACK) && equal(defend, FAIRY_DEFEND);
}

function properName(text: string | undefined): string {
	if (!text || !/^[A-Za-z]{3,10}$/.test(text)) return '';
	return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function buildChart(
	cells: { attack: number, defend: number, multiplier: number }[], canonical: string[], extraSlots: number[],
	supplied: string[] | undefined, own: string[] | null, count: number
) {
	const used = new Set<number>();
	for (const cell of cells) {
		used.add(cell.attack);
		used.add(cell.defend);
	}
	const typeNames: string[] = [];
	let fairySlot = -1;
	for (let i = 0; i < count; i++) {
		let name = canonical[i] || '';
		if (extraSlots.includes(i) || !name) {
			const given = properName(supplied?.[i]) || properName(own?.[i]);
			const taken = !!given && canonical.some((other, slot) => other === given && slot !== i && !extraSlots.includes(slot));
			if (given && !taken) name = given;
			else if (!used.has(i)) name = '';
			else if (looksLikeFairy(cells, i, canonical)) name = 'Fairy';
			else name = canonical[i] === '???' ? '???' : `Type${i}`;
		}
		if (name === 'Fairy') fairySlot = i;
		typeNames.push(name);
	}
	const seen = new Set<string>();
	const typeChart: NdsTypeMatchup[] = [];
	const typeChartCells: { attack: number, defend: number, multiplier: number }[] = [];
	for (const cell of cells) {
		if (cell.multiplier === 1) continue;
		const key = `${cell.attack}>${cell.defend}`;
		if (seen.has(key)) continue;
		seen.add(key);
		typeChartCells.push(cell);
		typeChart.push({ attack: typeNames[cell.attack], defend: typeNames[cell.defend], multiplier: cell.multiplier });
	}
	return { typeNames, typeChart, typeChartCells, fairySlot };
}

function rawMoveFields(moves: { [index: number]: NdsMoveExtra }, baseMoves: { [index: number]: NdsMoveExtra }) {
	const out: { [index: number]: { effect: number, secondaryChance?: number, critRatio?: number } } = {};
	for (const key of Object.keys(moves)) {
		const move = moves[+key];
		const base = baseMoves[+key];
		const fields: { effect: number, secondaryChance?: number, critRatio?: number } = { effect: move.effect };
		if (base && base.effect === move.effect && base.effectCategory === move.effectCategory && base.status === move.status &&
			move.secondaryChance !== undefined && base.secondaryChance !== undefined &&
			move.secondaryChance !== base.secondaryChance) fields.secondaryChance = move.secondaryChance;
		if (base && move.critRatio !== undefined && base.critRatio !== undefined && move.critRatio !== base.critRatio) {
			fields.critRatio = move.critRatio;
		}
		out[+key] = fields;
	}
	return out;
}

interface Family { name: string; ov: number; be: string; sub: string; items: string; moves: string; text: string }

const BE_SEQ = 'battle/skill/be_seq.narc';
const SUB_SEQ = 'battle/skill/sub_seq.narc';
const GEN4_FAMILIES: { [code: string]: Family } = {
	ADA: {
		name: 'Diamond', ov: 11, be: BE_SEQ, sub: SUB_SEQ, items: 'itemtool/itemdata/item_data.narc',
		moves: 'poketool/waza/waza_tbl.narc', text: 'msgdata/msg.narc',
	},
	APA: {
		name: 'Pearl', ov: 11, be: BE_SEQ, sub: SUB_SEQ, items: 'itemtool/itemdata/item_data.narc',
		moves: 'poketool/waza/waza_tbl.narc', text: 'msgdata/msg.narc',
	},
	CPU: {
		name: 'Platinum', ov: 16, be: BE_SEQ, sub: SUB_SEQ, items: 'itemtool/itemdata/pl_item_data.narc',
		moves: 'poketool/waza/pl_waza_tbl.narc', text: 'msgdata/pl_msg.narc',
	},
	IPK: { name: 'HeartGold', ov: 12, be: 'a/0/3/0', sub: 'a/0/0/1', items: 'a/0/1/7', moves: 'a/0/1/1', text: 'a/0/2/7' },
	IPG: { name: 'SoulSilver', ov: 12, be: 'a/0/3/0', sub: 'a/0/0/1', items: 'a/0/1/7', moves: 'a/0/1/1', text: 'a/0/2/7' },
};
const GEN4_TYPES = [
	'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', '???', 'Fire', 'Water', 'Grass',
	'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark',
];
const GEN5_TYPES = [
	'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass',
	'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark', 'Fairy',
];
const NATURES = [
	'hardy', 'lonely', 'brave', 'adamant', 'naughty', 'bold', 'docile', 'relaxed', 'impish', 'lax', 'timid', 'hasty',
	'serious', 'jolly', 'naive', 'modest', 'mild', 'quiet', 'bashful', 'rash', 'calm', 'gentle', 'sassy', 'careful', 'quirky',
];
const GEN4_NATURE_STATS: StatKey[] = ['atk', 'def', 'spe', 'spa', 'spd'];

const HOLD = {
	accReduce: 48, quickClaw: 52, flinch: 56, focusBand: 65, shellBell: 88, accuracyUp: 93, powerPhysical: 94,
	powerSpecial: 95, powerSuper: 96, screens: 97, lifeOrb: 98, zoomLens: 104, metronome: 105, hail: 110, sand: 111,
	sun: 112, rain: 113, bigRoot: 124,
};
const GEN4_BOOST_ITEMS: [number, string[]][] = [
	[57, ['silverpowder']], [68, ['metalcoat']], [72, ['softsand']], [73, ['hardstone', 'rockincense']],
	[74, ['miracleseed', 'roseincense']], [75, ['blackglasses']], [76, ['blackbelt']], [77, ['magnet']],
	[78, ['mysticwater', 'seaincense', 'waveincense']], [79, ['sharpbeak']], [80, ['poisonbarb']], [81, ['nevermeltice']],
	[82, ['spelltag']], [83, ['twistedspoon', 'oddincense']], [84, ['charcoal']], [85, ['dragonfang']], [86, ['silkscarf']],
	[126, ['flameplate']], [127, ['splashplate']], [128, ['zapplate']], [129, ['meadowplate']], [130, ['icicleplate']],
	[131, ['fistplate']], [132, ['toxicplate']], [133, ['earthplate']], [134, ['skyplate']], [135, ['mindplate']],
	[136, ['insectplate']], [137, ['stoneplate']], [138, ['spookyplate']], [139, ['dracoplate']], [140, ['dreadplate']],
	[141, ['ironplate']], [94, ['muscleband']], [95, ['wiseglasses']], [96, ['expertbelt']], [98, ['lifeorb']],
];

interface CodeWord { mask: number; val: number; cap: string | null; shift: boolean }

function maskOf(hex: string, cap: string | null): CodeWord {
	let mask = 0;
	let val = 0;
	for (let i = 0; i < 4; i++) {
		mask <<= 4;
		val <<= 4;
		if (hex[i] !== '.') {
			mask |= 15;
			val |= parseInt(hex[i], 16);
		}
	}
	return { mask, val, cap, shift: false };
}

function compileCode(source: string): CodeWord[] {
	const words: CodeWord[] = [];
	for (const token of source.trim().split(/\s+/)) {
		let match = /^([0-9a-f.]{2})\{(\w+)\}$/.exec(token);
		if (match) {
			words.push(maskOf(match[1] + '..', match[2]));
			continue;
		}
		match = /^S([0-9a-f]{2})\{(\w+)\}$/.exec(token);
		if (match) {
			words.push({ mask: 0xf800, val: (parseInt(match[1], 16) << 8) & 0xf800, cap: match[2], shift: true });
			continue;
		}
		words.push(maskOf(token, null));
	}
	return words;
}

function codeAt(buf: Buffer, off: number, words: CodeWord[]): Caps | null {
	if (off < 0 || off + words.length * 2 > buf.length) return null;
	const caps: Caps = {};
	for (let i = 0; i < words.length; i++) {
		const word = buf.readUInt16LE(off + i * 2);
		const token = words[i];
		if ((word & token.mask) !== token.val) return null;
		if (token.cap) {
			const value = token.shift ? (word >> 6) & 31 : word & 255;
			if (token.cap in caps && caps[token.cap] !== value) return null;
			caps[token.cap] = value;
		}
	}
	return caps;
}

function codeFind(buf: Buffer, words: CodeWord[]): { off: number, caps: Caps }[] {
	const out: { off: number, caps: Caps }[] = [];
	const first = words[0];
	for (let off = 0; off + words.length * 2 <= buf.length; off += 2) {
		if ((buf.readUInt16LE(off) & first.mask) !== first.val) continue;
		const caps = codeAt(buf, off, words);
		if (caps) out.push({ off, caps });
	}
	return out;
}

type ScriptToken = { any: true } | { cap: string } | { val: number };

function compileScript(source: string): ScriptToken[] {
	return source.trim().split(/\s+/).map((token): ScriptToken => {
		if (token === '*') return { any: true };
		const match = /^\{(\w+)\}$/.exec(token);
		if (match) return { cap: match[1] };
		return { val: parseInt(token, 16) >>> 0 };
	});
}

function scriptAt(member: Buffer, word: number, tokens: ScriptToken[]): Caps | null {
	if (word < 0 || (word + tokens.length) * 4 > member.length) return null;
	const caps: Caps = {};
	for (let i = 0; i < tokens.length; i++) {
		const value = member.readUInt32LE((word + i) * 4);
		const token = tokens[i];
		if ('any' in token) continue;
		if ('cap' in token) {
			if (token.cap in caps && caps[token.cap] !== value) return null;
			caps[token.cap] = value;
		} else if (value !== token.val) {
			return null;
		}
	}
	return caps;
}

function scriptFind(
	members: Buffer[], tokens: ScriptToken[], budget: Budget
): { m: number, w: number, caps: Caps }[] | null {
	const out: { m: number, w: number, caps: Caps }[] = [];
	for (const [m, member] of members.entries()) {
		const words = Math.floor(member.length / 4) - tokens.length + 1;
		if (words <= 0) continue;
		budget.steps -= words;
		if (budget.steps < 0) return null;
		for (let w = 0; w < words; w++) {
			const caps = scriptAt(member, w, tokens);
			if (caps) out.push({ m, w, caps });
		}
	}
	return out;
}

interface ChartTriples { main: number[][]; foresight: number[][]; len: number }

function decodeChart(buf: Buffer, off: number, budget: Budget): ChartTriples | null {
	const main: number[][] = [];
	const foresight: number[][] = [];
	let separated = false;
	let at = off;
	for (let n = 0; n < 500; n++, at += 3) {
		if (at + 3 > buf.length || --budget.steps < 0) return null;
		const a = buf[at];
		const d = buf[at + 1];
		const m = buf[at + 2];
		if (a === 0xff && d === 0xff) {
			if (!separated || main.length < 60 || !foresight.length || foresight.length > 40) return null;
			const seen = new Map<number, number>();
			for (const [x, y, z] of main.concat(foresight)) {
				const key = x * 32 + y;
				if (seen.has(key) && seen.get(key) !== z) return null;
				seen.set(key, z);
			}
			return { main, foresight, len: at + 3 - off };
		}
		if (a === 0xfe && d === 0xfe) {
			if (separated) return null;
			separated = true;
			continue;
		}
		if (a > 17 || d > 17 || (m !== 0 && m !== 5 && m !== 10 && m !== 20)) return null;
		if (separated) {
			if (m !== 0) return null;
			foresight.push([a, d, m]);
		} else {
			main.push([a, d, m]);
		}
	}
	return null;
}

function scanCharts(buf: Buffer, budget: Budget): { off: number, dec: ChartTriples }[] {
	const out: { off: number, dec: ChartTriples }[] = [];
	const size = buf.length;
	const runEnd = new Int32Array(size + 3);
	for (let i = size + 2; i >= 0; i--) {
		const m = buf[i + 2];
		const plain = i + 3 <= size && buf[i] <= 17 && buf[i + 1] <= 17 && (m === 0 || m === 5 || m === 10 || m === 20);
		runEnd[i] = plain ? runEnd[i + 3] : i;
	}
	let i = 0;
	while (i + 200 < size && budget.steps > 0) {
		const end = runEnd[i];
		if (end - i >= 180 && end - i < 1500 && buf[end] === 0xfe && buf[end + 1] === 0xfe) {
			const dec = decodeChart(buf, i, budget);
			if (dec) {
				out.push({ off: i, dec });
				i += dec.len;
				continue;
			}
		}
		i++;
	}
	return out;
}

function decodeFractions(buf: Buffer, off: number): number[][] | null {
	if (off < 0 || off + 26 > buf.length) return null;
	const out: number[][] = [];
	let previous = 0;
	for (let i = 0; i < 13; i++) {
		const n = buf[off + i * 2];
		const d = buf[off + i * 2 + 1];
		if (!n || !d) return null;
		if (n / d <= previous) return null;
		previous = n / d;
		out.push([n, d]);
	}
	if (out[6][0] !== out[6][1]) return null;
	if (out[0][0] / out[0][1] < 0.1 || out[12][0] / out[12][1] > 10) return null;
	return out;
}

function decodeCrit(buf: Buffer, off: number): number[] | null {
	if (off < 0 || off + 5 > buf.length) return null;
	const out: number[] = [];
	for (let i = 0; i < 5; i++) {
		const value = buf[off + i];
		if (!value || (i && value > out[i - 1])) return null;
		out.push(value);
	}
	if (out[0] < 2 || out[0] > 64) return null;
	return out;
}

function decodeProtect(buf: Buffer, off: number): number[] | null {
	if (off < 0 || off + 8 > buf.length) return null;
	const out: number[] = [];
	for (let i = 0; i < 4; i++) {
		const value = buf.readUInt16LE(off + i * 2);
		if (!value || (i && value > out[i - 1])) return null;
		out.push(value);
	}
	return out;
}

function decodeFlail(buf: Buffer, off: number): number[][] | null {
	if (off < 0 || off + 12 > buf.length) return null;
	const out: number[][] = [];
	for (let i = 0; i < 6; i++) {
		const hp = buf[off + i * 2];
		const power = buf[off + i * 2 + 1];
		if (!power || (i && (hp <= out[i - 1][0] || power >= out[i - 1][1]))) return null;
		out.push([hp, power]);
	}
	return out;
}

function decodeNature(buf: Buffer, off: number): number[][] | null {
	if (off < 0 || off + 125 > buf.length) return null;
	const rows: number[][] = [];
	let neutral = 0;
	for (let r = 0; r < 25; r++) {
		const row: number[] = [];
		let up = 0;
		let down = 0;
		for (let c = 0; c < 5; c++) {
			const value = buf.readInt8(off + r * 5 + c);
			if (value < -1 || value > 1) return null;
			if (value === 1) up++;
			if (value === -1) down++;
			row.push(value);
		}
		if (up > 1 || down > 1 || up !== down) return null;
		if (!up) neutral++;
		rows.push(row);
	}
	if (neutral > 12) return null;
	return rows;
}

interface TableDef {
	id: string;
	region: 'ov' | 'arm9';
	refDeltas: number[];
	decode: (buf: Buffer, off: number, budget: Budget) => Raw;
	copies?: number;
	external?: boolean;
}

const GEN4_TABLES: TableDef[] = [
	{ id: 'typeChart', region: 'ov', refDeltas: [0, 1, 2], decode: decodeChart, external: true },
	{ id: 'critChances', region: 'ov', refDeltas: [0], decode: decodeCrit },
	{
		id: 'statStages', region: 'ov', refDeltas: [0],
		decode: decodeFractions, copies: 3,
	},
	{
		id: 'accuracyStages', region: 'ov', refDeltas: [0],
		decode: decodeFractions,
	},
	{
		id: 'protectRates', region: 'ov', refDeltas: [0], decode: decodeProtect,
	},
	{
		id: 'flailPower', region: 'ov', refDeltas: [0], decode: decodeFlail,
	},
	{
		id: 'natureTable', region: 'arm9', refDeltas: [0],
		decode: decodeNature,
	},
];

interface CodeDef {
	id: string;
	region: 'ov' | 'arm9';
	count?: number;
	pick?: number[];
	value: (caps: Caps) => Raw;
	valid: (caps: Caps) => boolean;
	stock: Raw;
}

const GEN4_CODE: CodeDef[] = [
	{
		id: 'damageRoll', region: 'ov',
		value: c => ({ max: c.top, min: c.top - 15 }), valid: c => c.top === 100, stock: { max: 100, min: 85 },
	},
	{
		id: 'critMultiplier', region: 'ov',
		value: c => ({ crit: c.mul, sniper: c.sniper }),
		valid: c => c.mul >= 1 && c.mul <= 4 && c.sniper >= c.mul && c.sniper <= 6, stock: { crit: 2, sniper: 3 },
	},
	{
		id: 'critStageCap', region: 'ov',
		value: c => c.cap, valid: c => c.cap >= 1 && c.cap <= 8, stock: 4,
	},
	{
		id: 'stab', region: 'ov', count: 9, pick: [5],
		value: c => c.num / c.den, valid: c => c.den > 0 && c.num / c.den >= 1 && c.num / c.den <= 3, stock: 1.5,
	},
	{
		id: 'freezeThaw', region: 'ov', count: 2, pick: [0],
		value: c => ({ chance: [1, c.n] }), valid: c => c.n >= 2 && c.n <= 100, stock: { chance: [1, 5] },
	},
	{
		id: 'fullParalysis', region: 'ov',
		value: c => ({ chance: [1, 2 ** (32 - c.sh)] }), valid: c => c.sh === c.rot && c.sh >= 28 && c.sh <= 31,
		stock: { chance: [1, 4] },
	},
	{
		id: 'paralysisSpeed', region: 'ov', count: 2, pick: [0, 1],
		value: c => ({ divisor: 2 ** c.sh }), valid: c => c.sh >= 1 && c.sh <= 3, stock: { divisor: 4 },
	},
	{
		id: 'reflectTurns', region: 'ov',
		value: c => c.v >> 2, valid: c => (c.v & 3) === 0 && c.v >> 2 >= 1 && c.v >> 2 <= 7, stock: 5,
	},
	{
		id: 'mistTurns', region: 'ov', value: c => c.v, valid: c => c.v >= 1 && c.v <= 7,
		stock: 5,
	},
	{
		id: 'multiHit', region: 'ov',
		value: () => ({ hits: [2, 3, 4, 5], weights: [3, 3, 1, 1] }), valid: () => true,
		stock: { hits: [2, 3, 4, 5], weights: [3, 3, 1, 1] },
	},
	{
		id: 'obedienceBadges', region: 'ov',
		value: c => ({ badgesForFullObedience: c.n, levelCapNoBadges: c.a }), valid: c => c.n <= 16 && c.a >= 1 && c.a <= 100,
		stock: { badgesForFullObedience: 8, levelCapNoBadges: 10 },
	},
	{
		id: 'natureMultipliers', region: 'arm9',
		value: c => ({ up: [c.up, c.den], down: [c.down, c.den] }),
		valid: c => c.den > 0 && c.up >= c.den && c.down <= c.den && c.down > 0, stock: { up: [110, 100], down: [90, 100] },
	},
];

interface ScriptDef {
	id: string;
	narc: 'be' | 'sub';
	count?: number;
	value: (caps: Caps) => Raw;
	valid: (caps: Caps) => boolean;
	stock: Raw;
}

const turnsValid = (c: Caps) => c.n >= 1 && c.n <= 255;
const counterValid = (c: Caps) => c.offset >= 1 && c.offset + c.range <= 7;
const divisorValid = (c: Caps) => c.den >= 2 && c.den <= 64;
const GEN4_SCRIPTS: ScriptDef[] = [
	{ id: 'weatherTurnsRain', narc: 'be', value: c => c.n, valid: turnsValid, stock: 5 },
	{ id: 'weatherTurnsSand', narc: 'be', value: c => c.n, valid: turnsValid, stock: 5 },
	{ id: 'weatherTurnsSun', narc: 'be', value: c => c.n, valid: turnsValid, stock: 5 },
	{ id: 'weatherTurnsHail', narc: 'be', value: c => c.n, valid: turnsValid, stock: 5 },
	{
		id: 'sleepCounter', narc: 'sub',
		value: c => [c.offset, c.offset + c.range], valid: counterValid, stock: [2, 5],
	},
	{
		id: 'confusionCounter', narc: 'sub',
		value: c => [c.offset, c.offset + c.range], valid: counterValid, stock: [2, 5],
	},
	{
		id: 'bindCounter', narc: 'sub',
		value: c => ({ range: [c.offset, c.offset + c.range], gripClaw: c.grip }),
		valid: c => counterValid(c) && c.grip >= 1 && c.grip <= 7, stock: { range: [3, 6], gripClaw: 6 },
	},
	{
		id: 'burnDamage', narc: 'sub',
		value: c => ({ fraction: [1, c.den], heatproofDivisor: c.heatproof }),
		valid: c => divisorValid(c) && c.heatproof >= 1 && c.heatproof <= 8, stock: { fraction: [1, 8], heatproofDivisor: 2 },
	},
	{
		id: 'leechSeedDamage', narc: 'sub',
		value: c => [1, c.den], valid: divisorValid, stock: [1, 8],
	},
	{
		id: 'curseDamage', narc: 'sub',
		value: c => [1, c.den], valid: divisorValid, stock: [1, 4],
	},
	{
		id: 'nightmareDamage', narc: 'sub',
		value: c => [1, c.den], valid: divisorValid, stock: [1, 4],
	},
	{
		id: 'recoilDivisors', narc: 'sub', count: 3,
		value: c => c.den, valid: c => c.den >= 1 && c.den <= 16, stock: [4, 3, 2],
	},
];

function allIndexes(buf: Buffer, pattern: Buffer): number[] {
	const out: number[] = [];
	let i = -1;
	while (out.length < 4096 && (i = buf.indexOf(pattern, i + 1)) >= 0) out.push(i);
	return out;
}

function funcStart(buf: Buffer, off: number): number {
	for (let o = (off & ~1) - 2, n = 0; o >= 0 && n < 0x400; o -= 2, n++) {
		if (o + 2 <= buf.length && (buf.readUInt16LE(o) & 0xff00) === 0xb500) return o;
	}
	return Math.max(0, off - 0x200);
}

function readGen4TypeNames(rom: NdsCode, fam: Family): string[] | null {
	const members = rom.narc(fam.text);
	if (!members) return null;
	const chars: { [code: number]: string } = { 0x1de: ' ', 0x1be: '-', 0x1ae: '.', 0x1ac: '?' };
	for (let i = 0; i < 10; i++) chars[0x121 + i] = String(i);
	for (let i = 0; i < 26; i++) {
		chars[0x12b + i] = String.fromCharCode(65 + i);
		chars[0x145 + i] = String.fromCharCode(97 + i);
	}
	let best: string[] | null = null;
	let bestScore = 0;
	for (const file of members) {
		if (file.length < 4) continue;
		const count = file.readUInt16LE(0);
		const seed = file.readUInt16LE(2);
		if (count < 17 || count > 20 || 4 + count * 8 > file.length) continue;
		const list: string[] = [];
		for (let i = 0; i < count; i++) {
			let key = (((seed * 0x2fd) & 0xffff) * (i + 1)) & 0xffff;
			key = (key | (key << 16)) >>> 0;
			const offset = (file.readUInt32LE(4 + i * 8) ^ key) >>> 0;
			const length = (file.readUInt32LE(8 + i * 8) ^ key) >>> 0;
			if (length > 200 || offset + length * 2 > file.length) {
				list.length = 0;
				break;
			}
			let stream = (0x91bd3 * (i + 1)) & 0xffff;
			let text = '';
			for (let j = 0; j < length; j++) {
				const c = file.readUInt16LE(offset + j * 2) ^ stream;
				stream = (stream + 0x493d) & 0xffff;
				if (c === 0xffff) break;
				text += chars[c] || '';
			}
			list.push(text.trim());
		}
		let score = 0;
		list.forEach((name, i) => {
			if (GEN4_TYPES[i] && name.toLowerCase() === GEN4_TYPES[i].toLowerCase()) score++;
		});
		if (score > bestScore) {
			bestScore = score;
			best = list;
		}
	}
	return bestScore >= 12 ? best : null;
}

interface Gen4Raw {
	fam: Family;
	probes: RawProbe[];
	engine: {
		battleOverlay: number, battleOverlaySizeBase: number, battleOverlaySizeHack: number,
		battleOverlayBytesChanged: number, battleOverlayChangedRuns: number,
		battleOverlayChangesNotCoveredByAProbe: string[], battleOverlayChangesNotCoveredCount: number,
		arm9BytesChanged: number, battleOverlayHooks: { at: string, to: string }[], battleOverlayHookCount: number,
		arm9HookCount: number, externalCodeFile: string | null, verdict: string,
	};
	typeNames: string[] | null;
	hold: { base: { [effect: number]: number[] }, hack: { [effect: number]: number[] } } | null;
	moves: { [index: number]: NdsMoveExtra };
	baseMoves: { [index: number]: NdsMoveExtra };
	changedMoves: number[];
}

function analyseGen4(hack: NdsCode, base: NdsCode): Gen4Raw | null {
	const fam = GEN4_FAMILIES[hack.code.slice(0, 3)];
	if (!fam || base.code.slice(0, 3) !== hack.code.slice(0, 3)) return null;
	const budget: Budget = { steps: CHART_STEPS };
	const region = (rom: NdsCode, name: 'ov' | 'arm9') => (name === 'arm9' ?
		{ buf: rom.arm9, ram: rom.arm9Ram } :
		{ buf: rom.overlay(fam.ov), ram: rom.overlays[fam.ov] ? rom.overlays[fam.ov].ram : 0 });
	const hackOverlay = region(hack, 'ov');
	const baseOverlay = region(base, 'ov');
	if (!hackOverlay.buf || !baseOverlay.buf || hackOverlay.buf.length > MODULE_BYTES / 4) return null;
	const regions = {
		hack: { ov: { buf: hackOverlay.buf, ram: hackOverlay.ram }, arm9: { buf: hack.arm9, ram: hack.arm9Ram } },
		base: { ov: { buf: baseOverlay.buf, ram: baseOverlay.ram }, arm9: { buf: base.arm9, ram: base.arm9Ram } },
	};
	const probes: RawProbe[] = [];
	const probeOut = (
		id: string, status: MechanicsStatus, baseValue: Raw, hackValue: Raw, where?: string, note?: string
	) => {
		probes.push({
			id, status, base: baseValue === undefined ? null : baseValue, hack: hackValue === undefined ? null : hackValue,
			where: where || '', note: note || '',
		});
	};

	const refOffsets = new Set<string>();
	const explained = new Set<string>();
	const windowModified = (name: 'ov' | 'arm9', refOff: number) => {
		const b = regions.base[name].buf;
		const h = regions.hack[name].buf;
		const start = funcStart(b, refOff);
		for (let o = start; o < refOff; o += 2) {
			if (refOffsets.has(`${name}:${o & ~3}`) || explained.has(`${name}:${o}`)) continue;
			if (o + 2 > h.length || o + 2 > b.length || b.readUInt16LE(o) !== h.readUInt16LE(o)) return true;
		}
		return false;
	};

	let candidates: { where: string, buf: Buffer }[] | null = null;
	const externalCandidates = () => {
		if (candidates) return candidates;
		candidates = [];
		const baseFiles = base.files();
		let total = 0;
		for (const [name, data] of hack.files()) {
			const other = baseFiles.get(name);
			if (other && other.length === data.length && other.equals(data)) continue;
			const members = readNarcSafe(data);
			if (!members) {
				if (data.length >= 0x800 && data.length <= 0x400000 && total < 0x8000000) {
					candidates.push({ where: name, buf: data });
					total += data.length;
				}
				continue;
			}
			const otherMembers = other ? readNarcSafe(other) : null;
			members.forEach((member, i) => {
				if (member.length < 0x800 || total >= 0x8000000) return;
				if (otherMembers?.[i]?.equals(member)) return;
				candidates!.push({ where: `${name}#${i}`, buf: member });
				total += member.length;
			});
		}
		return candidates;
	};
	let synth: { buf: Buffer, load: number, where: string } | null = null;
	const resolve = (addr: number, name: 'ov' | 'arm9') => {
		const own = regions.hack[name];
		if (addr >= own.ram && addr < own.ram + own.buf.length) {
			return { buf: own.buf, off: addr - own.ram, where: name as string };
		}
		if (addr >= hack.arm9Ram && addr < hack.arm9Ram + hack.arm9.length) {
			return { buf: hack.arm9, off: addr - hack.arm9Ram, where: 'arm9' };
		}
		if (synth && addr >= synth.load && addr < synth.load + synth.buf.length) {
			return { buf: synth.buf, off: addr - synth.load, where: `${synth.where} loaded at 0x${synth.load.toString(16)}` };
		}
		return null;
	};

	const covered: [number, number][] = [];
	const baseTables: { [id: string]: { off: number, refs: { o: number, delta: number }[] }[] } = {};
	for (const table of GEN4_TABLES) {
		const r = regions.base[table.region];
		const sig = signatures().gen4Tables[table.id].sig;
		const offsets = allIndexes(r.buf, Buffer.from(sig, 'hex'));
		const copies: { off: number, refs: { o: number, delta: number }[] }[] = [];
		for (const off of offsets) {
			const refs: { o: number, delta: number }[] = [];
			const target = r.ram + off;
			for (let o = 0; o + 4 <= r.buf.length; o += 4) {
				const delta = r.buf.readUInt32LE(o) - target;
				if (delta >= 0 && delta <= 2 && table.refDeltas.includes(delta)) refs.push({ o, delta });
			}
			if (refs.length) copies.push({ off, refs });
		}
		baseTables[table.id] = copies;
		if (table.region === 'ov') {
			for (const copy of copies) {
				const dec = table.decode(r.buf, copy.off, budget);
				covered.push([copy.off, copy.off + (dec?.len ? dec.len : sig.length / 2 + 64)]);
				for (const ref of copy.refs) covered.push([ref.o, ref.o + 4]);
			}
		}
		for (const copy of copies) for (const ref of copy.refs) refOffsets.add(`${table.region}:${ref.o}`);
	}

	for (const probe of GEN4_CODE) {
		const hr = regions.hack[probe.region];
		const br = regions.base[probe.region];
		const want = probe.count || 1;
		const pick = probe.pick || [0];
		const evaluate = (hits: ({ off: number, caps: Caps } | null)[]): Raw => {
			const values: Raw[] = [];
			for (const i of pick) {
				const hit = hits[i];
				if (!hit || !probe.valid(hit.caps)) return null;
				values.push(probe.value(hit.caps));
			}
			if (!values.every(value => same(value, values[0]))) return null;
			return values[0];
		};
		let baseHits: { off: number, caps: Caps }[] | null = null;
		let alt: CodeWord[] | null = null;
		for (const source of signatures().gen4Code[probe.id]) {
			const words = compileCode(source);
			const hits = codeFind(br.buf, words);
			if (hits.length === want) {
				baseHits = hits;
				alt = words;
				break;
			}
		}
		if (!baseHits || !alt) {
			probeOut(probe.id, 'notfound', null, null, '', 'self-check failed: pattern not located in the clean base');
			continue;
		}
		const baseValue = evaluate(baseHits);
		if (!same(baseValue, probe.stock)) {
			probeOut(probe.id, 'notfound', baseValue, null, '', 'the clean base does not hold the documented value');
			continue;
		}
		if (probe.region === 'ov') for (const hit of baseHits) covered.push([hit.off, hit.off + alt.length * 2]);
		const words = alt;
		const direct = baseHits.map(hit => {
			const caps = codeAt(hr.buf, hit.off, words);
			return caps ? { off: hit.off, caps } : null;
		});
		if (pick.every(i => direct[i])) {
			const value = evaluate(direct);
			if (value !== null) {
				for (const hit of direct) {
					if (hit) for (let k = 0; k < words.length; k++) explained.add(`${probe.region}:${hit.off + k * 2}`);
				}
			}
			if (value === null) {
				probeOut(
					probe.id, 'unreadable', baseValue, null, '', 'the instruction is there but its operand is out of the sane range'
				);
			} else {
				probeOut(
					probe.id, same(value, baseValue) ? 'same' : 'changed', baseValue, value,
					`${probe.region}+0x${direct[pick[0]]!.off.toString(16)}`
				);
			}
			continue;
		}
		let done = false;
		for (const source of signatures().gen4Code[probe.id]) {
			const hits = codeFind(hr.buf, compileCode(source));
			if (hits.length !== want) continue;
			const value = evaluate(hits);
			if (value === null) continue;
			probeOut(
				probe.id, same(value, baseValue) ? 'same' : 'changed', baseValue, value,
				`${probe.region}+0x${hits[pick[0]].off.toString(16)}`, 'code moved; found again by pattern'
			);
			done = true;
			break;
		}
		if (!done) {
			probeOut(
				probe.id, 'unreadable', baseValue, null, '',
				'the code at the known location was rewritten and the pattern is nowhere else'
			);
		}
	}

	for (const table of GEN4_TABLES) {
		const hr = regions.hack[table.region];
		const br = regions.base[table.region];
		const copies = baseTables[table.id];
		if (!copies.length || (table.copies && copies.length !== table.copies)) {
			probeOut(table.id, 'notfound', null, null, '', 'self-check failed: signature not located in the clean base');
			continue;
		}
		const baseValue = table.decode(br.buf, copies[0].off, budget);
		const stock = signatures().gen4Tables[table.id].stock;
		if (!baseValue || (stock && !same(baseValue, stock))) {
			probeOut(table.id, 'notfound', null, null, '', 'the clean base does not hold the documented table');
			continue;
		}
		let status: MechanicsStatus = 'same';
		let hackValue: Raw = null;
		let note = '';
		let where = '';
		const values: Raw[] = [];
		for (const copy of copies) {
			const deltas = new Set<number | 'gone'>();
			let modified = false;
			let stale = 0;
			for (const ref of copy.refs) {
				if (ref.o + 4 > hr.buf.length) {
					deltas.add('gone');
					continue;
				}
				if (windowModified(table.region, ref.o)) modified = true;
				if (ref.delta === 0) deltas.add(hr.buf.readUInt32LE(ref.o) - br.buf.readUInt32LE(ref.o));
			}
			for (const ref of copy.refs) {
				if (ref.delta !== 0 && ref.o + 4 <= hr.buf.length &&
					!deltas.has(hr.buf.readUInt32LE(ref.o) - br.buf.readUInt32LE(ref.o))) stale++;
			}
			if (modified) {
				status = 'unreadable';
				note = 'the code that reads this table was modified';
				break;
			}
			if (deltas.size !== 1 || deltas.has('gone')) {
				status = 'unreadable';
				note = 'the pointers to this table were changed inconsistently';
				break;
			}
			const delta = [...deltas][0] as number;
			let target: { buf: Buffer, off: number, where: string } | null = { buf: hr.buf, off: copy.off, where: table.region };
			if (delta !== 0) {
				const addr = br.ram + copy.off + delta;
				target = resolve(addr, table.region);
				if (!target && table.external) {
					const hits: { cand: { where: string, buf: Buffer }, load: number }[] = [];
					for (const cand of externalCandidates()) {
						for (const hit of scanCharts(cand.buf, budget)) {
							const load = addr - hit.off;
							if ((load & 0xfff) === 0 && load >= 0x02000000 && load < 0x02800000) hits.push({ cand, load });
						}
					}
					if (hits.length === 1) {
						synth = { buf: hits[0].cand.buf, load: hits[0].load, where: hits[0].cand.where };
						target = resolve(addr, table.region);
					}
				}
				if (!target) {
					status = 'unreadable';
					note = `the table was moved to 0x${addr.toString(16)}, which is outside the code this tool can map`;
					break;
				}
				note = `table relocated from 0x${(br.ram + copy.off).toString(16)} to 0x${addr.toString(16)}`;
				if (stale) note += `; ${stale} secondary references (column pointers) were left pointing at the old location`;
			}
			const dec = table.decode(target.buf, target.off, budget);
			if (!dec) {
				status = 'unreadable';
				note = (note ? note + '; ' : '') + 'the bytes at the table location do not decode as a valid table';
				break;
			}
			where = `${target.where}+0x${target.off.toString(16)}`;
			values.push(dec);
		}
		if (status !== 'unreadable') {
			const strip = (value: Raw) => (table.id === 'typeChart' ? { main: value.main, foresight: value.foresight } : value);
			if (!values.every(value => same(strip(value), strip(values[0])))) {
				status = 'unreadable';
				note = 'the copies of this table disagree with each other';
			} else {
				hackValue = values[0];
				status = same(strip(hackValue), strip(baseValue)) ? 'same' : 'changed';
			}
		}
		probeOut(table.id, status, baseValue, hackValue, where, note);
	}

	const scriptBudget: Budget = { steps: SEARCH_STEPS * 8 };
	for (const probe of GEN4_SCRIPTS) {
		const tokens = compileScript(signatures().gen4Scripts[probe.id]);
		const want = probe.count || 1;
		const hm = hack.narc(fam[probe.narc]);
		if (!hm) {
			probeOut(probe.id, 'notfound', probe.stock, null, '', 'battle script archive missing');
			continue;
		}
		const evaluate = (hits: { caps: Caps }[]): Raw => {
			if (hits.length !== want || !hits.every(hit => probe.valid(hit.caps))) return null;
			const values = hits.map(hit => probe.value(hit.caps));
			return want === 1 ? values[0] : values;
		};
		const bm = base.narc(fam[probe.narc]);
		const baseHits = (bm && scriptFind(bm, tokens, scriptBudget)) || [];
		if (baseHits.length !== want) {
			probeOut(
				probe.id, 'notfound', null, null, '',
				`self-check failed: script pattern matched ${baseHits.length} times in the clean base`
			);
			continue;
		}
		const baseValue = evaluate(baseHits);
		if (!same(baseValue, probe.stock)) {
			probeOut(probe.id, 'notfound', baseValue, null, '', 'the clean base does not hold the documented value');
			continue;
		}
		const direct = baseHits.map(hit => {
			const caps = hm[hit.m] ? scriptAt(hm[hit.m], hit.w, tokens) : null;
			return caps ? { m: hit.m, w: hit.w, caps } : null;
		});
		if (direct.every(Boolean)) {
			const value = evaluate(direct as { m: number, w: number, caps: Caps }[]);
			if (value === null) {
				probeOut(probe.id, 'unreadable', baseValue, null, '', 'script value out of the sane range');
			} else {
				probeOut(
					probe.id, same(value, baseValue) ? 'same' : 'changed', baseValue, value,
					`${probe.narc}#${direct[0]!.m} word ${direct[0]!.w}`
				);
			}
			continue;
		}
		const hits = scriptFind(hm, tokens, scriptBudget);
		if (!hits) {
			probeOut(probe.id, 'unreadable', baseValue, null, '', 'the battle script archive is too large to search');
			continue;
		}
		const value = evaluate(hits);
		if (value === null) {
			probeOut(probe.id, 'unreadable', baseValue, null, '', `script pattern matched ${hits.length} times (wanted ${want})`);
		} else {
			probeOut(
				probe.id, same(value, baseValue) ? 'same' : 'changed', baseValue, value,
				`${probe.narc}#${hits[0].m} word ${hits[0].w}`, 'script was restructured; found again by pattern'
			);
		}
	}

	const holdParams = (rom: NdsCode) => {
		const members = rom.narc(fam.items);
		if (!members) return null;
		const map: { [effect: number]: number[] } = {};
		for (const member of members) {
			if (member.length < 8) continue;
			let effect = member[2];
			if (!effect) continue;
			if (fam.ov === 11 && effect >= 2) effect++;
			(map[effect] || (map[effect] = [])).push(member[3]);
		}
		for (const key of Object.keys(map)) map[+key] = [...new Set(map[+key])].sort((a, b) => a - b);
		return map;
	};
	const hackHold = holdParams(hack);
	const baseHold = holdParams(base);
	let hold: Gen4Raw['hold'] = null;
	if (!hackHold || !baseHold) {
		probeOut('itemHoldParams', 'notfound', null, null, '', 'item data archive missing');
	} else {
		hold = { base: baseHold, hack: hackHold };
		const changed: { [key: string]: number[] } = {};
		const before: { [key: string]: number[] } = {};
		for (const key of new Set(Object.keys(hackHold).concat(Object.keys(baseHold)))) {
			const a = baseHold[+key] || [];
			const b = hackHold[+key] || [];
			if (!same(a, b)) {
				before[key] = a;
				changed[key] = b;
			}
		}
		const count = Object.keys(changed).length;
		probeOut('itemHoldParams', count ? 'changed' : 'same', count ? before : null, count ? changed : null);
	}

	const moveRows = (rom: NdsCode) => {
		const members = rom.narc(fam.moves);
		const rows: { [index: number]: NdsMoveExtra } = {};
		if (!members) return null;
		members.forEach((member, i) => {
			if (member.length < 12) return;
			rows[i] = {
				effect: member.readUInt16LE(0), secondaryChance: member[7], target: member.readUInt16LE(8),
				priority: member.readInt8(10), flags: member[11],
			};
		});
		return { rows, count: members.length };
	};
	const hackMoves = moveRows(hack);
	const baseMoves = moveRows(base);
	const changedMoves: number[] = [];
	if (hackMoves && baseMoves) {
		const delta: { [key: string]: number } = { effect: 0, chance: 0, range: 0, priority: 0, flags: 0 };
		const examples: { move: number, base: number, hack: number }[] = [];
		for (let i = 1; i < Math.min(hackMoves.count, baseMoves.count); i++) {
			const h = hackMoves.rows[i];
			const b = baseMoves.rows[i];
			if (!h || !b) continue;
			const pairs: [string, number, number][] = [
				['effect', h.effect, b.effect], ['chance', h.secondaryChance!, b.secondaryChance!], ['range', h.target, b.target],
				['priority', h.priority, b.priority], ['flags', h.flags, b.flags],
			];
			let any = false;
			for (const [key, x, y] of pairs) {
				if (x === y) continue;
				any = true;
				delta[key]++;
				if (key === 'chance' && examples.length < 12) examples.push({ move: i, base: y, hack: x });
			}
			if (any) changedMoves.push(i);
		}
		const any = Object.values(delta).some(Boolean);
		probeOut(
			'moveTableExtras', any ? 'changed' : 'same', null, any ? { movesChanged: delta, effectChanceExamples: examples } : null
		);
	}

	const bo = regions.base.ov.buf;
	const ho = regions.hack.ov.buf;
	let diffBytes = 0;
	const n = Math.min(bo.length, ho.length);
	const scanHooks = (b: Buffer, h: Buffer, ramLow: number) => {
		const found: { at: string, to: string }[] = [];
		let count = 0;
		for (let o = 0; o + 8 <= h.length; o += 2) {
			const w0 = h.readUInt16LE(o);
			if ((w0 & 0xf8ff) !== 0x4800) continue;
			const w1 = h.readUInt16LE(o + 2);
			if ((w1 & 0xffc7) !== 0x4700) continue;
			const reg = (w0 >> 8) & 7;
			if (((w1 >> 3) & 15) !== reg) continue;
			const poolAt = (o + 4) & ~3;
			const target = h.readUInt32LE(poolAt);
			if (target < 0x02000000 || target >= 0x02800000) continue;
			if (o + 4 <= b.length && b.readUInt16LE(o) === w0 && b.readUInt16LE(o + 2) === w1) continue;
			count++;
			if (found.length < 40) found.push({ at: `0x${(ramLow + o).toString(16)}`, to: `0x${target.toString(16)}` });
		}
		return { found, count };
	};
	const { found: hooks, count: hookCount } = scanHooks(bo, ho, regions.hack.ov.ram);
	const runs: [number, number][] = [];
	let runStart = -1;
	let last = -1;
	for (let i = 0; i < n; i++) {
		if (bo[i] === ho[i]) continue;
		diffBytes++;
		if (runStart < 0) {
			runStart = i;
		} else if (i - last > 8) {
			runs.push([runStart, last + 1]);
			runStart = i;
		}
		last = i;
	}
	if (runStart >= 0) runs.push([runStart, last + 1]);
	const unexplained = runs.filter(run => !covered.some(c => run[0] < c[1] && run[1] > c[0]));
	let arm9Diff = 0;
	for (let i = 0; i < Math.min(base.arm9.length, hack.arm9.length); i++) if (base.arm9[i] !== hack.arm9[i]) arm9Diff++;
	const arm9HookCount = scanHooks(base.arm9, hack.arm9, hack.arm9Ram).count;
	const external = synth as { buf: Buffer, load: number, where: string } | null;
	const engine = {
		battleOverlay: fam.ov,
		battleOverlaySizeBase: bo.length,
		battleOverlaySizeHack: ho.length,
		battleOverlayBytesChanged: diffBytes,
		battleOverlayChangedRuns: runs.length,
		battleOverlayChangesNotCoveredByAProbe: unexplained.slice(0, 40)
			.map(run => `0x${run[0].toString(16)}+${run[1] - run[0]}`),
		battleOverlayChangesNotCoveredCount: unexplained.length,
		arm9BytesChanged: arm9Diff,
		battleOverlayHooks: hooks,
		battleOverlayHookCount: hookCount,
		arm9HookCount,
		externalCodeFile: external ? `${external.where} loaded at 0x${external.load.toString(16)}` : null,
		verdict: hookCount >= 8 ? 'battle engine replaced or heavily hooked: stock constants are not trustworthy' :
		hookCount ? 'a few battle functions are hooked: probes next to a hook are reported unreadable' :
		'stock battle engine code, data edits only',
	};
	return {
		fam, probes, engine, typeNames: readGen4TypeNames(hack, fam), hold,
		moves: hackMoves ? hackMoves.rows : {}, baseMoves: baseMoves ? baseMoves.rows : {}, changedMoves,
	};
}

function holdProbe(hold: Gen4Raw['hold'], effect: number): RawProbe | undefined {
	if (!hold) return undefined;
	const base = hold.base[effect];
	if (base?.length !== 1) return undefined;
	const hack = hold.hack[effect];
	if (hack?.length !== 1) return { id: `hold${effect}`, status: 'unreadable', base: base[0], hack: null };
	return { id: `hold${effect}`, status: hack[0] === base[0] ? 'same' : 'changed', base: base[0], hack: hack[0] };
}

function gen4Chart(triples: ChartTriples) {
	const cells: { attack: number, defend: number, multiplier: number }[] = [];
	for (const [a, d, m] of triples.main.concat(triples.foresight)) {
		cells.push({ attack: a, defend: d, multiplier: m / 10 });
	}
	return cells;
}

function gen4Result(raw: Gen4Raw, names: NdsNames | undefined): NdsMechanicsResult {
	const out = new Builder();
	const get = (id: string) => raw.probes.find(probe => probe.id === id);
	const one = (id: string, probeId: string, compute: (value: Raw) => Raw) => (
		out.derive(id, [get(probeId)], ([v]) => compute(v))
	);

	out.derive('critChances', [get('critChances'), get('critStageCap')], ([table, cap]) =>
		(cap > 4 ? undefined : table.slice(0, cap + 1).map((value: number) => [1, value])));
	one('info.critStageCap', 'critStageCap', v => v);
	one('critMultiplier', 'critMultiplier', v => v.crit);
	one('info.sniperCritMultiplier', 'critMultiplier', v => v.sniper);
	one('stab', 'stab', v => v);
	one('damageRoll', 'damageRoll', v => ({ min: v.min, max: v.max, den: 100 }));
	one('statStages', 'statStages', v => v);
	one('accuracyStages', 'accuracyStages', v => v);
	one('multiHit', 'multiHit', v => v.weights);
	one('protectRates', 'protectRates', v => v.map((value: number) => [value + 1, 65536]));
	one('natureMultipliers.plus', 'natureMultipliers', v => v.up);
	one('natureMultipliers.minus', 'natureMultipliers', v => v.down);
	const natureTable = get('natureTable');
	if (natureTable) {
		const describe = (row: number[]) => {
			const entry: { plus?: StatKey, minus?: StatKey } = {};
			row.forEach((value, column) => {
				if (value === 1) entry.plus = GEN4_NATURE_STATS[column];
				if (value === -1) entry.minus = GEN4_NATURE_STATS[column];
			});
			return entry;
		};
		if (natureTable.status === 'changed' && natureTable.base && natureTable.hack) {
			NATURES.forEach((id, i) => {
				if (same(natureTable.base[i], natureTable.hack[i])) return;
				out.entry(`natures.${id}`, 'changed', describe(natureTable.base[i]), describe(natureTable.hack[i]));
			});
		}
		out.entry('info.natureTable', natureTable.status, undefined, undefined);
		if (natureTable.status === 'unreadable') {
			out.notes.push('The nature table of this hack was changed but could not be read; the standard natures are used.');
		}
	}

	const weather: [string, string, number][] = [
		['rain', 'weatherTurnsRain', HOLD.rain], ['sun', 'weatherTurnsSun', HOLD.sun],
		['sand', 'weatherTurnsSand', HOLD.sand], ['hail', 'weatherTurnsHail', HOLD.hail],
	];
	for (const [key, probeId, effect] of weather) {
		one(`weatherTurns.${key}`, probeId, v => v);
		out.derive(`weatherRockTurns.${key}`, [get(probeId), holdProbe(raw.hold, effect)], ([turns, bonus]) => turns + bonus);
	}
	one('sleepTurns', 'sleepCounter', v => [v[0] - 1, v[1] - 1]);
	one('confusionTurns', 'confusionCounter', v => [v[0] - 1, v[1] - 1]);
	one('fullParalysisChance', 'fullParalysis', v => v.chance);
	one('paralysisSpeed', 'paralysisSpeed', v => 1 / v.divisor);
	one('thawChance', 'freezeThaw', v => v.chance);
	one('burnDamage', 'burnDamage', v => v.fraction);
	one('info.heatproofBurnDivisor', 'burnDamage', v => v.heatproofDivisor);
	one('leechSeedDamage', 'leechSeedDamage', v => v);
	one('nightmareDamage', 'nightmareDamage', v => v);
	one('curseDamage', 'curseDamage', v => v);
	one('screenTurns.reflect', 'reflectTurns', v => v);
	one('screenTurns.mist', 'mistTurns', v => v);
	out.derive('screenClayTurns', [get('reflectTurns'), holdProbe(raw.hold, HOLD.screens)], ([turns, bonus]) => turns + bonus);
	one('trapTurns', 'bindCounter', v => v.range);
	one('trapTurnsGripClaw', 'bindCounter', v => v.gripClaw);
	one('recoilFractions.quarter', 'recoilDivisors', v => [1, v[0]]);
	one('recoilFractions.third', 'recoilDivisors', v => [1, v[1]]);
	one('recoilFractions.half', 'recoilDivisors', v => [1, v[2]]);

	const item = (effect: number, ids: string[], param: string, compute: (value: number) => Raw) => {
		const probe = holdProbe(raw.hold, effect);
		for (const id of ids) out.derive(`items.${id}.${param}`, [probe], ([v]) => compute(v));
	};
	for (const [effect, ids] of GEN4_BOOST_ITEMS) item(effect, ids, 'powerBoost', v => (100 + v) / 100);
	item(HOLD.accReduce, ['brightpowder', 'laxincense'], 'accuracyMod', v => (v < 100 ? (100 - v) / 100 : undefined));
	item(HOLD.accuracyUp, ['widelens'], 'accuracyMod', v => (100 + v) / 100);
	item(HOLD.zoomLens, ['zoomlens'], 'accuracyMod', v => (100 + v) / 100);
	item(HOLD.focusBand, ['focusband'], 'chance', v => (v <= 100 ? [v, 100] : undefined));
	item(HOLD.quickClaw, ['quickclaw'], 'chance', v => (v >= 1 && v <= 100 ? [1, Math.floor(100 / v)] : undefined));
	item(HOLD.shellBell, ['shellbell'], 'healFraction', v => (v >= 1 ? [1, v] : undefined));
	out.derive('info.items.kingsrock.chance', [holdProbe(raw.hold, HOLD.flinch)], ([v]) => [v, 100]);
	out.derive('info.items.metronome.param', [holdProbe(raw.hold, HOLD.metronome)], ([v]) => v);
	out.derive('info.items.bigroot.param', [holdProbe(raw.hold, HOLD.bigRoot)], ([v]) => v);

	one('info.flailPower', 'flailPower', v => v);
	one('info.obedienceBadges', 'obedienceBadges', v => v);
	const holdAll = get('itemHoldParams');
	if (holdAll) out.entry('info.itemHoldParams', holdAll.status, holdAll.base, holdAll.hack);
	const moveExtras = get('moveTableExtras');
	if (moveExtras) out.entry('info.moveTableExtras', moveExtras.status, moveExtras.base, moveExtras.hack);
	const flail = get('flailPower');
	if (flail?.status === 'changed') {
		out.notes.push('The Flail / Reversal power table was changed by the hack; this is not applied in battles.');
	}

	const engine = raw.engine;
	const overlaySize = Math.min(engine.battleOverlaySizeBase, engine.battleOverlaySizeHack);
	let kind: 'stock' | 'rewritten' = 'stock';
	let detail = `${raw.fam.name} battle engine with data edits only (${engine.battleOverlayBytesChanged} bytes of the battle code differ, no code hooks).`;
	if (engine.battleOverlayHookCount >= 8) {
		kind = 'rewritten';
		detail = `The ${raw.fam.name} battle code is hooked in ${engine.battleOverlayHookCount} places, so the battle engine was replaced.`;
	} else if (engine.battleOverlayBytesChanged > overlaySize / 4 ||
		Math.abs(engine.battleOverlaySizeBase - engine.battleOverlaySizeHack) > overlaySize / 4) {
		kind = 'rewritten';
		detail = `The ${raw.fam.name} battle code no longer lines up with the original game (${engine.battleOverlayBytesChanged} bytes differ), so the battle engine was rebuilt.`;
	} else if (engine.battleOverlayHookCount) {
		detail = `${raw.fam.name} battle engine with ${engine.battleOverlayHookCount} hooked functions; values next to a hook are not used.`;
	}

	const result = emptyResult('unknown', detail);
	const chart = get('typeChart');
	if (chart) {
		const describe = (value: Raw) => {
			if (!value) return null;
			return buildChart(gen4Chart(value), GEN4_TYPES, [9], names?.types, raw.typeNames, 18);
		};
		const baseChart = describe(chart.base);
		const hackChart = describe(chart.hack);
		out.entry('typeChart', chart.status, baseChart?.typeChart, hackChart?.typeChart);
		if (kind === 'stock' && hackChart && (chart.status === 'same' || chart.status === 'changed')) {
			result.typeChart = hackChart.typeChart;
			result.typeChartCells = hackChart.typeChartCells;
			if (hackChart.fairySlot >= 0) result.fairySlot = hackChart.fairySlot;
			result.typeChartInfo = {
				typeNames: hackChart.typeNames,
				foresightIgnored: (chart.hack.foresight as number[][]).map(([a, d]) =>
					({ attack: hackChart.typeNames[a], defend: hackChart.typeNames[d] })),
				unsupported: [],
				reference: 'base',
			};
		}
	}
	if (kind !== 'stock') {
		out.killStock();
		out.notes.push(detail);
	}
	result.engine = { kind, live: kind === 'stock', detail };
	result.values = out.values;
	result.report = out.report;
	result.notes = out.notes;
	result.moves = raw.moves;
	result.baseMoves = raw.baseMoves;
	result.changedMoves = raw.changedMoves;
	result.rawMoveFields = rawMoveFields(raw.moves, raw.baseMoves);
	if (raw.hold) {
		for (const key of new Set(Object.keys(raw.hold.base).concat(Object.keys(raw.hold.hack)))) {
			result.itemHold[`effect${key}`] = { base: raw.hold.base[+key] || [], hack: raw.hold.hack[+key] || [] };
		}
	}
	result.debug = { probes: raw.probes, engine: raw.engine, typeNames: raw.typeNames };
	return result;
}

export function readGen4MechanicsFrom(hack: NdsCode, base: NdsCode, names?: NdsNames): NdsMechanicsResult {
	requireSignatures();
	try {
		const raw = analyseGen4(hack, base);
		if (!raw) return emptyResult('unknown', 'The battle code of this game could not be found.');
		return gen4Result(raw, names);
	} catch {
		return emptyResult('unknown', 'The battle code of this game could not be read.');
	}
}

export function readGen4Mechanics(rom: Buffer, base: Buffer | null, names?: NdsNames): NdsMechanicsResult {
	requireSignatures();
	try {
		const hack = openNdsCode(rom);
		if (!hack || !GEN4_FAMILIES[hack.code.slice(0, 3)]) {
			return emptyResult('unknown', 'This is not a Generation 4 Pokemon DS game.');
		}
		const clean = base ? openNdsCode(base) : null;
		if (!clean || clean.code.slice(0, 3) !== hack.code.slice(0, 3)) {
			return emptyResult('unknown', 'No matching original game was available to compare the battle code with.');
		}
		return readGen4MechanicsFrom(hack, clean, names);
	} catch {
		return emptyResult('unknown', 'The battle code of this game could not be read.');
	}
}

const GEN5_GAMES: { [code: string]: string } = { IRB: 'Black', IRA: 'White', IRE: 'Black 2', IRD: 'White 2' };

export interface Gen5Module { name: string; id: number; ram: number; data: Buffer }
export interface Gen5Rom { code: NdsCode; game: string; modules: Gen5Module[] }

export function openGen5(rom: Buffer): Gen5Rom | null {
	const code = openNdsCode(rom);
	if (!code || !GEN5_GAMES[code.code.slice(0, 3)]) return null;
	const modules: Gen5Module[] = [{ name: 'arm9', id: -1, ram: code.arm9Ram, data: code.arm9 }];
	let total = code.arm9.length;
	code.overlays.forEach((entry, i) => {
		if (total > MODULE_BYTES) return;
		const data = code.overlay(i);
		if (!data || data.length > MODULE_BYTES / 4) return;
		total += data.length;
		modules.push({ name: `ov${entry.id}`, id: entry.id, ram: entry.ram, data });
	});
	return { code, game: code.code.slice(0, 3), modules };
}

interface Signature { bytes: number[]; mask: number[]; caps: Caps; anchorAt: number; anchor: Buffer; length: number }

function compileSignature(source: string): Signature {
	const bytes: number[] = [];
	const mask: number[] = [];
	const caps: Caps = {};
	const tokens = source.replace(/<(\w+)>/g, ' <$1> ').split(/\s+/).filter(Boolean);
	for (const token of tokens) {
		if (token.startsWith('<')) {
			caps[token.slice(1, -1)] = bytes.length;
			bytes.push(0);
			mask.push(0);
			continue;
		}
		for (let i = 0; i < token.length; i += 2) {
			const pair = token.slice(i, i + 2);
			if (pair === '..') {
				bytes.push(0);
				mask.push(0);
			} else {
				bytes.push(parseInt(pair, 16));
				mask.push(1);
			}
		}
	}
	let best = 0;
	let bestLength = 0;
	let run = 0;
	for (let i = 0; i <= bytes.length; i++) {
		if (i < bytes.length && mask[i]) {
			run++;
		} else {
			if (run > bestLength) {
				bestLength = run;
				best = i - run;
			}
			run = 0;
		}
	}
	return {
		bytes, mask, caps, anchorAt: best, anchor: Buffer.from(bytes.slice(best, best + bestLength)), length: bytes.length,
	};
}

function matchAt(data: Buffer, sig: Signature, off: number): boolean {
	if (off < 0 || off + sig.length > data.length) return false;
	for (let i = 0; i < sig.length; i++) {
		if (sig.mask[i] && data[off + i] !== sig.bytes[i]) return false;
	}
	return true;
}

function searchSignature(data: Buffer, sig: Signature, budget: Budget): number[] {
	const hits: number[] = [];
	let at = -1;
	while (budget.steps > 0 && (at = data.indexOf(sig.anchor, at + 1)) >= 0) {
		budget.steps--;
		const off = at - sig.anchorAt;
		if (matchAt(data, sig, off)) hits.push(off);
		if (hits.length > 4) break;
	}
	return hits;
}

function literal(mod: Gen5Module, at: number): number | null {
	if (at < 0 || at + 2 > mod.data.length) return null;
	const word = mod.data.readUInt16LE(at);
	if ((word & 0xf800) !== 0x4800) return null;
	const pool = ((at + 4) & ~3) + (word & 0xff) * 4;
	if (pool + 4 > mod.data.length) return null;
	return mod.data.readUInt32LE(pool);
}

function tableAt(mod: Gen5Module, ram: number, length: number): Buffer | null {
	const off = ram - mod.ram;
	if (off < 0 || off + length > mod.data.length) return null;
	return mod.data.subarray(off, off + length);
}

function shiftImmediate(word: number, form: number): number | null {
	if ((word & 0xf800) !== form) return null;
	return (word >> 6) & 31;
}

function ratioPairs(mod: Gen5Module, ram: number): number[][] | null {
	const table = tableAt(mod, ram, 26);
	if (!table) return null;
	const out: number[][] = [];
	let last = 0;
	for (let i = 0; i < 13; i++) {
		const num = table[i * 2];
		const den = table[i * 2 + 1];
		if (!num || !den) return null;
		if (num / den <= last) return null;
		last = num / den;
		out.push([num, den]);
	}
	if (out[6][0] !== out[6][1]) return null;
	return out;
}

const percent = (value: number) => (value >= 1 && value <= 100 ? value : null);
const divisor = (value: number) => (value >= 1 && value <= 64 ? value : null);

interface ChartContext { ptr?: number; count?: number }
interface NdsSignatures {
	gen4Tables: { [id: string]: { sig: string, stock?: Raw } };
	gen4Code: { [id: string]: string[] };
	gen4Scripts: { [id: string]: string };
	gen5: { [id: string]: { sig: string, expect?: Raw } };
}
const signatures = () => signatureSection<NdsSignatures>('nds');
interface Gen5Probe {
	id: string;
	expect?: Raw;
	read: (mod: Gen5Module, off: number, caps: Caps, context: ChartContext) => Raw;
}

const byteAt = (name: string) => (mod: Gen5Module, off: number, caps: Caps) => mod.data[off + caps[name]] || null;
const percentAt = (name: string) => (mod: Gen5Module, off: number, caps: Caps) => percent(mod.data[off + caps[name]]);
const percentOver100 = (mod: Gen5Module, off: number, caps: Caps) =>
	(mod.data[off + caps.d] === 100 ? percent(mod.data[off + caps.v]) : null);

const GEN5_PROBES: Gen5Probe[] = [
	{
		id: 'typeChart',
		expect: null,
		read(mod, off, caps, context) {
			const d = mod.data;
			const n = d[off + caps.n1];
			if (n !== d[off + caps.n2] || n < 15 || n > 40) return null;
			const w0 = d.readUInt16LE(off + caps.i0);
			const w1 = d.readUInt16LE(off + caps.i2);
			let stride = 0;
			if ((w0 & 0xf83f) === 0x0002 && w1 === 0x1882) stride = (1 << ((w0 >> 6) & 31)) + 1;
			else if ((w0 & 0xff00) === 0x2200 && w1 === 0x4342) stride = w0 & 0xff;
			if (stride !== n) return null;
			const ptr = literal(mod, off + caps.i3 + 1);
			if (ptr === null) return null;
			context.ptr = ptr;
			context.count = n;
			const table = tableAt(mod, ptr, n * n);
			if (!table) return null;
			const chart: number[][] = [];
			for (let a = 0; a < n; a++) {
				const row: number[] = [];
				for (let b = 0; b < n; b++) {
					const value = table[a * n + b];
					if (value !== 0 && value !== 2 && value !== 4 && value !== 8) return null;
					row.push(value / 4);
				}
				chart.push(row);
			}
			return { types: n, chart };
		},
	},
	{
		id: 'critChances',
		expect: [16, 8, 4, 3, 2],
		read(mod, off) {
			const ptr = literal(mod, off + 2);
			const table = ptr === null ? null : tableAt(mod, ptr, 5);
			if (!table) return null;
			const out: number[] = [];
			for (let i = 0; i < 5; i++) {
				if (!table[i] || (i && table[i] > table[i - 1])) return null;
				out.push(table[i]);
			}
			return out;
		},
	},
	{
		id: 'statStages',
		read(mod, off) {
			const ptr = literal(mod, off + 4);
			return ptr === null ? null : ratioPairs(mod, ptr);
		},
	},
	{
		id: 'accuracyStages',
		read(mod, off) {
			const ptr = literal(mod, off + 4);
			return ptr === null ? null : ratioPairs(mod, ptr);
		},
	},
	{
		id: 'multiHit',
		expect: [35, 35, 15, 15],
		read(mod, off) {
			const ptr = literal(mod, off + 18);
			const table = ptr === null ? null : tableAt(mod, ptr, 6);
			if (!table || table[0] || table[1]) return null;
			const out: number[] = [];
			let last = 0;
			for (let i = 2; i < 6; i++) {
				const value = i === 5 ? 100 : table[i];
				if (value < last || value > 100) return null;
				out.push(value - last);
				last = value;
			}
			if (table[5] < table[4]) return null;
			return out;
		},
	},
	{
		id: 'damageRoll',
		expect: { min: 85, max: 100, fixed: 85 },
		read(mod, off, caps) {
			const d = mod.data;
			const range = d[off + caps.range];
			const max = d[off + caps.max];
			if (max !== d[off + caps.div] || range < 1 || range > max) return null;
			return { min: max - range + 1, max, fixed: d[off + caps.fixed] };
		},
	},
	{
		id: 'critMultiplier',
		expect: 2,
		read(mod, off, caps) {
			const word = mod.data.readUInt16LE(off + caps.s0);
			if ((word & 0xf83f) !== 0x003f) return null;
			const n = (word >> 6) & 31;
			return n >= 1 && n <= 3 ? 1 << n : null;
		},
	},
	{
		id: 'burnAttackPercent',
		expect: 50,
		read: percentOver100,
	},
	{
		id: 'stab',
		expect: 1.5,
		read(mod, off, caps) {
			const value = mod.data[off + caps.v];
			return value >= 4 && value <= 16 ? value / 4 : null;
		},
	},
	{
		id: 'weatherBoost',
		expect: { sunFire: 1.5, sunWater: 0.5, rainFire: 0.5, rainWater: 1.5 },
		read(mod, off, caps) {
			const d = mod.data;
			const values = [d[off + caps.a], d[off + caps.b], d[off + caps.c], d[off + caps.d]];
			if (values.some(value => value < 1 || value > 16)) return null;
			return { sunFire: values[0] / 4, sunWater: values[1] / 4, rainFire: values[2] / 4, rainWater: values[3] / 4 };
		},
	},
	{
		id: 'weatherDamage',
		expect: 16,
		read(mod, off, caps) {
			const d = mod.data;
			const a = shiftImmediate(d.readUInt16LE(off + caps.a0), 0x1000);
			const b = shiftImmediate(d.readUInt16LE(off + caps.b0), 0x0800);
			const s = shiftImmediate(d.readUInt16LE(off + caps.c0), 0x0000);
			if (a === null || b === null || s === null) return null;
			const k = 16 - s;
			if (k < 1 || k > 6 || a !== k - 1 || b !== 32 - k) return null;
			return 1 << k;
		},
	},
	{
		id: 'weatherTurns',
		expect: 5,
		read(mod, off, caps) {
			const word = mod.data.readUInt16LE(off + caps.w0);
			if ((word & 0xfe3f) === 0x1c12) return (word >> 6) & 7 || null;
			if ((word & 0xff00) === 0x3200) return word & 0xff || null;
			return null;
		},
	},
	{
		id: 'abilityWeatherTurns',
		expect: 255,
		read: byteAt('v'),
	},
	{
		id: 'sleepTurns',
		expect: [2, 4],
		read(mod, off, caps) {
			const min = mod.data[off + caps.min];
			const max = mod.data[off + caps.max];
			return min === 2 && max >= min && max <= 10 ? [min, max] : null;
		},
	},
	{
		id: 'confusionTurns',
		expect: [2, 5],
		read(mod, off, caps) {
			const min = mod.data[off + caps.min];
			const max = mod.data[off + caps.max];
			return min >= 1 && max >= min && max <= 10 ? [min, max] : null;
		},
	},
	{
		id: 'paralysisSpeedPercent',
		expect: 25,
		read: percentOver100,
	},
	{
		id: 'fullParalysisChance',
		expect: 25,
		read: percentAt('v'),
	},
	{
		id: 'thawChance',
		expect: 20,
		read: percentAt('v'),
	},
	{
		id: 'confusionSelfHitChance',
		expect: 50,
		read: percentAt('v'),
	},
	{
		id: 'attractImmobilizeChance',
		expect: 50,
		read: percentAt('v'),
	},
	{
		id: 'confusionSelfHitPower',
		expect: 40,
		read: byteAt('v'),
	},
	{
		id: 'statusDamage',
		expect: { toxicStep: 16, poison: 8, burn: 8, nightmare: 4, curse: 4 },
		read(mod, off, caps) {
			const d = mod.data;
			const out = {
				toxicStep: divisor(d[off + caps.tox]), poison: divisor(d[off + caps.psn]), burn: divisor(d[off + caps.brn]),
				nightmare: divisor(d[off + caps.ngt]), curse: divisor(d[off + caps.crs]),
			};
			return Object.values(out).includes(null) ? null : out;
		},
	},
	{
		id: 'reflectTurns',
		expect: 5,
		read: byteAt('v'),
	},
	{
		id: 'lightScreenTurns',
		expect: 5,
		read: byteAt('v'),
	},
	{
		id: 'safeguardTurns',
		expect: 5,
		read: byteAt('v'),
	},
	{
		id: 'mistTurns',
		expect: 5,
		read: byteAt('v'),
	},
	{
		id: 'damageFormula',
		expect: { levelDivisor: 5, divisor: 50 },
		read(mod, off, caps) {
			const lv = mod.data[off + caps.lv];
			const dv = mod.data[off + caps.dv];
			return lv && dv ? { levelDivisor: lv, divisor: dv } : null;
		},
	},
];

interface Located { mod: Gen5Module; off: number; how: string }

function locate(
	rom: Gen5Rom, sig: Signature, hint: { id: number, ram: number } | null, budget: Budget
): Located | 'ambiguous' | null {
	if (hint) {
		const mod = rom.modules.find(entry => entry.id === hint.id);
		if (mod) {
			const off = hint.ram - mod.ram;
			if (matchAt(mod.data, sig, off)) return { mod, off, how: 'same address' };
			const hits = searchSignature(mod.data, sig, budget);
			if (hits.length === 1) return { mod, off: hits[0], how: 'moved inside module' };
			if (hits.length > 1) return 'ambiguous';
		}
	}
	const found: Located[] = [];
	for (const mod of rom.modules) {
		if (hint && mod.id === hint.id) continue;
		for (const off of searchSignature(mod.data, sig, budget)) found.push({ mod, off, how: 'signature search' });
		if (found.length > 1) return 'ambiguous';
	}
	return found[0] || null;
}

function runProbe(
	rom: Gen5Rom, probe: Gen5Probe, sig: Signature, hint: { id: number, ram: number } | null, context: ChartContext,
	budget: Budget
): { where: Located | null, ambiguous: boolean, value: Raw } {
	const where = locate(rom, sig, hint, budget);
	if (!where || where === 'ambiguous') return { where: null, ambiguous: where === 'ambiguous', value: null };
	let value: Raw = null;
	try {
		value = probe.read(where.mod, where.off, sig.caps, context);
	} catch {
		value = null;
	}
	return { where, ambiguous: false, value };
}

interface HandlerEntry { id: number; ptr: number; at: number; events: number[][] }
interface HandlerTables {
	decode: (ptr: number) => number[][] | null;
	all: HandlerEntry[][];
	kinds: { [kind: string]: HandlerEntry[] | undefined };
}

function handlerTables(mod: Gen5Module): HandlerTables {
	const d = mod.data;
	const inside = (value: number) => !!(value & 1) && value >= mod.ram && value < mod.ram + d.length;
	const decode = (ptr: number): number[][] | null => {
		const off = (ptr & ~1) - mod.ram;
		if (off < 0 || off + 12 > d.length) return null;
		if (d[off + 1] !== 0x21 || d.readUInt16LE(off + 2) !== 0x6001 || d.readUInt16LE(off + 4) !== 0x4800 ||
			d.readUInt16LE(off + 6) !== 0x4770) return null;
		const count = d[off];
		const table = d.readUInt32LE(off + 8) - mod.ram;
		if (!count || count > 32 || table < 0 || table + count * 8 > d.length) return null;
		const events: number[][] = [];
		for (let i = 0; i < count; i++) {
			const fn = d.readUInt32LE(table + i * 8 + 4);
			if (!inside(fn)) return null;
			events.push([d.readUInt32LE(table + i * 8), fn]);
		}
		return events;
	};
	const maps: HandlerEntry[][] = [];
	for (let i = 0; i + 8 <= d.length; i += 4) {
		const entries: { id: number, ptr: number, at: number }[] = [];
		while (i + entries.length * 8 + 8 <= d.length) {
			const at = i + entries.length * 8;
			const id = d.readUInt32LE(at);
			const ptr = d.readUInt32LE(at + 4);
			if (id >= 1000 || !inside(ptr)) break;
			entries.push({ id, ptr, at });
		}
		if (entries.length < 20) continue;
		const real: HandlerEntry[] = [];
		for (const entry of entries) {
			const events = decode(entry.ptr);
			if (events) real.push({ id: entry.id, ptr: entry.ptr, at: entry.at, events });
		}
		if (real.length >= 20) maps.push(real);
		i += entries.length * 8 - 4;
	}
	const hasRun = (list: HandlerEntry[], ids: number[]) => {
		for (let i = 0; i + ids.length <= list.length; i++) {
			if (ids.every((id, k) => list[i + k].id === id)) return true;
		}
		return false;
	};
	const kinds: { [kind: string]: HandlerEntry[] | undefined } = {};
	for (const map of maps) {
		let kind = '';
		if (hasRun(map, [282, 283, 284, 285])) kind = 'item';
		else if (hasRun(map, [115, 113, 219, 54])) kind = 'move';
		else if (hasRun(map, [2, 70, 45, 117])) kind = 'ability';
		if (kind && !kinds[kind]) kinds[kind] = map;
	}
	return { decode, all: maps, kinds };
}

interface DiffRegion { start: number; end: number; bytes: number }

function diffRegions(a: Buffer, b: Buffer, shift: number, gap: number): DiffRegion[] {
	const out: DiffRegion[] = [];
	let current: DiffRegion | null = null;
	const n = Math.min(a.length, b.length - shift);
	for (let i = 0; i < n; i++) {
		if (a[i] === b[i + shift]) continue;
		if (current && i - current.end <= gap) {
			current.end = i;
		} else {
			current = { start: i, end: i, bytes: 0 };
			out.push(current);
		}
		current.bytes++;
	}
	return out;
}

const GEN5_MOVE_FIELDS: [string, number, number][] = [
	['effectCategory', 1, 1], ['hits', 7, 1], ['status', 8, 2], ['statusChance', 10, 1], ['statusTurnMode', 11, 1],
	['minTurns', 12, 1], ['maxTurns', 13, 1], ['critStage', 14, 1], ['flinchChance', 15, 1], ['effect', 16, 2],
	['recoil', 18, 1], ['heal', 19, 1], ['target', 20, 1], ['stat1', 21, 1], ['stat2', 22, 1], ['stat3', 23, 1],
	['stage1', 24, 1], ['stage2', 25, 1], ['stage3', 26, 1], ['statChance1', 27, 1], ['statChance2', 28, 1],
	['statChance3', 29, 1], ['flags', 32, 4],
];

function gen5Move(row: Buffer): NdsMoveExtra | null {
	if (row.length < 36) return null;
	const recoil = row.readInt8(18);
	const statChanges: { stat: number, stages: number, chance: number }[] = [];
	for (let i = 0; i < 3; i++) {
		if (row[21 + i]) statChanges.push({ stat: row[21 + i], stages: row.readInt8(24 + i), chance: row[27 + i] });
	}
	const status = row.readUInt16LE(8);
	const chances: number[] = [];
	if (status && row[10]) chances.push(row[10]);
	if (row[15]) chances.push(row[15]);
	for (const change of statChanges) if (change.chance) chances.push(change.chance);
	const out: NdsMoveExtra = {
		effect: row.readUInt16LE(16), target: row[20], flags: row.readUInt32LE(32), priority: row.readInt8(6),
		effectCategory: row[1], hits: [row[7] & 15, row[7] >> 4], status, statusChance: row[10], statusTurnMode: row[11],
		turns: [row[12], row[13]], flinchChance: row[15], recoilPercent: recoil < 0 ? -recoil : 0,
		drainPercent: recoil > 0 ? recoil : 0, healPercent: row[19], statChanges,
	};
	if (chances.length && chances.every(chance => chance === chances[0])) out.secondaryChance = chances[0];
	if (row[14] <= 4) out.critRatio = row[14] + 1;
	else if (row[14] === 6) out.alwaysCrit = true;
	return out;
}

interface Gen5Raw {
	game: string;
	probes: (RawProbe & { baseAt?: string, hackAt?: string, how?: string })[];
	battleModule: {
		name: string, baseRam: string, baseSize: number, hackRam: string | null, hackSize: number | null,
	} | null;
	effectHandlers: { [kind: string]: Raw } | null;
	engineCode: Raw;
	otherCode: Raw;
	data: { items: Raw, moves: Raw };
	itemRows: { base: Buffer[], hack: Buffer[] } | null;
	moves: { [index: number]: NdsMoveExtra };
	baseMoves: { [index: number]: NdsMoveExtra };
}

function analyseGen5(hack: Gen5Rom, base: Gen5Rom): Gen5Raw | null {
	if (hack.game !== base.game) return null;
	const budget: Budget = { steps: SEARCH_STEPS };
	const compiled = GEN5_PROBES.map(probe => compileSignature(signatures().gen5[probe.id].sig));
	const result: Gen5Raw = {
		game: hack.game, probes: [], battleModule: null, effectHandlers: null, engineCode: null, otherCode: null,
		data: { items: null, moves: null }, itemRows: null, moves: {}, baseMoves: {},
	};
	let battle: Gen5Module | null = null;
	const baseRanges: ({ id: number, start: number, end: number } | null)[] = [];
	const baseContext: ChartContext = {};
	const hackContext: ChartContext = {};
	GEN5_PROBES.forEach((probe, index) => {
		const sig = compiled[index];
		const stored = signatures().gen5[probe.id].expect;
		const expect = stored === undefined ? probe.expect : stored;
		baseRanges.push(null);
		const b = runProbe(base, probe, sig, null, baseContext, budget);
		const entry: Gen5Raw['probes'][number] = { id: probe.id, status: 'notfound', base: null, hack: null };
		result.probes.push(entry);
		if (!b.where || b.value === null) {
			entry.note = 'not located in the clean base';
			return;
		}
		if (expect !== null && !same(b.value, expect)) {
			entry.note = 'clean base value differs from the documented Gen 5 value';
			entry.base = b.value;
			return;
		}
		entry.base = b.value;
		entry.baseAt = `${b.where.mod.name}+0x${b.where.off.toString(16)}`;
		baseRanges[index] = { id: b.where.mod.id, start: b.where.off, end: b.where.off + sig.length };
		if (!battle) battle = b.where.mod;
		const baseModule = b.where.mod;
		const h = runProbe(hack, probe, sig, { id: baseModule.id, ram: baseModule.ram + b.where.off }, hackContext, budget);
		if (!h.where) {
			const mod = hack.modules.find(candidate => candidate.id === baseModule.id);
			const off = mod ? baseModule.ram + b.where.off - mod.ram : -1;
			const present = !!mod && off >= 0 && off + sig.length <= mod.data.length;
			entry.status = present ? 'unreadable' : 'notfound';
			entry.note = h.ambiguous ? 'signature matches more than once' :
				present ? 'code at the base address was rewritten' : 'module missing';
			return;
		}
		entry.hackAt = `${h.where.mod.name}+0x${h.where.off.toString(16)}`;
		entry.how = h.where.how;
		if (h.value === null) {
			entry.status = 'unreadable';
			entry.note = 'located but the value failed validation';
			return;
		}
		entry.hack = h.value;
		entry.status = same(h.value, b.value) ? 'same' : 'changed';
	});

	const battleModule = battle as Gen5Module | null;
	if (battleModule) {
		const hackBattle = hack.modules.find(mod => mod.id === battleModule.id) || null;
		result.battleModule = {
			name: battleModule.name, baseRam: `0x${battleModule.ram.toString(16)}`, baseSize: battleModule.data.length,
			hackRam: hackBattle ? `0x${hackBattle.ram.toString(16)}` : null, hackSize: hackBattle ? hackBattle.data.length : null,
		};
		if (hackBattle) {
			const bt = handlerTables(battleModule);
			const ht = handlerTables(hackBattle);
			const handlers: { [kind: string]: Raw } = {};
			const starts: { ram: number, label: string }[] = [];
			const shift = battleModule.ram - hackBattle.ram;
			const d = hackBattle.data;
			for (const kind of ['move', 'ability', 'item']) {
				const table = bt.kinds[kind];
				if (!table) {
					handlers[kind] = { status: 'notfound' };
					continue;
				}
				for (const entry of table) {
					starts.push({ ram: entry.ptr & ~1, label: `${kind} ${entry.id} (table setup)` });
					for (const [event, fn] of entry.events) starts.push({ ram: fn & ~1, label: `${kind} ${entry.id} event ${event}` });
				}
				const key = (events: number[][]) => events.map(event => event.join('>')).join(',');
				const removed: number[] = [];
				const retargeted: number[] = [];
				const added: number[] = [];
				const first = table[0].at + shift;
				const last = table[table.length - 1].at + shift;
				for (const entry of table) {
					const at = entry.at + shift;
					if (at < 0 || at + 8 > d.length) {
						retargeted.push(entry.id);
						continue;
					}
					const id = d.readUInt32LE(at);
					const ptr = d.readUInt32LE(at + 4);
					if (id === entry.id && ptr === entry.ptr) {
						const now = ht.decode(ptr);
						if (!now || key(now) !== key(entry.events)) retargeted.push(entry.id);
					} else if (id === 0 && ptr === 0) {
						removed.push(entry.id);
					} else {
						retargeted.push(entry.id);
					}
				}
				const baseIds = new Set(table.map(entry => entry.id));
				for (const map of ht.all) {
					for (const entry of map) {
						if (entry.at >= first - 8 && entry.at <= last + 8 * 64 && !baseIds.has(entry.id)) added.push(entry.id);
					}
				}
				handlers[kind] = {
					status: removed.length || retargeted.length || added.length ? 'changed' : 'same',
					baseEntries: table.length, removed, retargeted, added,
				};
			}
			result.effectHandlers = handlers;
			starts.sort((a, b) => a.ram - b.ram);
			const ownerOf = (ram: number) => {
				let low = 0;
				let high = starts.length;
				while (low < high) {
					const middle = (low + high) >> 1;
					if (starts[middle].ram <= ram) low = middle + 1;
					else high = middle;
				}
				return low ? starts[low - 1] : null;
			};

			const regions = shift >= 0 ? diffRegions(battleModule.data, hackBattle.data, shift, 8) : null;
			const typeCountOnly = (region: DiffRegion) => {
				if (baseContext.count === hackContext.count) return false;
				let seen = false;
				for (let i = region.start; i <= region.end; i++) {
					const a = battleModule.data[i];
					const b = hackBattle.data[i + shift];
					if (a === b) continue;
					if (a === baseContext.count && b === hackContext.count) seen = true;
					else if (!((a === 0xd0 && b === 0xda) || (a === 0xd1 && b === 0xdb))) return false;
				}
				return seen;
			};
			const chartPointer = (region: DiffRegion) => {
				const at = region.start & ~3;
				if (region.end >= at + 4 || at + 4 > battleModule.data.length || at + shift + 4 > hackBattle.data.length) return false;
				return battleModule.data.readUInt32LE(at) === baseContext.ptr &&
					hackBattle.data.readUInt32LE(at + shift) === hackContext.ptr;
			};
			const chartData = (region: DiffRegion) => {
				if (baseContext.ptr === undefined || !baseContext.count) return false;
				const from = baseContext.ptr - battleModule.ram;
				const to = from + baseContext.count * baseContext.count;
				return from >= 0 && to <= battleModule.data.length && region.start >= from && region.end < to;
			};
			if (!regions) {
				result.engineCode = { status: 'unreadable', note: 'battle module moved up in memory' };
			} else {
				const list: Raw[] = [];
				let bytes = 0;
				let unclassified = 0;
				let unclassifiedBytes = 0;
				const handlerEdits: string[] = [];
				for (const region of regions) {
					const ram = battleModule.ram + region.start;
					let cls = 'unclassified';
					const probeIndex = baseRanges.findIndex(range =>
						!!range && range.id === battleModule.id && region.start < range.end && region.end >= range.start);
					if (probeIndex >= 0) {
						cls = `probe ${GEN5_PROBES[probeIndex].id}`;
					} else if (typeCountOnly(region)) {
						cls = `type count ${String(baseContext.count)} -> ${String(hackContext.count)}`;
					} else if (chartPointer(region)) {
						cls = 'type chart pointer';
					} else if (chartData(region)) {
						cls = 'type chart data';
					} else {
						const owner = ownerOf(ram);
						const tableHit = ['move', 'ability', 'item'].find(kind =>
							bt.kinds[kind]?.some(entry => region.start >= entry.at && region.start < entry.at + 8));
						if (tableHit) cls = `${tableHit} handler table entry`;
						else if (owner && ram - owner.ram < 0x300) cls = `handler of ${owner.label}`;
					}
					if (cls.startsWith('type count')) {
						const owner = ownerOf(ram);
						if (owner && ram - owner.ram < 0x300) cls += ` (in handler of ${owner.label})`;
					}
					bytes += region.bytes;
					if (cls === 'unclassified') {
						unclassified++;
						unclassifiedBytes += region.bytes;
					}
					if (cls.startsWith('handler of')) handlerEdits.push(cls.slice(11));
					if (list.length < 400) {
						list.push({
							ram: `0x${ram.toString(16)}`, span: region.end - region.start + 1, bytes: region.bytes, class: cls,
						});
					}
				}
				result.engineCode = {
					status: regions.length ? 'changed' : 'same', regions: regions.length, bytes, insertedAtStart: shift,
					unclassified, unclassifiedBytes, handlerEdits, list,
				};
			}
		}
	}

	const others: Raw[] = [];
	for (const mod of base.modules) {
		if (battleModule && mod.id === battleModule.id) continue;
		const h = hack.modules.find(candidate => candidate.id === mod.id);
		if (!h) {
			others.push({ module: mod.name, status: 'missing' });
			continue;
		}
		if (h.ram === mod.ram && h.data.equals(mod.data)) continue;
		if (
			mod.id === -1 && h.data.length === mod.data.length + 12 && h.data.subarray(0, mod.data.length).equals(mod.data)
		) continue;
		const shift = mod.ram - h.ram;
		const regions = shift >= 0 ? diffRegions(mod.data, h.data, shift, 8) : [];
		others.push({
			module: mod.name, regions: regions.length, bytes: regions.reduce((sum, region) => sum + region.bytes, 0),
			sizeChange: h.data.length - mod.data.length,
		});
	}
	result.otherCode = { modulesInBase: base.modules.length, modulesInHack: hack.modules.length, changed: others };

	const bi = base.code.narc('a/0/2/4');
	const hi = hack.code.narc('a/0/2/4');
	if (bi && hi && bi[1]?.length === 36) {
		result.itemRows = { base: bi, hack: hi };
		const changed: { [index: number]: Raw } = {};
		for (let i = 1; i < Math.min(bi.length, hi.length); i++) {
			if (hi[i].length < 4 || bi[i].length < 4) continue;
			if (bi[i][2] !== hi[i][2] || bi[i][3] !== hi[i][3]) {
				changed[i] = { base: { effect: bi[i][2], param: bi[i][3] }, hack: { effect: hi[i][2], param: hi[i][3] } };
			}
		}
		const param = (list: Buffer[], id: number, effect: number) =>
			(list[id] && list[id].length >= 4 && list[id][2] === effect ? list[id][3] : null);
		result.data.items = {
			baseCount: bi.length, hackCount: hi.length, holdEffectChanged: changed,
			weatherRockBonus: { base: param(bi, 285, 0x71), hack: param(hi, 285, 0x71) },
			lightClayBonus: { base: param(bi, 269, 0x61), hack: param(hi, 269, 0x61) },
		};
	}
	const bm = base.code.narc('a/0/2/1');
	const hm = hack.code.narc('a/0/2/1');
	if (bm && hm && bm[1] && bm[1].length >= 36) {
		const changed: { [index: number]: Raw } = {};
		let count = 0;
		const fieldCount: { [name: string]: number } = {};
		const field = (row: Buffer, at: number, size: number) =>
			(size === 4 ? row.readUInt32LE(at) : size === 2 ? row.readUInt16LE(at) : row[at]);
		for (let i = 1; i < hm.length; i++) {
			const move = gen5Move(hm[i]);
			if (move) result.moves[i] = move;
		}
		for (let i = 1; i < bm.length; i++) {
			const move = gen5Move(bm[i]);
			if (move) result.baseMoves[i] = move;
		}
		for (let i = 1; i < Math.min(bm.length, hm.length); i++) {
			if (hm[i].length < 36 || bm[i].length < 36) continue;
			const fields: { [name: string]: number[] } = {};
			for (const [name, at, size] of GEN5_MOVE_FIELDS) {
				const a = field(bm[i], at, size);
				const b = field(hm[i], at, size);
				if (a !== b) {
					fields[name] = [a, b];
					fieldCount[name] = (fieldCount[name] || 0) + 1;
				}
			}
			if (Object.keys(fields).length) {
				count++;
				changed[i] = fields;
			}
		}
		result.data.moves = {
			baseCount: bm.length, hackCount: hm.length, movesWithChangedBattleFields: count, fieldCount, changed,
		};
	}
	return result;
}

function gcd(a: number, b: number): number {
	while (b) [a, b] = [b, a % b];
	return a;
}

const GEN5_ROCKS: [string, number][] = [['hail', 282], ['sand', 283], ['sun', 284], ['rain', 285]];

function gen5Result(raw: Gen5Raw, names: NdsNames | undefined): NdsMechanicsResult {
	const out = new Builder();
	const get = (id: string): RawProbe | undefined => raw.probes.find(probe => probe.id === id);
	const one = (id: string, probeId: string, compute: (value: Raw) => Raw) => (
		out.derive(id, [get(probeId)], ([v]) => compute(v))
	);
	const itemProbe = (index: number, effect?: number): RawProbe | undefined => {
		if (!raw.itemRows) return undefined;
		const b = raw.itemRows.base[index];
		const h = raw.itemRows.hack[index];
		if (!b || b.length < 4 || !b[2] || (effect !== undefined && b[2] !== effect)) return undefined;
		if (!h || h.length < 4 || h[2] !== b[2]) return { id: `item${index}`, status: 'unreadable', base: b[3], hack: null };
		return { id: `item${index}`, status: h[3] === b[3] ? 'same' : 'changed', base: b[3], hack: h[3] };
	};

	one('critChances', 'critChances', v => v.map((value: number) => [1, value]));
	one('critMultiplier', 'critMultiplier', v => v);
	one('stab', 'stab', v => v);
	one('damageRoll', 'damageRoll', v => ({ min: v.min, max: v.max, den: v.max }));
	one('info.damageRollFixed', 'damageRoll', v => v.fixed);
	one('damageLevelDivisor', 'damageFormula', v => v.levelDivisor);
	one('damageDivisor', 'damageFormula', v => v.divisor);
	one('statStages', 'statStages', v => v);
	one('accuracyStages', 'accuracyStages', v => v);
	one('multiHit', 'multiHit', v => {
		const common = v.reduce((a: number, b: number) => gcd(a, b), 0);
		return common ? v.map((value: number) => value / common) : undefined;
	});
	for (const [key, index] of GEN5_ROCKS) {
		one(`weatherTurns.${key}`, 'weatherTurns', v => v);
		out.derive(`weatherRockTurns.${key}`, [get('weatherTurns'), itemProbe(index, index === 285 ? 0x71 : undefined)],
			([turns, bonus]) => turns + bonus);
	}
	one('abilityWeatherTurns', 'abilityWeatherTurns', v => (v === 255 ? 0 : v));
	one('weatherMoveModifiers', 'weatherBoost', v => [
		{ weather: 'rain', type: 'Water', multiplier: v.rainWater }, { weather: 'rain', type: 'Fire', multiplier: v.rainFire },
		{ weather: 'sun', type: 'Fire', multiplier: v.sunFire }, { weather: 'sun', type: 'Water', multiplier: v.sunWater },
	]);
	one('sandDamage', 'weatherDamage', v => [1, v]);
	one('hailDamage', 'weatherDamage', v => [1, v]);
	const moveTurns = (status: number): RawProbe => {
		const collect = (rows: { [index: number]: NdsMoveExtra }) => {
			const seen = new Map<string, number[]>();
			for (const key of Object.keys(rows)) {
				const move = rows[+key];
				if (move.status === status && move.turns) seen.set(move.turns.join('-'), move.turns);
			}
			return [...seen.values()];
		};
		const b = collect(raw.baseMoves);
		const h = collect(raw.moves);
		if (b.length > 1) return { id: `moveTurns${status}`, status: 'notfound', base: null, hack: null };
		if (h.length > 1) return { id: `moveTurns${status}`, status: 'unreadable', base: b[0] || 'none', hack: null };
		return {
			id: `moveTurns${status}`, status: same(b, h) ? 'same' : 'changed', base: b[0] || 'none', hack: h[0] || 'none',
		};
	};
	const counter = ([code, table]: Raw[]) =>
		(code[0] >= 2 && (table === 'none' || same(table, code)) ? [code[0] - 1, code[1] - 1] : undefined);
	out.derive('sleepTurns', [get('sleepTurns'), moveTurns(2)], counter);
	out.derive('confusionTurns', [get('confusionTurns'), moveTurns(6)], counter);
	out.derive('info.bindTurns', [moveTurns(8)], ([v]) => v);
	one('confusionSelfHitChance', 'confusionSelfHitChance', v => [v, 100]);
	one('confusionSelfHitPower', 'confusionSelfHitPower', v => v);
	one('attractChance', 'attractImmobilizeChance', v => [v, 100]);
	one('fullParalysisChance', 'fullParalysisChance', v => [v, 100]);
	one('paralysisSpeed', 'paralysisSpeedPercent', v => v / 100);
	one('burnAttack', 'burnAttackPercent', v => v / 100);
	one('thawChance', 'thawChance', v => [v, 100]);
	one('burnDamage', 'statusDamage', v => [1, v.burn]);
	one('poisonDamage', 'statusDamage', v => [1, v.poison]);
	one('toxicStep', 'statusDamage', v => [1, v.toxicStep]);
	one('nightmareDamage', 'statusDamage', v => [1, v.nightmare]);
	one('curseDamage', 'statusDamage', v => [1, v.curse]);
	one('screenTurns.reflect', 'reflectTurns', v => v);
	one('screenTurns.lightscreen', 'lightScreenTurns', v => v);
	one('screenTurns.safeguard', 'safeguardTurns', v => v);
	one('screenTurns.mist', 'mistTurns', v => v);
	out.derive('screenClayTurns', [get('reflectTurns'), get('lightScreenTurns'), itemProbe(269, 0x61)],
		([reflect, lightScreen, bonus]) => (reflect === lightScreen ? reflect + bonus : undefined));

	const nameOf = (list: string[] | undefined, index: number, kind: string) => list?.[index] || `${kind} ${index}`;
	const changedItems: { [index: number]: Raw } = raw.data.items ? raw.data.items.holdEffectChanged : {};
	let listed = 0;
	for (const key of Object.keys(changedItems)) {
		const index = +key;
		if (index === 269 || (index >= 282 && index <= 285) || listed >= 200) continue;
		listed++;
		const name = names?.items?.[index];
		const id = name && toID(name) ? `items.${toID(name)}` : `info.item.${index}`;
		out.entry(id, id.startsWith('info.') ? 'changed' : 'unreadable', changedItems[index].base, changedItems[index].hack);
	}

	const effects = { movesRemoved: [] as number[], movesEdited: [] as number[], movesAdded: [] as number[],
		abilitiesEdited: [] as number[], itemsEdited: [] as number[] };
	const handlers = raw.effectHandlers;
	const add = (list: number[], id: number) => {
		if (!list.includes(id)) list.push(id);
	};
	if (handlers) {
		for (const id of handlers.move?.removed || []) add(effects.movesRemoved, id);
		for (const id of handlers.move?.retargeted || []) add(effects.movesEdited, id);
		for (const id of handlers.move?.added || []) add(effects.movesAdded, id);
		for (const kind of ['ability', 'item']) {
			const target = kind === 'ability' ? effects.abilitiesEdited : effects.itemsEdited;
			for (const key of ['removed', 'retargeted', 'added']) for (const id of handlers[kind]?.[key] || []) add(target, id);
		}
	}
	for (const label of (raw.engineCode?.handlerEdits || []) as string[]) {
		const match = /^(move|ability|item) (\d+) /.exec(label);
		if (!match) continue;
		const edited = match[1] === 'move' ? effects.movesEdited :
			match[1] === 'ability' ? effects.abilitiesEdited : effects.itemsEdited;
		add(edited, +match[2]);
	}
	effects.movesEdited = effects.movesEdited.filter(id => !effects.movesRemoved.includes(id));
	for (const id of effects.movesRemoved) {
		out.notes.push(`The special battle effect of ${nameOf(names?.moves, id, 'move')} was removed by the hack.`);
	}
	for (const id of effects.movesEdited) {
		out.notes.push(`The battle effect code of ${nameOf(names?.moves, id, 'move')} was edited by the hack; the edit is not applied in battles.`);
	}
	for (const id of effects.movesAdded) {
		out.notes.push(`The hack gives ${nameOf(names?.moves, id, 'move')} battle effect code of its own; it is not applied in battles.`);
	}
	for (const id of effects.abilitiesEdited) {
		out.notes.push(`The battle effect code of ${nameOf(names?.abilities, id, 'ability')} was edited by the hack; the edit is not applied in battles.`);
	}
	for (const id of effects.itemsEdited) {
		out.notes.push(`The battle effect code of ${nameOf(names?.items, id, 'item')} was edited by the hack; the edit is not applied in battles.`);
	}

	const gameName = GEN5_GAMES[raw.game];
	const code = raw.engineCode;
	let kind: 'stock' | 'rewritten' | 'unknown' = 'stock';
	let detail = '';
	if (!raw.battleModule) {
		kind = 'unknown';
		detail = 'The battle code of the original game could not be located.';
	} else if (!raw.battleModule.hackRam || !code || code.status === 'unreadable') {
		kind = 'rewritten';
		detail = `The ${gameName} battle code is missing or was moved, so the battle engine was rebuilt.`;
	} else if (code.unclassified > 8 || code.unclassifiedBytes > 64 || code.bytes > raw.battleModule.baseSize / 20) {
		kind = 'rewritten';
		detail = `The ${gameName} battle code has ${code.unclassified} edits that could not be explained (${code.bytes} bytes differ), so the battle engine was changed in ways that cannot be read.`;
	} else if (code.unclassified) {
		detail = `${gameName} battle engine; ${code.bytes} bytes of the battle code differ and ${code.unclassified} small edits could not be explained.`;
		out.notes.push(`${code.unclassified} small edits to the battle code of this hack could not be explained.`);
	} else {
		detail = `${gameName} battle engine; ${code.bytes} bytes of the battle code differ and every edit is explained.`;
	}

	const result = emptyResult('unknown', detail);
	const chart = get('typeChart');
	if (chart) {
		const describe = (value: Raw) => {
			if (!value) return null;
			const cells: { attack: number, defend: number, multiplier: number }[] = [];
			(value.chart as number[][]).forEach((row, attack) => row.forEach((multiplier, defend) => {
				if (multiplier !== 1) cells.push({ attack, defend, multiplier });
			}));
			const extra: number[] = [];
			for (let i = 17; i < value.types; i++) extra.push(i);
			return buildChart(cells, GEN5_TYPES, extra, names?.types, null, value.types);
		};
		const baseChart = describe(chart.base);
		const hackChart = describe(chart.hack);
		out.entry('typeChart', chart.status, baseChart?.typeChart, hackChart?.typeChart);
		if (kind === 'stock' && hackChart && (chart.status === 'same' || chart.status === 'changed')) {
			result.typeChart = hackChart.typeChart;
			result.typeChartCells = hackChart.typeChartCells;
			if (hackChart.fairySlot >= 0) result.fairySlot = hackChart.fairySlot;
			result.typeChartInfo = { typeNames: hackChart.typeNames, unsupported: [], reference: 'base' };
		}
	}
	if (kind !== 'stock') {
		out.killStock();
		out.notes.push(detail);
	}
	result.engine = { kind, live: kind === 'stock', detail };
	result.values = out.values;
	result.report = out.report;
	result.notes = out.notes;
	result.moves = raw.moves;
	result.baseMoves = raw.baseMoves;
	result.changedMoves = raw.data.moves ? Object.keys(raw.data.moves.changed).map(Number) : [];
	result.rawMoveFields = rawMoveFields(raw.moves, raw.baseMoves);
	for (const key of Object.keys(changedItems)) {
		result.itemHold[`item${key}`] = {
			base: [changedItems[+key].base.effect, changedItems[+key].base.param],
			hack: [changedItems[+key].hack.effect, changedItems[+key].hack.param],
		};
	}
	result.effects = effects;
	result.debug = {
		probes: raw.probes, battleModule: raw.battleModule, effectHandlers: raw.effectHandlers, engineCode: raw.engineCode,
		otherCode: raw.otherCode, data: raw.data,
	};
	return result;
}

export function readGen5MechanicsFrom(hack: Gen5Rom, base: Gen5Rom, names?: NdsNames): NdsMechanicsResult {
	requireSignatures();
	try {
		const raw = analyseGen5(hack, base);
		if (!raw) return emptyResult('unknown', 'The battle code of this game could not be found.');
		return gen5Result(raw, names);
	} catch {
		return emptyResult('unknown', 'The battle code of this game could not be read.');
	}
}

export function readGen5Mechanics(rom: Buffer, base: Buffer | null, names?: NdsNames): NdsMechanicsResult {
	requireSignatures();
	try {
		const hack = openGen5(rom);
		if (!hack) return emptyResult('unknown', 'This is not a Generation 5 Pokemon DS game.');
		const clean = base ? openGen5(base) : null;
		if (!clean || clean.game !== hack.game) {
			return emptyResult('unknown', 'No matching original game was available to compare the battle code with.');
		}
		return readGen5MechanicsFrom(hack, clean, names);
	} catch {
		return emptyResult('unknown', 'The battle code of this game could not be read.');
	}
}

export function readNdsMechanics(rom: Buffer, base: Buffer | null, names?: NdsNames): NdsMechanicsResult {
	const code = rom.length >= 0x10 ? rom.toString('latin1', 0x0c, 0x0f) : '';
	if (GEN4_FAMILIES[code]) return readGen4Mechanics(rom, base, names);
	if (GEN5_GAMES[code]) return readGen5Mechanics(rom, base, names);
	return emptyResult('unknown', 'This is not a Generation 4 or 5 Pokemon DS game.');
}
