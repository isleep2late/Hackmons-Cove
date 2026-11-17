import { Dex, toID, type ModdedDex } from '../../sim/dex';
import type { RomHackMechanics } from '../../sim/romhack-mechanics';
import { ROM_HACK_REGULAR_UNAVAILABLE } from '../../sim/romhack-formats';

export interface RawLearnset {
	levelup: { level: number, move: number }[];
	machines: number[];
	tutor: number[];
	egg: number[];
	other?: number[];
}
export interface RawSpecies {
	index: number;
	name: string;
	baseStats?: { hp: number, atk: number, def: number, spa: number, spd: number, spe: number };
	types?: string[];
	abilities?: string[];
	innates?: string[];
	learnset?: RawLearnset;
	evolvesFrom?: number;
	evolvesFromAll?: number[];
}
export interface RawMove {
	index: number;
	name: string;
	basePower?: number;
	type?: string;
	accuracy?: number;
	pp?: number;
	priority?: number;
	contact?: boolean;
	category?: 'Physical' | 'Special' | 'Status';
	secondaryChance?: number;
	effect?: number;
	critRatio?: number;
}
export interface RawTypeMatchup { attack: string; defend: string; multiplier: number }
export type MechanicsStatus = 'same' | 'changed' | 'unreadable' | 'notfound' | 'dead';
export interface MechanicsReportEntry { id: string; status: MechanicsStatus; base?: any; hack?: any }
export interface MechanicsReaderResult {
	engine: { kind: 'stock' | 'cfru' | 'expansion' | 'rewritten' | 'unknown', live: boolean, detail: string };
	values: AnyObject;
	report: MechanicsReportEntry[];
	typeChart?: RawTypeMatchup[];
	typeChartInfo?: {
		typeNames: string[],
		foresightIgnored?: { attack: string, defend: string }[],
		unsupported?: RawTypeMatchup[],
		reference: 'base' | 'gen6',
	};
	notes: string[];
}
export interface RomHackMechanicsReport {
	engine: MechanicsReaderResult['engine'];
	baseGen: number;
	parentGen: number;
	counts: { same: number, changed: number, unreadable: number, notfound: number, dead: number };
	changed: string[];
	unreadable: string[];
	applied: string[];
	noteOnly: string[];
	rejected?: string[];
}

export function slimMechanics(result: MechanicsReaderResult): MechanicsReaderResult {
	return {
		engine: result.engine, values: result.values, report: result.report, typeChart: result.typeChart,
		typeChartInfo: result.typeChartInfo, notes: result.notes,
	};
}

export function readMechanics<T>(notes: string[], read: () => T): T | null {
	try {
		return read();
	} catch {
		notes.push('The battle mechanics of this hack could not be read.');
		return null;
	}
}

export interface RawHack {
	rom?: Buffer;
	mechanics?: MechanicsReaderResult;
	engineGen?: number;
	speciesTable?: { start: number, stride: number, nameAt: number };
	typeChart?: RawTypeMatchup[];
	keepBaseEngine?: boolean;
	baseGame: string;
	baseGen: number;
	species: RawSpecies[];
	moves: RawMove[];
	abilities: string[];
	items: string[];
	itemPockets?: (ItemPocket | undefined)[];
	typeBasedCategories: boolean;
	notes: string[];
	learnsetStatus?: 'read' | 'unreadable';
	learnsetNote?: string;
}
export type ItemPocket = 'key' | 'tm' | 'held';

const KEY_ITEMS = new Set([
	'bicycle', 'machbike', 'acrobike', 'oldrod', 'goodrod', 'superrod', 'townmap', 'itemfinder', 'dowsingmchn',
	'dowsingmachine', 'vsseeker', 'vsrecorder', 'coincase', 'ssticket', 'tmcase', 'berrypouch', 'pokeflute', 'teachytv',
	'wailmerpail', 'devongoods', 'devonparts', 'devonscope', 'gogoggles', 'basementkey', 'cardkey', 'liftkey', 'silphscope',
	'secretkey', 'storagekey', 'bikevoucher', 'goldteeth', 'oaksparcel', 'oaksletter', 'tea', 'famechecker', 'tripass',
	'rainbowpass', 'mysticticket', 'auroraticket', 'eonticket', 'oldseamap', 'contestpass', 'sootsack', 'letter', 'scanner',
	'meteorite', 'magmaemblem', 'pokeblockcase', 'powderjar', 'rm1key', 'rm2key', 'rm4key', 'rm6key', 'ruby', 'sapphire',
	'redscale', 'secretpotion', 'mysteryegg', 'clearbell', 'tidalbell', 'silverwing', 'rainbowwing', 'gsball', 'bluecard',
	'machinepart', 'eggticket', 'lostitem', 'pass', 'squirtbottle', 'sprayduck', 'explorerkit', 'lootsack', 'rulebook',
	'pokeradar', 'pointcard', 'journal', 'sealcase', 'fashioncase', 'sealbag', 'palpad', 'workskey', 'oldcharm',
	'galactickey', 'redchain', 'poffincase', 'suitekey', 'lunarwing', 'membercard', 'azureflute', 'magmastone', 'parcel',
	'coupon1', 'coupon2', 'coupon3', 'apricornbox', 'unownreport', 'berrypots', 'slowpoketail', 'gbsounds', 'lockcapsule',
	'enigmastone', 'photoalbum', 'libertypass', 'propcase', 'dragonskull', 'lightstone', 'darkstone', 'xtransceiver',
	'medalbox', 'dnasplicers', 'permit', 'ovalcharm', 'shinycharm', 'catchingcharm', 'expcharm', 'plasmacard',
	'grubbyhanky', 'colressmachine', 'colressmchn', 'droppeditem', 'revealglass', 'megaring', 'megabracelet', 'zring',
	'zpowerring', 'dynamaxband', 'teraorb', 'dexnav', 'zygardecube', 'prisonbottle', 'nsolarizer', 'nlunarizer',
	'reinsofunity', 'pokedex', 'runningshoes', 'holocaster', 'gracidea', 'tmhm', 'keystone',
]);

export function itemKind(name: string): ItemPocket | '' {
	const id = toID(name);
	if (/^(tm|hm|tr)[0-9]+/.test(id)) return 'tm';
	if (Dex.items.get(id).exists) return 'held';
	return KEY_ITEMS.has(id) ? 'key' : '';
}

export function votePockets(
	names: string[], from: number, to: number, field: (item: number, at: number) => number, bit = 3, bitMask = 0x1f
): (ItemPocket | undefined)[] | undefined {
	const kinds = names.map(itemKind);
	const total = { key: 0, tm: 0, held: 0, '': 0 };
	for (const kind of kinds) total[kind]++;
	if (total.key < 4 || total.tm < 10 || total.held < 20) return undefined;
	let best: [number, number, number, number, number] | null = null;
	let bestScore = 0;
	for (let at = from; at < to; at++) {
		const raw = names.map((name, item) => field(item, at));
		for (const mask of [0xff, 0x1f, 0xf]) {
			for (let shift = 0; shift < 8; shift++) {
				const tally: { [kind: string]: Map<number, number> } = { key: new Map(), tm: new Map(), held: new Map() };
				const seen = { key: 0, tm: 0, held: 0 };
				kinds.forEach((kind, item) => {
					if (!kind || raw[item] < 0) return;
					const value = (raw[item] >> shift) & mask;
					seen[kind]++;
					tally[kind].set(value, (tally[kind].get(value) || 0) + 1);
				});
				if (seen.key < 4 || seen.tm < 10 || seen.held < 20) continue;
				const mode = (kind: string) => [...tally[kind]].sort((a, b) => b[1] - a[1])[0];
				const [key, keyVotes] = mode('key');
				const [tm, tmVotes] = mode('tm');
				const leaked = (tally.held.get(key) || 0) + (tally.held.get(tm) || 0);
				if (key === tm || keyVotes < seen.key * 0.8 || tmVotes < seen.tm * 0.9 || leaked > seen.held * 0.1) continue;
				const plain = shift === bit && mask === bitMask ? 0 : !shift && mask === 0xff ? 1 : 10 + shift + (0xff - mask) / 256;
				const score = keyVotes / seen.key + tmVotes / seen.tm - leaked / seen.held - plain / 10000;
				if (score > bestScore) {
					bestScore = score;
					best = [at, shift, mask, key, tm];
				}
			}
		}
	}
	if (!best) return undefined;
	const [at, shift, mask, key, tm] = best;
	return names.map((name, item) => {
		const raw = field(item, at);
		if (raw < 0) return undefined;
		const value = (raw >> shift) & mask;
		return value === tm ? 'tm' : value === key ? 'key' : 'held';
	});
}

export const HACK_VERSION = 17;

export interface HackDex {
	version: number;
	sha256: string;
	patchSha256?: string;
	autoBase?: string;
	pickedBase?: { id: string, name: string };
	patchFormat: string;
	baseGame: string;
	baseGen: number;
	parentMod: string;
	notes: string[];
	approximated: { moves: string[], abilities: string[], items: string[] };
	Pokedex: { [id: string]: AnyObject };
	Moves: { [id: string]: AnyObject };
	Abilities: { [id: string]: AnyObject };
	Items: { [id: string]: AnyObject };
	TypeChart: { [id: string]: AnyObject };
	mechanics: RomHackMechanics;
	mechanicsNotes: string[];
	mechanicsReport: RomHackMechanicsReport | null;
	indices: { species: { [id: string]: number }, items: { [id: string]: number } };
	sprites?: {
		pokemon: number, icons: number, items: number, size?: number, overworld?: number, overworldIds?: string[],
	};
	legal: { species: string[], moves: string[], abilities: string[], items: string[] };
	learnsetStatus: 'read' | 'unreadable';
	learnsetNote?: string;
	learnsets?: HackLearnsets;
}
export interface HackLearnset {
	levelup: number[];
	machines: number[];
	tutor: number[];
	egg: number[];
	other?: number[];
	prevos?: string[];
}
export interface HackLearnsets {
	moves: string[];
	species: { [id: string]: number[] };
	own: { [id: string]: HackLearnset };
}

