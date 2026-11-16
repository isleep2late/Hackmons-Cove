import { requireSignatures, signatureSection } from './signatures';
export type Fraction = [number, number];
export type Range = [number, number];
export type WeatherKey = 'rain' | 'sun' | 'sand' | 'hail';
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

export interface RomHackAbilityParams {
	damageFraction?: Fraction;
	healFraction?: Fraction;
	chance?: Fraction;
}

export interface RomHackMechanics {
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
	ingrainHeal?: Fraction;
	screenTurns?: { reflect?: number, lightscreen?: number, safeguard?: number, mist?: number };
	screenClayTurns?: number;
	trapTurns?: Range;
	trapTurnsGripClaw?: number;
	tauntTurns?: Range;
	disableTurns?: Range;
	encoreTurns?: Range;
	uproarTurns?: Range;
	thrashTurns?: Range;
	bideTurns?: Range;
	perishCount?: number;
	futureSightTurns?: number;
	healMoveFraction?: Fraction;
	recoilFractions?: { quarter?: Fraction, third?: Fraction, half?: Fraction };
	struggleRecoil?: Fraction;
	substituteCost?: Fraction;
	wishHeal?: Fraction;
	bellyDrumCost?: Fraction;
	curseCost?: Fraction;
	superFangFraction?: Fraction;
	presentHeal?: Fraction;
	sonicBoomDamage?: number;
	dragonRageDamage?: number;
	thunderAccuracy?: { rain?: number | true, sun?: number | true };
	weatherHeal?: Fraction[];
	focusEnergyCritStages?: number;
	flailPower?: [number, number][];
	magnitudePower?: [number, number, number][];
	presentPower?: [number, number][];
	highCritMoves?: string[];
	gen1Crit?: { normal?: number, high?: number, focusEnergy?: number, focusEnergyHigh?: number, cap?: 255 | 256 };
	miss1in256?: boolean;
	healFailsAtGap255?: boolean;
	invulnerabilityGlitch?: boolean;
	category?: { basis: 'type', specialTypes: string[] } | { basis: 'move', specialMoves: string[] };
	trapHits?: [number, number, number, number];
	items?: { [itemId: string]: RomHackItemParams };
	abilities?: { [abilityId: string]: RomHackAbilityParams };
}

export type MechanicsStatus = 'same' | 'changed' | 'unreadable' | 'notfound' | 'dead';

export interface MechanicsReportEntry {
	id: string;
	status: MechanicsStatus;
	base?: any;
	hack?: any;
}

export interface MechanicsTypeMatchup { attack: string; defend: string; multiplier: number }

export interface MechanicsTypeChartInfo {
	typeNames: string[];
	foresightIgnored?: { attack: string, defend: string }[];
	unsupported?: MechanicsTypeMatchup[];
	reference: 'base' | 'gen6';
}

export interface MechanicsReaderResult {
	engine: { kind: 'stock' | 'cfru' | 'expansion' | 'rewritten' | 'unknown', live: boolean, detail: string };
	values: RomHackMechanics;
	report: MechanicsReportEntry[];
	typeChart?: MechanicsTypeMatchup[];
	typeChartInfo?: MechanicsTypeChartInfo;
	notes: string[];
}

export interface Gen3MoveChance { index: number; effect: number; chance: number; baseChance: number }

export interface Gen3ItemParam {
	index: number;
	name: string;
	id: string;
	holdEffect: number;
	param: number;
	baseParam: number;
	leaf: string | null;
}

export interface Gen3MechanicsResult extends MechanicsReaderResult {
	moveChances: Gen3MoveChance[];
	moveTableOffset: number;
	itemParams: Gen3ItemParam[];
	itemParamsLive: boolean;
	itemTableOffset: number;
}

export interface Gen3MechanicsOptions {
	typeNames?: string[] | null;
	itemNames?: (string | undefined)[] | null;
	forceRebuilt?: boolean;
}

export interface Gen3ChartDiff { attack: string; defend: string; multiplier: number; reference: number | null }

export interface Gen3TypeChartResult {
	id: 'typeChart' | 'engine.typeChart';
	status: MechanicsStatus;
	live: boolean;
	engineKind: MechanicsReaderResult['engine']['kind'];
	format: string;
	offset: number;
	typeChart?: MechanicsTypeMatchup[];
	typeChartInfo?: MechanicsTypeChartInfo;
	diff: Gen3ChartDiff[];
	notes: string[];
}

type RawStatus = 'same' | 'changed' | 'unreadable' | 'notfound';

export interface Gen3RawProbe {
	id: string;
	status: RawStatus;
	base: any;
	hack: any;
	live?: boolean;
	method?: string;
	offset?: number;
	references?: number;
	format?: string;
	note?: string;
}

export interface Gen3RawEngine {
	kind: string;
	notes: string[];
	commandTable?: string;
	commandsRepointed?: string;
	version?: string;
}

export interface Gen3RawResult {
	gameCode: string;
	revision: number;
	baseKey: string | null;
	binarySimilarity: number;
	engine: Gen3RawEngine;
	probes: Gen3RawProbe[];
}

interface Site { at: number; fn: number; size: number; cmd: number }
interface BaseMap { name: string; cmdTable: number; cmdCount: number; sites: { [id: string]: Site } }
interface Group {
	key: string;
	ids: string[];
	expect: number | number[];
	min?: number;
	max?: number;
	oneOf?: number[];
	extraOk?: boolean;
}
interface Pattern { words: [number, number][]; valueAt: number; kind: string }
interface Gen3Signatures {
	code: { [key: string]: string[] };
	data: { [id: string]: string };
	typeChart: string;
	poundRow: number[];
	karateChopRow: number[];
}
const signatures = () => signatureSection<Gen3Signatures>('gen3');
interface Hit { at: number; pat: Pattern }
interface TripleTable { main: [number, number, number][]; foresight: [number, number, number][]; bytes: number }
interface Shape { width: number; unit: number; half: number; zero: number; one: number; double: number; kind: string }
interface MatrixCand { at: number; n: number; lead: number; shape: Shape; agree: number; total: number }
interface Followed { at: number; ok: boolean; notes: string[]; slots: number; stock: number; garbage: number }
interface ChartRead {
	id: 'typeChart' | 'engine.typeChart';
	names: string[];
	cells: MechanicsTypeMatchup[];
	foresight: { attack: string, defend: string }[];
	reference: 'base' | 'gen6';
}
interface ItemRow {
	index: number;
	name: string;
	holdEffect: number;
	param: number;
	baseParam: number;
	baseEffect: number;
}
interface Analysis {
	raw: Gen3RawResult;
	charts: ChartRead[];
	itemRows: ItemRow[];
	itemEffectChanges: ItemRow[];
	itemsLive: boolean;
	itemTableOffset: number;
	moveTableOffset: number;
	stockLive: boolean;
	cfruChart: boolean;
	codeLocated: number;
	codeTotal: number;
}

const SITE_IDS = [
	'weatherTurns.rain', 'weatherTurns.sandstorm', 'weatherTurns.sun', 'weatherTurns.hail', 'screenTurns.reflect',
	'screenTurns.lightscreen', 'screenTurns.mist', 'screenTurns.safeguard', 'critMultiplier', 'stabDivisor.battle',
	'stabDivisor.preview', 'sleepCounter.mask', 'sleepCounter.add', 'confusionCounter.add', 'confusionCounter.mask',
	'multiHit.mask', 'multiHit.rerollAbove', 'multiHit.add', 'freezeThawModulus', 'shedSkinModulus', 'fullParalysisMask',
	'confusionSelfHitMask', 'infatuationMask', 'residualShift.ingrain', 'residualShift.leechSeed', 'residualShift.poison',
	'residualShift.toxic', 'residualShift.burn', 'residualShift.nightmare', 'residualShift.curse', 'residualShift.wrap',
	'residualShift.rainDish', 'residualShift.absorbAbility', 'residualShift.roughSkin', 'residualShift.leftovers',
	'hpShift.recover', 'hpShift.superFang', 'residualShift.sandstorm', 'residualShift.hail', 'hpShift.curseCost',
	'hpShift.presentHeal', 'hpShift.bellyDrum', 'hpShift.wish', 'paralysisSpeedShift.first', 'paralysisSpeedShift.second',
	'damageRollMask.unused', 'damageRollMask.normal', 'damageRollMask.normal2', 'tauntTurns', 'disableTurns.add',
	'encoreTurns.add', 'wrapCounter.add', 'uproarCounter.add',
];
const SITE_COMMANDS = [
	125, 149, 187, 200, 126, 146, 153, 184, 4, 6, -1, -1, -1, -1, -1, 141, 141, 141, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	-1, -1, -1, -1, -1, -1, -1, -1, 123, 148, 150, 150, 175, 183, 188, 212, -1, -1, -1, 7, 8, 208, 163, 164, -1, -1,
];
const SITES_FIRERED = [
	160992, 160936, 84, 167122, 167064, 88, 176910, 176852, 88, 179368, 179316, 88, 161126, 161020, 204, 166054, 165948,
	204, 168482, 168400, 168, 176098, 175988, 168, 124264, 123912, 404, 125108, 125000, 624, 126564, 126452, 472,
	132516, 130848, 4612, 132520, 130848, 4612, 133118, 130848, 4612, 133110, 130848, 4612, 164338, 164304, 76, 164344,
	164304, 76, 164354, 164304, 76, 103682, 103124, 2364, 107712, 106264, 7372, 104726, 103124, 2364, 104520, 103124,
	2364, 104944, 103124, 2364, 99204, 98904, 2624, 99398, 98904, 2624, 99490, 98904, 2624, 99564, 98904, 2624, 99690,
	98904, 2624, 99778, 98904, 2624, 99864, 98904, 2624, 100036, 98904, 2624, 107652, 106264, 7372, 108700, 106264,
	7372, 109274, 106264, 7372, 114872, 113768, 4988, 160506, 160452, 124, 167022, 167004, 60, 167342, 167152, 416,
	167458, 167152, 416, 174576, 174484, 132, 175860, 175784, 204, 176992, 176940, 128, 181382, 181256, 210, 85600,
	85208, 976, 85824, 85208, 976, 127186, 127176, 60, 127246, 127236, 432, 127678, 127668, 396, 180194, 180164, 116,
	170816, 170608, 324, 171128, 170932, 308, 133710, 130848, 4612, 133372, 130848, 4612,
];
const SITES_EMERALD = [
	328448, 328392, 84, 334586, 334528, 88, 344214, 344156, 88, 346748, 346696, 88, 328582, 328476, 204, 333518, 333412,
	204, 335786, 335704, 168, 343402, 343292, 168, 290134, 289816, 372, 290980, 290872, 624, 292436, 292324, 472,
	298536, 296800, 4724, 298540, 296800, 4724, 299170, 296800, 4724, 299162, 296800, 4724, 331794, 331760, 76, 331800,
	331760, 76, 331810, 331760, 76, 269490, 268908, 2440, 273848, 272424, 7216, 270642, 268908, 2440, 270428, 268908,
	2440, 270780, 268908, 2440, 264784, 264484, 2624, 264978, 264484, 2624, 265070, 264484, 2624, 265144, 264484, 2624,
	265270, 264484, 2624, 265358, 264484, 2624, 265444, 264484, 2624, 265616, 264484, 2624, 273790, 272424, 7216,
	274832, 272424, 7216, 275406, 272424, 7216, 280892, 279772, 5004, 327966, 327912, 124, 334486, 334468, 60, 334770,
	334616, 376, 334882, 334616, 376, 341880, 341788, 132, 343164, 343088, 204, 344296, 344244, 128, 348734, 348608,
	210, 250008, 249616, 984, 250236, 249616, 984, 293058, 293048, 60, 293118, 293108, 432, 293550, 293540, 396, 347574,
	347544, 116, 338120, 337912, 324, 338432, 338236, 308, 299762, 296800, 4724, 299424, 296800, 4724,
];
const SITES_RUBY = [
	153352, 153296, 84, 159438, 159380, 88, 168994, 168936, 88, 171488, 171436, 88, 153486, 153380, 184, 158506, 158400,
	184, 160666, 160584, 148, 168234, 168124, 144, 117174, 116856, 372, 118072, 117956, 632, 119532, 119424, 476,
	125512, 123884, 4648, 125516, 123884, 4648, 126118, 123884, 4648, 126110, 123884, 4648, 156734, 156700, 76, 156740,
	156700, 76, 156750, 156700, 76, 96580, 96024, 2304, 100596, 99108, 7308, 97626, 96024, 2304, 97430, 96024, 2304,
	97774, 96024, 2304, 91748, 91480, 2948, 92016, 91480, 2948, 92142, 91480, 2948, 92240, 91480, 2948, 92390, 91480,
	2948, 92484, 91480, 2948, 92580, 91480, 2948, 92796, 91480, 2948, 100536, 99108, 7308, 101588, 99108, 7308, 102162,
	99108, 7308, 107660, 106540, 5088, 152770, 152716, 124, 159338, 159320, 60, 159622, 159468, 376, 159734, 159468,
	376, 166728, 166612, 156, 168012, 167936, 188, 169076, 169024, 128, 173478, 173352, 210, 78200, 77808, 984, 78424,
	77808, 984, 120190, 120180, 60, 120250, 120240, 432, 120682, 120672, 396, 172314, 172284, 116, 162980, 162772, 324,
	163292, 163096, 308, 126714, 123884, 4648, 126372, 123884, 4648,
];
const BASE_LAYOUTS: { [key: string]: [string, number, number, number[], number] } = {
	BPRE0: ['FireRed', 2425116, 248, SITES_FIRERED, 0],
	BPRE1: ['FireRed', 2425228, 248, SITES_FIRERED, 20],
	BPGE0: ['LeafGreen', 2425080, 248, SITES_FIRERED, 0],
	BPGE1: ['LeafGreen', 2425192, 248, SITES_FIRERED, 20],
	BPEE0: ['Emerald', 3259664, 249, SITES_EMERALD, 0],
	AXVE0: ['Ruby', 2074428, 248, SITES_RUBY, 0],
	AXVE1: ['Ruby', 2074452, 248, SITES_RUBY, 0],
	AXVE2: ['Ruby', 2074452, 248, SITES_RUBY, 0],
	AXPE0: ['Sapphire', 2074316, 248, SITES_RUBY, 0],
	AXPE1: ['Sapphire', 2074340, 248, SITES_RUBY, 0],
	AXPE2: ['Sapphire', 2074340, 248, SITES_RUBY, 0],
};
const GAME_NAMES: { [code: string]: string } = {
	BPRE: 'FireRed', BPGE: 'LeafGreen', BPEE: 'Emerald', AXVE: 'Ruby', AXPE: 'Sapphire',
};

