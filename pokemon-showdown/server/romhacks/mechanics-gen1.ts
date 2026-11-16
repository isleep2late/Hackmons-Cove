import * as crypto from 'crypto';
import { requireSignatures, signatureSection } from './signatures';

export type Gen1Fraction = [number, number];
export type Gen1Range = [number, number];
export type Gen1Status = 'same' | 'changed' | 'unreadable' | 'notfound' | 'dead';

export interface Gen1ReportEntry {
	id: string;
	status: Gen1Status;
	base?: any;
	hack?: any;
}

export interface Gen1TypeMatchup { attack: string; defend: string; multiplier: number }

export type Gen1Category = { basis: 'type', specialTypes: string[] } | { basis: 'move', specialMoves: string[] };

export interface Gen1Mechanics {
	stab?: number;
	damageRoll?: { min: number, max: number, den: number };
	damageLevelDivisor?: number;
	statStages?: Gen1Fraction[];
	accuracyStages?: Gen1Fraction[];
	multiHit?: [number, number, number, number];
	sleepTurns?: Gen1Range;
	restSleepTurns?: number;
	confusionTurns?: Gen1Range;
	confusionSelfHitChance?: Gen1Fraction;
	confusionSelfHitPower?: number;
	fullParalysisChance?: Gen1Fraction;
	paralysisSpeed?: number;
	burnAttack?: number;
	burnDamage?: Gen1Fraction;
	poisonDamage?: Gen1Fraction;
	toxicStep?: Gen1Fraction;
	leechSeedDamage?: Gen1Fraction;
	disableTurns?: Gen1Range;
	thrashTurns?: Gen1Range;
	bideTurns?: Gen1Range;
	healMoveFraction?: Gen1Fraction;
	recoilFractions?: { quarter?: Gen1Fraction };
	struggleRecoil?: Gen1Fraction;
	substituteCost?: Gen1Fraction;
	superFangFraction?: Gen1Fraction;
	sonicBoomDamage?: number;
	dragonRageDamage?: number;
	highCritMoves?: string[];
	gen1Crit?: { normal?: number, high?: number, focusEnergy?: number, focusEnergyHigh?: number, cap?: 255 | 256 };
	miss1in256?: boolean;
	healFailsAtGap255?: boolean;
	invulnerabilityGlitch?: boolean;
	category?: Gen1Category;
	trapHits?: [number, number, number, number];
}

export interface Gen1Probe {
	id: string;
	status: Gen1Status;
	base?: any;
	hack?: any;
	raw?: any;
	at?: number;
	how?: string;
	note?: string;
	length?: number;
	tableAt?: number;
	detail?: any;
}

export interface Gen1SideEffect {
	probe: string;
	effectIds: number[];
	status: Gen1Status;
	base: number;
	hack?: number;
	secondaryChance?: number;
}

export interface Gen1CritFit { mismatches: number; maxDifference: number; lastSpeed: number }

export interface Gen1Conditional {
	leaf: string;
	ramAddress: number;
	whenZero: number | boolean;
	otherwise: number | boolean;
}

export type Gen1CategoryIds =
	{ basis: 'type', specialFromTypeId: number | null, specialTypeIds: number[] } |
	{ basis: 'move', specialMoveIds: number[] };

export interface Gen1Extras {
	layout: string | null;
	closestBase: string | null;
	offsetMatchRate: number;
	counts: { same: number, changed: number, unreadable: number, notfound: number };
	probes: Gen1Probe[];
	typeChartRaw: [number, number, number][] | null;
	typeChartUnnamedRows: number;
	highCritMoveIds: number[] | null;
	category: Gen1CategoryIds | null;
	critFormula: { [key: string]: { rule: Gen1CritFit, stock: Gen1CritFit } } | null;
	sideEffects: Gen1SideEffect[];
	priority: { firstMoveId: number, lastMoveId: number } | null;
	conditional: Gen1Conditional[];
	rewrittenRoutines: string[];
}

export interface Gen1MechanicsResult {
	engine: { kind: 'stock' | 'cfru' | 'expansion' | 'rewritten' | 'unknown', live: boolean, detail: string };
	values: Gen1Mechanics;
	report: Gen1ReportEntry[];
	typeChart?: Gen1TypeMatchup[];
	typeChartInfo?: {
		typeNames: string[],
		unsupported?: Gen1TypeMatchup[],
		reference: 'base' | 'gen6',
	};
	notes: string[];
	extras: Gen1Extras;
}

export interface Gen1Names {
	typeName?: (id: number) => string;
	moveId?: (id: number) => string;
}

interface Sig { pat: string; lead: number; count?: number; nth?: number }
interface BaseProbe {
	off?: number;
	full?: Sig;
	pre?: Sig;
	post?: Sig;
	value?: unknown;
	count?: number;
	anchor?: string;
	leads?: number[];
	loose?: string;
	exact?: string;
	imm?: [number, number][];
}
interface BaseTable { name: string; title: string; probes: { [id: string]: BaseProbe } }
interface ProbeDef {
	id: string;
	kind: 'imm' | 'run' | 'table' | 'present' | 'block' | 'code' | 'model';
	runRe?: string;
	countRe?: string;
	after?: string;
	decode?: 'list8' | 'pairs13' | 'triples';
	valid?: 'moveList' | 'statTable' | 'typeChart' | { in?: number[], range?: [number, number] };
	group?: string;
	requires?: string;
}

