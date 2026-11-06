import {
  type Field as SmogonField,
  type Generation,
  type Move as SmogonMove,
  type Pokemon as SmogonPokemon,
  type ShowdexCalcMods,
  type StatID,
  modBaseDamage,
  Result,
} from '@smogon/calc';
import { type RawDesc } from '@smogon/calc/dist/desc';
import { computeFinalStats, getMoveEffectiveness, handleFixedDamageMoves } from '@smogon/calc/dist/mechanics/util';

type PhnnSwStat = Exclude<StatID, 'hp'>;

const PHNN_SW_MAX_DAMAGE = 0xffff;

const PHNN_SW_DAMAGE_ITEMS: Record<string, string> = {
  blackbelt: 'Fighting',
  blackglasses: 'Dark',
  charcoal: 'Fire',
  magnet: 'Electric',
  miracleseed: 'Grass',
  mysticwater: 'Water',
  nevermeltice: 'Ice',
  pinkbow: 'Normal',
  poisonbarb: 'Poison',
  polkadotbow: 'Normal',
  sharpbeak: 'Flying',
  softsand: 'Ground',
};

const PHNN_SW_BASE_TYPES: Record<string, string> = {
  flail: 'Normal',
  reversal: 'Fighting',
};

const toPhnnSwId = (value: string): string => (value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const capPhnnSwStat = (stat: number): number => Math.min(999, Math.max(1, stat));

export const getPhnnSwDamageItemBoost = (item: string, move: SmogonMove): boolean => {
  const boostType = PHNN_SW_DAMAGE_ITEMS[toPhnnSwId(item)];
  const moveType = PHNN_SW_BASE_TYPES[toPhnnSwId(move?.name)] || move?.type;

  return !!boostType && moveType === boostType;
};

export const getPhnnSw97HpDv = (ivs?: Partial<Record<string, number>>): number => {
  const odd = (stat: string): number => Math.floor((Number(ivs?.[stat] ?? 31) || 0) / 2) & 1;

  return 16 * odd('atk') + 8 * odd('def') + odd('spe') + odd('spa');
};

export const getPhnnSw97HiddenPower = (ivs?: Partial<Record<string, number>>): number => {
  const dv = (stat: string): number => Math.floor((Number(ivs?.[stat] ?? 31) || 0) / 2) & 15;
  const atk = dv('atk');
  const def = dv('def');
  const spe = dv('spe');
  const spc = dv('spa');
  const power = 5 * ((spc >> 3) + 2 * (spe >> 3) + 4 * (def >> 3) + 8 * (atk >> 3)) + (spc % 4);

  return Math.max(1, Math.min(78, power));
};

const getFlailPower = (attacker: SmogonPokemon): number | null => {
  const ctx = (globalThis as Record<string, unknown>).__phnnCalc as {
    flailPower?: (hp: number, maxHp: number) => number;
  };

  return typeof ctx?.flailPower === 'function'
    ? ctx.flailPower(attacker.curHP(), attacker.maxHP())
    : null;
};

export const calculatePhnnSpaceWorld = (
  gen: Generation,
  attacker: SmogonPokemon,
  defender: SmogonPokemon,
  move: SmogonMove,
  field: SmogonField,
  mods?: ShowdexCalcMods,
): Result => {
  computeFinalStats(gen, attacker, defender, field, 'atk', 'def', 'spa', 'spd', 'spe');

  const desc: RawDesc = {
    attackerName: attacker.name,
    moveName: move.name,
    defenderName: defender.name,
  };

  const result = new Result(gen, attacker, defender, move, field, 0, desc, mods);

  if (move.category === 'Status' && !move.named('Pain Split')) {
    return result;
  }

  if (field.defenderSide.isProtected) {
    desc.isProtected = true;

    return result;
  }

  if (move.named('Pain Split')) {
    const average = Math.floor((attacker.curHP() + defender.curHP()) / 2);

    result.damage = Math.max(0, defender.curHP() - average);

    return result;
  }

  const typeless = move.type === '???' || move.named('Flail', 'Reversal');
  const [firstType, secondType] = defender.types;
  const effectivenessInto = (type: typeof firstType): number => (
    getMoveEffectiveness(gen, move, type, field.defenderSide.isForesight) as number
  );
  const typeEffectiveness = typeless
    ? 1
    : effectivenessInto(firstType) * (secondType && secondType !== firstType ? effectivenessInto(secondType) : 1);

  if (typeEffectiveness === 0) {
    return result;
  }

  const fixedDamage = handleFixedDamageMoves(attacker, move);

  if (fixedDamage) {
    result.damage = fixedDamage;

    return result;
  }

  if (move.hits > 1) {
    desc.hits = move.hits;
  }

  const isTripleKick = move.named('Triple Kick');

  let doublings = 0;

  if (move.named('Fury Cutter', 'Rollout')) {
    const used = Math.max(1, Math.trunc(move.timesUsed || 1));

    doublings = (move.named('Rollout') ? Math.min(5, used) : used) - 1;

    if (doublings > 0) {
      desc.moveTurns = `(${used} times)`;
    }
  }

  if (move.named('Flail', 'Reversal')) {
    move.isCrit = false;

    const power = getFlailPower(attacker);

    if (power) {
      move.bp = power;
    }
  }

  if (!move.bp) {
    return result;
  }

  desc.moveBP = move.bp;

  const isPhysical = move.category === 'Physical';
  const attackStat = (move.overrideOffensiveStat || (isPhysical ? 'atk' : 'spa')) as PhnnSwStat;
  const defenseStat = (move.overrideDefensiveStat || (isPhysical ? 'def' : 'spd')) as PhnnSwStat;
  let at = attacker.stats[attackStat];
  let df = defenseStat === 'spd' ? capPhnnSwStat(defender.rawStats.spd) : defender.stats[defenseStat];
  let lv = attacker.level;

  if (move.isCrit) {
    at = capPhnnSwStat(attacker.rawStats[attackStat]);
    df = capPhnnSwStat(defender.rawStats[defenseStat]);
    lv *= 2;
    desc.isCritical = true;
  } else {
    if (attacker.boosts[attackStat]) {
      desc.attackBoost = attacker.boosts[attackStat];
    }

    if (defender.boosts[defenseStat] && defenseStat !== 'spd') {
      desc.defenseBoost = defender.boosts[defenseStat];
    }

    if (isPhysical && attacker.hasStatus('brn')) {
      at = Math.floor(at / 2);
      desc.isBurned = true;
    }

    if (isPhysical && (field.defenderSide.isReflect || field.defenderSide.isLightScreen)) {
      df *= 2;

      if (field.defenderSide.isReflect) {
        desc.isReflect = true;
      } else {
        desc.isLightScreen = true;
      }
    }
  }

  if (at >= 256 || df >= 256) {
    at = Math.max(1, Math.floor(at / 4));
    df = Math.max(1, Math.floor(df / 4));
  }

  if (move.named('Explosion', 'Self-Destruct') && defenseStat === 'def') {
    df = Math.max(1, Math.floor(df / 2));
  }

  if (mods?.strikes?.length) {
    desc.hits = mods.strikes.length;
  }

  let modified = modBaseDamage('gen12', mods)(lv, move.bp, at, df);

  if (getPhnnSwDamageItemBoost(attacker.item, move)) {
    modified = Math.floor(modified * 1.1);
    desc.attackerItem = attacker.item;
  }

  const capped = Math.max(1, Math.min(997, modified)) + 2;

  const finish = (multiplier: number): number => {
    let damage = Math.min(PHNN_SW_MAX_DAMAGE, capped * multiplier);

    if ((field.hasWeather('Sun') && move.hasType('Fire')) || (field.hasWeather('Rain') && move.hasType('Water'))) {
      damage *= 2;
      desc.weather = field.weather;
    } else if ((field.hasWeather('Sun') && move.hasType('Water')) || (field.hasWeather('Rain') && move.hasType('Fire'))) {
      damage = Math.floor(damage / 2);
      desc.weather = field.weather;
    }

    if (!typeless && move.hasType(...attacker.types)) {
      damage += Math.floor(damage / 2);
    }

    damage = Math.floor(damage * typeEffectiveness);

    for (let i = 0; i < doublings && damage < PHNN_SW_MAX_DAMAGE; i++) {
      damage = Math.min(PHNN_SW_MAX_DAMAGE, damage * 2);
    }

    return damage;
  };

  const rolls = (damage: number): number[] => Array.from({ length: 39 }, (_, i) => (
    damage > 1 ? Math.max(1, Math.floor((damage * (217 + i)) / 255)) : Math.max(1, damage)
  ));

  const baseDamage = finish(1);

  if (move.named('Flail', 'Reversal')) {
    result.damage = baseDamage;

    return result;
  }

  if (move.hits > 1) {
    result.damage = Array.from({ length: move.hits }, (_, i) => rolls(isTripleKick ? finish(i + 1) : baseDamage));

    return result;
  }

  result.damage = rolls(baseDamage);

  return result;
};