const LEARNSETS_UNREADABLE = 'The movesets of this game could not be read';

function buildLearnsets(
	raw: RawHack, moveByIndex: Map<number, string>, speciesByIndex: Map<number, string>
): { status: 'read' | 'unreadable', note?: string, learnsets?: HackLearnsets } {
	if (raw.learnsetStatus !== 'read') {
		return { status: 'unreadable', note: raw.learnsetNote || `${LEARNSETS_UNREADABLE}.` };
	}
	const rows = new Map<number, RawSpecies>();
	for (const row of raw.species) {
		if (!rows.has(row.index)) rows.set(row.index, row);
	}
	const moves: string[] = [];
	const slots = new Map<string, number>();
	let listed = 0;
	let known = 0;
	const slot = (index: number) => {
		listed++;
		const id = moveByIndex.get(index);
		if (!id) return -1;
		known++;
		let at = slots.get(id);
		if (at === undefined) {
			at = moves.length;
			moves.push(id);
			slots.set(id, at);
		}
		return at;
	};
	const list = (indices: number[] | undefined) => {
		const out: number[] = [];
		for (const index of indices || []) {
			const at = slot(index);
			if (at >= 0 && !out.includes(at)) out.push(at);
		}
		return out;
	};
	const ownByIndex = new Map<number, HackLearnset>();
	for (const [index, row] of rows) {
		const learnset = row.learnset;
		if (!learnset || !Array.isArray(learnset.levelup)) continue;
		const levelup: number[] = [];
		for (const entry of learnset.levelup) {
			const at = slot(entry.move);
			if (at >= 0 && entry.level >= 0 && entry.level <= 100) levelup.push(entry.level, at);
		}
		const own: HackLearnset = {
			levelup, machines: list(learnset.machines), tutor: list(learnset.tutor), egg: list(learnset.egg),
		};
		const other = list(learnset.other);
		if (other.length) own.other = other;
		ownByIndex.set(index, own);
	}
	if (!ownByIndex.size || !known || known < listed * 0.9) {
		return { status: 'unreadable', note: `${LEARNSETS_UNREADABLE}: its moves do not match the move list of the game.` };
	}
	const parents = (index: number) => {
		const row = rows.get(index);
		if (!row) return [];
		const from = row.evolvesFromAll?.length ? row.evolvesFromAll : row.evolvesFrom !== undefined ? [row.evolvesFrom] : [];
		return from.filter(parent => parent !== index);
	};
	const learnsets: HackLearnsets = { moves, species: {}, own: {} };
	for (const [index, id] of speciesByIndex) {
		const own = ownByIndex.get(index);
		if (!own || learnsets.own[id]) continue;
		const all = new Set<number>();
		const seen = new Set<number>();
		const queue = [index];
		const prevos: string[] = [];
		while (queue.length) {
			const at = queue.shift()!;
			if (seen.has(at)) continue;
			seen.add(at);
			const entry = ownByIndex.get(at);
			if (entry) {
				for (let i = 1; i < entry.levelup.length; i += 2) all.add(entry.levelup[i]);
				for (const group of [entry.machines, entry.tutor, entry.egg, entry.other || []]) {
					for (const move of group) all.add(move);
				}
			}
			for (const parent of parents(at)) {
				if (at === index) {
					const parentId = speciesByIndex.get(parent);
					if (parentId && parentId !== id && !prevos.includes(parentId)) prevos.push(parentId);
				}
				queue.push(parent);
			}
		}
		learnsets.own[id] = prevos.length ? { ...own, prevos } : own;
		learnsets.species[id] = [...all].sort((a, b) => a - b);
	}
	if (!Object.keys(learnsets.species).length) return { status: 'unreadable', note: `${LEARNSETS_UNREADABLE}.` };
	return { status: 'read', learnsets };
}

const SPECIAL_TYPES = ['Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark'];

const NA = 'n/a';
const SPECIAL = 'special';

type LeafKind = 'hp' | 'damage' | 'current' | 'chance' | 'range' | 'turns' | 'mult' | 'ratio' | 'num' | 'bool' | 'cap' |
	'fractions' | 'stages' | 'weights' | 'list' | 'roll' | 'category' | 'weather' | 'nature' | 'table' | 'accuracy' |
	'stagesAdded' | 'flat';
interface LeafInfo { label: string; kind: LeafKind; def?: [number, any][]; tolerance?: number; plural?: boolean }

const PLURAL_LABELS =
	/^(Critical-hit chances|High critical-hit moves|Protect success chances|Sandstorm-immune types)$|(multipliers|modifiers)$/;

function leaf(label: string, kind: LeafKind, ...def: [number, any][]): LeafInfo {
	return { label, kind, def, plural: PLURAL_LABELS.test(label) };
}

const GB_STAGES = [
	[25, 100], [28, 100], [33, 100], [40, 100], [50, 100], [66, 100], [1, 1], [3, 2], [2, 1], [5, 2], [3, 1], [7, 2],
	[4, 1],
];
const WEATHER_ROWS = [
	{ weather: 'rain', type: 'Water', multiplier: 1.5 }, { weather: 'rain', type: 'Fire', multiplier: 0.5 },
	{ weather: 'sun', type: 'Fire', multiplier: 1.5 }, { weather: 'sun', type: 'Water', multiplier: 0.5 },
];
const GEN1_SPECIAL = ['Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon'];

