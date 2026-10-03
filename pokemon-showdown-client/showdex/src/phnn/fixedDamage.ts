import {
  type Field as SmogonField,
  type Generation,
  type Move as SmogonMove,
  type Pokemon as SmogonPokemon,
  type Result,
  type ShowdexCalcMods,
  calculate,
} from '@smogon/calc';
import { buildPhnnImmunityBypassChart, detectPhnnKey, getPhnnIgnoreImmunity } from './index';
import phnnData from './phnn-data';

export type PhnnFixedDamage = number | number[] | number[][];

export type PhnnFixedDamageOutcome = 'calc' | 'immune' | 'unknown' | 'fails';

export interface PhnnKoChance {
  chance: number;
  n: number;
  text: string;
}

const toPhnnId = (text: string): string => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const PHNN_HALF_HP_MOVES = ['superfang', 'naturesmadness', 'ruination'];

const PHNN_MIN_ROLLS = 16;

const PHNN_UNKNOWN_DAMAGE_MOVES = ['counter', 'mirrorcoat', 'metalburst', 'bide', 'comeuppance'];

export const getPhnnSw97FlailPower = (hp: number, maxHp: number): number => {
  const product = Math.trunc(hp) * 48;
  let dividend = product;
  let divisor = Math.trunc(maxHp);

  if (divisor >= 256) {
    dividend = (product & 0xff0000) | ((product & 0xffff) >> 2);
    divisor = (divisor >> 2) & 0xff;
  }

  const ratio = divisor ? Math.floor(dividend / divisor) & 0xff : 0xff;

  if (ratio <= 1) {
    return 200;
  }

  if (ratio <= 4) {
    return 150;
  }

  if (ratio <= 9) {
    return 100;
  }

  if (ratio <= 16) {
    return 80;
  }

  return ratio <= 32 ? 40 : 20;
};

const PHNN_DISGUISE_KNOWN_MOVES = ['superfang', 'seismictoss', 'nightshade', 'sonicboom', 'dragonrage', 'psywave'];

export const isPhnnDisguiseKnownDamage = (
  format: string,
  moveName: string,
  defenderSource?: string,
): boolean => {
  const f = String(format || '').toLowerCase();
  const key = detectPhnnKey(f);

  return f.includes('disguise')
    && !f.includes('custom')
    && defenderSource === 'server'
    && !!key
    && (key === 'spaceworld' || (phnnData[key] as { gen?: number }).gen === 1)
    && PHNN_DISGUISE_KNOWN_MOVES.includes(toPhnnId(moveName));
};

export const isPhnnHalfHpMove = (moveName: string): boolean => (
  PHNN_HALF_HP_MOVES.includes(toPhnnId(moveName))
);

export const isPhnnCallbackDamageMove = (moveName: string): boolean => (
  isPhnnHalfHpMove(moveName) || ['psywave', 'endeavor'].includes(toPhnnId(moveName))
);

const rangeOf = (min: number, max: number): number[] => (
  max < min ? [] : Array.from({ length: max - min + 1 }, (_, i) => min + i)
);

export const getPhnnPsywaveDamage = (
  format: string,
  gen: number,
  level: number,
): number[] => {
  const key = detectPhnnKey(format);
  const lv = Math.max(1, Math.trunc(Number(level) || 100));
  const wrapped = (lv + (lv >> 1)) & 0xff;

  if (key === 'spaceworld') {
    return wrapped < 2 ? [] : rangeOf(1, wrapped - 1);
  }

  if (gen === 1) {
    return wrapped < 2 ? [] : rangeOf(1, Math.trunc(1.5 * lv) - 1);
  }

  if (gen === 2) {
    return rangeOf(1, Math.max(1, lv + Math.floor(lv / 2) - 1));
  }

  if (key === 'gen9phnn') {
    return rangeOf(lv, Math.floor(lv * 1.5));
  }

  return rangeOf(50, 150).map((r) => Math.max(1, Math.floor((r * lv) / 100)));
};

export const toPhnnRolls = (values: number[]): number[] => {
  if (!values?.length || values.length >= PHNN_MIN_ROLLS) {
    return values;
  }

  const repeat = Math.ceil(PHNN_MIN_ROLLS / values.length);

  return values.flatMap((value) => Array<number>(repeat).fill(value));
};

export type PhnnHpRange = [min: number, max: number];