const CODE_GROUPS: Group[] = [
	{
		key: 'weatherTurns',
		ids: ['weatherTurns.rain', 'weatherTurns.sandstorm', 'weatherTurns.sun'],
		expect: 5, min: 1, max: 15,
	},
	{ key: 'hailTurns', ids: ['weatherTurns.hail'], expect: 5, min: 1, max: 15 },
	{
		key: 'screenTurns',
		ids: ['screenTurns.reflect', 'screenTurns.lightscreen', 'screenTurns.mist', 'screenTurns.safeguard'],
		expect: 5, min: 1, max: 15,
	},
	{
		key: 'critMultiplier',
		ids: ['critMultiplier'], expect: 2, min: 1, max: 4,
	},
	{
		key: 'stabDivisor', ids: ['stabDivisor.battle', 'stabDivisor.preview'],
		expect: 10, min: 8, max: 15,
	},
	{ key: 'sleepCounter.mask', ids: ['sleepCounter.mask'], expect: 3, oneOf: [0, 1, 3, 7] },
	{ key: 'sleepCounter.add', ids: ['sleepCounter.add'], expect: 2, min: 1, max: 7 },
	{ key: 'confusionCounter.add', ids: ['confusionCounter.add'], expect: 2, min: 1, max: 7 },
	{ key: 'confusionCounter.mask', ids: ['confusionCounter.mask'], expect: 0xc0, oneOf: [0x40, 0xc0] },
	{ key: 'multiHit.mask', ids: ['multiHit.mask'], expect: 3, oneOf: [1, 3] },
	{
		key: 'multiHit.rerollAbove', ids: ['multiHit.rerollAbove'],
		expect: 1, min: 0, max: 3,
	},
	{ key: 'multiHit.add', ids: ['multiHit.add'], expect: 2, min: 1, max: 4 },
	{
		key: 'statusCureModulus',
		ids: ['freezeThawModulus', 'shedSkinModulus'], expect: [5, 3], min: 2, max: 100,
	},
	{
		key: 'fullParalysisMask',
		ids: ['fullParalysisMask'], expect: 0xc0, oneOf: [0x40, 0xc0],
	},
	{ key: 'confusionSelfHitMask', ids: ['confusionSelfHitMask'], expect: 1, oneOf: [1, 3] },
	{ key: 'infatuationMask', ids: ['infatuationMask'], expect: 1, oneOf: [1, 3] },
	{
		key: 'hpShift',
		ids: [
			'residualShift.ingrain', 'residualShift.leechSeed', 'residualShift.poison', 'residualShift.toxic',
			'residualShift.burn', 'residualShift.nightmare', 'residualShift.curse', 'residualShift.wrap',
			'residualShift.rainDish', 'residualShift.absorbAbility', 'residualShift.roughSkin', 'residualShift.leftovers',
			'hpShift.recover', 'hpShift.superFang', 'residualShift.sandstorm', 'residualShift.hail', 'hpShift.curseCost',
			'hpShift.presentHeal', 'hpShift.bellyDrum', 'hpShift.wish',
		],
		expect: [4, 3, 3, 4, 3, 2, 2, 4, 4, 2, 4, 4, 1, 1, 4, 4, 1, 2, 1, 1], min: 1, max: 6,
	},
	{ key: 'paralysisSpeedShift.first', ids: ['paralysisSpeedShift.first'], expect: 2, min: 0, max: 3 },
	{ key: 'paralysisSpeedShift.second', ids: ['paralysisSpeedShift.second'], expect: 2, min: 0, max: 3 },
	{
		key: 'damageRollMask',
		ids: ['damageRollMask.unused', 'damageRollMask.normal', 'damageRollMask.normal2'],
		expect: 15, oneOf: [0, 1, 3, 7, 15, 31], extraOk: true,
	},
	{ key: 'tauntTurns', ids: ['tauntTurns'], expect: 2, min: 1, max: 15 },
	{ key: 'disableTurns.add', ids: ['disableTurns.add'], expect: 2, min: 1, max: 12 },
	{ key: 'encoreTurns.add', ids: ['encoreTurns.add'], expect: 3, min: 1, max: 12 },
	{ key: 'wrapCounter.add', ids: ['wrapCounter.add'], expect: 3, min: 1, max: 4 },
	{ key: 'uproarCounter.add', ids: ['uproarCounter.add'], expect: 2, min: 1, max: 12 },
];

const ANCHOR_VISITS = 3000000;
const MAX_ROM = 0x2000000;

const VANILLA_TYPES = [
	'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', '???', 'Fire', 'Water', 'Grass',
	'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark',
];
const TYPE_ALIASES: { [k: string]: string } = {
	normal: 'Normal', fight: 'Fighting', fightng: 'Fighting', fighting: 'Fighting', flying: 'Flying', poison: 'Poison',
	ground: 'Ground', rock: 'Rock', bug: 'Bug', ghost: 'Ghost', steel: 'Steel', fire: 'Fire', water: 'Water',
	grass: 'Grass', electr: 'Electric', electric: 'Electric', psychc: 'Psychic', psychic: 'Psychic', ice: 'Ice',
	dragon: 'Dragon', dark: 'Dark', fairy: 'Fairy', stellar: 'Stellar',
};
const GEN6_ROWS: { [type: string]: { d?: string, h?: string, z?: string } } = {
	Normal: { h: 'Rock Steel', z: 'Ghost' },
	Fighting: { d: 'Normal Rock Steel Ice Dark', h: 'Flying Poison Bug Psychic Fairy', z: 'Ghost' },
	Flying: { d: 'Fighting Bug Grass', h: 'Rock Steel Electric' },
	Poison: { d: 'Grass Fairy', h: 'Poison Ground Rock Ghost', z: 'Steel' },
	Ground: { d: 'Poison Rock Steel Fire Electric', h: 'Bug Grass', z: 'Flying' },
	Rock: { d: 'Flying Bug Fire Ice', h: 'Fighting Ground Steel' },
	Bug: { d: 'Grass Psychic Dark', h: 'Fighting Flying Poison Ghost Steel Fire Fairy' },
	Ghost: { d: 'Ghost Psychic', h: 'Dark', z: 'Normal' },
	Steel: { d: 'Rock Ice Fairy', h: 'Steel Fire Water Electric' },
	Fire: { d: 'Bug Steel Grass Ice', h: 'Rock Fire Water Dragon' },
	Water: { d: 'Ground Rock Fire', h: 'Water Grass Dragon' },
	Grass: { d: 'Ground Rock Water', h: 'Flying Poison Bug Steel Fire Grass Dragon' },
	Electric: { d: 'Flying Water', h: 'Grass Electric Dragon', z: 'Ground' },
	Psychic: { d: 'Fighting Poison', h: 'Steel Psychic', z: 'Dark' },
	Ice: { d: 'Flying Ground Grass Dragon', h: 'Steel Fire Water Ice' },
	Dragon: { d: 'Dragon', h: 'Steel', z: 'Fairy' },
	Dark: { d: 'Ghost Psychic', h: 'Fighting Dark Fairy' },
	Fairy: { d: 'Fighting Dragon Dark', h: 'Poison Steel Fire' },
};
const NATURE_IDS = [
	'hardy', 'lonely', 'brave', 'adamant', 'naughty', 'bold', 'docile', 'relaxed', 'impish', 'lax', 'timid', 'hasty',
	'serious', 'jolly', 'naive', 'modest', 'mild', 'quiet', 'bashful', 'rash', 'calm', 'gentle', 'sassy', 'careful', 'quirky',
];
const NATURE_STATS: StatKey[] = ['atk', 'def', 'spe', 'spa', 'spd'];
const TYPE_POWER_EFFECTS = [31, 42, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60];
const CONFUSE_BERRY_EFFECTS = [10, 11, 12, 13, 14];