const LEAVES: { [path: string]: LeafInfo } = {
	critChances: leaf('Critical-hit chances', 'fractions', [1, NA],
		[2, [[17, 256], [32, 256], [64, 256], [85, 256], [128, 256]]], [3, [[1, 16], [1, 8], [1, 4], [1, 3], [1, 2]]],
		[6, [[1, 16], [1, 8], [1, 2], [1, 1]]], [7, [[1, 24], [1, 8], [1, 2], [1, 1]]]),
	critMultiplier: leaf('Critical-hit damage', 'mult', [1, NA], [2, 2], [6, 1.5]),
	stab: leaf('Same-type attack bonus', 'mult', [1, 1.5]),
	damageRoll: leaf('Damage roll', 'roll', [1, { min: 217, max: 255, den: 255 }], [3, { min: 85, max: 100, den: 100 }]),
	damageLevelDivisor: leaf('Damage formula level divisor', 'num', [1, 5]),
	damageDivisor: leaf('Damage formula divisor', 'num', [1, 50]),
	statStages: leaf('Stat stage multipliers', 'stages', [1, GB_STAGES],
		[3, [[2, 8], [2, 7], [2, 6], [2, 5], [2, 4], [2, 3], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2]]]),
	accuracyStages: leaf('Accuracy stage multipliers', 'stages', [1, GB_STAGES],
		[2, [[33, 100], [36, 100], [43, 100], [50, 100], [60, 100], [75, 100], [1, 1], [133, 100], [166, 100], [2, 1],
			[233, 100], [266, 100], [3, 1]]],
		[3, [[3, 9], [3, 8], [3, 7], [3, 6], [3, 5], [3, 4], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3]]]),
	multiHit: leaf('The hit count of 2-5 hit moves', 'weights', [1, [3, 3, 1, 1]], [5, [7, 7, 3, 3]]),
	protectRates: leaf('Protect success chances', 'fractions', [1, NA], [2, SPECIAL], [3, [[1, 1], [1, 2], [1, 4], [1, 8]]],
		[5, SPECIAL], [6, [[1, 1], [1, 3], [1, 9], [1, 27], [1, 81], [1, 243], [1, 729]]]),
	'natureMultipliers.plus': leaf('Nature bonus', 'ratio', [1, NA], [3, [110, 100]]),
	'natureMultipliers.minus': leaf('Nature penalty', 'ratio', [1, NA], [3, [90, 100]]),
	'weatherTurns.rain': leaf('Rain duration (from a move)', 'turns', [1, NA], [2, 5]),
	'weatherTurns.sun': leaf('Sun duration (from a move)', 'turns', [1, NA], [2, 5]),
	'weatherTurns.sand': leaf('Sandstorm duration (from a move)', 'turns', [1, NA], [2, 5]),
	'weatherTurns.hail': leaf('Hail duration (from a move)', 'turns', [1, NA], [3, 5]),
	'weatherRockTurns.rain': leaf('Rain duration with Damp Rock', 'turns', [1, NA], [4, 8]),
	'weatherRockTurns.sun': leaf('Sun duration with Heat Rock', 'turns', [1, NA], [4, 8]),
	'weatherRockTurns.sand': leaf('Sandstorm duration with Smooth Rock', 'turns', [1, NA], [4, 8]),
	'weatherRockTurns.hail': leaf('Hail duration with Icy Rock', 'turns', [1, NA], [4, 8]),
	abilityWeatherTurns: leaf('The duration of weather from an ability', 'turns', [1, NA], [3, 0], [6, 5]),
	weatherMoveModifiers: leaf('Weather damage modifiers', 'weather', [1, NA], [2, WEATHER_ROWS]),
	sandDamage: leaf('Sandstorm damage', 'hp', [1, NA], [2, [1, 8]], [3, [1, 16]]),
	hailDamage: leaf('Hail damage', 'hp', [1, NA], [3, [1, 16]]),
	sandImmuneTypes: leaf('Sandstorm-immune types', 'list', [1, NA], [2, ['Rock', 'Ground', 'Steel']]),
	sleepTurns: leaf('Sleep length', 'range', [1, [1, 7]], [2, [1, 6]], [3, [1, 4]], [5, [1, 3]]),
	restSleepTurns: leaf('Rest sleep length', 'turns', [1, 2]),
	confusionTurns: leaf('Confusion length', 'range', [1, [1, 4]]),
	confusionSelfHitChance: leaf('Confusion self-hit chance', 'chance', [1, [1, 2]], [7, [33, 100]]),
	confusionSelfHitPower: leaf('Confusion self-hit power', 'num', [1, 40]),
	attractChance: leaf('Infatuation immobilisation chance', 'chance', [1, NA], [2, [1, 2]]),
	fullParalysisChance: leaf('Full paralysis chance', 'chance', [1, [63, 256]], [3, [1, 4]]),
	paralysisSpeed: leaf('Paralysis Speed multiplier', 'mult', [1, 0.25], [7, 0.5]),
	burnAttack: leaf('Burn Attack multiplier', 'mult', [1, 0.5]),
	thawChance: leaf('Thaw chance', 'chance', [1, NA], [2, [25, 256]], [3, [1, 5]]),
	burnDamage: leaf('Burn damage', 'hp', [1, [1, 16]], [2, [1, 8]], [7, [1, 16]]),
	poisonDamage: leaf('Poison damage', 'hp', [1, [1, 16]], [2, [1, 8]]),
	toxicStep: leaf('Toxic damage step', 'hp', [1, [1, 16]]),
	leechSeedDamage: leaf('Leech Seed damage', 'hp', [1, [1, 16]], [2, [1, 8]]),
	bindDamage: leaf('Binding damage', 'hp', [1, NA], [2, [1, 16]], [6, [1, 8]]),
	nightmareDamage: leaf('Nightmare damage', 'hp', [1, NA], [2, [1, 4]]),
	curseDamage: leaf('Curse damage', 'hp', [1, NA], [2, [1, 4]]),
	spikesDamage: leaf('Spikes damage', 'hp', [1, NA], [2, [1, 8]]),
	ingrainHeal: leaf('Ingrain healing', 'hp', [1, NA], [3, [1, 16]]),
	'screenTurns.reflect': leaf('Reflect duration', 'turns', [1, NA], [2, 5]),
	'screenTurns.lightscreen': leaf('Light Screen duration', 'turns', [1, NA], [2, 5]),
	'screenTurns.safeguard': leaf('Safeguard duration', 'turns', [1, NA], [2, 5]),
	'screenTurns.mist': leaf('Mist duration', 'turns', [1, NA], [2, 5]),
	screenClayTurns: leaf('Screen duration with Light Clay', 'turns', [1, NA], [4, 8]),
	trapTurns: leaf('Binding move duration', 'range', [1, NA], [2, [3, 5]], [3, [3, 6]], [5, [5, 6]]),
	trapTurnsGripClaw: leaf('Binding move duration with Grip Claw', 'turns', [1, NA], [4, 6], [5, 8]),
	trapHits: leaf('The attack count of Wrap-type moves', 'weights', [1, [3, 3, 1, 1]], [2, NA]),
	tauntTurns: leaf('Taunt duration', 'range', [1, NA], [3, [2, 2]], [4, [3, 5]], [5, SPECIAL]),
	disableTurns: leaf('Disable duration', 'range', [1, [1, 8]], [2, [2, 5]], [4, SPECIAL]),
	encoreTurns: leaf('Encore duration', 'range', [1, NA], [2, [3, 6]], [4, [4, 8]], [5, SPECIAL]),
	uproarTurns: leaf('Uproar duration', 'range', [1, NA], [3, [2, 5]], [4, [3, 6]], [5, [3, 3]]),
	thrashTurns: leaf('Thrash / Petal Dance / Outrage duration', 'range', [1, [2, 3]]),
	bideTurns: leaf('Bide duration', 'range', [1, [2, 3]], [2, [3, 4]], [3, NA]),
	perishCount: leaf('Perish Song count', 'num', [1, NA], [2, 4]),
	futureSightTurns: leaf('Future Sight delay', 'num'),
	healMoveFraction: leaf('Recover-type healing', 'hp', [1, [1, 2]]),
	'recoilFractions.quarter': leaf('Recoil of 1/4-recoil moves', 'damage', [1, [1, 4]]),
	'recoilFractions.third': leaf('Recoil of 1/3-recoil moves', 'damage', [1, [1, 3]]),
	'recoilFractions.half': leaf('Recoil of 1/2-recoil moves', 'damage', [1, [1, 2]]),
	struggleRecoil: leaf('Struggle recoil', 'damage', [1, [1, 2]], [2, NA]),
	substituteCost: leaf('Substitute cost', 'hp', [1, [1, 4]]),
	wishHeal: leaf('Wish healing', 'hp', [1, NA], [3, [1, 2]]),
	bellyDrumCost: leaf('Belly Drum cost', 'hp', [1, NA], [2, [1, 2]]),
	curseCost: leaf('Curse cost', 'hp', [1, NA], [2, [1, 2]]),
	superFangFraction: leaf('Super Fang damage', 'current', [1, [1, 2]]),
	presentHeal: leaf('Present healing', 'hp', [1, NA], [2, [1, 4]]),
	sonicBoomDamage: leaf('Sonic Boom damage', 'flat', [1, 20]),
	dragonRageDamage: leaf('Dragon Rage damage', 'flat', [1, 40]),
	'thunderAccuracy.rain': leaf('Thunder accuracy in rain', 'accuracy', [1, NA], [2, true]),
	'thunderAccuracy.sun': leaf('Thunder accuracy in sun', 'accuracy', [1, NA], [2, 50]),
	weatherHeal: leaf('Moonlight-type healing', 'table'),
	focusEnergyCritStages: leaf('Focus Energy critical-hit stages', 'stagesAdded', [1, NA], [2, 1], [3, 2]),
	flailPower: leaf('Flail and Reversal power table', 'table'),
	magnitudePower: leaf('Magnitude power table', 'table'),
	presentPower: leaf('Present power table', 'table'),
	highCritMoves: leaf('High critical-hit moves', 'list', [1, SPECIAL], [3, NA]),
	'gen1Crit.normal': leaf('Critical-hit rate factor (normal moves)', 'mult', [1, 0.5], [2, NA]),
	'gen1Crit.high': leaf('Critical-hit rate factor (high critical-hit moves)', 'mult', [1, 4], [2, NA]),
	'gen1Crit.focusEnergy': leaf('Critical-hit rate factor (Focus Energy)', 'mult', [1, 0.125], [2, NA]),
	'gen1Crit.focusEnergyHigh': leaf(
		'Critical-hit rate factor (Focus Energy with a high critical-hit move)', 'mult', [1, 1], [2, NA]
	),
	'gen1Crit.cap': leaf('Critical-hit cap', 'cap', [1, 255], [2, NA]),
	miss1in256: leaf('The 1/256 miss of 100 % accurate moves', 'bool', [1, true], [2, NA]),
	healFailsAtGap255: leaf('The Recover failure bug', 'bool', [1, true], [2, NA]),
	invulnerabilityGlitch: leaf('The Fly / Dig invulnerability glitch', 'bool', [1, true], [2, NA]),
	category: leaf('The physical / special rule', 'category', [1, { basis: 'type', specialTypes: GEN1_SPECIAL }],
		[2, { basis: 'type', specialTypes: [...GEN1_SPECIAL, 'Dark'] }], [4, NA]),
};

const TYPE_ITEMS = [
	'blackbelt', 'blackglasses', 'charcoal', 'dragonfang', 'hardstone', 'magnet', 'metalcoat', 'miracleseed', 'mysticwater',
	'nevermeltice', 'poisonbarb', 'sharpbeak', 'silkscarf', 'silverpowder', 'softsand', 'spelltag', 'twistedspoon',
];
const LATER_TYPE_ITEMS = [
	'oddincense', 'rockincense', 'roseincense', 'waveincense', 'dracoplate', 'dreadplate', 'earthplate', 'fistplate',
	'flameplate', 'icicleplate', 'insectplate', 'ironplate', 'meadowplate', 'mindplate', 'pixieplate', 'skyplate',
	'splashplate', 'spookyplate', 'stoneplate', 'toxicplate', 'zapplate',
];
const FIGY_BERRIES = ['figyberry', 'wikiberry', 'magoberry', 'aguavberry', 'iapapaberry'];
const DEEP_DEFAULTS: { [path: string]: [number, any][] } = {
	'items.seaincense.powerBoost': [[1, NA], [3, 1.05], [4, 1.2]],
	'items.leftovers.healFraction': [[1, NA], [2, [1, 16]]],
	'items.quickclaw.chance': [[1, NA], [2, [60, 256]], [3, [1, 5]]],
	'items.kingsrock.chance': [[1, NA], [2, [30, 256]], [3, [1, 10]]],
	'items.razorfang.chance': [[1, NA], [4, [1, 10]]],
	'items.focusband.chance': [[1, NA], [2, [30, 256]], [3, [1, 10]]],
	'items.brightpowder.accuracyMinus255': [[1, NA], [2, 20], [3, NA]],
	'items.brightpowder.accuracyMod': [[1, NA], [3, 0.9]],
	'items.laxincense.accuracyMod': [[1, NA], [3, 0.95], [4, 0.9]],
	'items.sitrusberry.healFlat': [[1, NA], [3, 30], [4, NA]],
	'items.sitrusberry.healFraction': [[1, NA], [4, [1, 4]]],
	'items.shellbell.healFraction': [[1, NA], [3, [1, 8]]],
	'items.scopelens.critStages': [[1, NA], [2, 1]],
	'abilities.roughskin.damageFraction': [[1, NA], [3, [1, 16]], [4, [1, 8]]],
	'abilities.raindish.healFraction': [[1, NA], [3, [1, 16]]],
	'abilities.waterabsorb.healFraction': [[1, NA], [3, [1, 4]]],
	'abilities.voltabsorb.healFraction': [[1, NA], [3, [1, 4]]],
	'abilities.shedskin.chance': [[1, NA], [3, [33, 100]]],
};
for (const id of TYPE_ITEMS) {
	DEEP_DEFAULTS[`items.${id}.powerBoost`] = [[1, NA], [id === 'dragonfang' || id === 'silkscarf' ? 3 : 2, 1.1], [4, 1.2]];
}
for (const id of LATER_TYPE_ITEMS) DEEP_DEFAULTS[`items.${id}.powerBoost`] = [[1, NA], [4, 1.2]];
for (const id of FIGY_BERRIES) {
	DEEP_DEFAULTS[`items.${id}.healFraction`] = [[1, NA], [3, [1, 8]], [7, [1, 2]], [8, [1, 3]]];
}