export interface PhnnHpReport {
  hp?: number;
  maxhp?: number;
  dirtyHp?: number;
  source?: string;
}

export interface PhnnHpRanges {
  attacker?: PhnnHpRange | null;
  defender?: PhnnHpRange | null;
}

const PHNN_MAX_HP_SAMPLES = 64;

export const getPhnnHpRange = (
  format: string,
  report: PhnnHpReport,
  maxHp: number,
): PhnnHpRange | null => {
  const max = Math.trunc(Number(maxHp) || 0);
  const shown = Number(report?.hp);
  const denom = Number(report?.maxhp);

  if (
    !report
      || report.source === 'server'
      || typeof report.dirtyHp === 'number'
      || max < 2
      || ![100, 48].includes(denom)
      || denom === max
      || !Number.isInteger(shown)
      || shown < 1
  ) {
    return null;
  }

  if (shown >= denom) {
    return [max, max];
  }

  const floored = denom === 48 || String(format || '').toLowerCase().includes('champions');
  const lo = floored
    ? (shown <= 1 ? 1 : Math.ceil((shown * max) / denom))
    : Math.floor(((shown - 1) * max) / denom) + 1;
  const hi = floored
    ? Math.min(max - 1, Math.ceil(((shown + 1) * max) / denom) - 1)
    : (shown === denom - 1 ? max - 1 : Math.floor((shown * max) / denom));

  return lo >= 1 && lo <= hi ? [lo, hi] : null;
};

export const getPhnnHpSamples = (
  range: PhnnHpRange | null | undefined,
  fallback: number,
): number[] => {
  if (!range) {
    return [Math.trunc(Number(fallback) || 0)];
  }

  const [lo, hi] = range;
  const count = hi - lo + 1;

  if (count <= PHNN_MAX_HP_SAMPLES) {
    return rangeOf(lo, hi);
  }

  return [...new Set(Array.from(
    { length: PHNN_MAX_HP_SAMPLES },
    (_, i) => lo + Math.round((i * (hi - lo)) / (PHNN_MAX_HP_SAMPLES - 1)),
  ))];
};

const withOriginalHp = (pokemon: SmogonPokemon, hp: number): SmogonPokemon => {
  const probe = pokemon.clone();

  probe.originalCurHP = hp;

  return probe;
};

const isHpScaled = (pokemon: SmogonPokemon): boolean => pokemon.maxHP() !== pokemon.maxHP(true);

const toActualHp = (pokemon: SmogonPokemon, originalHp: number): number => (
  isHpScaled(pokemon) ? withOriginalHp(pokemon, originalHp).curHP() : originalHp
);

const toUndynamaxedHp = (pokemon: SmogonPokemon) => (hp: number): number => (
  isHpScaled(pokemon) ? Math.ceil((hp * pokemon.maxHP(true)) / pokemon.maxHP()) : hp
);

export const getPhnnHalfHpDamage = (
  hp: number,
  parentalBond?: boolean,
  toBaseHp: (hp: number) => number = (value) => value,
): number | number[] => {
  const current = Math.max(0, Math.trunc(Number(hp) || 0));
  const first = Math.max(1, Math.floor(toBaseHp(current) / 2));
  const remaining = current - first;

  if (!parentalBond || remaining <= 0) {
    return first;
  }

  return [first, Math.max(1, Math.floor(toBaseHp(remaining) / 2))];
};

const PHNN_NO_KO: PhnnKoChance = { chance: 0, n: 0, text: '' };

const PHNN_OHKO: PhnnKoChance = { chance: 1, n: 1, text: 'guaranteed OHKO' };

const totalOf = (damage: number | number[]): number => (
  Array.isArray(damage) ? damage.reduce((sum, value) => sum + value, 0) : damage
);

export const getPhnnHalfHpKoChance = (
  damage: number | number[],
  hp: number,
): PhnnKoChance => (totalOf(damage) >= hp ? PHNN_OHKO : PHNN_NO_KO);

const toPhnnSortedRolls = (values: number[]): number | number[] => {
  const sorted = [...values].sort((a, b) => a - b);

  return sorted.length === 1 ? sorted[0] : toPhnnRolls(sorted);
};