const DEFS: ProbeDef[] = [
	{ id: 'critEntry', kind: 'present' },
	{ id: 'accuracyEntry', kind: 'present' },
	{ id: 'damageVarsEntryPlayer', kind: 'present' },
	{ id: 'damageVarsEntryEnemy', kind: 'present' },
	{ id: 'critHighMoves', kind: 'table', decode: 'list8', valid: 'moveList' },
	{ id: 'critDoublesLevel', kind: 'present' },
	{ id: 'damageRollMin', kind: 'imm', valid: { range: [128, 255] } },
	{
		id: 'stabShift', kind: 'run', runRe: '^(srl b|rr c)$', countRe: '^rr c$', after: '^add hl, bc$',
		valid: { range: [1, 3] },
	},
	{ id: 'typeEffectDivisor', kind: 'imm', valid: { in: [10] } },
	{ id: 'typeChart', kind: 'table', decode: 'triples', valid: 'typeChart' },
	{ id: 'specialTypeMin', kind: 'imm', valid: { range: [1, 64] }, group: 'specialTypeMin' },
	{ id: 'specialTypeMinEnemy', kind: 'imm', valid: { range: [1, 64] }, group: 'specialTypeMin' },
	{ id: 'statStagesAccuracy', kind: 'table', decode: 'pairs13', valid: 'statTable', group: 'statStages' },
	{ id: 'statStages', kind: 'table', decode: 'pairs13', valid: 'statTable', group: 'statStages' },
	{ id: 'sleepTurnsMask', kind: 'imm', valid: { in: [1, 3, 7] } },
	{ id: 'restSleepTurns', kind: 'imm', valid: { range: [1, 7] } },
	{ id: 'confusionTurnsMask', kind: 'imm', valid: { in: [0, 1, 3, 7] } },
	{
		id: 'confusionTurnsAdd', kind: 'run', runRe: '^inc a$', countRe: '^inc a$', after: '^ld \\[bc\\], a$',
		valid: { range: [0, 4] },
	},
	{ id: 'confusionSelfHitThreshold', kind: 'imm', valid: { range: [1, 255] }, group: 'confusionSelfHitThreshold' },
	{
		id: 'confusionSelfHitThresholdEnemy', kind: 'imm', valid: { range: [1, 255] },
		group: 'confusionSelfHitThreshold',
	},
	{ id: 'confusionSelfHitPower', kind: 'imm', valid: { range: [1, 250] } },
	{ id: 'fullParalysisThreshold', kind: 'imm', valid: { range: [1, 255] }, group: 'fullParalysisThreshold' },
	{ id: 'fullParalysisThresholdEnemy', kind: 'imm', valid: { range: [1, 255] }, group: 'fullParalysisThreshold' },
	{
		id: 'paralysisSpeedShift', kind: 'run', runRe: '^(srl a|rr b)$', countRe: '^rr b$', after: '^ld \\[hli\\], a$',
		valid: { range: [1, 3] }, group: 'paralysisSpeedShift',
	},
	{
		id: 'paralysisSpeedShiftPlayer', kind: 'run', runRe: '^(srl a|rr b)$', countRe: '^rr b$',
		after: '^ld \\[hli\\], a$', valid: { range: [1, 3] }, group: 'paralysisSpeedShift',
	},
	{
		id: 'burnAttackShift', kind: 'run', runRe: '^(srl a|rr b)$', countRe: '^rr b$', after: '^ld \\[hli\\], a$',
		valid: { range: [1, 3] }, group: 'burnAttackShift',
	},
	{
		id: 'burnAttackShiftPlayer', kind: 'run', runRe: '^(srl a|rr b)$', countRe: '^rr b$',
		after: '^ld \\[hli\\], a$', valid: { range: [1, 3] }, group: 'burnAttackShift',
	},
	{
		id: 'residualDamageShift', kind: 'run', runRe: '^(srl b|rr c|srl c)$', countRe: '^(rr c|srl c)$',
		after: '^ld a, c$', valid: { range: [1, 6] },
	},
	{ id: 'toxicRamp', kind: 'present' },
	{ id: 'multiHitMask1', kind: 'imm', valid: { in: [1, 3, 7] } },
	{ id: 'multiHitThreshold', kind: 'imm', valid: { range: [0, 8] } },
	{ id: 'multiHitMask2', kind: 'imm', valid: { in: [1, 3, 7] } },
	{
		id: 'multiHitAdd', kind: 'run', runRe: '^inc a$', countRe: '^inc a$', after: '^ld \\[de\\], a$',
		valid: { range: [1, 3] },
	},
	{ id: 'trapMask1', kind: 'imm', valid: { in: [1, 3, 7] } },
	{ id: 'trapThreshold', kind: 'imm', valid: { range: [0, 8] } },
	{ id: 'trapMask2', kind: 'imm', valid: { in: [1, 3, 7] } },
	{
		id: 'trapAdd', kind: 'run', runRe: '^inc a$', countRe: '^inc a$', after: '^ld \\[de\\], a$',
		valid: { range: [0, 3] },
	},
	{ id: 'thrashTurnsMask', kind: 'imm', valid: { in: [0, 1, 3] } },
	{
		id: 'thrashTurnsAdd', kind: 'run', runRe: '^inc a$', countRe: '^inc a$', after: '^ld \\[de\\], a$',
		valid: { range: [0, 4] },
	},
	{ id: 'bideTurnsMask', kind: 'imm', valid: { in: [0, 1, 3] } },
	{
		id: 'bideTurnsAdd', kind: 'run', runRe: '^inc a$', countRe: '^inc a$', after: '^ld \\[bc\\], a$',
		valid: { range: [0, 4] },
	},
	{ id: 'disableTurnsMask', kind: 'imm', valid: { in: [1, 3, 7, 15] } },
	{ id: 'poisonChance1', kind: 'imm', valid: { range: [1, 255] } },
	{ id: 'poisonChance2', kind: 'imm', valid: { range: [1, 255] } },
	{ id: 'statusChance1', kind: 'imm', valid: { range: [1, 255] }, group: 'statusChance1' },
	{ id: 'statusChance1Enemy', kind: 'imm', valid: { range: [1, 255] }, group: 'statusChance1' },
	{ id: 'statusChance2', kind: 'imm', valid: { range: [1, 255] }, group: 'statusChance2' },
	{ id: 'statusChance2Enemy', kind: 'imm', valid: { range: [1, 255] }, group: 'statusChance2' },
	{ id: 'flinchChance1', kind: 'imm', valid: { range: [1, 255] } },
	{ id: 'flinchChance2', kind: 'imm', valid: { range: [1, 255] } },
	{ id: 'confusionSideChance', kind: 'imm', valid: { range: [1, 255] } },
	{ id: 'statDownSideChance', kind: 'imm', valid: { range: [1, 255] } },
	{
		id: 'recoilShift', kind: 'run', runRe: '^(srl b|rr c)$', countRe: '^rr c$', after: '^ld a, ',
		valid: { range: [0, 3] },
	},
	{
		id: 'recoilShift2', kind: 'run', runRe: '^(srl b|rr c)$', countRe: '^rr c$', after: '^ld a, b$',
		valid: { range: [0, 3] },
	},
	{ id: 'drainHalf', kind: 'present' },
	{
		id: 'healShift', kind: 'run', runRe: '^(srl b|rr c)$', countRe: '^rr c$', after: '^ld a, \\[de\\]$',
		valid: { range: [0, 3] },
	},
	{
		id: 'substituteShift', kind: 'run', runRe: '^(srl a|rr b)$', countRe: '^rr b$', after: '^push de$',
		valid: { range: [1, 3] },
	},
	{ id: 'superFangHalf', kind: 'present', group: 'superFangHalf' },
	{ id: 'superFangHalfEnemy', kind: 'present', group: 'superFangHalf' },
	{ id: 'sonicBoomDamage', kind: 'imm', valid: { range: [1, 255] }, group: 'sonicBoomDamage' },
	{ id: 'sonicBoomDamageEnemy', kind: 'imm', valid: { range: [1, 255] }, group: 'sonicBoomDamage' },
	{ id: 'dragonRageDamage', kind: 'imm', valid: { range: [1, 255] }, group: 'dragonRageDamage' },
	{ id: 'dragonRageDamageEnemy', kind: 'imm', valid: { range: [1, 255] }, group: 'dragonRageDamage' },
	{
		id: 'badgeBoostShift', kind: 'run', runRe: '^(srl d|rr e)$', countRe: '^rr e$', after: '^ld a, \\[hl\\]$',
		valid: { range: [1, 4] },
	},
	{ id: 'priorityBlock', kind: 'block' },
	{ id: 'statusClearMask', kind: 'imm', valid: { in: [204, 140] }, group: 'statusClearMask' },
	{ id: 'statusClearMaskEnemy', kind: 'imm', valid: { in: [204, 140] }, group: 'statusClearMask' },
	{ id: 'healEntry', kind: 'present' },
	{ id: 'healFailBug', kind: 'present' },
	{
		id: 'priorityFirstMove', kind: 'imm', valid: { range: [1, 254] }, group: 'priorityFirstMove',
		requires: 'priorityBlock',
	},
	{
		id: 'priorityLastMove', kind: 'imm', valid: { range: [1, 254] }, group: 'priorityLastMove',
		requires: 'priorityBlock',
	},
	{
		id: 'priorityFirstMove2', kind: 'imm', valid: { range: [1, 254] }, group: 'priorityFirstMove',
		requires: 'priorityBlock',
	},
	{
		id: 'priorityLastMove2', kind: 'imm', valid: { range: [1, 254] }, group: 'priorityLastMove',
		requires: 'priorityBlock',
	},
	{
		id: 'priorityFirstMove3', kind: 'imm', valid: { range: [1, 254] }, group: 'priorityFirstMove',
		requires: 'priorityBlock',
	},
	{
		id: 'priorityLastMove3', kind: 'imm', valid: { range: [1, 254] }, group: 'priorityLastMove',
		requires: 'priorityBlock',
	},
	{ id: 'statFormulaDivisor', kind: 'imm', valid: { in: [100] } },
	{ id: 'statFormulaBonus', kind: 'imm', valid: { range: [0, 20] } },
	{ id: 'statFormulaHPBonus', kind: 'imm', valid: { range: [0, 30] } },
	{ id: 'dvMask', kind: 'imm', valid: { in: [15] } },
	{ id: 'maxLevel', kind: 'imm', valid: { range: [1, 255] } },
	{ id: 'damageLevelDivisor', kind: 'imm', valid: { in: [5] } },
	{ id: 'damageCap999', kind: 'present' },
	{ id: 'explosionHalvesDefense', kind: 'present' },
	{ id: 'reflectDoublesDefense', kind: 'present' },
	{ id: 'code:CriticalHitTest', kind: 'code' },
	{ id: 'code:MoveHitTest', kind: 'code' },
	{ id: 'code:CalcHitChance', kind: 'code' },
	{ id: 'code:GetDamageVarsForPlayerAttack', kind: 'code' },
	{ id: 'code:GetDamageVarsForEnemyAttack', kind: 'code' },
	{ id: 'code:CalculateDamage', kind: 'code' },
	{ id: 'code:AdjustDamageForMoveType', kind: 'code' },
	{ id: 'code:RandomizeDamage', kind: 'code' },
	{ id: 'code:HandlePoisonBurnLeechSeed', kind: 'code' },
	{ id: 'code:HandlePoisonBurnLeechSeed_DecreaseOwnHP', kind: 'code' },
	{ id: 'code:HandlePoisonBurnLeechSeed_IncreaseEnemyHP', kind: 'code' },
	{ id: 'code:CheckPlayerStatusConditions', kind: 'code' },
	{ id: 'code:CheckEnemyStatusConditions', kind: 'code' },
	{ id: 'code:QuarterSpeedDueToParalysis', kind: 'code' },
	{ id: 'code:HalveAttackDueToBurn', kind: 'code' },
	{ id: 'code:ApplyBadgeStatBoosts', kind: 'code' },
	{ id: 'code:CalculateModifiedStat', kind: 'code' },
	{ id: 'code:SleepEffect', kind: 'code' },
	{ id: 'code:PoisonEffect', kind: 'code' },
	{ id: 'code:FreezeBurnParalyzeEffect', kind: 'code' },
	{ id: 'code:CheckDefrost', kind: 'code' },
	{ id: 'code:StatModifierUpEffect', kind: 'code' },
	{ id: 'code:StatModifierDownEffect', kind: 'code' },
	{ id: 'code:BideEffect', kind: 'code' },
	{ id: 'code:ThrashPetalDanceEffect', kind: 'code' },
	{ id: 'code:TwoToFiveAttacksEffect', kind: 'code' },
	{ id: 'code:FlinchSideEffect', kind: 'code' },
	{ id: 'code:TrappingEffect', kind: 'code' },
	{ id: 'code:ConfusionSideEffectSuccess', kind: 'code' },
	{ id: 'code:DisableEffect', kind: 'code' },
	{ id: 'code:HyperBeamEffect', kind: 'code' },
	{ id: 'code:RageEffect', kind: 'code' },
	{ id: 'code:MimicEffect', kind: 'code' },
	{ id: 'code:RecoilEffect_', kind: 'code' },
	{ id: 'code:DrainHPEffect_', kind: 'code' },
	{ id: 'code:HealEffect_', kind: 'code' },
	{ id: 'code:SubstituteEffect_', kind: 'code' },
	{ id: 'code:OneHitKOEffect_', kind: 'code' },
	{ id: 'code:ParalyzeEffect_', kind: 'code' },
	{ id: 'code:LeechSeedEffect_', kind: 'code' },
	{ id: 'code:MistEffect_', kind: 'code' },
	{ id: 'code:FocusEnergyEffect_', kind: 'code' },
	{ id: 'code:HazeEffect_', kind: 'code' },
	{ id: 'code:ReflectLightScreenEffect_', kind: 'code' },
	{ id: 'code:TransformEffect_', kind: 'code' },
	{ id: 'code:ConversionEffect_', kind: 'code' },
	{ id: 'code:ApplyAttackToEnemyPokemon', kind: 'code' },
	{ id: 'code:ApplyAttackToPlayerPokemon', kind: 'code' },
	{ id: 'code:HandleCounterMove', kind: 'code' },
	{ id: 'code:MainInBattleLoop', kind: 'code' },
	{ id: 'code:CalcStat', kind: 'code' },
	{ id: 'code:HandleSelfConfusionDamage', kind: 'code' },
	{ id: 'code:MirrorMoveCopyMove', kind: 'code' },
	{ id: 'code:MetronomePickMove', kind: 'code' },
	{ id: 'code:AIGetTypeEffectiveness', kind: 'code' },
	{ id: 'critModel', kind: 'model' },
	{ id: 'accuracyModel', kind: 'model' },
	{ id: 'categoryModel', kind: 'model' },
	{ id: 'healModel', kind: 'model' },
];

interface Gen1Signatures { bases: BaseTable[]; critMarker: number[]; accuracyMarker: number[] }
const signatures = () => signatureSection<Gen1Signatures>('gen1');

const SEARCH_BUDGET = 1500000;
const STEP_BUDGET = 4000000;
const RUN_STEPS = 4000;
const MAX_ROM = 0x800000;
const MIN_ROM = 0x8000;

interface Budget { search: number; steps: number }

class BudgetError extends Error {}

const R8 = ['b', 'c', 'd', 'e', 'h', 'l', '[hl]', 'a'];
const R16 = ['bc', 'de', 'hl', 'sp'];
const R16P = ['bc', 'de', 'hl', 'af'];
const CC = ['nz', 'z', 'nc', 'c'];
const ALU = ['add a,', 'adc a,', 'sub', 'sbc a,', 'and', 'xor', 'or', 'cp'];
const CB_ROT = ['rlc', 'rrc', 'rl', 'rr', 'sla', 'sra', 'swap', 'srl'];
const CB_BIT = ['', 'bit', 'res', 'set'];
const LD_IND = [
	'ld [bc], a', 'ld a, [bc]', 'ld [de], a', 'ld a, [de]', 'ld [hli], a', 'ld a, [hli]', 'ld [hld], a', 'ld a, [hld]',
];
const ACC_OPS = ['rlca', 'rrca', 'rla', 'rra', 'daa', 'cpl', 'scf', 'ccf'];
const RET_OPS = ['ret', 'reti', 'jp hl', 'ld sp, hl'];

function byteAt(rom: Buffer, at: number): number {
	return at >= 0 && at < rom.length ? rom[at] : 0xff;
}
function hex(n: number, width: number): string {
	return '$' + n.toString(16).padStart(width, '0');
}

interface Ins { len: number; text: string; kind: string }

function decode(rom: Buffer, at: number): Ins {
	const op = byteAt(rom, at);
	const d8 = byteAt(rom, at + 1);
	const d16 = d8 | (byteAt(rom, at + 2) << 8);
	const ins = (len: number, text: string, kind = ''): Ins => ({ len, text, kind });
	if (op === 0xcb) {
		const r = R8[d8 & 7];
		const g = d8 >> 6;
		const n = (d8 >> 3) & 7;
		return ins(2, g === 0 ? `${CB_ROT[n]} ${r}` : `${CB_BIT[g]} ${n}, ${r}`, 'cb');
	}
	const x = op >> 6;
	const y = (op >> 3) & 7;
	const z = op & 7;
	if (x === 1) return ins(1, op === 0x76 ? 'halt' : 'ld ' + R8[y] + ', ' + R8[z]);
	if (x === 2) return ins(1, ALU[y] + ' ' + R8[z]);
	if (x === 0) {
		if (z === 0) {
			if (y === 0) return ins(1, 'nop');
			if (y === 1) return ins(3, 'ld [' + hex(d16, 4) + '], sp', 'a16');
			if (y === 2) return ins(2, 'stop');
			if (y === 3) return ins(2, 'jr ' + hex(d8, 2), 'rel');
			return ins(2, 'jr ' + CC[y - 4] + ', ' + hex(d8, 2), 'rel');
		}
		if (z === 1) {
			return y & 1 ? ins(1, 'add hl, ' + R16[y >> 1]) : ins(3, 'ld ' + R16[y >> 1] + ', ' + hex(d16, 4), 'd16');
		}
		if (z === 2) return ins(1, LD_IND[y]);
		if (z === 3) return ins(1, (y & 1 ? 'dec ' : 'inc ') + R16[y >> 1]);
		if (z === 4) return ins(1, 'inc ' + R8[y]);
		if (z === 5) return ins(1, 'dec ' + R8[y]);
		if (z === 6) return ins(2, 'ld ' + R8[y] + ', ' + hex(d8, 2), 'd8');
		return ins(1, ACC_OPS[y]);
	}
	if (z === 0) {
		if (y < 4) return ins(1, 'ret ' + CC[y]);
		if (y === 4) return ins(2, 'ldh [' + hex(d8, 2) + '], a', 'a8');
		if (y === 5) return ins(2, 'add sp, ' + hex(d8, 2), 'd8');
		if (y === 6) return ins(2, 'ldh a, [' + hex(d8, 2) + ']', 'a8');
		return ins(2, 'ld hl, sp+' + hex(d8, 2), 'd8');
	}
	if (z === 1) {
		if (!(y & 1)) return ins(1, 'pop ' + R16P[y >> 1]);
		return ins(1, RET_OPS[y >> 1]);
	}
	if (z === 2) {
		if (y < 4) return ins(3, 'jp ' + CC[y] + ', ' + hex(d16, 4), 'a16');
		if (y === 4) return ins(1, 'ld [c], a');
		if (y === 5) return ins(3, 'ld [' + hex(d16, 4) + '], a', 'a16');
		if (y === 6) return ins(1, 'ld a, [c]');
		return ins(3, 'ld a, [' + hex(d16, 4) + ']', 'a16');
	}
	if (z === 3) {
		if (y === 0) return ins(3, 'jp ' + hex(d16, 4), 'a16');
		if (y === 6) return ins(1, 'di');
		if (y === 7) return ins(1, 'ei');
		return ins(1, 'db ' + hex(op, 2), 'bad');
	}
	if (z === 4) return y < 4 ? ins(3, 'call ' + CC[y] + ', ' + hex(d16, 4), 'a16') : ins(1, 'db ' + hex(op, 2), 'bad');
	if (z === 5) {
		if (!(y & 1)) return ins(1, 'push ' + R16P[y >> 1]);
		if (y === 1) return ins(3, 'call ' + hex(d16, 4), 'a16');
		return ins(1, 'db ' + hex(op, 2), 'bad');
	}
	if (z === 6) return ins(2, ALU[y] + ' ' + hex(d8, 2), 'd8');
	return ins(1, 'rst ' + hex(y * 8, 2));
}