const PARAM_KINDS: { [param: string]: [string, LeafKind] } = {
	powerBoost: ['power boost', 'mult'], accuracyMod: ['accuracy multiplier', 'mult'],
	accuracyMinus255: ['accuracy reduction (out of 255)', 'flat'], chance: ['activation chance', 'chance'],
	healFraction: ['healing', 'hp'], healFlat: ['healing (HP)', 'flat'], critStages: ['critical-hit stages', 'stagesAdded'],
	damageFraction: ['damage', 'hp'],
};

function spanValue(def: [number, any][] | undefined, gen: number) {
	let value: any;
	for (const [from, entry] of def || []) {
		if (from <= gen) value = entry;
	}
	return value;
}

function leafInfo(path: string, dex: ModdedDex): LeafInfo | null {
	if (Object.prototype.hasOwnProperty.call(LEAVES, path)) return LEAVES[path];
	const parts = path.split('.');
	if (parts[0] === 'natures' && parts.length === 2) {
		const nature = dex.natures.get(parts[1]);
		if (!nature.exists) return null;
		return {
			label: `The ${nature.name} nature`, kind: 'nature',
			def: [[1, NA], [3, { plus: nature.plus || '', minus: nature.minus || '' }]],
		};
	}
	if ((parts[0] === 'items' || parts[0] === 'abilities') && parts.length === 3 && PARAM_KINDS[parts[2]]) {
		const entry = parts[0] === 'items' ? dex.items.get(parts[1]) : dex.abilities.get(parts[1]);
		if (!entry.exists || entry.id !== parts[1]) return null;
		const [word, kind] = PARAM_KINDS[parts[2]];
		const dealt = path === 'items.shellbell.healFraction';
		return {
			label: `${entry.name} ${word}`, kind: dealt ? 'damage' : kind, def: DEEP_DEFAULTS[path],
			tolerance: kind === 'mult' ? 0.005 : path === 'abilities.shedskin.chance' ? 0.004 : 0,
		};
	}
	return null;
}

function gcd(a: number, b: number): number {
	return b ? gcd(b, a % b) : Math.abs(a);
}

function isPair(value: any): value is [number, number] {
	return Array.isArray(value) && value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number';
}

function sameFraction(a: any, b: any, tolerance = 0) {
	if (!isPair(a) || !isPair(b)) return false;
	if (a[0] * b[1] === b[0] * a[1]) return true;
	return tolerance > 0 && a[1] > 0 && b[1] > 0 && Math.abs(a[0] / a[1] - b[0] / b[1]) < tolerance;
}

function sameSet(a: any, b: any) {
	if (!Array.isArray(a) || !Array.isArray(b)) return false;
	const left = new Set(a);
	const right = new Set(b);
	return left.size === right.size && [...left].every(entry => right.has(entry));
}

function mechanicsEqual(info: LeafInfo, a: any, b: any): boolean {
	switch (info.kind) {
	case 'hp': case 'damage': case 'current': case 'chance': case 'ratio':
		return sameFraction(a, b, info.tolerance);
	case 'mult':
		return typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < (info.tolerance || 1e-6);
	case 'range':
		return isPair(a) && isPair(b) && a[0] === b[0] && a[1] === b[1];
	case 'fractions': {
		if (!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length) return false;
		const length = Math.max(a.length, b.length);
		for (let i = 0; i < length; i++) {
			if (!sameFraction(a[Math.min(i, a.length - 1)], b[Math.min(i, b.length - 1)])) return false;
		}
		return true;
	}
	case 'stages':
		if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
		return a.every((entry, i) => isPair(entry) && isPair(b[i]) && entry[1] > 0 && b[i][0] > 0 && b[i][1] > 0 &&
			Math.abs((entry[0] / entry[1]) / (b[i][0] / b[i][1]) - 1) <= 0.05);
	case 'weights': {
		if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
		const sumA = a.reduce((x, y) => x + y, 0);
		const sumB = b.reduce((x, y) => x + y, 0);
		return a.every((entry, i) => entry * sumB === b[i] * sumA);
	}
	case 'list':
		return sameSet(a, b);
	case 'category':
		return !!a && !!b && a.basis === b.basis && sameSet(a.specialTypes || a.specialMoves, b.specialTypes || b.specialMoves);
	case 'weather': {
		if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
		const key = (row: AnyObject) => `${row.weather}|${row.type}`;
		const rows = new Map<string, number>(b.map(row => [key(row), row.multiplier]));
		return rows.size === b.length &&
			a.every(row => rows.has(key(row)) && Math.abs(rows.get(key(row))! - row.multiplier) < 1e-6);
	}
	case 'roll':
		return !!a && !!b && a.min === b.min && a.max === b.max && a.den === b.den;
	case 'nature':
		return !!a && !!b && (a.plus || '') === (b.plus || '') && (a.minus || '') === (b.minus || '');
	case 'table':
		return JSON.stringify(a) === JSON.stringify(b);
	default:
		return a === b;
	}
}

function fractionText(value: any) {
	if (!isPair(value)) return String(value);
	const divisor = gcd(value[0], value[1]) || 1;
	return `${value[0] / divisor}/${value[1] / divisor}`;
}

function numberText(value: number) {
	return String(Math.round(value * 10000) / 10000);
}

function chanceText(value: any) {
	if (!isPair(value) || !value[1]) return String(value);
	const divisor = gcd(value[0], value[1]) || 1;
	const den = value[1] / divisor;
	if (100 % den === 0) return `${numberText(value[0] / divisor * (100 / den))} %`;
	return `${value[0] / divisor}/${den}`;
}

function mechanicsText(info: LeafInfo, value: any, dex: ModdedDex): string {
	if (value === SPECIAL) return 'a rule that depends on the situation';
	if (value === undefined || value === null) return 'unknown';
	switch (info.kind) {
	case 'hp': return `${fractionText(value)} of max HP`;
	case 'damage': return `${fractionText(value)} of the damage dealt`;
	case 'current': return `${fractionText(value)} of current HP`;
	case 'chance': return chanceText(value);
	case 'ratio': return isPair(value) && value[1] ? `x${numberText(value[0] / value[1])}` : String(value);
	case 'mult': return typeof value === 'number' ? `x${numberText(value)}` : String(value);
	case 'range':
		if (!isPair(value)) return String(value);
		return value[0] === value[1] ? `${value[0]} ${value[0] === 1 ? 'turn' : 'turns'}` : `${value[0]}-${value[1]} turns`;
	case 'turns': return value === 0 ? 'permanent' : `${value} ${value === 1 ? 'turn' : 'turns'}`;
	case 'flat': case 'num': return `${value}`;
	case 'stagesAdded': return `+${value}`;
	case 'accuracy': return value === true ? 'cannot miss' : `${value} %`;
	case 'bool': return value ? 'present' : 'removed';
	case 'cap': return value === 256 ? 'a certain critical hit is possible' : 'at most 255/256';
	case 'fractions': return Array.isArray(value) ? value.map(chanceText).join(', ') : String(value);
	case 'stages':
		if (!Array.isArray(value)) return String(value);
		return value.map(entry => (isPair(entry) && entry[1] ? `x${Math.round(entry[0] / entry[1] * 100) / 100}` : '?'))
			.join(', ') + ' for stages -6 to +6';
	case 'weights': {
		if (!Array.isArray(value)) return String(value);
		const sum = value.reduce((x: number, y: number) => x + y, 0) || 1;
		return value.map((weight: number, i: number) => `${i + 2} hits ${numberText(weight * 100 / sum)} %`).join(', ');
	}
	case 'list':
		if (!Array.isArray(value)) return String(value);
		if (!value.length) return 'none';
		return value.map(entry => (dex.moves.get(entry).exists ? dex.moves.get(entry).name : entry)).join(', ');
	case 'category':
		if (value.basis === 'move') return `set per move (${(value.specialMoves || []).length} special moves)`;
		return `by type (special types: ${(value.specialTypes || []).join(', ')})`;
	case 'weather':
		if (!Array.isArray(value)) return String(value);
		return value.map(row => `${row.type} in ${row.weather} x${numberText(row.multiplier)}`).join(', ');
	case 'roll': return `${value.min}-${value.max} out of ${value.den}`;
	case 'nature': {
		const names: AnyObject = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };
		if (!value.plus && !value.minus) return 'neutral';
		return `+${names[value.plus] || 'nothing'}, -${names[value.minus] || 'nothing'}`;
	}
	default: return JSON.stringify(value);
	}
}

function getPath(root: AnyObject, path: string) {
	let node: any = root;
	for (const part of path.split('.')) {
		if (!node || typeof node !== 'object') return undefined;
		node = node[part];
	}
	return node;
}

