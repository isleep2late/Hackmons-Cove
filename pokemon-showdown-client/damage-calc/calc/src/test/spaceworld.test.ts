import {Field, Generations, Move, Pokemon, calculate} from '../index';

const gen = Generations.get(11 as 1);
const evs = {hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252};

function range(
  attacker: string,
  moveName: string,
  defender: string,
  options: {
    attacker?: {[key: string]: unknown};
    defender?: {[key: string]: unknown};
    move?: {[key: string]: unknown};
    field?: {[key: string]: unknown};
  } = {}
) {
  const result = calculate(
    gen,
    new Pokemon(gen, attacker, {evs, ...options.attacker}),
    new Pokemon(gen, defender, {evs, ...options.defender}),
    new Move(gen, moveName, options.move),
    new Field(options.field)
  );
  let damage = result.damage;
  if (Array.isArray(damage) && Array.isArray(damage[0])) {
    damage = (damage as number[][])[(damage as number[][]).length - 1];
  }
  return Array.isArray(damage)
    ? [(damage as number[])[0], (damage as number[])[(damage as number[]).length - 1]]
    : [damage, damage];
}

describe('SpaceWorld damage matches the demo engine', () => {
  test('Hidden Power is one ???-typed move with DV-based power', () => {
    const move = new Move(gen, 'Hidden Power');
    expect(move.type).toBe('???');
    expect(gen.moves.get('hiddenpowerfire' as any)).toBeUndefined();
    expect(range('Snorlax', 'Hidden Power', 'Gengar')).toEqual([82, 97]);
    expect(range('Snorlax', 'Hidden Power', 'Gengar', {
      attacker: {ivs: {atk: 0, def: 20, spa: 30, spd: 30, spe: 12}},
    })).toEqual([28, 33]);
    expect(range('Snorlax', 'Hidden Power', 'Skarmory', {
      attacker: {ivs: {atk: 16, def: 2, spa: 22, spd: 22, spe: 31}},
    })).toEqual([65, 77]);
  });

  test('Present defaults to 40 power and takes 80 or 120', () => {
    expect(new Move(gen, 'Present').bp).toBe(40);
    expect(range('Delibird', 'Present', 'Snorlax')).toEqual([26, 31]);
    expect(range('Delibird', 'Present', 'Snorlax', {move: {overrides: {basePower: 80}}}))
      .toEqual([51, 60]);
    expect(range('Delibird', 'Present', 'Snorlax', {move: {overrides: {basePower: 120}}}))
      .toEqual([75, 89]);
  });

  test('stat stages use the demo table and the 999 cap', () => {
    expect(range('Snorlax', 'Body Slam', 'Dragonite', {attacker: {boosts: {atk: 6}}}))
      .toEqual([316, 372]);
    expect(range('Snorlax', 'Body Slam', 'Dragonite', {attacker: {boosts: {atk: -1}}}))
      .toEqual([67, 79]);
    expect(range('Snorlax', 'Body Slam', 'Dragonite', {attacker: {boosts: {atk: -5}}}))
      .toEqual([28, 34]);
  });

  test('crits ignore boosts and double the level', () => {
    expect(range('Snorlax', 'Body Slam', 'Dragonite', {
      attacker: {boosts: {atk: 2}}, move: {isCrit: true},
    })).toEqual([196, 231]);
  });

  test('both screens double physical Defense only', () => {
    expect(range('Snorlax', 'Body Slam', 'Starmie', {field: {defenderSide: {isLightScreen: true}}}))
      .toEqual([56, 66]);
    expect(range('Starmie', 'Surf', 'Snorlax', {field: {defenderSide: {isLightScreen: true}}}))
      .toEqual([102, 121]);
  });

  test('rain and sun double or halve the boosted type before STAB', () => {
    expect(range('Starmie', 'Surf', 'Snorlax', {field: {weather: 'Rain'}})).toEqual([206, 243]);
    expect(range('Starmie', 'Surf', 'Snorlax', {field: {weather: 'Sun'}})).toEqual([51, 60]);
    expect(range('Charizard', 'Flamethrower', 'Snorlax', {field: {weather: 'Sun'}}))
      .toEqual([206, 243]);
  });

  test('Triple Kick multiplies the capped damage by the hit number', () => {
    expect(range('Hitmonlee', 'Triple Kick', 'Snorlax', {move: {hits: 1}})).toEqual([194, 228]);
    expect(range('Hitmonlee', 'Triple Kick', 'Snorlax', {move: {hits: 2}})).toEqual([388, 456]);
    expect(range('Hitmonlee', 'Triple Kick', 'Snorlax', {move: {hits: 3}})).toEqual([582, 684]);
  });

  test('Fury Cutter and Rollout double the final damage per use', () => {
    expect(range('Scyther', 'Fury Cutter', 'Snorlax', {move: {timesUsed: 1}})).toEqual([39, 46]);
    expect(range('Scyther', 'Fury Cutter', 'Snorlax', {move: {timesUsed: 3}})).toEqual([156, 184]);
    expect(range('Scyther', 'Fury Cutter', 'Exeggutor', {move: {timesUsed: 9}}))
      .toEqual([33984, 39936]);
    expect(range('Golem', 'Rollout', 'Charizard', {move: {timesUsed: 4}})).toEqual([1334, 1568]);
  });

  test('Dragon Scale has no held effect and stored stats cap at 999', () => {
    expect(range('Dragonite', 'Outrage', 'Snorlax')).toEqual([97, 115]);
    expect(range('Dragonite', 'Outrage', 'Snorlax', {attacker: {item: 'Dragon Scale'}}))
      .toEqual([97, 115]);
    expect(range('Snorlax', 'Body Slam', 'Dragonite', {
      attacker: {level: 500}, defender: {level: 500}, move: {isCrit: true},
    })).toEqual([873, 1027]);
    expect(range('Starmie', 'Surf', 'Snorlax', {attacker: {level: 500}, defender: {level: 500}}))
      .toEqual([491, 577]);
    expect(range('Starmie', 'Surf', 'Snorlax', {
      attacker: {level: 500}, defender: {level: 500}, move: {isCrit: true},
    })).toEqual([976, 1147]);
  });
});