class Cpu {
	a = 0;
	f = 0;
	b = 0;
	c = 0;
	d = 0;
	e = 0;
	h = 0;
	l = 0;
	sp = 0xdff0;
	pc = 0;
	steps = 0;
	io = false;
	reads: number[] = [];
	ram: Uint8Array;
	rom: Buffer;
	bank: number;
	constructor(rom: Buffer, bank: number, fill: number) {
		this.rom = rom;
		this.bank = bank;
		this.ram = new Uint8Array(0x10000);
		this.ram.fill(fill, 0x8000, 0xff00);
	}
	rd(target: number): number {
		const addr = target & 0xffff;
		if (addr < 0x4000) return byteAt(this.rom, addr);
		if (addr < 0x8000) return byteAt(this.rom, this.bank * 0x4000 + addr - 0x4000);
		if (addr >= 0xff00 && addr < 0xff80) this.io = true;
		if (addr < 0xdf00 || addr >= 0xff00) this.reads.push(addr);
		return this.ram[addr];
	}
	wr(target: number, value: number) {
		const addr = target & 0xffff;
		if (addr < 0x8000) {
			if (addr >= 0x2000 && addr < 0x4000) this.bank = (value & 0xff) || 1;
			return;
		}
		if (addr >= 0xff00 && addr < 0xff80) this.io = true;
		this.ram[addr] = value;
	}
	offset(): number {
		return this.pc < 0x4000 ? this.pc : this.bank * 0x4000 + this.pc - 0x4000;
	}
	hl(): number {
		return (this.h << 8) | this.l;
	}
	getR(i: number): number {
		switch (i) {
		case 0: return this.b;
		case 1: return this.c;
		case 2: return this.d;
		case 3: return this.e;
		case 4: return this.h;
		case 5: return this.l;
		case 6: return this.rd(this.hl());
		default: return this.a;
		}
	}
	setR(i: number, value: number) {
		const v = value & 0xff;
		switch (i) {
		case 0: this.b = v; break;
		case 1: this.c = v; break;
		case 2: this.d = v; break;
		case 3: this.e = v; break;
		case 4: this.h = v; break;
		case 5: this.l = v; break;
		case 6: this.wr(this.hl(), v); break;
		default: this.a = v;
		}
	}
	get16(i: number): number {
		switch (i) {
		case 0: return (this.b << 8) | this.c;
		case 1: return (this.d << 8) | this.e;
		case 2: return this.hl();
		default: return this.sp;
		}
	}
	set16(i: number, value: number) {
		const v = value & 0xffff;
		switch (i) {
		case 0: this.b = v >> 8; this.c = v & 255; break;
		case 1: this.d = v >> 8; this.e = v & 255; break;
		case 2: this.h = v >> 8; this.l = v & 255; break;
		default: this.sp = v;
		}
	}
	flags(z: boolean, n: boolean, h: boolean, c: boolean) {
		this.f = (z ? 0x80 : 0) | (n ? 0x40 : 0) | (h ? 0x20 : 0) | (c ? 0x10 : 0);
	}
	fz(): boolean {
		return (this.f & 0x80) !== 0;
	}
	fn(): boolean {
		return (this.f & 0x40) !== 0;
	}
	fh(): boolean {
		return (this.f & 0x20) !== 0;
	}
	fc(): boolean {
		return (this.f & 0x10) !== 0;
	}
	cond(i: number): boolean {
		switch (i) {
		case 0: return !this.fz();
		case 1: return this.fz();
		case 2: return !this.fc();
		default: return this.fc();
		}
	}
	push(value: number) {
		this.sp = (this.sp - 2) & 0xffff;
		this.ram[this.sp] = value & 255;
		this.ram[(this.sp + 1) & 0xffff] = value >> 8;
	}
	pop(): number {
		const value = this.ram[this.sp] | (this.ram[(this.sp + 1) & 0xffff] << 8);
		this.sp = (this.sp + 2) & 0xffff;
		return value;
	}
	fetch8(): number {
		const value = this.rd(this.pc);
		this.pc = (this.pc + 1) & 0xffff;
		return value;
	}
	fetch16(): number {
		const lo = this.fetch8();
		return lo | (this.fetch8() << 8);
	}
	fetchRel(): number {
		const value = this.fetch8();
		return value > 127 ? value - 256 : value;
	}
	alu(op: number, v: number) {
		const a = this.a;
		const carry = this.fc() ? 1 : 0;
		let r: number;
		switch (op) {
		case 0:
			r = a + v;
			this.flags(!(r & 255), false, (a & 15) + (v & 15) > 15, r > 255);
			this.a = r & 255;
			break;
		case 1:
			r = a + v + carry;
			this.flags(!(r & 255), false, (a & 15) + (v & 15) + carry > 15, r > 255);
			this.a = r & 255;
			break;
		case 2:
		case 7:
			r = a - v;
			this.flags(!(r & 255), true, (a & 15) < (v & 15), r < 0);
			if (op === 2) this.a = r & 255;
			break;
		case 3:
			r = a - v - carry;
			this.flags(!(r & 255), true, (a & 15) < (v & 15) + carry, r < 0);
			this.a = r & 255;
			break;
		case 4:
			this.a = a & v;
			this.flags(!this.a, false, true, false);
			break;
		case 5:
			this.a = a ^ v;
			this.flags(!this.a, false, false, false);
			break;
		default:
			this.a = a | v;
			this.flags(!this.a, false, false, false);
		}
	}
	cbOp() {
		const op = this.fetch8();
		const r = op & 7;
		const n = (op >> 3) & 7;
		const g = op >> 6;
		let v = this.getR(r);
		if (g === 1) {
			this.flags(!(v & (1 << n)), false, true, this.fc());
			return;
		}
		if (g === 2) {
			this.setR(r, v & ~(1 << n));
			return;
		}
		if (g === 3) {
			this.setR(r, v | (1 << n));
			return;
		}
		const carry = this.fc() ? 1 : 0;
		let c: number;
		switch (n) {
		case 0: c = v >> 7; v = ((v << 1) | c) & 255; break;
		case 1: c = v & 1; v = (v >> 1) | (c << 7); break;
		case 2: c = v >> 7; v = ((v << 1) | carry) & 255; break;
		case 3: c = v & 1; v = (v >> 1) | (carry << 7); break;
		case 4: c = v >> 7; v = (v << 1) & 255; break;
		case 5: c = v & 1; v = (v >> 1) | (v & 0x80); break;
		case 6: c = 0; v = ((v << 4) | (v >> 4)) & 255; break;
		default: c = v & 1; v >>= 1;
		}
		this.setR(r, v);
		this.flags(!v, false, false, c !== 0);
	}
	accOp(y: number) {
		const a = this.a;
		if (y === 0) {
			const c = a >> 7;
			this.a = ((a << 1) | c) & 255;
			this.flags(false, false, false, c !== 0);
		} else if (y === 1) {
			const c = a & 1;
			this.a = (a >> 1) | (c << 7);
			this.flags(false, false, false, c !== 0);
		} else if (y === 2) {
			const c = a >> 7;
			this.a = ((a << 1) | (this.fc() ? 1 : 0)) & 255;
			this.flags(false, false, false, c !== 0);
		} else if (y === 3) {
			const c = a & 1;
			this.a = (a >> 1) | (this.fc() ? 0x80 : 0);
			this.flags(false, false, false, c !== 0);
		} else if (y === 4) {
			let v = a;
			let c = this.fc();
			if (!this.fn()) {
				if (c || v > 0x99) {
					v += 0x60;
					c = true;
				}
				if (this.fh() || (v & 15) > 9) v += 6;
			} else {
				if (c) v -= 0x60;
				if (this.fh()) v -= 6;
			}
			this.a = v & 255;
			this.flags(!this.a, this.fn(), false, c);
		} else if (y === 5) {
			this.a = a ^ 255;
			this.flags(this.fz(), true, true, this.fc());
		} else if (y === 6) {
			this.flags(this.fz(), false, false, true);
		} else {
			this.flags(this.fz(), false, false, !this.fc());
		}
	}
	step() {
		this.steps++;
		const op = this.fetch8();
		const x = op >> 6;
		const y = (op >> 3) & 7;
		const z = op & 7;
		if (op === 0xcb) {
			this.cbOp();
			return;
		}
		if (x === 1) {
			if (op === 0x76) throw new Error('halt');
			this.setR(y, this.getR(z));
			return;
		}
		if (x === 2) {
			this.alu(y, this.getR(z));
			return;
		}
		if (x === 0) {
			this.stepLow(y, z);
			return;
		}
		this.stepHigh(y, z);
	}
	stepLow(y: number, z: number) {
		if (z === 0) {
			if (y === 0) return;
			if (y === 1) {
				const a = this.fetch16();
				this.wr(a, this.sp & 255);
				this.wr(a + 1, this.sp >> 8);
				return;
			}
			if (y === 2) throw new Error('stop');
			const off = this.fetchRel();
			if (y === 3 || this.cond(y - 4)) this.pc = (this.pc + off) & 0xffff;
			return;
		}
		if (z === 1) {
			if (y & 1) {
				const a = this.hl();
				const b = this.get16(y >> 1);
				const r = a + b;
				this.flags(this.fz(), false, (a & 0xfff) + (b & 0xfff) > 0xfff, r > 0xffff);
				this.set16(2, r);
				return;
			}
			this.set16(y >> 1, this.fetch16());
			return;
		}
		if (z === 2) {
			if (y === 0) {
				this.wr(this.get16(0), this.a);
			} else if (y === 1) {
				this.a = this.rd(this.get16(0));
			} else if (y === 2) {
				this.wr(this.get16(1), this.a);
			} else if (y === 3) {
				this.a = this.rd(this.get16(1));
			} else {
				const a = this.hl();
				if (y & 1) this.a = this.rd(a); else this.wr(a, this.a);
				this.set16(2, a + (y < 6 ? 1 : -1));
			}
			return;
		}
		if (z === 3) {
			this.set16(y >> 1, this.get16(y >> 1) + (y & 1 ? -1 : 1));
			return;
		}
		if (z === 4) {
			const v = (this.getR(y) + 1) & 255;
			this.setR(y, v);
			this.flags(!v, false, !(v & 15), this.fc());
			return;
		}
		if (z === 5) {
			const v = (this.getR(y) - 1) & 255;
			this.setR(y, v);
			this.flags(!v, true, (v & 15) === 15, this.fc());
			return;
		}
		if (z === 6) {
			this.setR(y, this.fetch8());
			return;
		}
		this.accOp(y);
	}
	stepHigh(y: number, z: number) {
		if (z === 0) {
			if (y < 4) {
				if (this.cond(y)) this.pc = this.pop();
				return;
			}
			if (y === 4) {
				this.wr(0xff00 + this.fetch8(), this.a);
				return;
			}
			if (y === 6) {
				this.a = this.rd(0xff00 + this.fetch8());
				return;
			}
			const off = this.fetchRel();
			const r = this.sp + off;
			this.flags(false, false, (this.sp & 15) + (off & 15) > 15, (this.sp & 255) + (off & 255) > 255);
			if (y === 5) this.sp = r & 0xffff; else this.set16(2, r);
			return;
		}
		if (z === 1) {
			if (!(y & 1)) {
				const v = this.pop();
				if (y === 6) {
					this.a = v >> 8;
					this.f = v & 0xf0;
				} else {
					this.set16(y >> 1, v);
				}
				return;
			}
			if (y === 1 || y === 3) this.pc = this.pop();
			else if (y === 5) this.pc = this.hl();
			else this.sp = this.hl();
			return;
		}
		if (z === 2) {
			if (y < 4) {
				const a = this.fetch16();
				if (this.cond(y)) this.pc = a;
			} else if (y === 4) {
				this.wr(0xff00 + this.c, this.a);
			} else if (y === 5) {
				this.wr(this.fetch16(), this.a);
			} else if (y === 6) {
				this.a = this.rd(0xff00 + this.c);
			} else {
				this.a = this.rd(this.fetch16());
			}
			return;
		}
		if (z === 3) {
			if (y === 0) {
				this.pc = this.fetch16();
				return;
			}
			if (y === 6 || y === 7) return;
			throw new Error('bad opcode');
		}
		if (z === 4) {
			if (y >= 4) throw new Error('bad opcode');
			const a = this.fetch16();
			if (this.cond(y)) {
				this.push(this.pc);
				this.pc = a;
			}
			return;
		}
		if (z === 5) {
			if (!(y & 1)) {
				this.push(y === 6 ? (this.a << 8) | this.f : this.get16(y >> 1));
				return;
			}
			if (y !== 1) throw new Error('bad opcode');
			const a = this.fetch16();
			this.push(this.pc);
			this.pc = a;
			return;
		}
		if (z === 6) {
			this.alu(y, this.fetch8());
			return;
		}
		this.push(this.pc);
		this.pc = y * 8;
	}
}