function buildGen6(): Map<string, number> {
	const out = new Map<string, number>();
	const types = Object.keys(GEN6_ROWS);
	for (const attack of types) {
		const row = GEN6_ROWS[attack];
		for (const defend of types) {
			let value = 1;
			if (row.d?.split(' ').includes(defend)) value = 2;
			else if (row.h?.split(' ').includes(defend)) value = 0.5;
			else if (row.z?.split(' ').includes(defend)) value = 0;
			out.set(attack + '>' + defend, value);
		}
	}
	return out;
}
const GEN6_CHART = buildGen6();

function buildText(): { encode: { [ch: string]: number }, decode: (string | undefined)[] } {
	const encode: { [ch: string]: number } = {};
	for (let i = 0; i < 26; i++) {
		encode[String.fromCharCode(65 + i)] = 0xbb + i;
		encode[String.fromCharCode(97 + i)] = 0xd5 + i;
	}
	encode[' '] = 0;
	encode['-'] = 0xae;
	encode['.'] = 0xad;
	encode["'"] = 0xb4;
	const decode: (string | undefined)[] = new Array(256).fill(undefined);
	for (const ch in encode) decode[encode[ch]] = ch;
	for (let i = 0; i < 10; i++) decode[0xa1 + i] = String(i);
	decode[0x1b] = 'e';
	decode[0xab] = '!';
	decode[0xac] = '?';
	decode[0xb8] = ',';
	decode[0xba] = '/';
	decode[0xb5] = 'M';
	decode[0xb6] = 'F';
	decode[0xf0] = ':';
	decode[0xb0] = '.';
	decode[0xb1] = '"';
	decode[0xb2] = '"';
	decode[0xb3] = "'";
	return { encode, decode };
}
const TEXT = buildText();

function u16(buf: Buffer, at: number): number {
	return at >= 0 && at + 2 <= buf.length ? buf.readUInt16LE(at) : 0;
}

function u32(buf: Buffer, at: number): number {
	return at >= 0 && at + 4 <= buf.length ? buf.readUInt32LE(at) : 0;
}

function s8(buf: Buffer, at: number): number {
	return at >= 0 && at < buf.length ? buf.readInt8(at) : 0;
}

function sameBytes(a: Buffer, b: Buffer, at: number, length: number): boolean {
	if (at < 0 || at + length > a.length || at + length > b.length) return false;
	for (let i = 0; i < length; i++) {
		if (a[at + i] !== b[at + i]) return false;
	}
	return true;
}

function hasBytes(buf: Buffer, at: number, bytes: Buffer): boolean {
	if (at < 0 || at + bytes.length > buf.length) return false;
	for (let i = 0; i < bytes.length; i++) {
		if (buf[at + i] !== bytes[i]) return false;
	}
	return true;
}

