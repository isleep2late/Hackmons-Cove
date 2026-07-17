import type {Generation, TypeName} from '../data/interface';
import type {RawDesc} from '../desc';
import type {Field} from '../field';
import type {Move} from '../move';
import type {Pokemon} from '../pokemon';
import {Result} from '../result';
import {computeFinalStats, getMoveEffectiveness, handleFixedDamageMoves} from './util';


const SW_ITEM_BOOSTS: {[item: string]: TypeName} = {
  'Big Leaf': 'Grass',
  'Sharp Stone': 'Rock',
  'Black Feather': 'Flying',
  'Sharp Fang': 'Normal',
  'Stick': 'Normal',
  'Toxic Needle': 'Poison',
  'Poison Fang': 'Poison',
  'Migraine Seed': 'Psychic',
  'Attack Needle': 'Bug',
  'Power Bracer SW': 'Fighting',
  'Ice Fang': 'Ice',
  'Wet Horn': 'Water',
  'Thunder Fang': 'Electric',
  'Fire Claw': 'Fire',
  'Spike': 'Ghost',
  'Thick Club': 'Ground',
  'Dragon Fang': 'Dragon',
};

export function calculateSpaceWorld(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field
) {
  computeFinalStats(gen, attacker, defender, field, 'atk', 'def', 'spa', 'spd', 'spe');

  const desc: RawDesc = {
    attackerName: attacker.name,
    moveName: move.name,
    defenderName: defender.name,
  };

  const result = new Result(gen, attacker, defender, move, field, 0, desc);

  if (move.category === 'Status') {
    return result;
  }

  if (field.defenderSide.isProtected) {
    desc.isProtected = true;
    return result;
  }

  if (move.name === 'Pain Split') {
    const average = Math.floor((attacker.curHP() + defender.curHP()) / 2);
    const damage = Math.max(0, defender.curHP() - average);
    result.damage = damage;
    return result;
  }

  const typeEffectivenessPrecedenceRules = [
    'Normal',
    'Fire',
    'Water',
    'Electric',
    'Grass',
    'Ice',
    'Fighting',
    'Poison',
    'Ground',
    'Flying',
    'Psychic',
    'Bug',
    'Rock',
    'Ghost',
    'Dragon',
    'Dark',
    'Steel',
  ];

  let firstDefenderType = defender.types[0];
  let secondDefenderType = defender.types[1];

  if (secondDefenderType && firstDefenderType !== secondDefenderType) {
    const firstTypePrecedence = typeEffectivenessPrecedenceRules.indexOf(firstDefenderType);
    const secondTypePrecedence = typeEffectivenessPrecedenceRules.indexOf(secondDefenderType);

    if (firstTypePrecedence > secondTypePrecedence) {
      [firstDefenderType, secondDefenderType] = [secondDefenderType, firstDefenderType];
    }
  }

  const typeless = move.type === '???';
  const type1Effectiveness = typeless
    ? 1
    : getMoveEffectiveness(gen, move, firstDefenderType, field.defenderSide.isForesight);
  const type2Effectiveness = typeless || !secondDefenderType
    ? 1
    : getMoveEffectiveness(gen, move, secondDefenderType, field.defenderSide.isForesight);
  const typeEffectiveness = type1Effectiveness * type2Effectiveness;

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

  if (move.name === 'Triple Kick') {
    move.bp = move.hits === 2 ? 90 : move.hits === 3 ? 120 : 60;
    desc.moveBP = move.bp;
  }

  if (move.named('Fury Cutter')) {
    move.bp = Math.min(65535, 25 * Math.pow(2, Math.min(15, move.timesUsed! - 1)));
    desc.moveBP = move.bp;
  }

  if (move.named('Flail', 'Reversal')) {
    move.isCrit = false;
    const p = Math.floor((48 * attacker.curHP()) / attacker.maxHP());
    move.bp = p <= 1 ? 200 : p <= 4 ? 150 : p <= 9 ? 100 : p <= 16 ? 80 : p <= 32 ? 40 : 20;
    desc.moveBP = move.bp;
  }

  if (move.bp === 0) {
    return result;
  }

  const isPhysical = move.category === 'Physical';
  const attackStat = isPhysical ? 'atk' : 'spa';
  const defenseStat = isPhysical ? 'def' : 'spd';
  let at = attacker.stats[attackStat]!;
  let df = defender.stats[defenseStat]!;

  if (!isPhysical && !field.defenderSide.isBatonBoost &&
      defender.boosts.spd !== 0) {
    df = defender.rawStats.spd!;
  }

  const ignoreMods = move.isCrit;

  let lv = attacker.level;
  if (ignoreMods) {
    at = attacker.rawStats[attackStat]!;
    df = defender.rawStats[defenseStat]!;
    lv *= 2;
    desc.isCritical = true;
  } else {
    if (attacker.boosts[attackStat] !== 0) desc.attackBoost = attacker.boosts[attackStat];
    if (defender.boosts[defenseStat] !== 0 &&
        (isPhysical || field.defenderSide.isBatonBoost)) {
      desc.defenseBoost = defender.boosts[defenseStat];
    }
    if (isPhysical && attacker.hasStatus('brn')) {
      at = Math.floor(at / 2);
      desc.isBurned = true;
    }
  }

  if (!ignoreMods && isPhysical &&
      (field.defenderSide.isReflect || field.defenderSide.isLightScreen)) {
    df *= 2;
    if (field.defenderSide.isReflect) desc.isReflect = true;
    else desc.isLightScreen = true;
  }

  if (at >= 256 || df >= 256) {
    at = Math.floor(at / 4);
    df = Math.floor(df / 4);
  }

  if (move.named('Explosion', 'Self-Destruct')) {
    df = Math.max(1, Math.floor(df / 2));
  }

  let baseDamage = Math.floor(
    Math.floor((Math.floor((2 * lv) / 5 + 2) * Math.max(1, at) * move.bp) / Math.max(1, df)) / 50
  );

  const itemBoostType = attacker.item && SW_ITEM_BOOSTS[attacker.item];
  if (itemBoostType && move.hasType(itemBoostType)) {
    baseDamage = Math.floor(baseDamage * 1.2);
    desc.attackerItem = attacker.item;
  }

  baseDamage = Math.min(997, baseDamage) + 2;

  if ((field.hasWeather('Sun') && move.hasType('Fire')) ||
      (field.hasWeather('Rain') && move.hasType('Water'))) {
    baseDamage = Math.floor(baseDamage * 1.5);
    desc.weather = field.weather;
  } else if (
    (field.hasWeather('Sun') && move.hasType('Water')) ||
    (field.hasWeather('Rain') && move.hasType('Fire'))
  ) {
    baseDamage = Math.floor(baseDamage / 2);
    desc.weather = field.weather;
  }

  if (!typeless && move.hasType(...attacker.types)) {
    baseDamage = Math.floor(baseDamage * 1.5);
  }

  baseDamage = Math.floor(baseDamage * typeEffectiveness);

  // Flail and Reversal don't use random factor
  if (move.named('Flail', 'Reversal')) {
    result.damage = baseDamage;
    return result;
  }

  const damage = [];
  for (let i = 217; i <= 255; i++) {
    // like Gen 2, damage is always rounded up to 1
    damage[i - 217] = Math.max(1, Math.floor((baseDamage * i) / 255));
  }
  result.damage = damage;

  if (move.hits > 1) {
    if (move.name === 'Triple Kick') {
      const damageMatrix = [];
      for (let hit = 1; hit <= move.hits; hit++) {
        const bp = 60 * hit;
        let hitBase = Math.floor(
          Math.floor(
            (Math.floor((2 * lv) / 5 + 2) * Math.max(1, at) * bp) / Math.max(1, df)
          ) / 50
        );
        if (itemBoostType && move.hasType(itemBoostType)) {
          hitBase = Math.floor(hitBase * 1.2);
        }
        hitBase = Math.min(997, hitBase) + 2;
        if ((field.hasWeather('Sun') && move.hasType('Fire')) ||
            (field.hasWeather('Rain') && move.hasType('Water'))) {
          hitBase = Math.floor(hitBase * 1.5);
        } else if ((field.hasWeather('Sun') && move.hasType('Water')) ||
            (field.hasWeather('Rain') && move.hasType('Fire'))) {
          hitBase = Math.floor(hitBase / 2);
        }
        if (!typeless && move.hasType(...attacker.types)) {
          hitBase = Math.floor(hitBase * 1.5);
        }
        hitBase = Math.floor(hitBase * typeEffectiveness);
        const hitDamage = [];
        for (let i = 217; i <= 255; i++) {
          hitDamage[i - 217] = Math.max(1, Math.floor((hitBase * i) / 255));
        }
        damageMatrix.push(hitDamage);
      }
      result.damage = damageMatrix;
      return result;
    }
    const damageMatrix = [damage];
    for (let times = 1; times < move.hits; times++) {
      const hitDamage = [];
      for (let damageMultiplier = 217; damageMultiplier <= 255; damageMultiplier++) {
        hitDamage[damageMultiplier - 217] =
          Math.max(1, Math.floor((baseDamage * damageMultiplier) / 255));
      }
      damageMatrix[times] = hitDamage;
    }
    result.damage = damageMatrix;
  }

  return result;
}