const SENTINEL = 0xfff8;
type RamSet = { [address: number]: number };
type ModelOutcome = { error: string } | { model: any, detail: any };
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function startCpu(rom: Buffer, start: number, set: RamSet): Cpu {
	const bank = start >> 14;
	const cpu = new Cpu(rom, bank, 1);
	for (const key in set) cpu.ram[Number(key) & 0xffff] = set[key];
	cpu.pc = bank ? 0x4000 + (start & 0x3fff) : start;
	cpu.sp = 0xdff0;
	cpu.ram[0xdff0] = SENTINEL & 255;
	cpu.ram[0xdff1] = SENTINEL >> 8;
	return cpu;
}
function spend(budget: Budget, cpu: Cpu) {
	budget.steps -= cpu.steps + 64;
}
function errorText(err: unknown): string {
	return err instanceof Error ? err.message : 'the emulation failed';
}

interface RollResult { error?: string; t: number; reads: number[] }

function runUntil(
	rom: Buffer, budget: Budget, start: number, speed: number, set: RamSet, marker: number[], flagAddr: number
): RollResult {
	if (budget.steps <= 0) return { error: 'the emulation budget was used up', t: 0, reads: [] };
	const cpu = startCpu(rom, start, set);
	if (flagAddr >= 0) cpu.ram[flagAddr] = 0;
	cpu.b = speed;
	const fail = (error: string): RollResult => ({ error, t: 0, reads: [] });
	try {
		while (cpu.steps < RUN_STEPS) {
			if (cpu.pc === SENTINEL) return { t: flagAddr < 0 || cpu.ram[flagAddr] ? 256 : 0, reads: cpu.reads };
			if (cpu.io) return fail('the routine touched hardware registers before the random roll');
			const at = cpu.offset();
			if (byteAt(rom, at) === 0xcd && marker.every((b, i) => byteAt(rom, at + 3 + i) === b)) {
				return { t: cpu.b, reads: cpu.reads };
			}
			cpu.step();
		}
	} catch (err) {
		return fail(errorText(err));
	} finally {
		spend(budget, cpu);
	}
	return fail('the routine did not finish');
}

const SPEEDS = [8, 16, 24, 32, 48, 64, 96, 128, 160, 240];
const CRIT_FACTORS = [0.0625, 0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32];
const STOCK_CRIT: { [key: string]: (half: number) => number } = {
	normal: half => half,
	high: half => Math.min(255, half * 8),
	focusEnergy: half => half >> 2,
	focusEnergyHigh: half => Math.min(255, (half >> 1) * 4),
};
const CRIT_LABELS: { [key: string]: string } = {
	normal: 'ordinary moves',
	high: 'high critical-hit moves',
	focusEnergy: 'ordinary moves after Focus Energy',
	focusEnergyHigh: 'high critical-hit moves after Focus Energy',
};

type CritFit = Gen1CritFit;

function countMismatch(fit: CritFit, speed: number, measured: number, expected: number) {
	if (measured === expected) return;
	fit.mismatches++;
	fit.maxDifference = Math.max(fit.maxDifference, Math.abs(measured - expected));
	fit.lastSpeed = speed;
}

function critModel(
	rom: Buffer, budget: Budget, entryAt: number, entryLength: number, highMoves: number[]
): ModelOutcome {
	const start = entryAt + entryLength;
	const flagAddr = byteAt(rom, entryAt + 2) | (byteAt(rom, entryAt + 3) << 8);
	const run = (speed: number, set: RamSet) => runUntil(rom, budget, start, speed, set, signatures().critMarker, flagAddr);
	const vector = (set: RamSet): { error?: string, t: number[] } => {
		const out: number[] = [];
		for (const s of SPEEDS) {
			const r = run(s, set);
			if (r.error) return { error: r.error, t: [] };
			out.push(r.t);
		}
		return { t: out };
	};
	const base = vector({});
	if (base.error) return { error: base.error };
	const reads = new Set<number>();
	for (const s of [16, 240]) {
		for (const a of run(s, {}).reads) if (a >= 0xc000 && a < 0xdf00 && a !== flagAddr) reads.add(a);
	}
	const inList = (v: number) => highMoves.includes(v);
	const high = highMoves.find(v => !(v & 4)) || highMoves[0];
	let control = 0;
	let focus = 0;
	for (let v = 2; v < 255 && !control; v++) if (!inList(v) && (v & 4) === (high & 4)) control = v;
	for (let v = 4; v < 255 && !focus; v++) if (!inList(v) && (v & 4)) focus = v;
	let moveAddr = -1;
	let focusAddr = -1;
	for (const a of reads) {
		const tHigh = vector({ [a]: high });
		const tControl = vector({ [a]: control });
		const tFocus = vector({ [a]: focus });
		if (tHigh.error || tControl.error || tFocus.error) {
			return { error: 'the routine failed when input 0x' + a.toString(16) + ' was varied' };
		}
		if (!eq(tHigh.t, tControl.t)) {
			if (moveAddr >= 0) return { error: 'two inputs behave like the move id' };
			moveAddr = a;
		} else if (!eq(tFocus.t, base.t)) {
			if (focusAddr >= 0) return { error: 'two inputs behave like the Focus Energy flag' };
			focusAddr = a;
		}
	}
	if (moveAddr < 0 || focusAddr < 0) return { error: 'the move id or Focus Energy input was not identified' };
	const fit = (t: number[]) => {
		for (const factor of CRIT_FACTORS) {
			if (SPEEDS.every((s, i) => t[i] === Math.min(255, Math.floor(s * factor)))) return factor;
		}
		return null;
	};
	const sets: [string, RamSet][] = [
		['normal', {}], ['high', { [moveAddr]: high }], ['focusEnergy', { [focusAddr]: focus }],
		['focusEnergyHigh', { [moveAddr]: high, [focusAddr]: focus }],
	];
	const cases: { [key: string]: number[] } = {};
	const model: { [key: string]: any } = {};
	for (const [key, set] of sets) {
		const v = vector(set);
		if (v.error) return { error: v.error };
		cases[key] = v.t;
		const factor = fit(v.t);
		if (factor === null) {
			const seen = JSON.stringify(v.t);
			return { error: `the ${key} thresholds ${seen} do not fit "base Speed x factor, capped at 255"` };
		}
		model[key] = factor;
	}
	model.cap = 255;
	const gates: { ramAddress: number, whenZero: { cap: number } }[] = [];
	for (const a of reads) {
		if (a === moveAddr || a === focusAddr) continue;
		const withZero = vector({ [moveAddr]: high, [a]: 0 });
		if (withZero.error) return { error: 'the routine failed when input 0x' + a.toString(16) + ' was zero' };
		if (eq(withZero.t, cases.high) || withZero.t.every(t => !t)) continue;
		if (!withZero.t.every((t, i) => (t === 256 && cases.high[i] === 255) || t === cases.high[i])) {
			return { error: 'RAM input 0x' + a.toString(16) + ' changes the result in a way that is not understood' };
		}
		gates.push({ ramAddress: a, whenZero: { cap: 256 } });
	}
	if (gates.length) model.conditional = gates;
	const formula: { [key: string]: { rule: CritFit, stock: CritFit } } = {};
	for (const [key, set] of sets) {
		const rule: CritFit = { mismatches: 0, maxDifference: 0, lastSpeed: 0 };
		const stock: CritFit = { mismatches: 0, maxDifference: 0, lastSpeed: 0 };
		for (let s = 1; s < 256; s++) {
			const r = run(s, set);
			if (r.error) return { error: r.error };
			const half = s >> 1;
			countMismatch(rule, s, r.t, Math.min(255, Math.floor(half * 2 * model[key])));
			countMismatch(stock, s, r.t, STOCK_CRIT[key](half));
		}
		formula[key] = { rule, stock };
	}
	return {
		model,
		detail: { speeds: SPEEDS, thresholds: cases, moveIdAddress: moveAddr, focusEnergyAddress: focusAddr, formula },
	};
}

const ACCURACIES = [1, 77, 128, 229, 254, 255];

function accuracyModel(rom: Buffer, budget: Budget, start: number): ModelOutcome {
	const vector = (set: RamSet, accAddr: number): { error?: string, t: number[], reads: number[] } => {
		const out: number[] = [];
		let reads: number[] = [];
		for (const acc of ACCURACIES) {
			const fill: RamSet = { ...set };
			if (accAddr >= 0) fill[accAddr] = acc;
			const r = runUntil(rom, budget, start, 0, fill, signatures().accuracyMarker, -1);
			if (r.error) return { error: r.error, t: [], reads: [] };
			out.push(r.t);
			reads = r.reads;
		}
		return { t: out, reads };
	};
	const base = vector({}, -1);
	if (base.error) return { error: base.error };
	const reads = [...new Set(base.reads)].filter(a => a >= 0xc000 && a < 0xdf00);
	let accAddr = -1;
	for (const a of reads) {
		const v = vector({}, a);
		if (v.error) return { error: v.error };
		if (!eq(v.t, base.t)) {
			if (accAddr >= 0) return { error: 'two inputs behave like the move accuracy' };
			accAddr = a;
		}
	}
	if (accAddr < 0) return { error: 'the accuracy input was not identified' };
	const stock = vector({}, accAddr);
	if (stock.error) return { error: stock.error };
	const shape = (t: number[]) => {
		if (eq(t, ACCURACIES)) return 255;
		if (eq(t, ACCURACIES.map(a => (a === 255 ? 256 : a)))) return 256;
		return null;
	};
	const full = shape(stock.t);
	if (full === null) return { error: `the thresholds ${JSON.stringify(stock.t)} are not "random < accuracy"` };
	const model: { [key: string]: any } = { hitThresholdAtFullAccuracy: full };
	const gates: { ramAddress: number, whenZero: { hitThresholdAtFullAccuracy: number } }[] = [];
	for (const a of reads) {
		if (a === accAddr) continue;
		const v = vector({ [a]: 0 }, accAddr);
		if (v.error) return { error: v.error };
		if (eq(v.t, stock.t)) continue;
		const s = shape(v.t);
		if (s === null) {
			return { error: 'RAM input 0x' + a.toString(16) + ' changes the result in a way that is not understood' };
		}
		gates.push({ ramAddress: a, whenZero: { hitThresholdAtFullAccuracy: s } });
	}
	if (gates.length) model.conditional = gates;
	return { model, detail: { accuracies: ACCURACIES, thresholds: stock.t, accuracyAddress: accAddr } };
}

interface SideResult { error?: string; selector: number; bits: string; basis: string }