function toID(text: string): string {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function hex(value: number): string {
	return '0x' + value.toString(16);
}

function compile(text: string): Pattern {
	const words: [number, number][] = [];
	let valueAt = -1;
	let kind = '';
	for (const tok of text.trim().split(/\s+/)) {
		if (tok === 'BL') {
			words.push([0xf000, 0xf800], [0xf800, 0xf800]);
			continue;
		}
		const m = /^\{(\w+):([0-9a-f?]{4})\}$/.exec(tok);
		let body = tok;
		if (m) {
			kind = m[1];
			body = m[2];
			valueAt = words.length;
		}
		let value = 0;
		let mask = 0;
		for (const ch of body) {
			value <<= 4;
			mask <<= 4;
			if (ch !== '?') {
				value |= parseInt(ch, 16);
				mask |= 0xf;
			}
		}
		if (m) {
			mask &= kind === 'imm8' ? 0xff00 : 0xf83f;
			value &= mask;
		}
		words.push([value, mask]);
	}
	return { words, valueAt, kind };
}

function matchAt(rom: Buffer, pat: Pattern, at: number): boolean {
	if (at < 0 || at + pat.words.length * 2 > rom.length) return false;
	for (let i = 0; i < pat.words.length; i++) {
		const value = pat.words[i][0];
		const mask = pat.words[i][1];
		if (mask && (rom.readUInt16LE(at + i * 2) & mask) !== value) return false;
	}
	return true;
}

function readValue(rom: Buffer, pat: Pattern, at: number): number {
	const w = u16(rom, at + pat.valueAt * 2);
	if (pat.kind === 'imm8') return w & 0xff;
	return (w >> 6) & 31;
}

function searchPattern(rom: Buffer, pat: Pattern, limit: number): number[] {
	let anchor = -1;
	for (let i = 0; i < pat.words.length; i++) {
		if (pat.words[i][1] === 0xffff) {
			anchor = i;
			break;
		}
	}
	const hits: number[] = [];
	if (anchor < 0) return hits;
	const needle = Buffer.alloc(2);
	needle.writeUInt16LE(pat.words[anchor][0]);
	let pos = 0;
	let visits = 0;
	while (hits.length < limit && visits < ANCHOR_VISITS) {
		const at = rom.indexOf(needle, pos);
		if (at < 0) break;
		visits++;
		pos = at + 1;
		const start = at - anchor * 2;
		if (start & 1) continue;
		if (matchAt(rom, pat, start)) hits.push(start);
	}
	return hits;
}

function groupHits(rom: Buffer, group: Group): Hit[] {
	const hits: Hit[] = [];
	for (const text of signatures().code[group.key]) {
		const pat = compile(text);
		for (const at of searchPattern(rom, pat, 64)) hits.push({ at, pat });
	}
	hits.sort((a, b) => a.at - b.at);
	return hits;
}

function findAll(rom: Buffer, needle: Buffer, limit: number): number[] {
	const out: number[] = [];
	let from = 0;
	while (out.length < limit) {
		const at = rom.indexOf(needle, from);
		if (at < 0) break;
		out.push(at);
		from = at + 1;
	}
	return out;
}

function pointerRefs(rom: Buffer, target: number, limit: number): number[] {
	const needle = Buffer.alloc(4);
	needle.writeUInt32LE((0x08000000 + target) >>> 0);
	return findAll(rom, needle, limit * 4).filter(at => at % 4 === 0).slice(0, limit);
}

function romPointer(rom: Buffer, at: number): number {
	if (at < 0 || at + 4 > rom.length) return -1;
	const value = rom.readUInt32LE(at);
	if (value < 0x08000000 || value >= 0x08000000 + rom.length) return -1;
	return value - 0x08000000;
}

function follow(base: Buffer, rom: Buffer, baseAt: number, limit: number): Followed {
	const slots = pointerRefs(base, baseAt, limit);
	let stock = 0;
	let garbage = 0;
	const moved = new Map<number, number>();
	for (const slot of slots) {
		const target = romPointer(rom, slot);
		if (target === baseAt) stock++;
		else if (target >= 0) moved.set(target, (moved.get(target) || 0) + 1);
		else garbage++;
	}
	const ranked = Array.from(moved.entries()).sort((a, b) => b[1] - a[1]);
	const repointed = ranked.reduce((sum, entry) => sum + entry[1], 0);
	const notes: string[] = [];
	let at = baseAt;
	let ok = true;
	if (ranked.length && ranked[0][1] > stock + repointed - ranked[0][1]) {
		at = ranked[0][0];
		const rest = stock + repointed - ranked[0][1];
		notes.push(`repointed to ${hex(at)}` + (rest ? ` (${rest} references point elsewhere)` : ''));
	} else if (ranked.length && stock >= repointed) {
		notes.push(`${repointed} of ${slots.length} references were repointed; most still use the stock table`);
	} else if (ranked.length) {
		ok = false;
		notes.push(`references point to ${ranked.length} different places`);
	} else if (!stock) {
		ok = false;
		notes.push('every reference was overwritten');
	}
	if (garbage) notes.push(`${garbage} of ${slots.length} references overwritten by rewritten code`);
	return { at, ok, notes, slots: slots.length, stock, garbage };
}

function encodeText(text: string): Buffer {
	const out: number[] = [];
	for (const ch of text) out.push(TEXT.encode[ch] || 0);
	return Buffer.from(out);
}

function decodeText(rom: Buffer, at: number, maxLen: number): string | null {
	let out = '';
	for (let i = 0; i < maxLen; i++) {
		const p = at + i;
		if (p < 0 || p >= rom.length) return null;
		const b = rom[p];
		if (b === 0xff) return out;
		const ch = TEXT.decode[b];
		if (ch === undefined) return null;
		out += ch;
	}
	return out;
}

function readTypeNames(rom: Buffer): string[] | null {
	for (const first of ['NORMAL', 'Normal']) {
		const needle = Buffer.concat([encodeText(first), Buffer.from([0xff])]);
		for (const hit of findAll(rom, needle, 64)) {
			for (let stride = 7; stride <= 16; stride++) {
				const next = decodeText(rom, hit + stride, stride);
				if (!next || !/^fight/i.test(next)) continue;
				const names: string[] = [];
				for (let i = 0; i < 32; i++) {
					const text = decodeText(rom, hit + i * stride, stride);
					if (text === null || (i > 0 && !text)) break;
					const plain = text.replace(/[^A-Za-z]/g, '');
					names.push(TYPE_ALIASES[plain.toLowerCase()] ||
						(plain ? plain[0].toUpperCase() + plain.slice(1).toLowerCase() : '???'));
				}
				if (names.length >= 18) return names;
			}
		}
	}
	return null;
}

function gen6Multiplier(attack: string, defend: string): number | null {
	const value = GEN6_CHART.get(attack + '>' + defend);
	return value === undefined ? null : value;
}

function gen3Multiplier(attack: string, defend: string): number | null {
	if (attack === 'Fairy' || defend === 'Fairy') return null;
	if (defend === 'Steel' && (attack === 'Ghost' || attack === 'Dark')) return 0.5;
	return gen6Multiplier(attack, defend);
}

function decodeTriples(rom: Buffer, at: number, strict: boolean): TripleTable | null {
	const main: [number, number, number][] = [];
	const foresight: [number, number, number][] = [];
	let list = main;
	if (at < 0) return null;
	for (let i = 0; i < 600; i++) {
		const p = at + i * 3;
		if (p + 3 > rom.length) return null;
		const a = rom[p];
		const d = rom[p + 1];
		const m = rom[p + 2];
		if (a === 0xff && d === 0xff) return main.length >= 20 ? { main, foresight, bytes: (i + 1) * 3 } : null;
		if (a === 0xfe && d === 0xfe) {
			if (list === foresight) return null;
			list = foresight;
			continue;
		}
		if (a >= 32 || d >= 32 || m > 40 || (strict && m !== 0 && m !== 5 && m !== 20)) return null;
		list.push([a, d, m / 10]);
	}
	return null;
}

function inferFairy(table: TripleTable, names: string[]): number | null {
	const ids = new Set<number>();
	for (const list of [table.main, table.foresight]) {
		for (const entry of list) {
			ids.add(entry[0]);
			ids.add(entry[1]);
		}
	}
	if (names.includes('Fairy')) return null;
	for (const id of ids) {
		if (names[id] && names[id] !== '???') continue;
		let right = 0;
		let wrong = 0;
		for (const entry of table.main) {
			if (entry[0] !== id && entry[1] !== id) continue;
			const attack = entry[0] === id ? 'Fairy' : names[entry[0]];
			const defend = entry[1] === id ? 'Fairy' : names[entry[1]];
			if (attack && defend && gen6Multiplier(attack, defend) === entry[2]) right++;
			else wrong++;
		}
		if (right >= 10 && wrong <= 2) return id;
	}
	return null;
}

function triplesToMatrix(table: TripleTable, names: string[]): Map<string, number> {
	const out = new Map<string, number>();
	for (const list of [table.main, table.foresight]) {
		for (const entry of list) {
			const attack = names[entry[0]] || `Type${entry[0]}`;
			const defend = names[entry[1]] || `Type${entry[1]}`;
			const key = attack + '>' + defend;
			out.set(key, (out.get(key) ?? 1) * entry[2]);
		}
	}
	return out;
}

const TYPE_SLOTS = Array.from({ length: 256 }, (unused, slot) => String(slot));

function tripleDiff(baseTable: TripleTable, table: TripleTable, names: string[]): Gen3ChartDiff[] {
	const named = (slot: string) => names[Number(slot)] || `Type${slot}`;
	return matrixDiff(triplesToMatrix(baseTable, TYPE_SLOTS), triplesToMatrix(table, TYPE_SLOTS))
		.map(cell => ({ ...cell, attack: named(cell.attack), defend: named(cell.defend) }));
}

function matrixDiff(baseMatrix: Map<string, number>, hackMatrix: Map<string, number>): Gen3ChartDiff[] {
	const diff: Gen3ChartDiff[] = [];
	const keys = new Set<string>();
	for (const key of baseMatrix.keys()) keys.add(key);
	for (const key of hackMatrix.keys()) keys.add(key);
	for (const key of keys) {
		const a = baseMatrix.get(key);
		const b = hackMatrix.get(key);
		const reference = a === undefined ? 1 : a;
		const multiplier = b === undefined ? 1 : b;
		if (reference !== multiplier) {
			const split = key.indexOf('>');
			diff.push({ attack: key.slice(0, split), defend: key.slice(split + 1), multiplier, reference });
		}
	}
	return diff;
}

function tripleChart(id: 'typeChart', table: TripleTable, names: string[]): ChartRead {
	const cells: MechanicsTypeMatchup[] = [];
	for (const [key, multiplier] of triplesToMatrix(table, names)) {
		if (multiplier === 1) continue;
		const split = key.indexOf('>');
		cells.push({ attack: key.slice(0, split), defend: key.slice(split + 1), multiplier });
	}
	const foresight = table.foresight.map(entry => ({
		attack: names[entry[0]] || `Type${entry[0]}`, defend: names[entry[1]] || `Type${entry[1]}`,
	}));
	return { id, names: names.slice(), cells, foresight, reference: 'base' };
}

function scanTripleTables(rom: Buffer): { at: number, table: TripleTable }[] {
	const found: { at: number, table: TripleTable }[] = [];
	const signature = Buffer.from([0xfe, 0xfe, 0x00]);
	for (const mark of findAll(rom, signature, 4000)) {
		let start = mark;
		let count = 0;
		while (start >= 3 && count < 600) {
			const a = rom[start - 3];
			const d = rom[start - 2];
			const m = rom[start - 1];
			if (a >= 32 || d >= 32 || (m !== 0 && m !== 5 && m !== 20)) break;
			start -= 3;
			count++;
		}
		while (count > 0 && rom[start] === 0 && rom[start + 1] === 0 && rom[start + 2] === 0) {
			start += 3;
			count--;
		}
		if (count < 60) continue;
		const table = decodeTriples(rom, start, true);
		if (table) found.push({ at: start, table });
	}
	return found;
}

function shapeRead(rom: Buffer, width: number, at: number): number {
	if (at < 0 || at + width > rom.length) return -1;
	return width === 1 ? rom[at] : width === 2 ? rom.readUInt16LE(at) : rom.readUInt32LE(at);
}

function shapeDecode(shape: Shape, v: number): number | null {
	return v === shape.one ? 1 : v === shape.half ? 0.5 : v === shape.double ? 2 : v === shape.zero ? 0 : null;
}

function findMatrixCharts(rom: Buffer): MatrixCand[] {
	const out: MatrixCand[] = [];
	const shapes: Shape[] = [];
	for (const unit of [0x1000, 0x400]) {
		for (const width of [2, 4]) {
			shapes.push({ width, unit, half: unit / 2, zero: 0, one: unit, double: unit * 2, kind: 'uq' });
		}
	}
	shapes.push({ width: 1, unit: 0, half: 5, zero: 1, one: 0, double: 20, kind: 'cfru' });
	shapes.push({ width: 1, unit: 10, half: 5, zero: 0, one: 10, double: 20, kind: 'u8x10' });
	const official: (number | null)[] = [];
	const older: (number | null)[] = [];
	for (let a = 0; a < 18; a++) {
		for (let d = 0; d < 18; d++) {
			official.push(gen6Multiplier(VANILLA_TYPES[a], VANILLA_TYPES[d]));
			older.push(gen3Multiplier(VANILLA_TYPES[a], VANILLA_TYPES[d]));
		}
	}
	for (const shape of shapes) {
		const w = shape.width;
		const cell = (v: number) => {
			const b = Buffer.alloc(w);
			if (w === 1) b[0] = v;
			else if (w === 2) b.writeUInt16LE(v);
			else b.writeUInt32LE(v);
			return b;
		};
		const rows: [number, number[]][] = [
			[0, [shape.one, shape.one, shape.one, shape.one, shape.one, shape.half, shape.one, shape.zero, shape.half]],
			[1, [shape.double, shape.one, shape.half, shape.half, shape.one, shape.double, shape.half, shape.zero, shape.double]],
		];
		const seen = new Set<string>();
		for (const [rowIndex, values] of rows) {
			const needle = Buffer.concat(values.map(cell));
			for (const hit of findAll(rom, needle, 400)) {
				if (w > 1 && hit % 2) continue;
				for (let n = 18; n <= 32; n++) {
					for (const lead of [0, 1]) {
						const start = hit - (rowIndex + lead) * n * w - lead * w;
						if (start < 0 || start + n * n * w > rom.length) continue;
						const key = `${start}:${n}`;
						if (seen.has(key)) continue;
						let agree = 0;
						let total = 0;
						let valid = true;
						for (let a = 0; a < 18 && valid; a++) {
							for (let d = 0; d < 18; d++) {
								if (a === 9 || d === 9) continue;
								const v = shapeDecode(shape, shapeRead(rom, w, start + ((a + lead) * n + d + lead) * w));
								if (v === null) {
									valid = false;
									break;
								}
								total++;
								if (v === official[a * 18 + d] || v === older[a * 18 + d]) agree++;
							}
						}
						if (!valid || agree < total * 0.88) continue;
						let cellsValid = true;
						for (let i = 0; i < n * n && cellsValid; i++) {
							if (shapeDecode(shape, shapeRead(rom, w, start + i * w)) === null) cellsValid = false;
						}
						if (!cellsValid) continue;
						seen.add(key);
						out.push({ at: start, n, lead, shape, agree, total });
					}
				}
			}
		}
	}
	const best = new Map<string, MatrixCand>();
	for (const cand of out) {
		const rowZero = cand.at + cand.lead * (cand.n + 1) * cand.shape.width;
		const key = `${cand.shape.kind}${cand.shape.width}:${rowZero}`;
		const old = best.get(key);
		if (!old || cand.agree > old.agree || (cand.agree === old.agree && cand.n < old.n)) best.set(key, cand);
	}
	return Array.from(best.values());
}

function readMatrix(rom: Buffer, cand: MatrixCand, names: string[]) {
	const w = cand.shape.width;
	const count = cand.n - cand.lead;
	const typeList: string[] = [];
	for (let i = 0; i < count; i++) typeList.push(names[i] || `Type${i}`);
	const index = new Map<string, number>();
	typeList.forEach((name, i) => index.set(name, i));
	const lookup = (attack: string, defend: string): number | null => {
		const a = index.get(attack);
		const d = index.get(defend);
		if (a === undefined || d === undefined) return null;
		return shapeDecode(cand.shape, shapeRead(rom, w, cand.at + ((a + cand.lead) * cand.n + d + cand.lead) * w));
	};
	return { typeList, lookup };
}

function chartDiff(
	matchups: (attack: string, defend: string) => number | null, typeList: string[]
): Gen3ChartDiff[] {
	const diff: Gen3ChartDiff[] = [];
	for (const attack of typeList) {
		for (const defend of typeList) {
			if (attack === '???' || defend === '???') continue;
			const mine = matchups(attack, defend);
			const theirs = gen6Multiplier(attack, defend);
			if (mine === null) continue;
			if (theirs === null) {
				if (mine !== 1) diff.push({ attack, defend, multiplier: mine, reference: null });
			} else if (mine !== theirs) {
				diff.push({ attack, defend, multiplier: mine, reference: theirs });
			}
		}
	}
	return diff;
}

function identify(rom: Buffer) {
	const code = rom.length >= 0xc0 ? rom.toString('latin1', 0xac, 0xb0) : '';
	const revision = rom.length >= 0xc0 ? rom[0xbc] : 0;
	return { code, revision, key: `${code}${revision}` };
}

function baseMapFor(key: string): BaseMap | null {
	if (!Object.prototype.hasOwnProperty.call(BASE_LAYOUTS, key)) return null;
	const layout = BASE_LAYOUTS[key];
	const sites: { [id: string]: Site } = {};
	SITE_IDS.forEach((id, i) => {
		sites[id] = {
			at: layout[3][i * 3] + layout[4], fn: layout[3][i * 3 + 1] + layout[4], size: layout[3][i * 3 + 2],
			cmd: SITE_COMMANDS[i],
		};
	});
	return { name: layout[0], cmdTable: layout[1], cmdCount: layout[2], sites };
}

function similarity(rom: Buffer, base: Buffer): number {
	let same = 0;
	let total = 0;
	for (let at = 0x400; at < 0x1c0000; at += 37) {
		total++;
		if (rom[at] === base[at]) same++;
	}
	return same / total;
}

function referencedTargets(rom: Buffer, targets: number[]): Set<number> {
	const wanted = new Set<number>();
	for (const target of targets) wanted.add((0x08000000 + target) >>> 0);
	const found = new Set<number>();
	if (!wanted.size) return found;
	const low = 0x08000000;
	const high = 0x08000000 + rom.length;
	for (let at = 0; at + 4 <= rom.length; at += 4) {
		const value = rom.readUInt32LE(at);
		if (value >= low && value < high && wanted.has(value)) found.add(value - 0x08000000);
	}
	return found;
}

interface DataProbe {
	id: string;
	decode: (r: Buffer, at: number) => any;
	valid: (v: any) => boolean;
}

const DATA_PROBES: DataProbe[] = [
	{
		id: 'critChance',
		decode: (r, at) => [0, 1, 2, 3, 4].map(i => u16(r, at + i * 2)),
		valid: (v: number[]) => v.every((x, i) => x >= 1 && x <= 64 && (i === 0 || x <= v[i - 1])),
	},
	{
		id: 'statStageRatios',
		decode: (r, at) => Array.from({ length: 13 }, (x, i) => [r[at + i * 2], r[at + i * 2 + 1]]),
		valid: (v: number[][]) => v.every(p => p[0] > 0 && p[1] > 0 && p[0] <= 100 && p[1] <= 100) && v[6][0] === v[6][1] &&
			v.every((p, i) => i === 0 || p[0] / p[1] >= v[i - 1][0] / v[i - 1][1]),
	},
	{
		id: 'accuracyStageRatios',
		decode: (r, at) => Array.from({ length: 13 }, (x, i) => [r[at + i * 4], r[at + i * 4 + 1]]),
		valid: (v: number[][]) => v.every(p => p[0] > 0 && p[1] > 0) && v[6][0] === v[6][1] &&
			v.every((p, i) => i === 0 || p[0] / p[1] >= v[i - 1][0] / v[i - 1][1]),
	},
	{
		id: 'natureTable',
		decode: (r, at) => Array.from({ length: 25 }, (x, i) => [0, 1, 2, 3, 4].map(k => s8(r, at + i * 5 + k))),
		valid: (v: number[][]) => v.every(row => row.every(x => x >= -1 && x <= 1) && row.reduce((a, b) => a + b, 0) === 0),
	},
	{
		id: 'protectSuccessRates',
		decode: (r, at) => [0, 1, 2, 3].map(i => u16(r, at + i * 2)),
		valid: (v: number[]) => v.every((x, i) => x > 0 && (i === 0 || x <= v[i - 1])),
	},
];

function findItemTable(rom: Buffer): { start: number, count: number } | null {
	const master = Buffer.concat([encodeText('MASTER BALL'), Buffer.from([0xff])]);
	const ultra = Buffer.concat([encodeText('ULTRA BALL'), Buffer.from([0xff])]);
	for (const hit of findAll(rom, master, 16)) {
		if (!hasBytes(rom, hit + 44, ultra)) continue;
		const start = hit - 44;
		let count = 2;
		while (count < 1200) {
			const text = decodeText(rom, start + count * 44, 14);
			if (text === null) break;
			count++;
		}
		return { start, count };
	}
	return null;
}

function findMoveTable(rom: Buffer): number {
	const pound = Buffer.from(signatures().poundRow);
	const chop = Buffer.from(signatures().karateChopRow);
	for (const hit of findAll(rom, pound, 4000)) {
		if (hasBytes(rom, hit + 12, chop)) return hit - 12;
	}
	return -1;
}

function analyse(rom: Buffer, baseInput: Buffer | null, options: Gen3MechanicsOptions, chartOnly: boolean): Analysis {
	const id = identify(rom);
	const engine: Gen3RawEngine = { kind: 'unknown', notes: [] };
	const probes: Gen3RawProbe[] = [];
	const raw: Gen3RawResult = {
		gameCode: id.code, revision: id.revision, baseKey: null, binarySimilarity: 0, engine, probes,
	};
	const out: Analysis = {
		raw, charts: [], itemRows: [], itemEffectChanges: [], itemsLive: false, itemTableOffset: -1, moveTableOffset: -1,
		stockLive: false, cfruChart: false, codeLocated: 0, codeTotal: 0,
	};
	let base: Buffer | null = null;
	let map: BaseMap | null = null;
	if (baseInput && baseInput.length >= 0x1c0000) {
		const baseKey = identify(baseInput).key;
		map = baseMapFor(baseKey);
		if (map) {
			base = baseInput;
			raw.baseKey = baseKey;
		}
	}
	if (!base) engine.notes.push('base ROM not available; differential probes skipped');
	const add = (probeId: string, status: RawStatus, baseValue: any, hackValue: any, extra?: Partial<Gen3RawProbe>) => {
		const entry: Gen3RawProbe = { id: probeId, status, base: baseValue, hack: hackValue, ...extra };
		probes.push(entry);
		return entry;
	};

	const isBase = !!base && base.equals(rom);
	const sim = base ? similarity(rom, base) : 0;
	const binary = sim >= 0.7 && !options.forceRebuilt;
	raw.binarySimilarity = Math.round(sim * 1000) / 1000;

	let repointed = 0;
	let tableLost = false;
	const cmdPtr: number[] = [];
	if (base && map && binary) {
		const table = follow(base, rom, map.cmdTable, 16);
		const tableAt = table.ok ? table.at : map.cmdTable;
		tableLost = !table.ok;
		if (tableAt !== map.cmdTable) engine.commandTable = hex(tableAt);
		for (let i = 0; i < map.cmdCount; i++) {
			const a = u32(base, map.cmdTable + i * 4);
			const b = u32(rom, tableAt + i * 4);
			cmdPtr.push(b);
			if (a !== b) repointed++;
		}
		engine.commandsRepointed = `${repointed}/${map.cmdCount}`;
	}
	const engineReplaced = !!map && binary && (tableLost || repointed >= map.cmdCount * 0.25);

	const rhhAt = rom.indexOf(Buffer.from('RHHEXP', 'latin1'));
	const ownTypeNames = options.typeNames === undefined || options.typeNames === null ?
		readTypeNames(rom) : Array.from(options.typeNames, name => (typeof name === 'string' && name ? name : '???'));
	const matrices = findMatrixCharts(rom);
	const uqMatrix = matrices.filter(m => m.shape.kind === 'uq').sort((a, b) => b.agree - a.agree)[0];
	const cfruMatrix = matrices.filter(m => m.shape.kind === 'cfru' && m.at > 0x700000)
		.sort((a, b) => b.agree - a.agree)[0];

	if (isBase) {
		engine.kind = 'vanilla';
	} else if (rhhAt >= 0 && rhhAt < 0x1000) {
		engine.kind = 'pokeemerald-expansion';
		engine.version = `${rom[rhhAt + 6]}.${rom[rhhAt + 7]}.${rom[rhhAt + 8]}`;
		engine.notes.push('RHH header at ' + hex(rhhAt));
	} else if (!binary && uqMatrix) {
		engine.kind = 'expansion-like (no RHH header)';
		engine.notes.push('rebuilt ROM with a fixed-point 2D type chart; battle engine is not the stock one');
	} else if (engineReplaced && cfruMatrix) {
		engine.kind = 'cfru';
		engine.notes.push('battle script command table mostly repointed and a CFRU-coded 2D type chart is present');
	} else if (engineReplaced) {
		engine.kind = 'replaced (unknown injected engine)';
	} else if (binary) {
		engine.kind = 'stock (binary hack)';
	} else {
		engine.kind = 'rebuilt (unknown)';
	}
	const isExpansion = engine.kind.includes('expansion');
	const stockLive = !engineReplaced && (binary || isBase);
	const signatureLive = !isExpansion;
	out.stockLive = stockLive;
	out.cfruChart = !!cfruMatrix;

	const runCode = !chartOnly || engine.kind === 'rebuilt (unknown)';
	for (const group of runCode ? CODE_GROUPS : []) {
		const baseHits = base ? groupHits(base, group) : [];
		const baseOk = !!base && baseHits.length >= group.ids.length &&
			(!!group.extraOk || baseHits.length === group.ids.length);
		const valid = (v: number) => (
			group.oneOf ? group.oneOf.includes(v) : v >= group.min! && v <= group.max!
		);
		const hackHits = binary ? [] : groupHits(rom, group);
		group.ids.forEach((probeId, i) => {
			out.codeTotal++;
			const expect = Array.isArray(group.expect) ? group.expect[i] : group.expect;
			const site = map ? map.sites[probeId] : undefined;
			if (base && (!baseOk || !site || baseHits[i].at + baseHits[i].pat.valueAt * 2 !== site.at)) {
				add(probeId, 'notfound', expect, null, { note: 'probe self-check failed on the base ROM' });
				return;
			}
			if (binary && base && map && site) {
				const hit = baseHits[i];
				if (!matchAt(rom, hit.pat, hit.at)) {
					add(probeId, 'unreadable', expect, null, {
						live: stockLive, method: 'differential', offset: site.at, note: 'code at the base offset was rewritten',
					});
					return;
				}
				const value = readValue(rom, hit.pat, hit.at);
				const notes: string[] = [];
				let live = stockLive;
				if (engineReplaced) notes.push('stock code present but the battle engine is replaced');
				if (!sameBytes(rom, base, site.fn, 8) && site.at - site.fn >= 8) {
					live = false;
					notes.push('function entry is hooked');
				}
				if (site.cmd >= 0 && cmdPtr[site.cmd] !== u32(base, map.cmdTable + site.cmd * 4)) {
					live = false;
					notes.push('script command ' + hex(site.cmd) + ' repointed to ' + hex(cmdPtr[site.cmd]));
				}
				let edited = 0;
				for (let p = site.fn; p < site.fn + site.size; p++) {
					if (rom[p] !== base[p] && (p < site.at || p > site.at + 1)) edited++;
				}
				if (edited && live) notes.push(`${edited} other bytes of the function differ from the base`);
				if (!valid(value)) {
					add(probeId, 'unreadable', expect, null, {
						live, method: 'differential', offset: site.at, note: `value ${value} fails the validator`,
					});
					return;
				}
				out.codeLocated++;
				add(probeId, value === expect ? 'same' : 'changed', expect, value, {
					live, method: 'differential', offset: site.at, note: notes.join('; ') || undefined,
				});
				return;
			}
			const okCount = hackHits.length === group.ids.length || (!!group.extraOk && hackHits.length > group.ids.length);
			if (!okCount) {
				add(probeId, 'notfound', expect, null, {
					method: 'signature', note: `${hackHits.length} signature hits, ${group.ids.length} expected`,
				});
				return;
			}
			const hit = hackHits[i];
			const value = readValue(rom, hit.pat, hit.at);
			if (!valid(value)) {
				add(probeId, 'unreadable', expect, null, { method: 'signature', offset: hit.at, note: 'value fails the validator' });
				return;
			}
			out.codeLocated++;
			add(probeId, value === expect ? 'same' : 'changed', expect, value, {
				live: signatureLive, method: 'signature', offset: hit.at + hit.pat.valueAt * 2,
				note: signatureLive ? undefined : 'stock-looking code found inside a replacement engine; not trusted',
			});
		});
	}

	for (const probe of chartOnly ? [] : DATA_PROBES) {
		if (!base) continue;
		const sig = Buffer.from(signatures().data[probe.id], 'hex');
		const baseHits = findAll(base, sig, 4);
		if (baseHits.length !== 1) {
			add(probe.id, 'notfound', null, null, {
				note: `probe self-check failed on the base ROM (${baseHits.length} hits)`,
			});
			continue;
		}
		const baseAt = baseHits[0];
		const baseValue = probe.decode(base, baseAt);
		if (binary) {
			const followed = follow(base, rom, baseAt, 512);
			const at = followed.at;
			const notes = followed.notes.slice();
			if (engineReplaced) notes.push('stock table present but the battle engine is replaced');
			if (!followed.ok) {
				add(probe.id, 'unreadable', baseValue, null, { live: stockLive, method: 'pointer-follow', note: notes.join('; ') });
				continue;
			}
			const value = probe.decode(rom, at);
			if (!probe.valid(value)) {
				add(probe.id, 'unreadable', baseValue, null, {
					live: stockLive, method: 'pointer-follow', offset: at, note: 'table fails the validator',
				});
				continue;
			}
			const same = JSON.stringify(value) === JSON.stringify(baseValue);
			add(probe.id, same ? 'same' : 'changed', baseValue, value, {
				live: stockLive, method: at === baseAt ? 'differential' : 'pointer-follow', offset: at, references: followed.slots,
				note: notes.join('; ') || undefined,
			});
			continue;
		}
		const hits = findAll(rom, sig, 8);
		if (hits.length >= 1) {
			add(probe.id, 'same', baseValue, baseValue, {
				live: signatureLive && (probe.id === 'statStageRatios' || probe.id === 'natureTable') ? true : undefined,
				method: 'signature', offset: hits[0],
				note: probe.id === 'critChance' || probe.id === 'accuracyStageRatios' || probe.id === 'protectSuccessRates' ?
					'stock bytes found; liveness unknown in a rebuilt ROM' : undefined,
			});
		} else {
			add(probe.id, 'notfound', baseValue, null, { method: 'signature' });
		}
	}

	const names = (ownTypeNames || VANILLA_TYPES).slice();
	if (base) {
		const baseSig = Buffer.from(signatures().typeChart, 'hex');
		const baseAt = base.indexOf(baseSig);
		const baseTable = baseAt >= 0 ? decodeTriples(base, baseAt, false) : null;
		if (!baseTable) {
			add('typeChart', 'notfound', null, null, { note: 'probe self-check failed on the base ROM' });
		} else if (binary) {
			const followed = follow(base, rom, baseAt, 512);
			const notes = followed.notes.slice();
			const at = followed.ok ? followed.at : -1;
			if (engineReplaced) notes.push('stock chart is not used: the battle engine is replaced');
			const table = at >= 0 ? decodeTriples(rom, at, false) : null;
			if (!table) {
				add('typeChart', 'unreadable', { entries: baseTable.main.length }, null, {
					live: stockLive, method: 'pointer-follow',
					note: at < 0 ? 'references point to several different tables' : 'table at ' + hex(at) + ' does not decode',
				});
			} else {
				const fairy = inferFairy(table, names);
				if (fairy !== null) {
					names[fairy] = 'Fairy';
					notes.push(`type id ${fairy} named Fairy from its matchups`);
				}
				const diff = tripleDiff(baseTable, table, names);
				const odd = diff.filter(d => ![0, 0.5, 1, 2].includes(d.multiplier) ||
					(d.multiplier === 0 && gen6Multiplier(d.attack, d.defend) !== 0 && gen6Multiplier(d.attack, d.defend) !== null));
				if (odd.length) {
					notes.push('unusual cells (non-standard multiplier or a new immunity between official types): ' +
						odd.map(d => `${d.attack}>${d.defend}=${d.multiplier}`).join(', '));
				}
				add('typeChart', diff.length ? 'changed' : 'same', { entries: baseTable.main.length + baseTable.foresight.length },
					{ entries: table.main.length + table.foresight.length, diff }, {
						live: stockLive, method: at === baseAt ? 'differential' : 'pointer-follow', offset: at, references: followed.slots,
						format: 'gen3-triples', note: notes.join('; ') || undefined,
					});
				out.charts.push(tripleChart('typeChart', table, names));
			}
		} else {
			const tables = scanTripleTables(rom);
			if (tables.length === 1) {
				const diff = tripleDiff(baseTable, tables[0].table, names);
				add('typeChart', diff.length ? 'changed' : 'same', { entries: baseTable.main.length + baseTable.foresight.length },
					{ entries: tables[0].table.main.length + tables[0].table.foresight.length, diff },
					{ live: signatureLive, method: 'structure-scan', offset: tables[0].at, format: 'gen3-triples' });
				out.charts.push(tripleChart('typeChart', tables[0].table, names));
			} else {
				add('typeChart', 'notfound', { entries: baseTable.main.length + baseTable.foresight.length }, null, {
					method: 'structure-scan', note: `${tables.length} triple tables found`,
				});
			}
		}
	}

	const matrixProbe = (cand: MatrixCand | undefined, canon: string[]) => {
		if (!cand) return;
		const useNames = ownTypeNames && ownTypeNames.length >= cand.n - cand.lead - 1 ? ownTypeNames : canon;
		const matrix = readMatrix(rom, cand, useNames);
		const real = matrix.typeList.filter(t => GEN6_ROWS[t]);
		const diff = chartDiff(matrix.lookup, real);
		const extraTypes = matrix.typeList.filter(t => !GEN6_ROWS[t] && t !== '???' && !/^Type\d+$/.test(t) && t !== 'Stellar');
		add('engine.typeChart', diff.length ? 'changed' : 'same', { reference: 'gen6+ chart' }, {
			types: matrix.typeList.length, hasFairy: matrix.typeList.includes('Fairy'), extraTypes, diff,
		}, {
			live: true, method: 'structure-scan', offset: cand.at,
			format: `${cand.shape.kind} ${cand.n}x${cand.n} width ${cand.shape.width}` +
				(cand.shape.unit ? ' unit ' + hex(cand.shape.unit) : '') + (cand.lead ? ' with a leading None row' : ''),
			note: `agreement with the official chart on the 17 old types: ${cand.agree}/${cand.total}` +
				(ownTypeNames ? '' : '; type names not found, canonical order assumed'),
		});
		const cells: MechanicsTypeMatchup[] = [];
		for (const attack of matrix.typeList) {
			for (const defend of matrix.typeList) {
				const multiplier = matrix.lookup(attack, defend);
				if (multiplier !== null && multiplier !== 1) cells.push({ attack, defend, multiplier });
			}
		}
		const romNames: string[] = [];
		for (let i = 0; i < cand.lead; i++) romNames.push('');
		out.charts.push({
			id: 'engine.typeChart', names: romNames.concat(matrix.typeList), cells, foresight: [], reference: 'gen6',
		});
	};
	const canonExpansion = VANILLA_TYPES.concat(['Fairy', 'Stellar']);
	const canonCfru = VANILLA_TYPES.concat(['Type18', 'Type19', 'Type20', 'Type21', 'Type22', 'Fairy']);
	const reference = [24, 8, 2, 1, 1];
	if (!isBase && isExpansion) {
		matrixProbe(uqMatrix, canonExpansion);
		if (!uqMatrix) add('engine.typeChart', 'notfound', null, null, { method: 'structure-scan' });
		if (!chartOnly) {
			const variants: [string, number[]][] = [
				['gen7', [24, 8, 2, 1, 1]], ['gen6', [16, 8, 2, 1, 1]], ['gen2to5', [16, 8, 4, 3, 2]],
			];
			const candidates: { key: string, hit: number }[] = [];
			for (const [key, bytes] of variants) {
				for (const hit of findAll(rom, Buffer.from(bytes), 2000)) candidates.push({ key, hit });
			}
			const targets = referencedTargets(rom, candidates.map(c => c.hit));
			const referenced = candidates.filter(c => targets.has(c.hit));
			const kinds = Array.from(new Set(referenced.map(r => r.key)));
			if (kinds.length === 1) {
				const value = variants.find(v => v[0] === kinds[0])![1];
				add('engine.critChance', kinds[0] === 'gen7' ? 'same' : 'changed', reference, value, {
					live: true, method: 'signature', offset: referenced[0].hit,
					note: 'u8 odds table referenced by code; compared with the Gen 7+ default',
				});
			} else {
				add('engine.critChance', kinds.length ? 'unreadable' : 'notfound', reference, null, {
					method: 'signature',
					note: kinds.length ? `several odds tables are referenced (${kinds.join(', ')}); the choice is made in code` :
					'no referenced odds table (newer expansion builds fold the configuration into code)',
				});
			}
		}
	}
	if (engine.kind === 'cfru' && cfruMatrix) {
		matrixProbe(cfruMatrix, canonCfru);
		if (!chartOnly) {
			const before = cfruMatrix.at - 10;
			const crit = [0, 1, 2, 3, 4].map(i => u16(rom, before + i * 2));
			const ok = crit.every((x, i) => x >= 1 && x <= 64 && (i === 0 || x <= crit[i - 1])) && crit[0] >= 8;
			if (ok) {
				add('engine.critChance', JSON.stringify(crit) === '[24,8,2,1,1]' ? 'same' : 'changed', reference, crit, {
					live: true, method: 'structure', offset: before, note: 'u16 table stored directly before the CFRU type chart',
				});
			} else {
				add('engine.critChance', 'notfound', reference, null, { method: 'structure' });
			}
		}
	}

	if (!chartOnly && base) {
		itemProbe(rom, base, binary, stockLive, add, out);
		moveProbe(rom, base, binary, add, out);
	}
	return out;
}

type AddProbe = (id: string, status: RawStatus, base: any, hack: any, extra?: Partial<Gen3RawProbe>) => Gen3RawProbe;

function itemProbe(rom: Buffer, base: Buffer, binary: boolean, stockLive: boolean, add: AddProbe, out: Analysis) {
	const baseTable = findItemTable(base);
	let table = findItemTable(rom);
	if (baseTable && binary) {
		const followed = follow(base, rom, baseTable.start, 512);
		table = null;
		if (followed.ok) {
			let count = 1;
			while (count < 1200 && decodeText(rom, followed.at + count * 44, 14) !== null) count++;
			if (count >= 100) table = { start: followed.at, count };
		}
	}
	if (!baseTable) {
		add('itemHoldEffectParams', 'notfound', null, null, { note: 'probe self-check failed on the base ROM' });
		return;
	}
	if (!table) {
		add('itemHoldEffectParams', 'notfound', { items: baseTable.count }, null, {
			method: 'signature', note: 'no 44-byte item table (expansion-style item structs are not read by this probe)',
		});
		return;
	}
	const changed: { index: number, name: string, holdEffect: number, reference: number, param: number }[] = [];
	let effectChanges = 0;
	const limit = Math.min(baseTable.count, table.count);
	const rowLimit = binary ? baseTable.count : limit;
	for (let i = 1; i < rowLimit; i++) {
		const a = baseTable.start + i * 44;
		const b = table.start + i * 44;
		const baseName = decodeText(base, a, 14);
		const name = decodeText(rom, b, 14);
		if (baseName === null || name === null) continue;
		const sameName = baseName.toLowerCase() === name.toLowerCase();
		const row: ItemRow = {
			index: i, name, holdEffect: rom[b + 18], param: rom[b + 19], baseParam: base[a + 19], baseEffect: base[a + 18],
		};
		if (base[a + 18] !== rom[b + 18]) {
			if (sameName) {
				if (i < limit) effectChanges++;
				out.itemEffectChanges.push(row);
			}
			continue;
		}
		if (sameName && base[a + 18] !== 0) out.itemRows.push(row);
		if (i < limit && base[a + 19] !== rom[b + 19] && base[a + 18] !== 0 && sameName) {
			changed.push({ index: i, name, holdEffect: rom[b + 18], reference: base[a + 19], param: rom[b + 19] });
		}
	}
	const live = stockLive || !binary ? stockLive || undefined : false;
	out.itemsLive = live === true;
	out.itemTableOffset = table.start;
	add('itemHoldEffectParams', changed.length ? 'changed' : 'same', { items: baseTable.count },
		{ items: table.count, changed, sameNameDifferentEffect: effectChanges },
		{ live, method: binary ? 'differential' : 'signature', offset: table.start });
}

function moveProbe(rom: Buffer, base: Buffer, binary: boolean, add: AddProbe, out: Analysis) {
	const baseAt = findMoveTable(base);
	let at = findMoveTable(rom);
	if (baseAt >= 0 && binary) {
		const followed = follow(base, rom, baseAt, 512);
		at = followed.ok ? followed.at : -1;
	}
	if (baseAt < 0) {
		add('moveSecondaryChance', 'notfound', null, null, { note: 'probe self-check failed on the base ROM' });
		return;
	}
	if (at < 0) {
		add('moveSecondaryChance', 'notfound', { moves: 354 }, null, { method: 'signature', note: 'no stock 12-byte move table' });
		return;
	}
	const changed: { index: number, effect: number, reference: number, chance: number }[] = [];
	let effectChanged = 0;
	for (let i = 1; i <= 354; i++) {
		const a = baseAt + i * 12;
		const b = at + i * 12;
		if (base[a] !== rom[b]) {
			effectChanged++;
			continue;
		}
		if (base[a + 5] !== rom[b + 5]) changed.push({ index: i, effect: rom[b], reference: base[a + 5], chance: rom[b + 5] });
	}
	out.moveTableOffset = at;
	add('moveSecondaryChance', changed.length ? 'changed' : 'same', { moves: 354 },
		{ changed, effectIdChanged: effectChanged },
		{
			live: true, method: binary ? 'differential' : 'signature', offset: at,
			note: 'compared by move index; byte 5 of the 12-byte struct',
		});
}

function gcd(a: number, b: number): number {
	while (b) {
		const t = a % b;
		a = b;
		b = t;
	}
	return a;
}

function setLeaf(target: { [k: string]: any }, path: string, value: any) {
	const parts = path.split('.');
	let node = target;
	for (let i = 0; i < parts.length - 1; i++) {
		if (!Object.prototype.hasOwnProperty.call(node, parts[i])) node[parts[i]] = {};
		node = node[parts[i]];
	}
	node[parts[parts.length - 1]] = value;
}

function usableType(name: string): boolean {
	return !!name && name !== '???' && !/^Type\d+$/.test(name) && !/^stell/i.test(name);
}

function chartOutput(chart: ChartRead) {
	const typeChart: MechanicsTypeMatchup[] = [];
	const unsupported: MechanicsTypeMatchup[] = [];
	let skipped = 0;
	for (const cell of chart.cells) {
		if (/^stell/i.test(cell.attack) || /^stell/i.test(cell.defend)) continue;
		if (!usableType(cell.attack) || !usableType(cell.defend)) {
			skipped++;
			continue;
		}
		if (cell.multiplier === 0 || cell.multiplier === 0.5 || cell.multiplier === 2) typeChart.push(cell);
		else unsupported.push(cell);
	}
	const info: MechanicsTypeChartInfo = {
		typeNames: chart.names.map(name => (usableType(name) ? name : '')),
		reference: chart.reference,
	};
	const foresight = chart.foresight.filter(cell => usableType(cell.attack) && usableType(cell.defend));
	if (foresight.length) info.foresightIgnored = foresight;
	if (unsupported.length) info.unsupported = unsupported;
	return { typeChart, info, skipped };
}

function engineVerdict(analysis: Analysis): MechanicsReaderResult['engine'] {
	const raw = analysis.raw;
	const kind = raw.engine.kind;
	const game = GAME_NAMES[raw.gameCode] || (raw.baseKey ? GAME_NAMES[raw.baseKey.slice(0, 4)] : '') || 'Generation 3';
	const commands = raw.engine.commandsRepointed ?
		', ' + raw.engine.commandsRepointed.replace('/', ' of ') + ' battle commands repointed' : '';
	if (kind === 'vanilla') {
		return { kind: 'stock', live: true, detail: 'Unmodified ' + game + ' battle engine.' };
	}
	if (kind === 'stock (binary hack)') {
		return { kind: 'stock', live: true, detail: game + ' binary hack' + commands + '.' };
	}
	if (kind === 'cfru') {
		return { kind: 'cfru', live: false, detail: game + ' binary hack with the CFRU battle engine' + commands + '.' };
	}
	if (kind === 'pokeemerald-expansion') {
		return { kind: 'expansion', live: false, detail: `pokeemerald-expansion ${raw.engine.version || ''} battle engine.` };
	}
	if (kind.startsWith('expansion-like')) {
		return { kind: 'expansion', live: false, detail: 'Rebuilt ROM with an expansion-style battle engine.' };
	}
	if (kind.startsWith('replaced')) {
		return { kind: 'rewritten', live: false, detail: game + ' binary hack with a replaced battle engine' + commands + '.' };
	}
	if (analysis.cfruChart) {
		return {
			kind: 'rewritten', live: false,
			detail: 'Rebuilt ROM with a CFRU-style type chart; its battle engine is not the stock one.',
		};
	}
	const sameGame = !!raw.baseKey && raw.baseKey.slice(0, 4) === raw.gameCode;
	if (sameGame && analysis.codeTotal > 0 && analysis.codeLocated >= analysis.codeTotal * 0.6) {
		return {
			kind: 'stock', live: true,
			detail: `Rebuilt ROM with the stock battle code (${analysis.codeLocated} of ${analysis.codeTotal} code sites located).`,
		};
	}
	return { kind: 'unknown', live: false, detail: 'No known Generation 3 battle engine was recognised.' };
}

function chartStatus(probe: Gen3RawProbe | undefined, engineKind: string, isEngineChart: boolean): MechanicsStatus {
	if (!probe) return 'notfound';
	if (probe.status === 'notfound') return 'notfound';
	const gateOpen = isEngineChart ? engineKind === 'cfru' || engineKind === 'expansion' : engineKind === 'stock';
	if (!gateOpen) return 'dead';
	if (probe.status === 'unreadable') return 'unreadable';
	return probe.live === true ? probe.status : 'dead';
}

function emptyResult(detail: string): Gen3MechanicsResult {
	return {
		engine: { kind: 'unknown', live: false, detail }, values: {}, report: [], notes: [],
		moveChances: [], moveTableOffset: -1, itemParams: [], itemParamsLive: false, itemTableOffset: -1,
	};
}

function itemLeaf(effect: number): { key: string, convert: (param: number) => any } | null {
	if (effect === 1) return { key: 'healFlat', convert: p => (p >= 1 ? p : undefined) };
	if (CONFUSE_BERRY_EFFECTS.includes(effect) || effect === 62) {
		return { key: 'healFraction', convert: p => (p >= 1 ? [1, p] : undefined) };
	}
	if (effect === 22) return { key: 'accuracyMod', convert: p => (p <= 100 ? (100 - p) / 100 : undefined) };
	if (effect === 26 || effect === 30 || effect === 39) {
		return { key: 'chance', convert: p => (p <= 100 ? [p, 100] : undefined) };
	}
	if (TYPE_POWER_EFFECTS.includes(effect)) return { key: 'powerBoost', convert: p => (100 + p) / 100 };
	return null;
}

function convert(analysis: Analysis, options: Gen3MechanicsOptions): Gen3MechanicsResult {
	const raw = analysis.raw;
	const engine = engineVerdict(analysis);
	const values: { [k: string]: any } = {};
	const report: MechanicsReportEntry[] = [];
	const notes: string[] = [];
	const byId = new Map<string, Gen3RawProbe>();
	for (const probe of raw.probes) byId.set(probe.id, probe);
	const stock = engine.kind === 'stock';

	const part = (id: string): { status: MechanicsStatus, base: any, hack: any } => {
		const probe = byId.get(id);
		if (!probe) return { status: 'notfound', base: undefined, hack: undefined };
		if (probe.status === 'notfound') return { status: 'notfound', base: probe.base, hack: undefined };
		if (!stock) return { status: 'dead', base: probe.base, hack: undefined };
		if (probe.status === 'unreadable') return { status: 'unreadable', base: probe.base, hack: undefined };
		if (probe.live !== true) return { status: 'dead', base: probe.base, hack: undefined };
		return { status: probe.status, base: probe.base, hack: probe.hack };
	};
	const entry = (id: string, status: MechanicsStatus, base: any, hack: any) => {
		const item: MechanicsReportEntry = { id, status };
		if (base !== undefined && base !== null) item.base = base;
		if (hack !== undefined && hack !== null && (status === 'same' || status === 'changed')) item.hack = hack;
		report.push(item);
	};
	const leaf = (paths: string[], ids: string[], compute: (v: any[]) => any) => {
		const parts = ids.map(part);
		const has = (status: MechanicsStatus) => parts.some(p => p.status === status);
		let status: MechanicsStatus = has('unreadable') ? 'unreadable' : has('dead') ? 'dead' : has('notfound') ? 'notfound' :
			has('changed') ? 'changed' : 'same';
		const baseKnown = parts.every(p => p.base !== undefined && p.base !== null);
		const baseValue = baseKnown ? compute(parts.map(p => p.base)) : undefined;
		let hackValue: any;
		if (status === 'same' || status === 'changed') {
			hackValue = compute(parts.map(p => p.hack));
			if (hackValue === undefined) status = 'unreadable';
		}
		for (const path of paths) {
			entry(path, status, baseValue, hackValue);
			if (status === 'same' || status === 'changed') setLeaf(values, path, hackValue);
		}
	};
	const one = (path: string, id: string, compute: (v: any) => any) => leaf([path], [id], v => compute(v[0]));
	const plain = (v: number) => v;
	const shift = (v: number): Fraction => [1, 2 ** v];
	const agree = (compute: (v: number) => any) => (v: any[]) => (v[0] === v[1] ? compute(v[0]) : undefined);

	one('weatherTurns.rain', 'weatherTurns.rain', plain);
	one('weatherTurns.sun', 'weatherTurns.sun', plain);
	one('weatherTurns.sand', 'weatherTurns.sandstorm', plain);
	one('weatherTurns.hail', 'weatherTurns.hail', plain);
	for (const screen of ['reflect', 'lightscreen', 'mist', 'safeguard']) {
		one('screenTurns.' + screen, 'screenTurns.' + screen, plain);
	}
	one('critMultiplier', 'critMultiplier', plain);
	leaf(['stab'], ['stabDivisor.battle', 'stabDivisor.preview'], agree(v => 15 / v));
	one('critChances', 'critChance', (v: number[]) => v.map((n): Fraction => [1, n]));
	leaf(['sleepTurns'], ['sleepCounter.add', 'sleepCounter.mask'], v => [v[0] - 1, v[0] + v[1] - 1]);
	leaf(['confusionTurns'], ['confusionCounter.add', 'confusionCounter.mask'], v => [v[0] - 1, v[0] + (v[1] >> 6) - 1]);
	leaf(['multiHit'], ['multiHit.mask', 'multiHit.rerollAbove', 'multiHit.add'], v => {
		const mask: number = v[0];
		const above: number = v[1];
		const plus: number = v[2];
		const weights = [0, 0, 0, 0];
		let valid = true;
		const bump = (hits: number, weight: number) => {
			if (hits < 2 || hits > 5) valid = false;
			else weights[hits - 2] += weight;
		};
		for (let first = 0; first <= mask; first++) {
			if (first > above) {
				for (let second = 0; second <= mask; second++) bump(second + plus, 1);
			} else {
				bump(first + plus, mask + 1);
			}
		}
		if (!valid) return undefined;
		const divisor = weights.reduce(gcd, 0) || 1;
		return weights.map(w => w / divisor);
	});
	one('thawChance', 'freezeThawModulus', v => [1, v]);
	one('abilities.shedskin.chance', 'shedSkinModulus', v => [1, v]);
	one('fullParalysisChance', 'fullParalysisMask', v => [1, (v >> 6) + 1]);
	one('confusionSelfHitChance', 'confusionSelfHitMask', v => [1, v + 1]);
	one('attractChance', 'infatuationMask', v => [1, v + 1]);
	one('ingrainHeal', 'residualShift.ingrain', shift);
	one('leechSeedDamage', 'residualShift.leechSeed', shift);
	one('poisonDamage', 'residualShift.poison', shift);
	one('toxicStep', 'residualShift.toxic', shift);
	one('burnDamage', 'residualShift.burn', shift);
	one('nightmareDamage', 'residualShift.nightmare', shift);
	one('curseDamage', 'residualShift.curse', shift);
	one('bindDamage', 'residualShift.wrap', shift);
	one('abilities.raindish.healFraction', 'residualShift.rainDish', shift);
	leaf(
		['abilities.waterabsorb.healFraction', 'abilities.voltabsorb.healFraction'], ['residualShift.absorbAbility'],
		v => shift(v[0])
	);
	one('abilities.roughskin.damageFraction', 'residualShift.roughSkin', shift);
	one('items.leftovers.healFraction', 'residualShift.leftovers', shift);
	one('healMoveFraction', 'hpShift.recover', shift);
	one('superFangFraction', 'hpShift.superFang', shift);
	one('sandDamage', 'residualShift.sandstorm', shift);
	one('hailDamage', 'residualShift.hail', shift);
	one('curseCost', 'hpShift.curseCost', shift);
	one('presentHeal', 'hpShift.presentHeal', shift);
	one('bellyDrumCost', 'hpShift.bellyDrum', shift);
	one('wishHeal', 'hpShift.wish', shift);
	leaf(['paralysisSpeed'], ['paralysisSpeedShift.first', 'paralysisSpeedShift.second'], agree(v => 1 / 2 ** v));
	leaf(
		['damageRoll'], ['damageRollMask.normal', 'damageRollMask.normal2'],
		agree(v => ({ min: 100 - v, max: 100, den: 100 }))
	);
	one('tauntTurns', 'tauntTurns', v => [v, v]);
	one('disableTurns', 'disableTurns.add', v => [v, v + 3]);
	one('encoreTurns', 'encoreTurns.add', v => [v, v + 3]);
	one('trapTurns', 'wrapCounter.add', v => [v, v + 3]);
	one('uproarTurns', 'uproarCounter.add', v => [v, v + 3]);
	one('statStages', 'statStageRatios', (v: number[][]) => v.map(p => [p[0], p[1]]));
	one('accuracyStages', 'accuracyStageRatios', (v: number[][]) => v.map(p => [p[0], p[1]]));
	one('protectRates', 'protectSuccessRates', (v: number[]) => v.map(n => [n, 65535]));

	const natures = part('natureTable');
	const natureRow = (row: number[]) => {
		const plus = row.filter(x => x === 1).length;
		const minus = row.filter(x => x === -1).length;
		if (!plus && !minus) return {};
		if (plus !== 1 || minus !== 1) return undefined;
		return { plus: NATURE_STATS[row.indexOf(1)], minus: NATURE_STATS[row.indexOf(-1)] };
	};
	if (natures.status === 'changed') {
		for (let i = 0; i < NATURE_IDS.length; i++) {
			const baseRow: number[] = natures.base[i];
			const hackRow: number[] = natures.hack[i];
			if (baseRow.join() === hackRow.join()) continue;
			const value = natureRow(hackRow);
			const path = 'natures.' + NATURE_IDS[i];
			entry(path, value === undefined ? 'unreadable' : 'changed', natureRow(baseRow), value);
			if (value !== undefined) setLeaf(values, path, value);
		}
	}
	if (natures.status === 'unreadable') notes.push('The nature table was changed by the hack but could not be read.');
	if (byId.has('natureTable')) entry('info.natureTable', natures.status, undefined, undefined);
	if (byId.has('damageRollMask.unused')) {
		const unused = part('damageRollMask.unused');
		entry('info.damageRollMask.unused', unused.status, unused.base, unused.hack);
	}

	const itemParams: Gen3ItemParam[] = [];
	const itemNames = Array.isArray(options.itemNames) ? options.itemNames : [];
	const itemId = (row: ItemRow) => {
		const given = itemNames[row.index];
		return toID(typeof given === 'string' && given ? given : row.name);
	};
	const items = part('itemHoldEffectParams');
	const itemsLive = stock && analysis.itemsLive;
	const seenItems = new Set<string>(['leftovers']);
	for (const row of analysis.itemRows) {
		const id = itemId(row);
		const mapping = itemLeaf(row.holdEffect);
		const changed = row.param !== row.baseParam;
		const path = mapping && id ? 'items.' + id + '.' + mapping.key : null;
		if (changed) {
			itemParams.push({
				index: row.index, name: row.name, id, holdEffect: row.holdEffect, param: row.param, baseParam: row.baseParam,
				leaf: path,
			});
		}
		if (!mapping || !path || !itemsLive || seenItems.has(id)) continue;
		seenItems.add(id);
		const baseValue = mapping.convert(row.baseParam);
		let value = mapping.convert(row.param);
		if (changed && row.holdEffect === 1 && id === 'sitrusberry') value = undefined;
		if (value === undefined) {
			entry(path, 'unreadable', baseValue, undefined);
			continue;
		}
		entry(path, changed ? 'changed' : 'same', baseValue, value);
		setLeaf(values, path, value);
	}
	if (itemsLive) {
		for (const row of analysis.itemEffectChanges) {
			const id = itemId(row);
			if (!id || seenItems.has(id)) continue;
			if (!itemLeaf(row.holdEffect) && !itemLeaf(row.baseEffect)) continue;
			seenItems.add(id);
			entry('items.' + id, 'unreadable', undefined, undefined);
		}
	}
	if (byId.has('itemHoldEffectParams')) {
		entry('info.itemHoldEffectParams', items.status === 'same' && itemParams.length ? 'changed' : items.status, undefined, itemParams.length);
	}

	const moveChances: Gen3MoveChance[] = [];
	const moves = byId.get('moveSecondaryChance');
	if (moves) {
		if (moves.status === 'changed') {
			for (const row of moves.hack.changed) {
				moveChances.push({ index: row.index, effect: row.effect, chance: row.chance, baseChance: row.reference });
			}
		}
		entry('info.moveSecondaryChance', moves.status, undefined, moves.hack ? moves.hack.changed.length : undefined);
	}

	const critProbe = byId.get('engine.critChance');
	if (critProbe) {
		const toFractions = (v: number[]) => v.map((n): Fraction => [1, n]);
		const live = (engine.kind === 'cfru' || engine.kind === 'expansion') && critProbe.live === true;
		let status: MechanicsStatus = critProbe.status;
		if ((status === 'same' || status === 'changed') && !live) status = 'dead';
		const value = status === 'same' || status === 'changed' ? toFractions(critProbe.hack) : undefined;
		entry('engine.critChances', status, toFractions(critProbe.base), value);
		if (value) values.critChances = value;
	}

	const result: Gen3MechanicsResult = {
		engine, values: values as RomHackMechanics, report, notes,
		moveChances, moveTableOffset: analysis.moveTableOffset,
		itemParams, itemParamsLive: itemsLive, itemTableOffset: analysis.itemTableOffset,
	};

	for (const chartId of ['typeChart', 'engine.typeChart'] as const) {
		const probe = byId.get(chartId);
		if (!probe) continue;
		const status = chartStatus(probe, engine.kind, chartId === 'engine.typeChart');
		const chart = analysis.charts.find(c => c.id === chartId);
		const readable = (status === 'same' || status === 'changed') && !!chart;
		const located = status === 'same' || status === 'changed';
		entry(chartId, located && !chart ? 'notfound' : status, undefined, readable ? probe.hack?.diff : undefined);
		if (!readable || !chart) continue;
		const output = chartOutput(chart);
		result.typeChart = output.typeChart;
		result.typeChartInfo = output.info;
		for (const text of chartNotes(probe, output.skipped)) notes.push(text);
	}

	if (engine.kind === 'cfru') {
		notes.push('This hack runs the CFRU battle engine; only its type chart and critical-hit odds table could be read.');
	} else if (engine.kind === 'expansion') {
		notes.push('This hack runs a pokeemerald-expansion battle engine; only its type chart and critical-hit odds table could be read.');
	}
	if (!stock && engine.kind !== 'cfru' && engine.kind !== 'expansion') {
		result.values = {};
		delete result.typeChart;
		delete result.typeChartInfo;
	}
	return result;
}

function chartNotes(probe: Gen3RawProbe, skipped: number): string[] {
	const notes: string[] = [];
	const text = probe.note || '';
	const fairy = /type id (\d+) named Fairy/.exec(text);
	if (fairy) {
		notes.push(
			`One type of this hack has no name in the game's data (type number ${fairy[1]}); ` +
			`it is treated as Fairy because its matchups are Fairy's.`
		);
	}
	const diff: Gen3ChartDiff[] = probe.hack?.diff || [];
	const immunities = diff.filter(d => d.multiplier === 0 && gen6Multiplier(d.attack, d.defend) !== 0 &&
		gen6Multiplier(d.attack, d.defend) !== null);
	if (immunities.length) {
		notes.push('The type chart has an immunity the official games do not have: ' +
			immunities.map(d => d.attack + ' against ' + d.defend).join(', ') + '.');
	}
	if (skipped) notes.push(`Type chart entries that use a type without a readable name were left out (${skipped}).`);
	return notes;
}

function tooSmall(rom: Buffer): boolean {
	return !Buffer.isBuffer(rom) || rom.length < 0x200 || rom.length > MAX_ROM;
}

export function readGen3MechanicsRaw(
	rom: Buffer, base: Buffer | null, options: Gen3MechanicsOptions = {}
): Gen3RawResult {
	requireSignatures();
	return analyse(rom, base, options, false).raw;
}

export function readGen3Mechanics(
	rom: Buffer, base: Buffer | null, options: Gen3MechanicsOptions = {}
): Gen3MechanicsResult {
	requireSignatures();
	try {
		if (tooSmall(rom)) return emptyResult('The file is not a Game Boy Advance ROM.');
		return convert(analyse(rom, Buffer.isBuffer(base) ? base : null, options || {}, false), options || {});
	} catch {
		return emptyResult('The battle engine could not be analysed.');
	}
}

export function readGen3TypeChart(rom: Buffer, base: Buffer | null, typeNames?: string[] | null): Gen3TypeChartResult {
	requireSignatures();
	const failed: Gen3TypeChartResult = {
		id: 'typeChart', status: 'notfound', live: false, engineKind: 'unknown', format: '', offset: -1, diff: [], notes: [],
	};
	try {
		if (tooSmall(rom)) return failed;
		const options: Gen3MechanicsOptions = { typeNames: typeNames || null };
		const analysis = analyse(rom, Buffer.isBuffer(base) ? base : null, options, true);
		const engine = engineVerdict(analysis);
		failed.engineKind = engine.kind;
		const engineChart = engine.kind === 'cfru' || engine.kind === 'expansion';
		const id = engineChart ? 'engine.typeChart' : 'typeChart';
		const probe = analysis.raw.probes.find(p => p.id === id);
		failed.id = id;
		if (!probe) return failed;
		const status = chartStatus(probe, engine.kind, engineChart);
		const chart = analysis.charts.find(c => c.id === id);
		const out: Gen3TypeChartResult = {
			id, status, live: (status === 'same' || status === 'changed') && !!chart, engineKind: engine.kind,
			format: probe.format || '', offset: probe.offset === undefined ? -1 : probe.offset,
			diff: probe.hack?.diff || [], notes: [],
		};
		if (!out.live || !chart) {
			if (out.status === 'same' || out.status === 'changed') out.status = 'notfound';
			return out;
		}
		const output = chartOutput(chart);
		out.typeChart = output.typeChart;
		out.typeChartInfo = output.info;
		out.notes = chartNotes(probe, output.skipped);
		return out;
	} catch {
		return failed;
	}
}
