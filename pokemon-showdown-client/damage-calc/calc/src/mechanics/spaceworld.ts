import type {Generation, TypeName} from '../data/interface';
import type {RawDesc} from '../desc';
import type {Field} from '../field';
import type {Move} from '../move';
import type {Pokemon} from '../pokemon';
import {Result} from '../result';
import {computeFinalStats, getMoveEffectiveness, handleFixedDamageMoves} from './util';
import {halfHPDamage, psywaveRolls, sw97FlailPower, sw97HiddenPowerBP} from './fixed-damage';

const SW_IGNORES_IMMUNITY = [
  'Super Fang', 'Seismic Toss', 'Night Shade', 'Sonic Boom', 'Dragon Rage', 'Psywave',
  'Flail', 'Reversal', 'Counter', 'Wrap', 'Bind',
];


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

const SW_DAMAGE_ITEMS: {[item: string]: TypeName} = {
  'Black Belt': 'Fighting',
  'Black Glasses': 'Dark',
  'Charcoal': 'Fire',
  'Magnet': 'Electric',
  'Miracle Seed': 'Grass',
  'Mystic Water': 'Water',
  'Never-Melt Ice': 'Ice',
  'Pink Bow': 'Normal',
  'Poison Barb': 'Poison',
  'Polkadot Bow': 'Normal',
  'Sharp Beak': 'Flying',
  'Soft Sand': 'Ground',
};

const SW_BASE_TYPES: {[move: string]: TypeName} = {
  'Flail': 'Normal',
  'Reversal': 'Fighting',
};

const capSwStat = (stat: number) => Math.min(999, Math.max(1, stat));

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

  const typeless = move.type === '???' || move.named('Flail', 'Reversal');
  const ignoresImmunity = move.named(...SW_IGNORES_IMMUNITY);
  const effectivenessInto = (type: TypeName) => {
    const effectiveness = getMoveEffectiveness(gen, move, type, field.defenderSide.isForesight);
    return ignoresImmunity && effectiveness === 0 ? 1 : effectiveness;
  };
  const type1Effectiveness = typeless ? 1 : effectivenessInto(firstDefenderType);
  const type2Effectiveness = typeless || !secondDefenderType
    ? 1
    : effectivenessInto(secondDefenderType);
  const typeEffectiveness = type1Effectiveness * type2Effectiveness;

  if (typeEffectiveness === 0) {
    return result;
  }

  const fixedDamage = handleFixedDamageMoves(attacker, move);
  if (fixedDamage) {
    result.damage = fixedDamage;
    return result;
  }

  if (move.named('Super Fang')) {
    result.damage = halfHPDamage(defender.curHP());
    return result;
  }

  if (move.named('Psywave')) {
    const rolls = psywaveRolls('spaceworld', attacker.level);
    if (rolls.length) result.damage = rolls;
    return result;
  }

  if (move.hits > 1) {
    desc.hits = move.hits;
  }

  const isTripleKick = move.named('Triple Kick');
  if (isTripleKick) {
    move.bp = 60;
  }

  let doublings = 0;
  if (move.named('Fury Cutter', 'Rollout')) {
    const used = Math.max(1, Math.trunc(move.timesUsed || 1));
    doublings = (move.named('Rollout') ? Math.min(5, used) : used) - 1;
    if (doublings > 0) desc.moveTurns = `(${used} times)`;
  }

  if (move.named('Hidden Power')) {
    move.bp = sw97HiddenPowerBP(attacker.ivs);
    desc.moveBP = move.bp;
  }

  if (move.named('Flail', 'Reversal')) {
    move.isCrit = false;
    move.bp = sw97FlailPower(attacker.curHP(), attacker.maxHP());
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
    df = capSwStat(defender.rawStats.spd!);
  }

  const ignoreMods = move.isCrit;

  let lv = attacker.level;
  if (ignoreMods) {
    at = capSwStat(attacker.rawStats[attackStat]!);
    df = capSwStat(defender.rawStats[defenseStat]!);
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

  const itemBoostType = attacker.item && SW_ITEM_BOOSTS[attacker.item];
  const itemBoosted = !!itemBoostType && move.hasType(itemBoostType);
  if (itemBoosted) desc.attackerItem = attacker.item;
  const boostedPower = (bp: number) => (itemBoosted ? Math.floor(bp * 1.2) : bp);

  let modified = Math.floor(
    Math.floor(
      (Math.floor((2 * lv) / 5 + 2) * Math.max(1, at) * boostedPower(move.bp)) / Math.max(1, df)
    ) / 50
  );
  const damageItemType = attacker.item && SW_DAMAGE_ITEMS[attacker.item];
  if (damageItemType && (SW_BASE_TYPES[move.name] || move.type) === damageItemType) {
    modified = Math.floor(modified * 1.1);
    desc.attackerItem = attacker.item;
  }

  const capped = Math.max(1, Math.min(997, modified)) + 2;

  const finish = (multiplier: number) => {
    let damage = Math.min(0xffff, capped * multiplier);
    if ((field.hasWeather('Sun') && move.hasType('Fire')) ||
        (field.hasWeather('Rain') && move.hasType('Water'))) {
      damage *= 2;
      desc.weather = field.weather;
    } else if (
      (field.hasWeather('Sun') && move.hasType('Water')) ||
      (field.hasWeather('Rain') && move.hasType('Fire'))
    ) {
      damage = Math.floor(damage / 2);
      desc.weather = field.weather;
    }
    if (!typeless && move.hasType(...attacker.types)) {
      damage += Math.floor(damage / 2);
    }
    damage = Math.floor(damage * typeEffectiveness);
    for (let i = 0; i < doublings && damage < 0xffff; i++) {
      damage = Math.min(0xffff, damage * 2);
    }
    return damage;
  };

  const rolls = (damage: number) => {
    const out = [];
    for (let i = 217; i <= 255; i++) {
      out[i - 217] = damage > 1 ? Math.max(1, Math.floor((damage * i) / 255)) : Math.max(1, damage);
    }
    return out;
  };

  const baseDamage = finish(1);

  if (move.named('Flail', 'Reversal')) {
    result.damage = baseDamage;
    return result;
  }

  if (move.hits > 1) {
    const damageMatrix = [];
    for (let hit = 1; hit <= move.hits; hit++) {
      damageMatrix.push(rolls(isTripleKick ? finish(hit) : baseDamage));
    }
    result.damage = damageMatrix;
    return result;
  }

  result.damage = rolls(baseDamage);
  return result;
}