function categorySide(rom: Buffer, budget: Budget, entryAt: number, entryLength: number): SideResult {
	const fail = (error: string): SideResult => ({ error, selector: -1, bits: '', basis: '' });
	let powerAddr = -1;
	for (let i = 0; i + 2 < entryLength; i++) {
		if (byteAt(rom, entryAt + i) === 0x21) {
			powerAddr = byteAt(rom, entryAt + i + 1) | (byteAt(rom, entryAt + i + 2) << 8);
			i += 2;
		}
	}
	if (powerAddr < 0xc000) return fail('the move power address was not found');
	const decide = (set: RamSet): { error?: string, special: boolean, reads: number[] } => {
		const bad = (error: string) => ({ error, special: false, reads: [] });
		if (budget.steps <= 0) return bad('the emulation budget was used up');
		const cpu = startCpu(rom, entryAt, set);
		try {
			while (cpu.steps < RUN_STEPS) {
				if (cpu.pc === SENTINEL) return bad('the routine returned before deciding');
				if (cpu.io) return bad('the routine touched hardware registers');
				const at = cpu.offset();
				const op = byteAt(rom, at);
				if (cpu.sp === 0xdff0 && at >= entryAt + entryLength && (op & 0xe7) === 0x20) {
					if (byteAt(rom, at + 1) > 127) return bad('the deciding jump goes backwards');
					return { special: cpu.cond((op >> 3) & 3), reads: cpu.reads };
				}
				cpu.step();
			}
		} catch (err) {
			return bad(errorText(err));
		} finally {
			spend(budget, cpu);
		}
		return bad('the routine did not finish');
	};
	const base = decide({});
	if (base.error) return fail(base.error);
	const reads = [...new Set(base.reads)].filter(a => a >= 0xc000 && a < 0xdf00 && a !== powerAddr);
	let selector = -1;
	let picture = '';
	for (const a of reads) {
		let bits = '';
		for (let v = 0; v < 256; v++) {
			const r = decide({ [a]: v });
			if (r.error) return fail(r.error);
			bits += r.special ? '1' : '0';
		}
		if (/^0+$|^1+$/.test(bits)) continue;
		if (selector >= 0) return fail('two inputs change the physical/special decision');
		selector = a;
		picture = bits;
	}
	if (selector < 0) return fail('no input changes the physical/special decision');
	return { selector, bits: picture, basis: selector === powerAddr + 1 ? 'type' : 'other' };
}

function categoryModel(
	rom: Buffer, budget: Budget, playerAt: number, enemyAt: number, entryLength: number
): ModelOutcome {
	const player = categorySide(rom, budget, playerAt, entryLength);
	if (player.error) return { error: 'player side: ' + player.error };
	const enemy = categorySide(rom, budget, enemyAt, entryLength);
	if (enemy.error) return { error: 'enemy side: ' + enemy.error };
	if (player.bits !== enemy.bits || player.basis !== enemy.basis) {
		return { error: 'the player and enemy sides decide differently' };
	}
	const ids: number[] = [];
	for (let v = 0; v < 256; v++) if (player.bits[v] === '1') ids.push(v);
	const threshold = /^0*1+$/.test(player.bits) ? player.bits.indexOf('1') : null;
	if (player.basis === 'type') {
		const model = threshold !== null ? { basis: 'type', specialFromTypeId: threshold } :
			{ basis: 'type', specialTypeIds: ids.filter(v => v < 0x40) };
		return { model, detail: { typeAddress: player.selector } };
	}
	if (threshold !== null) return { error: 'the decision follows a threshold on a value that is not the move type' };
	return {
		model: { basis: 'move', specialMoveIds: ids },
		detail: { moveIdAddressPlayer: player.selector, moveIdAddressEnemy: enemy.selector },
	};
}

function healModel(rom: Buffer, budget: Budget, start: number): ModelOutcome {
	let failAt = -1;
	const fails = (hp: number, max: number): boolean | null => {
		if (budget.steps <= 0) return null;
		const cpu = startCpu(rom, start, {});
		cpu.ram[0xc100] = hp >> 8;
		cpu.ram[0xc101] = hp & 255;
		cpu.ram[0xc200] = max >> 8;
		cpu.ram[0xc201] = max & 255;
		cpu.d = 0xc1;
		cpu.e = 0;
		cpu.h = 0xc2;
		cpu.l = 0;
		try {
			while (cpu.steps < 24) {
				const at = cpu.offset();
				const op = byteAt(rom, at);
				if (op === 0xca && (failAt < 0 || at === failAt)) {
					if (failAt < 0) failAt = at;
					return cpu.fz();
				}
				if (op === 0xcd || op === 0xc9) return failAt < 0 ? null : false;
				cpu.step();
			}
		} catch {
			return null;
		} finally {
			spend(budget, cpu);
		}
		return failAt < 0 ? null : false;
	};
	const full = fails(300, 300);
	const one = fails(299, 300);
	const big = fails(1, 300);
	const gap255 = fails(45, 300);
	const gap511 = fails(88, 599);
	const gap256 = fails(44, 300);
	if (full !== true || one !== false || big !== false || gap256 !== false || gap255 === null || gap511 === null ||
		gap255 !== gap511) {
		return { error: 'the HP comparison does not behave like "fail at full HP"' };
	}
	return { model: { failsAtGap255or511: gap255 }, detail: {} };
}

interface Pattern { bytes: Buffer; mask: Uint8Array; n: number; needle: Buffer; needleAt: number }

function parsePat(cache: Map<string, Pattern>, text: string): Pattern {
	const known = cache.get(text);
	if (known) return known;
	const n = text.length >> 1;
	const bytes = Buffer.alloc(n);
	const mask = new Uint8Array(n);
	let bestStart = 0;
	let bestLen = 0;
	let runStart = 0;
	let runLen = 0;
	for (let i = 0; i < n; i++) {
		const h = text.substr(i * 2, 2);
		if (h === '..') {
			runLen = 0;
			runStart = i + 1;
			continue;
		}
		bytes[i] = parseInt(h, 16);
		mask[i] = 1;
		runLen++;
		if (runLen > bestLen) {
			bestLen = runLen;
			bestStart = runStart;
		}
	}
	const p = { bytes, mask, n, needle: bytes.subarray(bestStart, bestStart + bestLen), needleAt: bestStart };
	cache.set(text, p);
	return p;
}

class Scanner {
	rom: Buffer;
	budget: Budget;
	patterns = new Map<string, Pattern>();
	regexes = new Map<string, RegExp>();
	constructor(rom: Buffer, budget: Budget) {
		this.rom = rom;
		this.budget = budget;
	}
	regex(source: string): RegExp {
		let re = this.regexes.get(source);
		if (!re) {
			re = new RegExp(source);
			this.regexes.set(source, re);
		}
		return re;
	}
	matchAt(off: number, text: string): boolean {
		const p = parsePat(this.patterns, text);
		if (off < 0 || off + p.n > this.rom.length) return false;
		for (let i = 0; i < p.n; i++) if (p.mask[i] && this.rom[off + i] !== p.bytes[i]) return false;
		return true;
	}
	mismatches(off: number, text: string): number {
		const p = parsePat(this.patterns, text);
		let bad = 0;
		for (let i = 0; i < p.n; i++) if (p.mask[i] && byteAt(this.rom, off + i) !== p.bytes[i]) bad++;
		return bad;
	}
	findAll(text: string, limit = 8): number[] {
		const p = parsePat(this.patterns, text);
		const hits: number[] = [];
		if (!p.needle.length) return hits;
		let from = 0;
		while (hits.length < limit) {
			const at = this.rom.indexOf(p.needle, from);
			if (at < 0) break;
			if (--this.budget.search < 0) throw new BudgetError('the signature search budget was used up');
			from = at + 1;
			if (this.matchAt(at - p.needleAt, text)) hits.push(at - p.needleAt);
		}
		return hits;
	}
	routineHash(at: number, count: number, level: number): { hash: string, imm: [number, number][] } {
		const imm: [number, number][] = [];
		if (at < 0) return { hash: '', imm };
		const hash = crypto.createHash('sha256');
		let cursor = at;
		for (let n = 0; n < count; n++) {
			if (cursor + 3 > this.rom.length) return { hash: '', imm: [] };
			const i = decode(this.rom, cursor);
			let text = i.text;
			if (i.kind === 'a16' || i.kind === 'd16') text = text.replace(/\$[0-9a-f]{4}/, 'A');
			else if (i.kind === 'a8') text = text.replace(/\$[0-9a-f]{2}/, 'H');
			else if (i.kind === 'd8') imm.push([n, this.rom[cursor + 1]]);
			if (text.startsWith('rst ')) text = 'call A';
			if (level >= 2 && (i.kind === 'rel' || i.kind === 'd8')) text = text.replace(/\$[0-9a-f]{2}/, 'N');
			hash.update(text + ';');
			cursor += i.len;
		}
		return { hash: hash.digest('hex').slice(0, 24), imm };
	}
}

function bankOffset(pos: number, pointer: number): number {
	if (pointer < 0x4000) return pointer;
	if (pointer >= 0x8000) return -1;
	return (pos >> 14) * 0x4000 + pointer - 0x4000;
}

function validMoveList(v: unknown): boolean {
	if (!Array.isArray(v) || v.length < 1 || v.length > 24) return false;
	return v.every(m => m >= 1 && m <= 0xfe) && new Set(v).size === v.length;
}
function validStatTable(v: unknown): boolean {
	if (!Array.isArray(v) || v.length !== 13) return false;
	let last = 0;
	for (const [num, den] of v as [number, number][]) {
		if (!num || !den || num / den <= last) return false;
		last = num / den;
	}
	return v[6][0] === v[6][1] && v[0][0] / v[0][1] >= 0.1 && v[12][0] / v[12][1] <= 10;
}
function validTypeChart(v: unknown): boolean {
	if (!Array.isArray(v) || v.length < 20 || v.length > 600) return false;
	return (v as number[][]).every(t => t[0] < 0x40 && t[1] < 0x40 && t[2] <= 40 && t[2] !== 10);
}
function isValid(probe: ProbeDef, value: unknown): boolean {
	const valid = probe.valid;
	if (!valid) return true;
	if (valid === 'moveList') return validMoveList(value);
	if (valid === 'statTable') return validStatTable(value);
	if (valid === 'typeChart') return validTypeChart(value);
	if (typeof value !== 'number') return false;
	if (valid.in) return valid.in.includes(value);
	if (valid.range) return Number.isInteger(value) && value >= valid.range[0] && value <= valid.range[1];
	return true;
}

interface ReadOut { value: unknown; bad?: string; tableAt?: number }

function readValue(scan: Scanner, probe: ProbeDef, pos: number): ReadOut {
	const rom = scan.rom;
	if (probe.kind === 'imm') {
		const i = decode(rom, pos);
		return { value: i.len === 3 ? byteAt(rom, pos + 1) | (byteAt(rom, pos + 2) << 8) : byteAt(rom, pos + 1) };
	}
	if (probe.kind === 'run') {
		const runRe = scan.regex(probe.runRe || '^$');
		const countRe = scan.regex(probe.countRe || '^$');
		let at = pos;
		let count = 0;
		for (let n = 0; n < 16; n++) {
			const i = decode(rom, at);
			if (!runRe.test(i.text)) break;
			if (countRe.test(i.text)) count++;
			at += i.len;
		}
		if (probe.after && !scan.regex(probe.after).test(decode(rom, at).text)) {
			return { value: count, bad: 'the code after the shifts is not the stock code' };
		}
		return { value: count };
	}
	if (probe.kind === 'table') {
		const pointer = byteAt(rom, pos + 1) | (byteAt(rom, pos + 2) << 8);
		const at = bankOffset(pos, pointer);
		if (at < 0 || at >= rom.length) return { value: null, bad: 'pointer leaves the ROM' };
		if (probe.decode === 'list8') {
			const out: number[] = [];
			for (let i = 0; i < 32 && byteAt(rom, at + i) !== 0xff; i++) out.push(byteAt(rom, at + i));
			return { value: out, tableAt: at };
		}
		if (probe.decode === 'pairs13') {
			const out: [number, number][] = [];
			for (let i = 0; i < 13; i++) out.push([byteAt(rom, at + i * 2), byteAt(rom, at + i * 2 + 1)]);
			return { value: out, tableAt: at };
		}
		if (probe.decode === 'triples') {
			const out: [number, number, number][] = [];
			let cursor = at;
			let skipped = 0;
			while (out.length < 601 && skipped < 64 && byteAt(rom, cursor) !== 0xff) {
				if (rom[cursor] === 0xfe) {
					cursor++;
					skipped++;
					continue;
				}
				out.push([byteAt(rom, cursor), byteAt(rom, cursor + 1), byteAt(rom, cursor + 2)]);
				cursor += 3;
			}
			return { value: out, tableAt: at };
		}
	}
	return { value: true };
}