export const calcPhnnCallbackDamage = (
  format: string,
  gen: number,
  attacker: SmogonPokemon,
  defender: SmogonPokemon,
  moveName: string,
  ranges?: PhnnHpRanges,
): { damage: PhnnFixedDamage; halfHp: boolean; zero?: PhnnFixedDamageOutcome; ko?: PhnnKoChance } | null => {
  const parentalBond = !!attacker?.hasAbility?.('Parental Bond');
  const id = toPhnnId(moveName);

  if (isPhnnHalfHpMove(moveName)) {
    const targets = getPhnnHpSamples(ranges?.defender, defender.curHP(true)).map((hp) => toActualHp(defender, hp));
    const hits = targets.map((hp) => getPhnnHalfHpDamage(hp, parentalBond, toUndynamaxedHp(defender)));
    const ko = hits.every((hit, i) => totalOf(hit) >= targets[i]) ? PHNN_OHKO : PHNN_NO_KO;

    if (hits.length === 1) {
      return { damage: hits[0], halfHp: true, ko };
    }

    if (!hits.some((hit) => Array.isArray(hit))) {
      return { damage: toPhnnSortedRolls(hits as number[]), halfHp: true, ko };
    }

    const pairs = hits
      .map((hit) => (Array.isArray(hit) ? hit : [hit, 0]))
      .sort((a, b) => totalOf(a) - totalOf(b));

    return {
      damage: [toPhnnRolls(pairs.map(([first]) => first)), toPhnnRolls(pairs.map(([, second]) => second))],
      halfHp: true,
      ko,
    };
  }

  if (id === 'endeavor') {
    const targets = getPhnnHpSamples(ranges?.defender, defender.curHP(true));
    const users = getPhnnHpSamples(ranges?.attacker, attacker.curHP(true)).map((hp) => toActualHp(attacker, hp));
    const values = [...new Set(targets.flatMap((target) => users.map((user) => target - user)))]
      .filter((value) => value > 0);

    return values.length
      ? { damage: toPhnnSortedRolls(values), halfHp: false, ko: PHNN_NO_KO }
      : { damage: 0, halfHp: false, zero: 'immune' };
  }

  if (id === 'psywave') {
    const rolls = toPhnnRolls(getPhnnPsywaveDamage(format, gen, attacker.level));

    if (!rolls.length) {
      return { damage: 0, halfHp: false };
    }

    return {
      damage: parentalBond ? [rolls, [...rolls]] : rolls,
      halfHp: false,
    };
  }

  return null;
};

const flattenDamage = (damage: unknown): number[] => (
  Array.isArray(damage)
    ? (damage as unknown[]).flat(Infinity as 1).map(Number)
    : [Number(damage) || 0]
);

export const phnnMoveConnects = (
  gen: Generation,
  attacker: SmogonPokemon,
  defender: SmogonPokemon,
  move: SmogonMove,
  field?: SmogonField,
  mods?: ShowdexCalcMods,
): boolean => {
  if (!gen || !attacker || !defender || !move || move.category === 'Status') {
    return false;
  }

  const probe = move.clone();
  const target = defender.clone();

  probe.overrides = { ...(probe.overrides || {}), basePower: 1 };
  probe.bp = 1;
  target.originalCurHP = target.maxHP(true);

  try {
    const result = calculate(gen, attacker, target, probe, field, mods);

    return flattenDamage(result?.damage).some((value) => value > 0);
  } catch {
    return false;
  }
};

export const overridePhnnKoChance = (
  result: Result,
  koChance: PhnnKoChance,
): void => {
  const fullDesc = result.fullDesc.bind(result) as typeof result.fullDesc;

  result.kochance = () => koChance;
  result.fullDesc = (notation, err) => {
    const [head] = fullDesc(notation, err).split(' -- ');

    return koChance.text ? `${head} -- ${koChance.text}` : head;
  };
  result.desc = () => result.fullDesc();
};