function setPath(root: AnyObject, path: string, value: any) {
	const parts = path.split('.');
	let node = root;
	for (let i = 0; i < parts.length - 1; i++) {
		if (!node[parts[i]] || typeof node[parts[i]] !== 'object') node[parts[i]] = {};
		node = node[parts[i]];
	}
	node[parts[parts.length - 1]] = value;
}

function deletePath(root: AnyObject, path: string) {
	const parts = path.split('.');
	const chain: AnyObject[] = [root];
	for (let i = 0; i < parts.length - 1; i++) {
		const next = chain[i][parts[i]];
		if (!next || typeof next !== 'object') return;
		chain.push(next);
	}
	delete chain[chain.length - 1][parts[parts.length - 1]];
	for (let i = chain.length - 1; i > 0; i--) {
		if (Object.keys(chain[i]).length) break;
		delete chain[i - 1][parts[i - 1]];
	}
}

function unreadableLabel(path: string, dex: ModdedDex) {
	const info = leafInfo(path, dex);
	if (info) return info.label;
	const parts = path.split('.');
	if (parts[0] === 'items' && parts.length === 2) {
		const item = dex.items.get(parts[1]);
		return `The held effect of ${item.exists ? item.name : parts[1]}`;
	}
	if (parts[0] === 'natures') return 'The nature table';
	if ((parts[0] === 'items' || parts[0] === 'abilities') && parts.length === 3) {
		const entry = parts[0] === 'items' ? dex.items.get(parts[1]) : dex.abilities.get(parts[1]);
		return `${entry.exists ? entry.name : parts[1]} ${PARAM_KINDS[parts[2]]?.[0] || parts[2]}`;
	}
	return `The battle value "${path}"`;
}

interface MechanicsContext {
	dex: ModdedDex;
	baseGen: number;
	parentGen: number;
	legalMoves: Set<string>;
	moveIds: Map<string, string>;
	typeName: (name: string) => string;
}

function translateLeaf(path: string, value: any, context: MechanicsContext) {
	const moveList = (ids: any) => {
		const out: string[] = [];
		for (const raw of Array.isArray(ids) ? ids : []) {
			const id = context.moveIds.get(toID(raw));
			if (id && context.legalMoves.has(id) && !out.includes(id)) out.push(id);
		}
		return out;
	};
	if (path === 'highCritMoves') return moveList(value);
	if (path === 'category' && value?.basis === 'move') {
		return { basis: 'move', specialMoves: moveList(value.specialMoves) };
	}
	if (path === 'category' && value?.basis === 'type' && Array.isArray(value.specialTypes)) {
		const types = value.specialTypes.map((name: string) => context.typeName(name)).filter((name: string) => name !== '???');
		return { basis: 'type', specialTypes: [...new Set(types)] };
	}
	if (path === 'protectRates' && Array.isArray(value)) {
		return value.map(rate => (isPair(rate) && rate[1] === 65535 ? [rate[0] + 1, 65536] : rate));
	}
	if (path === 'sandImmuneTypes' && Array.isArray(value)) return value.map(name => context.typeName(name));
	if (path === 'weatherMoveModifiers' && Array.isArray(value)) {
		return value.map(row => ({ ...row, type: context.typeName(row.type) }));
	}
	return value;
}

function buildMechanics(reader: MechanicsReaderResult, context: MechanicsContext) {
	const { dex, baseGen, parentGen } = context;
	const counts: { [status: string]: number } = { same: 0, changed: 0, unreadable: 0, notfound: 0, dead: 0 };
	const kind = reader.engine.kind;
	const readable = kind === 'stock' || kind === 'cfru' || kind === 'expansion';
	const changed: string[] = [];
	const unreadable: string[] = [];
	const rejected: string[] = [];
	const unreadableNotes: string[] = [];
	const candidates: { path: string, value: any, shown: string }[] = [];
	const noteOnly: { path: string, shown: string }[] = [];
	const seen = new Set<string>();
	const highDefault = () => {
		const out: string[] = [];
		for (const id of context.legalMoves) {
			const move = dex.moves.get(id);
			if (move.exists && (move.critRatio || 1) > 1) out.push(id);
		}
		return out;
	};
	for (const entry of Array.isArray(reader.report) ? reader.report : []) {
		if (!entry || typeof entry.id !== 'string' || !(entry.status in counts)) continue;
		counts[entry.status]++;
		if (entry.status === 'changed') changed.push(entry.id);
		if (entry.id.startsWith('info.')) continue;
		const engineId = entry.id.startsWith('engine.');
		const path = engineId ? entry.id.slice(7) : entry.id;
		if (path === 'typeChart') continue;
		if (entry.status === 'unreadable') {
			if (!readable) continue;
			unreadable.push(entry.id);
			unreadableNotes.push(
				`${unreadableLabel(path, dex)} was changed by the hack but could not be read; ` +
				`the Generation ${parentGen} default is used.`
			);
			continue;
		}
		if (entry.status !== 'same' && entry.status !== 'changed') continue;
		if (!readable) continue;
		if (kind === 'stock' ? (!reader.engine.live || engineId) : !engineId) continue;
		if (seen.has(path)) continue;
		const info = leafInfo(path, dex);
		if (!info) continue;
		seen.add(path);
		const read = getPath(reader.values || {}, path);
		if (read === undefined) {
			rejected.push(entry.id);
			continue;
		}
		const value = translateLeaf(path, read, context);
		if (parentGen === baseGen && kind === 'stock' && entry.status === 'same') continue;
		let wanted = spanValue(info.def, parentGen);
		let reference = `Generation ${parentGen} default`;
		if (path === 'highCritMoves' && wanted === SPECIAL) wanted = highDefault();
		const crossOnly = (path === 'thrashTurns' || path === 'bideTurns') && parentGen !== baseGen;
		const deep = path.startsWith('items.') || path.startsWith('abilities.');
		if (wanted === undefined && deep && parentGen === baseGen && entry.base !== undefined) {
			wanted = entry.base;
			reference = 'base game';
		}
		if (wanted === NA || wanted === undefined || crossOnly) {
			if (entry.status === 'changed') {
				const is = info.plural ? 'are' : 'is';
				let text = '';
				if (wanted !== NA && wanted !== undefined) {
					text = ` (${reference}: ${mechanicsText(info, wanted, dex)})`;
				} else if (entry.base !== undefined) {
					text = ` (base game: ${mechanicsText(info, translateLeaf(path, entry.base, context), dex)})`;
				}
				noteOnly.push({ path, shown: `${info.label} ${is} ${mechanicsText(info, value, dex)} in this hack${text}` });
			}
			continue;
		}
		if (wanted !== SPECIAL && mechanicsEqual(info, value, wanted)) continue;
		candidates.push({
			path, value,
			shown: `${info.label} ${info.plural ? 'are' : 'is'} ${mechanicsText(info, value, dex)}|` +
				`(${reference}: ${mechanicsText(info, wanted, dex)})`,
		});
	}
	const mechanics: AnyObject = {};
	for (const candidate of candidates) setPath(mechanics, candidate.path, candidate.value);
	let refused: Set<string>;
	try {
		refused = new Set(Dex.romHackMechanicsUnapplied(mechanics as RomHackMechanics, `gen${parentGen}`));
	} catch {
		refused = new Set(candidates.map(candidate => candidate.path));
	}
	const notes: string[] = [];
	const applied: string[] = [];
	const skipped: string[] = [];
	for (const candidate of candidates) {
		if (refused.has(candidate.path)) {
			deletePath(mechanics, candidate.path);
			continue;
		}
		applied.push(candidate.path);
		notes.push(`${candidate.shown.replace('|', ' ')}.`);
	}
	for (const candidate of candidates) {
		if (!refused.has(candidate.path)) continue;
		skipped.push(candidate.path);
		notes.push(`${candidate.shown.replace('|', ' in this hack ')}; this is not applied in battles.`);
	}
	for (const entry of noteOnly) {
		skipped.push(entry.path);
		notes.push(`${entry.shown}; this is not applied in battles.`);
	}
	notes.push(...unreadableNotes);
	for (const note of Array.isArray(reader.notes) ? reader.notes : []) {
		if (typeof note === 'string' && note && !notes.includes(note)) notes.push(note);
	}
	const general = !notes.length;
	if (kind === 'rewritten' && general) {
		notes.push(
			`This hack replaces the battle engine; its own engine changes could not be read, ` +
			`so Generation ${parentGen} rules are used.`
		);
	} else if (kind === 'unknown' && general) {
		notes.push(
			`The battle engine of this hack was not recognised; its own engine changes could not be read, ` +
			`so Generation ${parentGen} rules are used.`
		);
	} else if (general && kind === 'stock') {
		notes.push(`No battle-engine changes were found; Generation ${parentGen} rules apply.`);
	}
	const report: RomHackMechanicsReport = {
		engine: { kind, live: !!reader.engine.live, detail: String(reader.engine.detail || '') }, baseGen, parentGen,
		counts: counts as RomHackMechanicsReport['counts'], changed, unreadable, applied, noteOnly: skipped,
	};
	if (rejected.length) report.rejected = rejected;
	return { mechanics: mechanics as RomHackMechanics, notes, report };
}

function isPlaceholder(name: string) {
	return !name || !/[A-Za-z]/.test(name) || /^[?\- ]+$/.test(name) ||
		/^(z-move \d+|placeholder|unused|bad egg|egg|max move \d+)$/i.test(name.trim());
}

const GEN1_DRAIN_EFFECT = 0x03;
const GEN1_SWIFT_EFFECT = 0x11;
const GEN1_SPECIAL_DOWN_SIDE_EFFECT = 0x47;
const GEN1_SPECIAL_EFFECTS: { [effect: number]: number } = { 0x0d: 1, 0x35: 2, 0x15: -1, 0x3d: -2 };