interface Located { pos: number; all?: number[]; how: string; agreed?: boolean; entry: BaseProbe }

function locate(scan: Scanner, probe: ProbeDef, entries: BaseProbe[], base: BaseTable | null): Located | null {
	const sides: ('full' | 'pre' | 'post')[] = ['full', 'pre', 'post'];
	if (base) {
		const e = base.probes[probe.id];
		if (e?.off !== undefined) {
			for (const which of sides) {
				const p = e[which];
				if (!p || !scan.matchAt(e.off - p.lead, p.pat)) continue;
				const agreed = which === 'pre' && !!e.post && scan.matchAt(e.off - e.post.lead, e.post.pat);
				return { pos: e.off, how: 'offset:' + which, agreed, entry: e };
			}
		}
	}
	const seen = new Set<string>();
	const found: { which: string, hits: number[], entry: BaseProbe }[] = [];
	for (const e of entries) {
		for (const which of sides) {
			const p = e[which];
			if (!p) continue;
			const key = which + p.pat;
			if (seen.has(key)) continue;
			seen.add(key);
			let hits = scan.findAll(p.pat).map(h => h + p.lead);
			if (p.count) hits = hits.length === p.count ? [hits[p.nth || 0]] : [];
			if (hits.length) found.push({ which, hits, entry: e });
		}
	}
	if (!found.length) return null;
	const side = (which: string) => {
		const out: number[] = [];
		for (const f of found) {
			if (f.which !== which) continue;
			for (const hit of f.hits) if (!out.includes(hit)) out.push(hit);
		}
		return out;
	};
	const pre = side('pre');
	const post = side('post');
	if (!side('full').length && pre.length === 1 && post.length === 1 && pre[0] === post[0]) {
		return { pos: pre[0], how: 'signature:pre', agreed: true, entry: found[0].entry };
	}
	for (const which of sides) {
		const positions = side(which);
		if (!positions.length) continue;
		const first = found.find(f => f.which === which);
		const entry = first ? first.entry : found[0].entry;
		return { pos: positions[0], all: positions, how: 'signature:' + which, entry };
	}
	return null;
}

interface Examined {
	layout: string | null;
	engine: boolean;
	offsetMatchRate: number;
	closestBase: string | null;
	results: Gen1Probe[];
}

const isRead = (r: Gen1Probe | undefined): boolean => !!r && (r.status === 'same' || r.status === 'changed');

function examine(rom: Buffer, budget: Budget, baseTitle: string): Examined {
	const scan = new Scanner(rom, budget);
	const romTitle = rom.toString('latin1', 0x134, 0x143);
	let best: BaseTable | null = null;
	let bestRate = 0;
	const bases = signatures().bases;
	for (const base of bases) {
		let hit = 0;
		let total = 0;
		for (const probe of DEFS) {
			const e = base.probes[probe.id];
			if (!e?.full || e.off === undefined) continue;
			total++;
			if (scan.matchAt(e.off - e.full.lead, e.full.pat)) hit++;
		}
		const rate = total ? hit / total : 0;
		const titled = romTitle.startsWith(base.title) || baseTitle.startsWith(base.title);
		if (rate > bestRate || (rate === bestRate && rate > 0 && titled)) {
			bestRate = rate;
			best = base;
		}
	}
	const layout = bestRate >= 0.5 ? best : null;
	const results: Gen1Probe[] = [];
	let readable = 0;
	for (const probe of DEFS) {
		const last = results.length - 1;
		if (last >= 0 && (isRead(results[last]) || DEFS[last].kind === 'model')) readable++;
		if (readable + DEFS.length - results.length < DEFS.length / 2) break;
		const entries = bases.map(b => b.probes[probe.id]).filter(Boolean);
		const own = layout ? layout.probes[probe.id] : undefined;
		const stock = own || entries[0];
		const r: Gen1Probe = { id: probe.id, status: 'notfound', base: stock ? stock.value : undefined, hack: undefined };
		results.push(r);
		if (probe.kind === 'model') continue;
		if (probe.kind === 'code') {
			const tries: [BaseProbe, number[] | null][] = [];
			if (own?.off !== undefined) tries.push([own, [own.off]]);
			for (const e of entries) tries.push([e, null]);
			let done = false;
			for (const level of ['exact', 'loose'] as const) {
				for (const [e, fixed] of tries) {
					const count = e.count || 0;
					const wanted = e[level];
					const hits = (fixed || scan.findAll(e.anchor || '', 64))
						.filter(at => scan.routineHash(at, count, level === 'exact' ? 0 : 2).hash === wanted);
					if (hits.length !== 1) continue;
					const now = scan.routineHash(hits[0], count, 2).imm;
					const diffs = (e.imm || [])
						.map(([n, value], k) => ({ instruction: n, base: value, hack: now[k] ? now[k][1] : -1 }))
						.filter(d => d.base !== d.hack);
					r.at = hits[0];
					r.how = (fixed ? 'offset:' : 'signature:') + level;
					r.hack = diffs.length ? diffs : r.base;
					r.status = diffs.length ? 'changed' : 'same';
					if (diffs.length) r.note = 'same instructions, different constants';
					done = true;
					break;
				}
				if (done) break;
			}
			if (!done && own?.off !== undefined) {
				r.status = 'unreadable';
				r.note = `the stock routine at 0x${own.off.toString(16)} was rewritten and is nowhere else`;
			}
			continue;
		}
		if (probe.kind === 'block') {
			const found = new Set<number>();
			if (own?.off !== undefined && scan.routineHash(own.off, own.count || 0, 2).hash === own.loose) {
				found.add(own.off);
			}
			for (const e of found.size ? [] : entries) {
				for (const hit of scan.findAll(e.anchor || '', 64)) {
					for (const lead of e.leads || []) {
						if (scan.routineHash(hit - lead, e.count || 0, 2).hash === e.loose) found.add(hit - lead);
					}
				}
			}
			if (found.size === 1) {
				r.at = [...found][0];
				r.how = 'instructions';
				r.status = 'same';
				r.hack = r.base;
			} else if (layout) {
				r.status = 'unreadable';
				r.note = 'the stock logic is not there any more';
			}
			continue;
		}
		const where = locate(scan, probe, entries, layout);
		if (!where) {
			if (own?.off !== undefined && own.full) {
				const bad = scan.mismatches(own.off - own.full.lead, own.full.pat);
				r.status = 'unreadable';
				const size = own.full.pat.length >> 1;
				r.note = `the stock code at 0x${own.off.toString(16)} was rewritten (${bad} of ${size} ` +
					'signature bytes differ) and the signature is nowhere else';
			}
			continue;
		}
		r.at = where.pos;
		r.how = where.how;
		if (probe.kind === 'present') {
			const full = where.entry.full;
			r.length = full ? (full.pat.length >> 1) - full.lead : 0;
			r.status = 'same';
			r.hack = r.base;
			continue;
		}
		const reads = (where.all || [where.pos]).map(pos => readValue(scan, probe, pos));
		const first = reads[0];
		if (reads.some(x => !eq(x.value, first.value))) {
			r.status = 'unreadable';
			const seen = reads.map(x => JSON.stringify(x.value)).join(' / ');
			r.note = 'the signature matches several places that disagree: ' + seen;
			continue;
		}
		if (first.bad || !isValid(probe, first.value)) {
			r.status = 'unreadable';
			r.raw = first.value;
			r.note = first.bad || 'the value read fails the sanity check';
			continue;
		}
		if (!eq(first.value, r.base) && probe.kind !== 'table' && /:(pre|post)$/.test(where.how) && !where.agreed) {
			r.status = 'unreadable';
			r.raw = first.value;
			r.note = `read ${JSON.stringify(first.value)}, but only one side of the surrounding code is stock, ` +
				'so the place is not certain';
			continue;
		}
		r.hack = first.value;
		if (first.tableAt !== undefined) r.tableAt = first.tableAt;
		r.status = eq(first.value, r.base) ? 'same' : 'changed';
	}
	if (results.length < DEFS.length) {
		const missing: Gen1Probe[] = DEFS.map(probe => {
			const stock = bases[0].probes[probe.id];
			return {
				id: probe.id, status: 'notfound', base: stock ? stock.value : undefined, hack: undefined,
				note: 'this ROM does not contain the Gen 1 battle engine',
			};
		});
		return { layout: null, engine: false, offsetMatchRate: 0, closestBase: null, results: missing };
	}
	const by: { [id: string]: Gen1Probe } = {};
	for (const r of results) by[r.id] = r;
	const model = (id: string, needs: string[], fn: () => ModelOutcome) => {
		const r = by[id];
		if (!r) return;
		if (needs.some(n => !isRead(by[n]) || by[n].at === undefined)) {
			r.status = by[needs[0]]?.status === 'unreadable' ? 'unreadable' : 'notfound';
			r.note = 'needs ' + needs.join(' + ');
			return;
		}
		const out = fn();
		if ('error' in out) {
			r.status = 'unreadable';
			r.note = out.error;
			return;
		}
		r.hack = out.model;
		r.detail = out.detail;
		r.how = 'emulated';
		r.status = r.base === undefined || eq(r.base, r.hack) ? 'same' : 'changed';
	};
	const at = (id: string) => by[id].at || 0;
	const len = (id: string) => by[id].length || 0;
	model('critModel', ['critEntry', 'critHighMoves'],
		() => critModel(rom, budget, at('critEntry'), len('critEntry'), by.critHighMoves.hack));
	model('accuracyModel', ['accuracyEntry'], () => accuracyModel(rom, budget, at('accuracyEntry') + 3));
	model('healModel', ['healEntry'], () => healModel(rom, budget, at('healEntry') + len('healEntry')));
	model('categoryModel', ['damageVarsEntryPlayer', 'damageVarsEntryEnemy'], () => categoryModel(
		rom, budget, at('damageVarsEntryPlayer'), at('damageVarsEntryEnemy'), len('damageVarsEntryPlayer')
	));
	for (const probe of DEFS) {
		if (!probe.requires) continue;
		const r = by[probe.id];
		const need = by[probe.requires];
		if (isRead(r) && need && need.status !== 'same') {
			r.status = need.status === 'notfound' ? 'notfound' : 'unreadable';
			r.raw = r.hack;
			r.hack = undefined;
			r.note = `read ${r.raw}, but ${probe.requires} is not the stock logic, so the value alone would mislead`;
		}
	}
	const groups = new Map<string, Gen1Probe[]>();
	DEFS.forEach((probe, i) => {
		if (!probe.group) return;
		const members = groups.get(probe.group) || [];
		members.push(results[i]);
		groups.set(probe.group, members);
	});
	for (const [name, members] of groups) {
		const read = members.filter(isRead);
		if (read.length > 1 && read.some(m => !eq(m.hack, read[0].hack))) {
			const text = read.map(x => JSON.stringify(x.hack)).join(' / ');
			for (const m of read) {
				m.status = 'unreadable';
				m.note = `the two sides of ${name} disagree: ` + text;
			}
		}
	}
	const located = results.filter(isRead).length / results.length;
	if (located < 0.5) {
		for (const r of results) {
			r.status = 'notfound';
			r.hack = undefined;
			r.note = 'this ROM does not contain the Gen 1 battle engine';
			delete r.at;
			delete r.how;
			delete r.raw;
			delete r.length;
			delete r.tableAt;
			delete r.detail;
		}
		return { layout: null, engine: false, offsetMatchRate: 0, closestBase: null, results };
	}
	return {
		layout: layout ? layout.name : null,
		engine: true,
		offsetMatchRate: Math.round(bestRate * 1000) / 1000,
		closestBase: best ? best.name : null,
		results,
	};
}