export const applyPhnnFixedDamage = (
  format: string,
  gen: Generation,
  result: Result,
  attacker: SmogonPokemon,
  defender: SmogonPokemon,
  move: SmogonMove,
  field?: SmogonField,
  mods?: ShowdexCalcMods,
  ranges?: PhnnHpRanges,
): PhnnFixedDamageOutcome => {
  if (!result || !move) {
    return 'calc';
  }

  const zero = !flattenDamage(result.damage).some((value) => value > 0);
  const callback = isPhnnCallbackDamageMove(move.name);
  const reactive = PHNN_UNKNOWN_DAMAGE_MOVES.includes(toPhnnId(move.name));

  if (!zero && !callback && !reactive) {
    return 'calc';
  }

  if (!phnnMoveConnects(gen, attacker, defender, move, field, mods)) {
    if (reactive) {
      result.damage = 0;
    }

    return zero || reactive ? 'immune' : 'calc';
  }

  if (reactive) {
    return 'unknown';
  }

  const outcome = callback ? calcPhnnCallbackDamage(format, gen.num, attacker, defender, move.name, ranges) : null;

  if (!outcome) {
    return zero ? 'unknown' : 'calc';
  }

  if (!flattenDamage(outcome.damage).some((value) => value > 0)) {
    if (outcome.zero === 'immune') {
      result.damage = 0;
    }

    return outcome.zero || 'fails';
  }

  result.damage = outcome.damage;

  if (result.rawDesc) {
    const doubled = Array.isArray(outcome.damage) && Array.isArray(outcome.damage[0]);
    const paired = doubled || (outcome.halfHp && Array.isArray(outcome.damage) && outcome.damage.length === 2);

    if (paired && attacker.hasAbility('Parental Bond')) {
      result.rawDesc.attackerAbility = attacker.ability;
    } else if (result.rawDesc.attackerAbility === 'Parental Bond') {
      result.rawDesc.attackerAbility = undefined;
    }

    if (outcome.halfHp || toPhnnId(move.name) === 'psywave') {
      result.rawDesc.moveBP = undefined;
    }
  }

  if (outcome.ko) {
    overridePhnnKoChance(result, outcome.ko);
  }

  return 'calc';
};

export const applyPhnnImmunityBypass = (
  format: string,
  gen: Generation,
  moveName: string,
): boolean => {
  const ctx = (globalThis as Record<string, unknown>).__phnnCalc as {
    typeChart?: Record<string, Record<string, number>>;
  };
  const bypass = getPhnnIgnoreImmunity(format, moveName);

  if (!ctx || !bypass) {
    return false;
  }

  ctx.typeChart = buildPhnnImmunityBypassChart(
    ctx.typeChart,
    bypass,
    (attackType, defenseType) => (
      gen?.types?.get(toPhnnId(attackType) as Parameters<Generation['types']['get']>[0])
        ?.effectiveness as Record<string, number>
    )?.[defenseType] ?? 1,
  );

  return true;
};

export const applyPhnnFlailPower = (format: string, boosted?: boolean): boolean => {
  const ctx = (globalThis as Record<string, unknown>).__phnnCalc as {
    flailPower?: (hp: number, maxHp: number) => number;
  };

  if (!ctx) {
    return false;
  }

  ctx.flailPower = detectPhnnKey(format) === 'spaceworld'
    ? (hp: number, maxHp: number) => {
      const power = getPhnnSw97FlailPower(hp, maxHp);

      return boosted ? Math.floor(power * 1.2) : power;
    }
    : undefined;

  return !!ctx.flailPower;
};

const PHNN_SW_ITEM_BOOSTS: Record<string, string> = {
  bigleaf: 'Grass',
  sharpstone: 'Rock',
  blackfeather: 'Flying',
  sharpfang: 'Normal',
  stick: 'Normal',
  toxicneedle: 'Poison',
  poisonfang: 'Poison',
  migraineseed: 'Psychic',
  attackneedle: 'Bug',
  powerbracersw: 'Fighting',
  icefang: 'Ice',
  wethorn: 'Water',
  thunderfang: 'Electric',
  fireclaw: 'Fire',
  spike: 'Ghost',
  thickclub: 'Ground',
  dragonfang: 'Dragon',
};

export const getPhnnSwItemBoost = (
  format: string,
  gen: Generation,
  attacker: SmogonPokemon,
  move: SmogonMove,
): { item: string; boosted: boolean } | null => {
  const item = attacker?.item ? String(attacker.item) : '';
  const boostType = PHNN_SW_ITEM_BOOSTS[toPhnnId(item)];

  if (!boostType || detectPhnnKey(format) !== 'spaceworld' || !move) {
    return null;
  }

  const id = toPhnnId(move.name);
  const moveType = ['flail', 'reversal'].includes(id)
    ? gen?.moves?.get(id as Parameters<Generation['moves']['get']>[0])?.type
    : move.type;

  return { item, boosted: moveType === boostType };
};