function oneSpecialDrop(secondary: AnyObject): boolean {
	const stats = Object.keys(secondary.boosts || {});
	return stats.length === 1 && (stats[0] === 'spa' || stats[0] === 'spd') && secondary.boosts[stats[0]] === -1;
}

const MOVE_ALIASES: { [id: string]: string } = {
	dazzlegleam: 'dazzlinggleam', petalstorm: 'petalblizzard', '1000arrows': 'thousandarrows', '1000waves': 'thousandwaves',
	spacehole: 'hyperspacehole', spacefury: 'hyperspacefury', cliffblades: 'precipiceblades', steampump: 'steameruption',
	waterstar: 'watershuriken', poweruphit: 'poweruppunch', paracharge: 'paraboliccharge', dracohammer: 'dragonhammer',
	firstpress: 'firstimpression', geistbeam: 'moongeistbeam', reveldance: 'revelationdance', sparklearia: 'sparklingaria',
	spiritlock: 'spiritshackle', badtantrum: 'stompingtantrum', sunsteelram: 'sunsteelstrike', tearylook: 'tearfullook',
	craftyguard: 'craftyshield', woodscurse: 'forestscurse', clangsoul: 'clangoroussoul', giantblade: 'behemothblade',
	giantbash: 'behemothbash', weirdsteam: 'strangesteam', falseyield: 'falsesurrender', meteorrush: 'meteorassault',
	mistyexplode: 'mistyexplosion', jealousburn: 'burningjealousy', corrodegas: 'corrosivegas', surgestrikes: 'surgingstrikes',
	freezeglare: 'freezingglare', astralstorm: 'astralbarrage', psyshieldram: 'psyshieldbash', endlessedge: 'ceaselessedge',
	bleakicewind: 'bleakwindstorm', wildboltwind: 'wildboltstorm', sandsearwind: 'sandsearstorm', dolleyes: 'babydolleyes',
	disarmcry: 'disarmingvoice', flowerguard: 'flowershield', darkhole: 'darkvoid', soupercellslam: 'supercellslam',
	hijumpkick: 'highjumpkick', faintattack: 'feintattack', smellingsalt: 'smellingsalts', vicegrip: 'visegrip',
	fakesurrendr: 'falsesurrender',
};
const ABILITY_ALIASES: { [id: string]: string } = {
	neutralizegas: 'neutralizinggas', wanderingsoul: 'wanderingspirit', alchemicpower: 'powerofalchemy',
	valiantshield: 'dauntlessshield', compoundeyes: 'compoundeyes', lightningrod: 'lightningrod',
};