const STOCK_TYPES: { [id: number]: string } = {
	0: 'Normal', 1: 'Fighting', 2: 'Flying', 3: 'Poison', 4: 'Ground', 5: 'Rock', 6: 'Bird', 7: 'Bug', 8: 'Ghost',
	0x14: 'Fire', 0x15: 'Water', 0x16: 'Grass', 0x17: 'Electric', 0x18: 'Psychic', 0x19: 'Ice', 0x1a: 'Dragon',
};
const STOCK_SPECIAL_TYPES = ['Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon'];
const STOCK_HIGH_CRIT: { [id: number]: string } = { 2: 'karatechop', 75: 'razorleaf', 152: 'crabhammer', 163: 'slash' };
const BASE_NAMES: { [name: string]: string } = { pokered: 'Red', pokeblue: 'Blue', pokeyellow: 'Yellow' };
const SIDE_EFFECTS: [string, string[], number[]][] = [
	['poisonChance1', ['poisonChance1'], [0x02, 0x4d]],
	['poisonChance2', ['poisonChance2'], [0x21]],
	['statusChance1', ['statusChance1', 'statusChance1Enemy'], [0x04, 0x05, 0x06]],
	['statusChance2', ['statusChance2', 'statusChance2Enemy'], [0x22, 0x23, 0x24]],
	['flinchChance1', ['flinchChance1'], [0x1f]],
	['flinchChance2', ['flinchChance2'], [0x25]],
	['confusionSideChance', ['confusionSideChance'], [0x4c]],
	['statDownSideChance', ['statDownSideChance'], [0x44, 0x45, 0x46, 0x47]],
];
const INFO_PROBES: [string, string[]][] = [
	['typeEffectDivisor', ['typeEffectDivisor']],
	['specialTypeMin', ['specialTypeMin', 'specialTypeMinEnemy']],
	['critDoublesLevel', ['critDoublesLevel']],
	['toxicRamp', ['toxicRamp']],
	['drainHalf', ['drainHalf']],
	['badgeBoostShift', ['badgeBoostShift']],
	['statFormulaDivisor', ['statFormulaDivisor']],
	['statFormulaBonus', ['statFormulaBonus']],
	['statFormulaHPBonus', ['statFormulaHPBonus']],
	['dvMask', ['dvMask']],
	['maxLevel', ['maxLevel']],
	['damageCap999', ['damageCap999']],
	['explosionHalvesDefense', ['explosionHalvesDefense']],
	['reflectDoublesDefense', ['reflectDoublesDefense']],
	['healFailBug', ['healFailBug']],
	['critEntry', ['critEntry']],
	['accuracyEntry', ['accuracyEntry']],
	['damageVarsEntry', ['damageVarsEntryPlayer', 'damageVarsEntryEnemy']],
	['healEntry', ['healEntry']],
];

type Getter = (id: string) => any;
type Convert = (v: Getter) => unknown;

function fractionOfShift(n: number): Gen1Fraction | undefined {
	return Number.isInteger(n) && n >= 0 && n <= 8 ? [1, 1 << n] : undefined;
}
function range(min: number, max: number): Gen1Range | undefined {
	return Number.isInteger(min) && Number.isInteger(max) && min >= 0 && max >= min ? [min, max] : undefined;
}
function gcd(a: number, b: number): number {
	return b ? gcd(b, a % b) : a;
}
type Weights = [number, number, number, number];

function rollWeights(mask1: number, threshold: number, mask2: number, add: number): Weights | undefined {
	const weights = [0, 0, 0, 0];
	const put = (hits: number, weight: number) => {
		if (hits < 2 || hits > 5) return false;
		weights[hits - 2] += weight;
		return true;
	};
	for (let r1 = 0; r1 <= mask1; r1++) {
		if (r1 < threshold) {
			if (!put(r1 + add, mask2 + 1)) return undefined;
		} else {
			for (let r2 = 0; r2 <= mask2; r2++) if (!put(r2 + add, 1)) return undefined;
		}
	}
	const divisor = weights.reduce(gcd, 0);
	if (!divisor) return undefined;
	return [weights[0] / divisor, weights[1] / divisor, weights[2] / divisor, weights[3] / divisor];
}

const LEAVES: [string, string[], Convert][] = [
	['stab', ['stabShift'], v => 1 + 1 / (1 << v('stabShift'))],
	['damageRoll', ['damageRollMin'], v => ({ min: v('damageRollMin'), max: 255, den: 255 })],
	['damageLevelDivisor', ['damageLevelDivisor'], v => v('damageLevelDivisor')],
	['statStages', ['statStages'], v => v('statStages')],
	['accuracyStages', ['statStagesAccuracy'], v => v('statStagesAccuracy')],
	['multiHit', ['multiHitMask1', 'multiHitThreshold', 'multiHitMask2', 'multiHitAdd'],
		v => rollWeights(v('multiHitMask1'), v('multiHitThreshold'), v('multiHitMask2'), v('multiHitAdd'))],
	['trapHits', ['trapMask1', 'trapThreshold', 'trapMask2', 'trapAdd'],
		v => rollWeights(v('trapMask1'), v('trapThreshold'), v('trapMask2'), v('trapAdd') + 1)],
	['sleepTurns', ['sleepTurnsMask'], v => range(1, v('sleepTurnsMask'))],
	['restSleepTurns', ['restSleepTurns'], v => v('restSleepTurns')],
	['confusionTurns', ['confusionTurnsMask', 'confusionTurnsAdd'],
		v => range(v('confusionTurnsAdd') - 1, v('confusionTurnsAdd') + v('confusionTurnsMask') - 1)],
	['confusionSelfHitChance', ['confusionSelfHitThreshold', 'confusionSelfHitThresholdEnemy'],
		v => [256 - v('confusionSelfHitThreshold'), 256]],
	['confusionSelfHitPower', ['confusionSelfHitPower'], v => v('confusionSelfHitPower')],
	['fullParalysisChance', ['fullParalysisThreshold', 'fullParalysisThresholdEnemy'],
		v => [v('fullParalysisThreshold'), 256]],
	['paralysisSpeed', ['paralysisSpeedShift', 'paralysisSpeedShiftPlayer'], v => 1 / (1 << v('paralysisSpeedShift'))],
	['burnAttack', ['burnAttackShift', 'burnAttackShiftPlayer'], v => 1 / (1 << v('burnAttackShift'))],
	['burnDamage', ['residualDamageShift'], v => fractionOfShift(v('residualDamageShift'))],
	['poisonDamage', ['residualDamageShift'], v => fractionOfShift(v('residualDamageShift'))],
	['toxicStep', ['residualDamageShift', 'toxicRamp'], v => fractionOfShift(v('residualDamageShift'))],
	['leechSeedDamage', ['residualDamageShift'], v => fractionOfShift(v('residualDamageShift'))],
	['disableTurns', ['disableTurnsMask'], v => range(1, v('disableTurnsMask') + 1)],
	['thrashTurns', ['thrashTurnsMask', 'thrashTurnsAdd'],
		v => range(v('thrashTurnsAdd'), v('thrashTurnsAdd') + v('thrashTurnsMask'))],
	['bideTurns', ['bideTurnsMask', 'bideTurnsAdd'],
		v => range(v('bideTurnsAdd'), v('bideTurnsAdd') + v('bideTurnsMask'))],
	['healMoveFraction', ['healShift'], v => fractionOfShift(v('healShift'))],
	['recoilFractions.quarter', ['recoilShift', 'recoilShift2'],
		v => fractionOfShift(v('recoilShift') + v('recoilShift2'))],
	['struggleRecoil', ['recoilShift'], v => fractionOfShift(v('recoilShift'))],
	['substituteCost', ['substituteShift'], v => fractionOfShift(v('substituteShift'))],
	['superFangFraction', ['superFangHalf', 'superFangHalfEnemy'], () => [1, 2]],
	['sonicBoomDamage', ['sonicBoomDamage', 'sonicBoomDamageEnemy'], v => v('sonicBoomDamage')],
	['dragonRageDamage', ['dragonRageDamage', 'dragonRageDamageEnemy'], v => v('dragonRageDamage')],
	['invulnerabilityGlitch', ['statusClearMask', 'statusClearMaskEnemy'], v => (v('statusClearMask') & 0x40) !== 0],
];

function aggregate(probes: (Gen1Probe | undefined)[]): Gen1Status {
	if (probes.some(p => !p)) return 'notfound';
	if (probes.some(p => p!.status === 'unreadable' || p!.status === 'dead')) return 'unreadable';
	if (probes.some(p => p!.status === 'notfound')) return 'notfound';
	return probes.some(p => p!.status === 'changed') ? 'changed' : 'same';
}
function setPath(target: { [key: string]: any }, path: string, value: unknown) {
	const parts = path.split('.');
	let node = target;
	for (let i = 0; i + 1 < parts.length; i++) {
		if (!node[parts[i]] || typeof node[parts[i]] !== 'object') node[parts[i]] = {};
		node = node[parts[i]];
	}
	node[parts[parts.length - 1]] = value;
}
function sameSet(a: string[], b: string[]): boolean {
	return a.length === b.length && a.every(x => b.includes(x));
}
function emptyExtras(probes: Gen1Probe[]): Gen1Extras {
	const counts = { same: 0, changed: 0, unreadable: 0, notfound: 0 };
	for (const p of probes) if (p.status !== 'dead') counts[p.status]++;
	return {
		layout: null, closestBase: null, offsetMatchRate: 0, counts, probes, typeChartRaw: null, highCritMoveIds: null,
		typeChartUnnamedRows: 0, category: null, critFormula: null, sideEffects: [], priority: null, conditional: [],
		rewrittenRoutines: [],
	};
}
function unknownResult(detail: string, probes: Gen1Probe[], report: Gen1ReportEntry[]): Gen1MechanicsResult {
	const engine: Gen1MechanicsResult['engine'] = { kind: 'unknown', live: false, detail };
	return { engine, values: {}, report, notes: [], extras: emptyExtras(probes) };
}