const PHNN_ATTACKER_HP_MOVES = ['flail', 'reversal', 'eruption', 'waterspout', 'dragonenergy', 'finalgambit'];

const mergePhnnDamage = (damages: unknown[]): PhnnFixedDamage => {
  const twoHit = damages.every((damage) => Array.isArray(damage) && Array.isArray(damage[0]));

  if (twoHit) {
    const hits = damages as number[][][];

    return [0, 1].map((i) => [...hits.flatMap((damage) => damage[i] || [])].sort((a, b) => a - b));
  }

  return toPhnnRolls(damages.flatMap((damage) => flattenDamage(damage)).sort((a, b) => a - b));
};

export const calculatePhnnOverAttackerHp = (
  gen: Generation,
  attacker: SmogonPokemon,
  defender: SmogonPokemon,
  move: SmogonMove,
  field?: SmogonField,
  mods?: ShowdexCalcMods,
  range?: PhnnHpRange | null,
): Result => {
  const samples = PHNN_ATTACKER_HP_MOVES.includes(toPhnnId(move?.name))
    ? getPhnnHpSamples(range, attacker.originalCurHP)
    : [];

  if (samples.length < 2) {
    return calculate(gen, attacker, defender, move, field, mods);
  }

  const results = samples.map((hp) => calculate(gen, withOriginalHp(attacker, hp), defender, move, field, mods));
  const distinct = results.filter((result, i) => (
    results.findIndex((other) => JSON.stringify(other.damage) === JSON.stringify(result.damage)) === i
  ));
  const [merged] = distinct;

  if (distinct.length < 2) {
    return merged;
  }

  const kos = distinct.map((result) => {
    try {
      return result.kochance() as PhnnKoChance;
    } catch {
      return PHNN_NO_KO;
    }
  });
  const slowest = kos.reduce((worst, ko) => (ko.n > worst.n ? ko : worst), kos[0]);
  const ko = kos.every((each) => each.n > 0 && each.chance === 1) ? slowest : PHNN_NO_KO;

  merged.damage = mergePhnnDamage(distinct.map((result) => result.damage)) as Result['damage'];

  if (merged.rawDesc && new Set(distinct.map((result) => result.rawDesc?.moveBP)).size > 1) {
    merged.rawDesc.moveBP = undefined;
  }

  overridePhnnKoChance(merged, { chance: ko.chance, n: ko.n, text: ko.text });

  return merged;
};

export const calculatePhnnMatchup = (
  format: string,
  gen: Generation,
  attacker: SmogonPokemon,
  defender: SmogonPokemon,
  move: SmogonMove,
  field?: SmogonField,
  mods?: ShowdexCalcMods,
  ranges?: PhnnHpRanges,
): { result: Result; outcome: PhnnFixedDamageOutcome } => {
  const swItem = getPhnnSwItemBoost(format, gen, attacker, move);
  const swFlail = ['flail', 'reversal'].includes(toPhnnId(move?.name));
  const user = swItem ? attacker.clone() : attacker;
  const used = swItem?.boosted && !swFlail ? move.clone() : move;

  if (swItem) {
    user.item = undefined;
  }

  if (used !== move) {
    used.bp = Math.floor(used.bp * 1.2);
    used.overrides = { ...(used.overrides || {}), basePower: used.bp };
  }

  applyPhnnImmunityBypass(format, gen, move?.name);
  applyPhnnFlailPower(format, !!swItem?.boosted && swFlail);

  const result = calculatePhnnOverAttackerHp(gen, user, defender, used, field, mods, ranges?.attacker);
  const outcome = applyPhnnFixedDamage(format, gen, result, user, defender, used, field, mods, ranges);
  const damage = flattenDamage(result.damage);

  if (swItem?.boosted && result.rawDesc) {
    result.rawDesc.attackerItem = swItem.item as typeof result.rawDesc.attackerItem;
  }

  if (outcome === 'calc' && toPhnnId(move?.name) === 'finalgambit' && damage.some((value) => value > 0)) {
    const [, highest] = ranges?.defender || [defender.curHP(true), defender.curHP(true)];

    overridePhnnKoChance(result, Math.min(...damage) >= toActualHp(defender, highest) ? PHNN_OHKO : PHNN_NO_KO);
  }

  return { result, outcome };
};