function properName(name: string) {
	if (name !== name.toUpperCase()) return name;
	return name.toLowerCase().replace(/(^|[ -])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

let extraTypes = new Set<string>();
let reservedIds: Set<string> | null = null;

function freeName(name: string) {
	if (!reservedIds) {
		reservedIds = new Set();
		for (let gen = 1; gen <= 9; gen++) {
			for (const id of Object.keys(Dex.mod(`gen${gen}`).data.Conditions)) reservedIds.add(id);
		}
	}
	return reservedIds.has(toID(name)) ? `${name} Hack` : name;
}

function hasFunction(value: any): boolean {
	if (typeof value === 'function') return true;
	if (!value || typeof value !== 'object') return false;
	return Object.keys(value).some(key => hasFunction(value[key]));
}

function fixType(type: string | undefined) {
	if (type && Dex.types.get(type).exists) return Dex.types.get(type).name;
	if (type && extraTypes.has(type)) return type;
	return Dex.types.get('???').exists ? '???' : 'Normal';
}

function prefixMatch(id: string, ids: string[]): string | null {
	if (id.length < 8) return null;
	const hits = ids.filter(other => other.startsWith(id)).sort((a, b) => a.length - b.length);
	if (hits.length === 1 || (hits.length > 1 && hits.every(other => other.startsWith(hits[0])))) return hits[0];
	if (hits.length || id.length < 9) return null;
	const loose = ids.filter(other => {
		if (other[0] !== id[0] || other.length <= id.length || other.length > id.length + 4) return false;
		let at = 0;
		for (const ch of other) {
			if (ch === id[at]) at++;
		}
		return at === id.length;
	});
	return loose.length === 1 ? loose[0] : null;
}

const MAX_NAME = 40;

function safeName(name: string, species = false) {
	let text = String(name || '');
	const unsafe = species ? /\p{Cc}|[|<>[\]\\`"=,]/u : /\p{Cc}|[|<>[\]\\`"=]/u;
	if (unsafe.test(text)) text = text.replace(new RegExp(unsafe.source, 'gu'), ' ').replace(/\s+/g, ' ').trim();
	return text.length > MAX_NAME ? text.slice(0, MAX_NAME).trim() : text;
}

export function buildHackDex(input: RawHack, sha256: string, patchFormat: string): HackDex {
	const raw: RawHack = {
		...input,
		abilities: input.abilities.map(name => safeName(name)),
		items: input.items.map(name => safeName(name)),
		moves: input.moves.map(row => ({ ...row, name: safeName(row.name) })),
		species: input.species.map(row => ({ ...row, name: safeName(row.name, true) })),
	};
	let floor = 0;
	for (;;) {
		const built = buildHackDexFrom(raw, sha256, patchFormat, floor);
		if (built.settled) return built.hack;
		floor = built.gen;
	}
}

function buildHackDexFrom(
	raw: RawHack, sha256: string, patchFormat: string, floor: number
): { hack: HackDex, gen: number, settled: boolean } {
	let base = Dex.mod('gen9');
	const speciesIds = base.species.all().map(s => s.id);
	const moveIds = base.moves.all().map(m => m.id);
	const abilityIds = base.abilities.all().map(a => a.id);
	const itemIds = base.items.all().map(i => i.id);

	let maxGen = raw.keepBaseEngine ? raw.engineGen || raw.baseGen : Math.max(raw.engineGen || raw.baseGen, floor);
	const bump = (gen: number) => {
		if (!raw.keepBaseEngine && gen > maxGen && gen <= 9) maxGen = gen;
	};
	extraTypes = new Set();
	const hasChart = !!raw.typeChart && raw.typeChart.length >= 20;
	const newType = (type: string | undefined) => {
		if (type && /^[A-Z][a-z]{2,11}$/.test(type) && !Dex.types.get(type).exists) extraTypes.add(type);
	};
	const oddRows = (hasChart && raw.mechanics?.typeChartInfo?.unsupported) || [];
	const chartRows = [...(raw.typeChart || []), ...oddRows];
	if (hasChart) {
		for (const matchup of chartRows) {
			newType(matchup.attack);
			newType(matchup.defend);
		}
		for (const row of raw.species) (row.types || []).forEach(newType);
		for (const row of raw.moves) newType(row.type);
	}
	const reader = raw.mechanics?.engine && Array.isArray(raw.mechanics.report) ? raw.mechanics : null;
	const liveValues: AnyObject = (reader?.engine.kind === 'stock' && reader.engine.live && reader.values) || {};

	if (!raw.keepBaseEngine) {
		for (const entry of raw.abilities) bump(base.abilities.get(entry).gen);
		for (const entry of raw.moves) bump(base.moves.get(entry.name).gen);
		raw.items.forEach((entry, i) => {
			const pocket = raw.itemPockets?.[i];
			if (pocket !== 'key' && pocket !== 'tm') bump(base.items.get(entry).gen);
		});
		for (const entry of raw.species) bump(base.species.get(entry.name).gen);
		for (const entry of [...raw.species.flatMap(row => row.types || []), ...raw.moves.map(row => row.type || '')]) {
			if (entry === 'Fairy') bump(6);
		}
	}
	base = Dex.mod(`gen${maxGen}`);
	const settledGen = maxGen;

	const abilityByName = new Map<string, string>();
	const Abilities: HackDex['Abilities'] = {};
	const approximated: HackDex['approximated'] = { moves: [], abilities: [], items: [] };
	const legalAbilities = new Set<string>();
	raw.abilities.forEach((rawName, i) => {
		if (isPlaceholder(rawName)) return;
		let ability = base.abilities.get(ABILITY_ALIASES[toID(rawName)] || rawName);
		if (!ability.exists) {
			const guess = prefixMatch(toID(rawName), abilityIds);
			if (guess) ability = base.abilities.get(guess);
		}
		if (ability.exists) {
			bump(ability.gen);
			abilityByName.set(rawName, ability.name);
			legalAbilities.add(ability.id);
			return;
		}
		const name = freeName(properName(rawName));
		const id = toID(name);
		if (!id || Abilities[id]) return;
		Abilities[id] = { name, num: 20000 + i, rating: 0, shortDesc: 'ROM hack ability; its effect is not simulated.' };
		abilityByName.set(rawName, name);
		legalAbilities.add(id);
		approximated.abilities.push(name);
	});

	const Moves: HackDex['Moves'] = {};
	const legalMoves = new Set<string>();
	const hackMoveIds = new Map<string, string>();
	const moveByIndex = new Map<number, string>();
	let specialTypes = SPECIAL_TYPES;
	if (liveValues.category?.basis === 'type' && Array.isArray(liveValues.category.specialTypes)) {
		specialTypes = liveValues.category.specialTypes.map((name: string) => fixType(name));
	}
	const typeRule = raw.typeBasedCategories && base.gen <= 3;
	const gen1Engine = raw.baseGen === 1 && !!raw.keepBaseEngine;
	for (const rawMove of raw.moves) {
		if (isPlaceholder(rawMove.name)) continue;
		let move = base.moves.get(MOVE_ALIASES[toID(rawMove.name)] || rawMove.name);
		if (!move.exists) {
			const guess = prefixMatch(toID(rawMove.name), moveIds);
			if (guess) move = base.moves.get(guess);
		}
		const hasData = rawMove.pp !== undefined;
		if (move.exists) {
			if (!hackMoveIds.has(toID(rawMove.name))) hackMoveIds.set(toID(rawMove.name), move.id);
			if (!move.isZ && !move.isMax && !moveByIndex.has(rawMove.index)) moveByIndex.set(rawMove.index, move.id);
			if (legalMoves.has(move.id) || move.isZ || move.isMax) continue;
			bump(move.gen);
			legalMoves.add(move.id);
			if (!hasData) continue;
			const patch: AnyObject = {};
			const effect = gen1Engine ? rawMove.effect : undefined;
			const type = fixType(rawMove.type);
			if (type !== move.type && move.id !== 'hiddenpower' && type !== '???') patch.type = type;
			if (move.basePower > 1 && rawMove.basePower! > 1 && rawMove.basePower !== move.basePower) {
				patch.basePower = rawMove.basePower;
			}
			const accuracy = rawMove.accuracy && effect !== GEN1_SWIFT_EFFECT ? rawMove.accuracy : true;
			if (accuracy !== move.accuracy && move.accuracy !== true && !move.ohko) patch.accuracy = accuracy;
			if (rawMove.pp && rawMove.pp !== move.pp) patch.pp = rawMove.pp;
			if (rawMove.priority !== undefined && rawMove.priority !== move.priority && Math.abs(rawMove.priority) <= 7) {
				patch.priority = rawMove.priority;
			}
			if (rawMove.category && rawMove.category !== move.category) patch.category = rawMove.category;
			if (typeRule && patch.type && !rawMove.category && move.category !== 'Status') {
				const category = specialTypes.includes(patch.type) ? 'Special' : 'Physical';
				if (category !== move.category) patch.category = category;
			}
			const sameSlot = move.num === rawMove.index;
			const chance = rawMove.secondaryChance;
			const secondary = move.secondary as AnyObject | null;
			if (sameSlot && typeof chance === 'number' && chance > 0 && chance <= 100 && secondary &&
				typeof secondary.chance === 'number' && (!move.secondaries || move.secondaries.length === 1) &&
				Math.abs(secondary.chance - chance) > 1e-9 && !hasFunction(secondary)) {
				patch.secondary = { ...JSON.parse(JSON.stringify(secondary)), chance };
			}
			const special = effect === undefined ? 0 : GEN1_SPECIAL_EFFECTS[effect] || 0;
			const oneSpecial = (boosts: AnyObject | null | undefined) => {
				const stats = Object.keys(boosts || {});
				return stats.length === 1 && (stats[0] === 'spa' || stats[0] === 'spd') && boosts![stats[0]] * special > 0;
			};
			if (special && oneSpecial(move.boosts)) patch.boosts = { spa: special, spd: special };
			if (effect === GEN1_SPECIAL_DOWN_SIDE_EFFECT && secondary && oneSpecialDrop(secondary) && !hasFunction(secondary) &&
				(!move.secondaries || move.secondaries.length === 1)) {
				patch.secondary = { ...JSON.parse(JSON.stringify(patch.secondary || secondary)), boosts: { spa: -1, spd: -1 } };
			}
			if (effect === GEN1_DRAIN_EFFECT && move.category !== 'Status' && move.drain && move.drain.join() !== '1,2') {
				patch.drain = [1, 2];
			}
			const critRatio = rawMove.critRatio;
			if (sameSlot && Number.isInteger(critRatio) && critRatio! >= 1 && critRatio! <= 5 && !move.willCrit &&
				move.category !== 'Status' && critRatio !== (move.critRatio || 1)) {
				patch.critRatio = critRatio;
			}
			if (Object.keys(patch).length) Moves[move.id] = patch;
			continue;
		}
		const name = freeName(properName(rawMove.name));
		const id = toID(name);
		if (id && !moveByIndex.has(rawMove.index)) moveByIndex.set(rawMove.index, id);
		if (!id || Moves[id] || legalMoves.has(id)) continue;
		const type = hasData ? fixType(rawMove.type) : 'Normal';
		const basePower = rawMove.basePower || 0;
		let category = rawMove.category;
		if (!category) category = !basePower ? 'Status' : specialTypes.includes(type) ? 'Special' : 'Physical';
		hackMoveIds.set(toID(rawMove.name), id);
		Moves[id] = {
			num: 30000 + rawMove.index,
			name,
			type,
			basePower,
			accuracy: gen1Engine && rawMove.effect === GEN1_SWIFT_EFFECT ? true : rawMove.accuracy || true,
			pp: rawMove.pp || 5,
			priority: rawMove.priority || 0,
			category,
			flags: category === 'Status' ? {} : { protect: 1, mirror: 1, metronome: 1, ...(rawMove.contact ? { contact: 1 } : {}) },
			target: category === 'Status' ? 'self' : 'normal',
			secondary: null,
			shortDesc: 'ROM hack move; only its power, accuracy, PP, type and priority are simulated.',
		};
		legalMoves.add(id);
		approximated.moves.push(name);
	}

	const Items: HackDex['Items'] = {};
	const legalItems = new Set<string>();
	const notHeld = new Set<number>();
	raw.items.forEach((rawName, i) => {
		if (isPlaceholder(rawName)) return;
		const pocket = raw.itemPockets?.[i];
		let item = base.items.get(rawName);
		if (!item.exists) {
			const guess = prefixMatch(toID(rawName), itemIds);
			if (guess) item = base.items.get(guess);
		}
		const unusable = /^(tm|hm|tr) ?[0-9]+|^(teru-sama|cancel)$|^data card ?[0-9]+$/i.test(rawName.trim());
		if (pocket === 'key' || pocket === 'tm' || unusable || (!item.exists && !pocket && itemKind(rawName) === 'key')) {
			notHeld.add(i);
			return;
		}
		if (item.exists) {
			bump(item.gen);
			legalItems.add(item.id);
			return;
		}
		const name = freeName(properName(rawName));
		const id = toID(name);
		if (!id || Items[id]) return;
		Items[id] = { name, num: 20000 + i, gen: raw.baseGen, shortDesc: 'ROM hack item; its effect is not simulated.' };
		legalItems.add(id);
		approximated.items.push(name);
	});

	const Pokedex: HackDex['Pokedex'] = {};
	const indices: HackDex['indices'] = { species: {}, items: {} };
	raw.items.forEach((rawName, i) => {
		if (isPlaceholder(rawName) || notHeld.has(i)) return;
		let item = base.items.get(rawName);
		if (!item.exists) {
			const guess = prefixMatch(toID(rawName), itemIds);
			if (guess) item = base.items.get(guess);
		}
		const id = item.exists ? item.id : toID(freeName(properName(rawName)));
		if (id && legalItems.has(id) && !(id in indices.items)) indices.items[id] = i + 1;
	});
	const legalSpecies = new Set<string>();
	const addSpecies = legalSpecies.add.bind(legalSpecies);
	let currentIndex = 0;
	const speciesByIndex = new Map<number, string>();
	legalSpecies.add = (id: string) => {
		if (!(id in indices.species)) indices.species[id] = currentIndex;
		if (!speciesByIndex.has(currentIndex) && !legalSpecies.has(id)) speciesByIndex.set(currentIndex, id);
		return addSpecies(id);
	};
	const seen = new Map<string, number>();
	const statKey = (stats: { [stat: string]: number }) => ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].map(stat => stats[stat]).join();
	const present = new Set<string>();
	for (const rawSpecies of raw.species) {
		if (rawSpecies.baseStats) present.add(`${toID(rawSpecies.name)}|${statKey(rawSpecies.baseStats)}`);
	}
	for (const rawSpecies of raw.species) {
		if (isPlaceholder(rawSpecies.name)) continue;
		currentIndex = rawSpecies.index;
		let species = base.species.get(rawSpecies.name);
		if (!species.exists) {
			const guess = prefixMatch(toID(rawSpecies.name), speciesIds);
			if (guess) species = base.species.get(guess);
		}
		const stats = rawSpecies.baseStats;
		if (stats && !stats.hp && !stats.atk && !stats.spe) continue;
		const types = rawSpecies.types ? [...new Set(rawSpecies.types.map(fixType))] : null;
		const abilities: AnyObject | null = rawSpecies.abilities ? {} : null;
		if (abilities) {
			const [a0, a1, hidden] = rawSpecies.abilities!.map(name => abilityByName.get(name) || '');
			if (a0) abilities[0] = a0;
			if (a1 && a1 !== a0) abilities[1] = a1;
			if (hidden && hidden !== a0 && hidden !== a1) abilities['H'] = hidden;
			if (!abilities[0]) abilities[0] = a1 || hidden || 'No Ability';
		}
		const innates = [...new Set((rawSpecies.innates || []).map(name => abilityByName.get(name) || '').filter(Boolean))];
		const sameData = (other: Species) => !stats || (
			(Object.keys(stats) as StatID[]).every(stat => other.baseStats[stat] === stats[stat]) &&
			(!types || other.types.join() === types.join())
		);
		if (species.exists) {
			const dupes = seen.get(species.id) || 0;
			seen.set(species.id, dupes + 1);
			let target: Species | null = species;
			if (dupes) {
				target = null;
				for (const formeName of species.formeOrder || []) {
					const forme = base.species.get(formeName);
					if (forme.exists && !legalSpecies.has(forme.id) && sameData(forme)) {
						target = forme;
						break;
					}
				}
				if (!target && stats && !sameData(species)) {
					let nearest = 151;
					for (const formeName of species.formeOrder || []) {
						const forme = base.species.get(formeName);
						if (!forme.exists || legalSpecies.has(forme.id) || forme.id === species.id) continue;
						if (present.has(`${toID(rawSpecies.name)}|${statKey(forme.baseStats)}`)) continue;
						let gap = 0;
						for (const stat of Object.keys(stats) as StatID[]) gap += Math.abs(forme.baseStats[stat] - stats[stat]);
						if (gap < nearest) {
							nearest = gap;
							target = forme;
						}
					}
				}
				if (!target) {
					if (!stats || sameData(species)) continue;
					const name = `${species.baseSpecies}-Hack-${dupes}`;
					const id = toID(name);
					Pokedex[id] = {
						num: species.num, name, baseSpecies: species.baseSpecies, forme: `Hack-${dupes}`,
						types: types || species.types, baseStats: stats, abilities: abilities || species.abilities,
						heightm: species.heightm, weightkg: species.weightkg, color: species.color, eggGroups: species.eggGroups,
						gender: species.gender || undefined, genderRatio: species.gender ? undefined : species.genderRatio,
					};
					if (innates.length) Pokedex[id].innates = innates;
					legalSpecies.add(id);
					continue;
				}
			}
			bump(target.gen);
			legalSpecies.add(target.id);
			const patch: AnyObject = {};
			if (stats && !(Object.keys(stats) as StatID[]).every(stat => target.baseStats[stat] === stats[stat])) {
				patch.baseStats = stats;
			}
			if (types && types.join() !== target.types.join()) patch.types = types;
			if (abilities && JSON.stringify(abilities) !== JSON.stringify(target.abilities)) patch.abilities = abilities;
			if (innates.length) patch.innates = innates;
			if (Object.keys(patch).length) Pokedex[target.id] = patch;
			continue;
		}
		const name = freeName(properName(rawSpecies.name));
		const id = toID(name);
		if (!id || Pokedex[id] || legalSpecies.has(id) || !stats) continue;
		Pokedex[id] = {
			num: 20000 + rawSpecies.index, name, types: types || ['Normal'], baseStats: stats,
			abilities: abilities || { 0: 'No Ability' }, heightm: 1, weightkg: 20, color: 'Gray', eggGroups: ['Undiscovered'],
		};
		if (innates.length) Pokedex[id].innates = innates;
		legalSpecies.add(id);
	}
	if (legalSpecies.size < 50) throw new Error('The Pokemon data of this hack could not be read.');

	const TypeChart: HackDex['TypeChart'] = {};
	const chartNotes: string[] = [];
	if (raw.typeChart && hasChart) {
		const parentChart = Dex.mod(`gen${maxGen}`).data.TypeChart;
		const typeId = (name: string) => toID(name) || name.toLowerCase();
		const universe = new Set<string>(extraTypes);
		for (const matchup of chartRows) {
			for (const name of [matchup.attack, matchup.defend]) {
				if (extraTypes.has(name)) continue;
				const type = Dex.types.get(name);
				if (type.exists && type.name === name && parentChart[type.id]) universe.add(name);
			}
		}
		/*
		 * Type chart rounding (owner decision, 2026-11-16). Showdown's damageTaken chart only has four values per
		 * matchup: immune, resisted, neutral and super effective. A hack can set a multiplier outside x0, x0.5, x1
		 * and x2, and such a cell cannot be simulated exactly. It is rounded instead of being left neutral:
		 *   - above x1 (x3, x4, x1.2 ...) becomes x2, super effective;
		 *   - between x0 and x1 but not x0.5 (x0.3, x0.25 ...) becomes x0.5, resisted;
		 *   - x0 stays immune.
		 * Known cases: Pokemon Brown (x3, x4 and x0.3 cells) and Ghost Grey (x1.2 cells).
		 * The hack notes say how many matchups were rounded, with the game's real multiplier for up to six of them.
		 */
		const cells = new Map<string, number>();
		const rounded = new Map<string, RawTypeMatchup>();
		for (const matchup of chartRows) {
			if (!universe.has(matchup.attack) || !universe.has(matchup.defend)) continue;
			const multiplier = matchup.multiplier;
			if (!(multiplier >= 0) || multiplier === 1) continue;
			const key = `${matchup.attack}|${matchup.defend}`;
			cells.set(key, multiplier === 0 ? 3 : multiplier < 1 ? 2 : 1);
			if (multiplier === 0 || multiplier === 0.5 || multiplier === 2) rounded.delete(key);
			else rounded.set(key, matchup);
		}
		if (rounded.size) {
			const examples = [...rounded.values()].slice(0, 6).map(matchup =>
				`${matchup.attack} hits ${matchup.defend} for x${numberText(matchup.multiplier)} in the game; ` +
				`battles here use x${matchup.multiplier > 1 ? '2' : '0.5'}.`);
			const one = rounded.size === 1;
			const rest = rounded.size > 6 ? ` The other ${rounded.size - 6} are rounded the same way.` : '';
			chartNotes.push(
				`${rounded.size} type ${one ? 'matchup uses a multiplier' : 'matchups use multipliers'} that battles here ` +
				`cannot express, so ${one ? 'it was' : 'they were'} rounded: above x1 to x2, below x1 to x0.5. ` +
				examples.join(' ') + rest
			);
		}
		let differing = 0;
		for (const defend of universe) {
			const id = typeId(defend);
			const parent: AnyObject = parentChart[id]?.damageTaken || {};
			const damageTaken: AnyObject = { ...parent };
			let changed = extraTypes.has(defend);
			for (const attack of universe) {
				const key = `${attack}|${defend}`;
				const before = parent[attack] || 0;
				const code = cells.get(key) || 0;
				damageTaken[attack] = code;
				if (code !== before) {
					differing++;
					changed = true;
				}
			}
			const future = !!parentChart[id]?.isNonstandard;
			if (!changed && !future) continue;
			TypeChart[id] = { damageTaken };
			if (extraTypes.has(defend)) TypeChart[id].name = defend;
			if (future) TypeChart[id].isNonstandard = null;
		}
		if (differing) {
			chartNotes.unshift(
				`The hack's own type chart is used: ${differing} ${differing === 1 ? 'matchup differs' : 'matchups differ'} ` +
				`from the Generation ${maxGen} chart.`
			);
		} else {
			chartNotes.unshift(`The hack's type chart was read; it matches the Generation ${maxGen} chart.`);
		}
	}

	let mechanics: RomHackMechanics = {};
	let mechanicsNotes: string[] = [];
	let mechanicsReport: RomHackMechanicsReport | null = null;
	if (reader) {
		try {
			const built = buildMechanics(reader, {
				dex: Dex.mod(`gen${maxGen}`), baseGen: raw.baseGen, parentGen: maxGen, legalMoves, moveIds: hackMoveIds,
				typeName: fixType,
			});
			mechanics = built.mechanics;
			mechanicsNotes = built.notes;
			mechanicsReport = built.report;
		} catch {
			mechanicsNotes = ['The battle mechanics of this hack could not be read.'];
		}
	}

	const notes = raw.notes.slice();
	const learned = legalMoves.size < 50 ?
		{ status: 'unreadable' as const, note: `${LEARNSETS_UNREADABLE}: the move list was not found.`, learnsets: undefined } :
		buildLearnsets(raw, moveByIndex, speciesByIndex);
	const standard = (entry: { gen: number, isNonstandard: string | null }) => entry.gen <= maxGen && !entry.isNonstandard;
	if (legalMoves.size < 50) {
		for (const move of base.moves.all()) {
			if (standard(move) && !move.isZ && !move.isMax) legalMoves.add(move.id);
		}
		notes.push(`The hack's move list could not be read; every Generation ${maxGen} move is allowed.`);
	}
	if (legalAbilities.size < 20 && maxGen >= 3) {
		for (const ability of base.abilities.all()) {
			if (standard(ability)) legalAbilities.add(ability.id);
		}
		notes.push(`The hack's ability list could not be read; every Generation ${maxGen} ability is allowed.`);
	}
	if (legalItems.size < 20 && maxGen >= 2) {
		for (const item of base.items.all()) {
			if (standard(item)) legalItems.add(item.id);
		}
		notes.push(`The hack's item list could not be read; every Generation ${maxGen} item is allowed.`);
	}
	if (learned.status === 'read') {
		notes.push(
			'Regular uses the movesets read from the game: level-up, TM and HM, tutor and egg moves, including those of ' +
			'earlier evolutions. Moves that the game only teaches through events or scripted tutors are not included.'
		);
	} else {
		notes.push(ROM_HACK_REGULAR_UNAVAILABLE);
		if (learned.note) notes.push(learned.note);
	}
	if (extraTypes.size) notes.push(`New types in this hack: ${[...extraTypes].join(', ')}.`);
	notes.push(...chartNotes);
	if (!reader) {
		notes.push(
			`Battle mechanics are Generation ${maxGen} mechanics; engine changes made by the hack itself are not detected.`
		);
	} else if (Object.keys(mechanics).length) {
		notes.push(`Battle mechanics are Generation ${maxGen} mechanics plus the hack's own changes listed below.`);
	} else {
		notes.push(`Battle mechanics are Generation ${maxGen} mechanics.`);
	}
	const hack: HackDex = {
		version: HACK_VERSION,
		sha256,
		patchFormat,
		baseGame: raw.baseGame,
		baseGen: raw.baseGen,
		parentMod: `gen${maxGen}`,
		notes,
		approximated,
		Pokedex,
		Moves,
		Abilities,
		Items,
		TypeChart,
		mechanics,
		mechanicsNotes,
		mechanicsReport,
		indices,
		legal: {
			species: [...legalSpecies], moves: [...legalMoves], abilities: [...legalAbilities], items: [...legalItems],
		},
		learnsetStatus: learned.status,
	};
	if (learned.note) hack.learnsetNote = learned.note;
	if (learned.learnsets) hack.learnsets = learned.learnsets;
	return { hack, gen: maxGen, settled: maxGen === settledGen };
}