function buildResult(seen: Examined, names: Gen1Names): Gen1MechanicsResult {
	const by: { [id: string]: Gen1Probe } = {};
	for (const r of seen.results) by[r.id] = r;
	const report: Gen1ReportEntry[] = [];
	const values: { [key: string]: any } = {};
	const notes: string[] = [];
	const extras = emptyExtras(seen.results);
	extras.layout = seen.layout;
	extras.closestBase = seen.closestBase;
	extras.offsetMatchRate = seen.offsetMatchRate;
	const live = seen.engine;
	const baseOf: Getter = id => (by[id] ? by[id].base : undefined);
	const hackOf: Getter = id => (by[id] ? by[id].hack : undefined);
	const safely = (convert: Convert, getter: Getter): unknown => {
		try {
			const value = convert(getter);
			if (typeof value === 'number' && !Number.isFinite(value)) return undefined;
			return value;
		} catch {
			return undefined;
		}
	};
	const leaf = (path: string, status: Gen1Status, base: unknown, hack: unknown) => {
		const entry: Gen1ReportEntry = { id: path, status };
		if (base !== undefined) entry.base = base;
		if ((status === 'same' || status === 'changed') && hack !== undefined) {
			entry.hack = hack;
			if (live && !path.startsWith('info.') && path !== 'typeChart') setPath(values, path, hack);
		}
		report.push(entry);
	};
	const converted = (path: string, ids: string[], convert: Convert) => {
		const base = safely(convert, baseOf);
		let status = aggregate(ids.map(id => by[id]));
		let hack: unknown;
		if (status === 'same' || status === 'changed') {
			hack = safely(convert, hackOf);
			if (hack === undefined) status = 'unreadable';
			else status = eq(hack, base) ? 'same' : 'changed';
		}
		leaf(path, status, base, hack);
	};

	const critBase = baseOf('critModel') || {};
	const crit = by.critModel;
	const critHack = isRead(crit) ? crit.hack : null;
	/*
	 * Run-time-conditional values are deliberately not applied (owner decision, 2026-11-16). Some hacks gate a
	 * mechanic on a RAM flag set by an in-game option: Yellow Legacy Plus does this for its critical hit cap and
	 * for the 1/256 miss. The ROM holds both variants and nothing in it says which one a player picked, so the
	 * value is reported as unreadable, neither variant is applied and the parent generation's default stays.
	 * This covers the critGates below and the accuracyGates further down.
	 */
	const critGates: { ramAddress: number, whenZero: { cap?: number } }[] = critHack?.conditional || [];
	const critFormula: { [key: string]: { rule: CritFit, stock: CritFit } } | null =
		(critHack && crit.detail?.formula) || null;
	extras.critFormula = critFormula;
	for (const key of ['normal', 'high', 'focusEnergy', 'focusEnergyHigh', 'cap']) {
		const path = 'gen1Crit.' + key;
		if (!crit || !critHack) {
			leaf(path, crit ? crit.status : 'notfound', critBase[key], undefined);
		} else if (key === 'cap' && critGates.length) {
			leaf(path, 'unreadable', critBase[key], undefined);
		} else {
			const changed = critHack[key] !== critBase[key];
			leaf(path, changed ? 'changed' : 'same', critBase[key], critHack[key]);
			const fit = critFormula?.[key]?.[changed ? 'rule' : 'stock'];
			if (fit?.mismatches) {
				const against = changed ? `the "base Speed x ${critHack[key]}" rule reported for it.` :
					'the base game; that difference is not applied.';
				notes.push(`For ${fit.mismatches} base Speed values up to ${fit.lastSpeed}, this hack's ` +
					`critical-hit rate for ${CRIT_LABELS[key]} differs by up to ${fit.maxDifference}/256 from ${against}`);
			}
		}
	}
	for (const gate of critGates) {
		extras.conditional.push({ leaf: 'gen1Crit.cap', ramAddress: gate.ramAddress, whenZero: 256, otherwise: 255 });
		notes.push('The critical-hit cap depends on an option that is set inside this game: with one setting a move that ' +
			'is sure to be a critical hit always is one, with the other it still fails 1 time in 256 as in the base game. ' +
			'A battle here cannot see that setting, so neither variant is applied.');
	}

	const highIds: number[] | null = isRead(by.critHighMoves) ? by.critHighMoves.hack : null;
	const stockHighIds = Object.keys(STOCK_HIGH_CRIT).map(Number);
	const stockHigh = stockHighIds.map(id => STOCK_HIGH_CRIT[id]);
	extras.highCritMoveIds = highIds;
	if (!highIds) {
		leaf('highCritMoves', by.critHighMoves ? by.critHighMoves.status : 'notfound', stockHigh, undefined);
	} else if (names.moveId) {
		const listed = highIds.map(id => names.moveId!(id) || '');
		if (listed.some(id => !id)) leaf('highCritMoves', 'unreadable', stockHigh, undefined);
		else leaf('highCritMoves', sameSet(listed, stockHigh) ? 'same' : 'changed', stockHigh, listed);
	} else if (eq(highIds, stockHighIds)) {
		leaf('highCritMoves', 'same', stockHigh, stockHigh);
	} else {
		leaf('highCritMoves', 'unreadable', stockHigh, undefined);
	}

	const accuracy = by.accuracyModel;
	const accuracyHack = isRead(accuracy) ? accuracy.hack : null;
	const accuracyGates: { ramAddress: number, whenZero: { hitThresholdAtFullAccuracy: number } }[] =
		accuracyHack?.conditional || [];
	const missBase = baseOf('accuracyModel')?.hitThresholdAtFullAccuracy === 255;
	if (!accuracy || !accuracyHack) {
		leaf('miss1in256', accuracy ? accuracy.status : 'notfound', missBase, undefined);
	} else if (accuracyGates.length) {
		leaf('miss1in256', 'unreadable', missBase, undefined);
	} else {
		const miss = accuracyHack.hitThresholdAtFullAccuracy === 255;
		leaf('miss1in256', miss === missBase ? 'same' : 'changed', missBase, miss);
	}
	for (const gate of accuracyGates) {
		const whenZero = gate.whenZero.hitThresholdAtFullAccuracy === 255;
		const otherwise = accuracyHack.hitThresholdAtFullAccuracy === 255;
		extras.conditional.push({ leaf: 'miss1in256', ramAddress: gate.ramAddress, whenZero, otherwise });
		const text = (miss: boolean) => 'a 100% accurate move ' + (miss ? 'misses 1 time in 256' : 'never misses');
		notes.push('The 1/256 miss depends on an option that is set inside this game: ' +
			`with one setting ${text(whenZero)}, with the other ${text(otherwise)}. ` +
			'A battle here cannot see that setting, so neither variant is applied.');
	}

	const heal = by.healModel;
	const healBase = baseOf('healModel')?.failsAtGap255or511;
	if (isRead(heal)) {
		const fails = heal.hack.failsAtGap255or511;
		leaf('healFailsAtGap255', fails === healBase ? 'same' : 'changed', healBase, fails);
	} else {
		leaf('healFailsAtGap255', heal ? heal.status : 'notfound', healBase, undefined);
	}

	const chartProbe = by.typeChart;
	const divisorStatus = by.typeEffectDivisor ? by.typeEffectDivisor.status : 'notfound';
	const chartRaw: [number, number, number][] | null =
		isRead(chartProbe) && divisorStatus !== 'unreadable' ? chartProbe.hack : null;
	extras.typeChartRaw = chartRaw;
	const chartIds = new Set<number>();
	for (const [attack, defend] of chartRaw || []) {
		chartIds.add(attack);
		chartIds.add(defend);
	}
	const typeName = (id: number): string => {
		const name = names.typeName ? names.typeName(id) : STOCK_TYPES[id];
		return name && name !== '???' ? name : '';
	};
	const idsByName = new Map<string, number[]>();
	for (let id = 0; id < 0x40; id++) {
		const name = typeName(id);
		if (!name) continue;
		const list = idsByName.get(name) || [];
		list.push(id);
		idsByName.set(name, list);
	}
	const unnamedInChart = [...chartIds].some(id => !typeName(id));
	const matchups = (rows: [number, number, number][], name: (id: number) => string) => rows.map(
		([attack, defend, multiplier]) => ({ attack: name(attack), defend: name(defend), multiplier: multiplier / 10 })
	);
	const chartBase = matchups(baseOf('typeChart') || [], id => STOCK_TYPES[id] || '');
	let typeChart: Gen1TypeMatchup[] | undefined;
	let typeChartInfo: Gen1MechanicsResult['typeChartInfo'];
	if (!chartRaw) {
		const status = isRead(chartProbe) ? 'unreadable' : chartProbe ? chartProbe.status : 'notfound';
		leaf('typeChart', status, chartBase, undefined);
	} else if (unnamedInChart && !names.typeName) {
		leaf('typeChart', 'unreadable', chartBase, undefined);
	} else {
		const named = chartRaw.filter(([attack, defend]) => typeName(attack) && typeName(defend));
		extras.typeChartUnnamedRows = chartRaw.length - named.length;
		const supported = named.filter(row => row[2] === 0 || row[2] === 5 || row[2] === 20);
		const unsupported = named.filter(row => !supported.includes(row));
		const typeNames: string[] = [];
		for (const [name, ids] of idsByName) {
			for (const id of ids) if (id === ids[0] || chartIds.has(id)) typeNames[id] = name;
		}
		for (let id = 0; id < typeNames.length; id++) typeNames[id] = typeNames[id] || '';
		typeChartInfo = { typeNames, reference: 'base' };
		if (unsupported.length) typeChartInfo.unsupported = matchups(unsupported, typeName);
		if (live) typeChart = matchups(supported, typeName);
		leaf('typeChart', chartProbe.status, chartBase, matchups(named, typeName));
	}

	const category = by.categoryModel;
	const categoryBase: Gen1Category = { basis: 'type', specialTypes: STOCK_SPECIAL_TYPES };
	if (!isRead(category)) {
		leaf('category', category ? category.status : 'notfound', categoryBase, undefined);
	} else if (category.hack.basis === 'move') {
		const ids: number[] = category.hack.specialMoveIds;
		extras.category = { basis: 'move', specialMoveIds: ids };
		if (names.moveId) {
			const listed: string[] = [];
			for (const id of ids) {
				const move = names.moveId(id);
				if (move && !listed.includes(move)) listed.push(move);
			}
			leaf('category', 'changed', categoryBase, { basis: 'move', specialMoves: listed });
		} else {
			leaf('category', 'unreadable', categoryBase, undefined);
		}
	} else {
		const threshold: number | undefined = category.hack.specialFromTypeId;
		const from = threshold === undefined ? null : threshold;
		const ids: number[] = [];
		for (let id = 0; id < 0x40; id++) {
			if (from !== null ? id >= from : category.hack.specialTypeIds.includes(id)) ids.push(id);
		}
		extras.category = { basis: 'type', specialFromTypeId: from, specialTypeIds: ids };
		const special: string[] = [];
		let ambiguous = unnamedInChart && !names.typeName;
		for (const [name, all] of idsByName) {
			const inChart = all.filter(id => chartIds.has(id));
			const pool = inChart.length ? inChart : all;
			const count = pool.filter(id => ids.includes(id)).length;
			if (count === pool.length) special.push(name);
			else if (count) ambiguous = true;
		}
		if (ambiguous) {
			leaf('category', 'unreadable', categoryBase, undefined);
		} else {
			const status = sameSet(special, STOCK_SPECIAL_TYPES) ? 'same' : 'changed';
			leaf('category', status, categoryBase, { basis: 'type', specialTypes: special });
		}
	}

	for (const [path, ids, convert] of LEAVES) converted(path, ids, convert);

	for (const [name, ids, effectIds] of SIDE_EFFECTS) {
		const fraction: Convert = v => [v(ids[0]), 256];
		converted('info.sideEffectChance.' + name, ids, fraction);
		const entry = report[report.length - 1];
		const side: Gen1SideEffect = { probe: name, effectIds, status: entry.status, base: baseOf(ids[0]) };
		if (entry.hack) {
			const n: number = entry.hack[0];
			side.hack = n;
			const nudge = name === 'confusionSideChance' ? 0.5 : -0.5;
			if (entry.status === 'changed') side.secondaryChance = (n + nudge) * 100 / 256;
		}
		extras.sideEffects.push(side);
	}

	const priorityIds = [
		'priorityBlock', 'priorityFirstMove', 'priorityFirstMove2', 'priorityFirstMove3',
		'priorityLastMove', 'priorityLastMove2', 'priorityLastMove3',
	];
	converted('info.priority', priorityIds,
		v => ({ firstMoveId: v('priorityFirstMove'), lastMoveId: v('priorityLastMove') }));
	const priority = report[report.length - 1];
	if (priority.hack) extras.priority = priority.hack;

	for (const [name, ids] of INFO_PROBES) converted('info.' + name, ids, v => v(ids[0]));
	for (const r of seen.results) {
		if (!r.id.startsWith('code:')) continue;
		const name = r.id.slice(5);
		leaf('info.code.' + name, r.status, true, r.hack);
		if (r.status !== 'same' && r.status !== 'changed') extras.rewrittenRoutines.push(name);
	}

	if (!live) {
		return unknownResult('The Generation 1 battle engine was not found in this ROM.', seen.results, report);
	}
	const routines = seen.results.filter(r => r.id.startsWith('code:')).length;
	const closest = BASE_NAMES[seen.closestBase || ''] || 'Red';
	const share = Math.round(seen.offsetMatchRate * 1000) / 10;
	const differing = `${extras.rewrittenRoutines.length} of ${routines} battle routines are not identical.`;
	const detail = seen.layout ?
		`${BASE_NAMES[seen.layout] || seen.layout} binary hack, ${share}% of the probed battle code is at its stock offset ` +
		`and ${differing}` :
		`Generation 1 engine rebuilt from a disassembly (closest base: ${closest}), ${differing}`;
	const result: Gen1MechanicsResult = {
		engine: { kind: 'stock', live: true, detail }, values: values as Gen1Mechanics, report, notes, extras,
	};
	if (typeChart) result.typeChart = typeChart;
	if (typeChartInfo) result.typeChartInfo = typeChartInfo;
	return result;
}

function headerTitle(rom: Buffer | null): string {
	return rom && rom.length >= 0x150 ? rom.toString('latin1', 0x134, 0x143) : '';
}

export function readGen1Mechanics(rom: Buffer, base: Buffer | null, names: Gen1Names = {}): Gen1MechanicsResult {
	requireSignatures();
	try {
		const sized = Buffer.isBuffer(rom) && rom.length >= MIN_ROM && rom.length <= MAX_ROM;
		if (!sized || rom.readUInt32BE(0x104) !== 0xceed6666) {
			return unknownResult('This is not a Game Boy ROM.', [], []);
		}
		const budget: Budget = { search: SEARCH_BUDGET, steps: STEP_BUDGET };
		return buildResult(examine(rom, budget, headerTitle(Buffer.isBuffer(base) ? base : null)), names);
	} catch (err) {
		const reason = err instanceof BudgetError ? 'the search limit was reached' : 'the reader failed';
		return unknownResult(`The Generation 1 battle engine could not be examined (${reason}).`, [], []);
	}
}
