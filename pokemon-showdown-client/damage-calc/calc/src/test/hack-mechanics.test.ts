import type * as I from '../data/interface';
import {calculate, Pokemon, Move, Field, setHackMechanics} from '../index';

const range = (
  gen: I.GenerationNum,
  attacker: [string, any?],
  defender: [string, any?],
  move: [string, any?],
  field?: any
) => {
  const result = calculate(
    gen,
    new Pokemon(gen, attacker[0], attacker[1]),
    new Pokemon(gen, defender[0], defender[1]),
    new Move(gen, move[0], move[1]),
    field ? new Field(field) : undefined
  );
  const damage = result.damage as number[];
  return [damage[0], damage[damage.length - 1], damage.length];
};

const STAGES = [
  [25, 100], [28, 100], [33, 100], [40, 100], [50, 100], [66, 100], [1, 1],
  [125, 100], [150, 100], [175, 100], [2, 1], [225, 100], [250, 100],
];

describe('ROM hack mechanics', () => {
  afterEach(() => setHackMechanics(0, null));

  test('critMultiplier 2 on a Gen 9 engine equals the Gen 5 critical hit', () => {
    const crit = (gen: I.GenerationNum) =>
      range(gen, ['Garchomp'], ['Blissey'], ['Earthquake', {isCrit: true}]);
    expect(crit(9)).toEqual([852, 1003, 16]);
    setHackMechanics(9, {critMultiplier: 2});
    expect(crit(9)).toEqual([1137, 1338, 16]);
    expect(crit(5)).toEqual([1137, 1338, 16]);
    setHackMechanics(0, null);
    expect(crit(9)).toEqual([852, 1003, 16]);
  });

  test('critMultiplier 1.5 on Gen 3 and Gen 4 engines', () => {
    const crit = (gen: I.GenerationNum, name: string) =>
      range(gen, [name], ['Blissey'], ['Earthquake', {isCrit: true}]);
    expect(crit(3, 'Swampert')).toEqual([984, 1158, 16]);
    expect(crit(4, 'Garchomp')).toEqual([1137, 1338, 16]);
    setHackMechanics(3, {critMultiplier: 1.5});
    expect(crit(3, 'Swampert')).toEqual([737, 868, 16]);
    expect(crit(4, 'Garchomp')).toEqual([1137, 1338, 16]);
  });

  test('stab 1.25 changes only same-type moves and not Adaptability', () => {
    setHackMechanics(9, {stab: 1.25});
    expect(range(9, ['Garchomp'], ['Blissey'], ['Earthquake'])).toEqual([474, 557, 16]);
    expect(range(9, ['Garchomp'], ['Blissey'], ['Stone Edge'])).toEqual([379, 446, 16]);
    expect(range(9, ['Porygon-Z', {ability: 'Adaptability'}], ['Blissey'], ['Tri Attack']))
      .toEqual([116, 138, 16]);
    setHackMechanics(4, {stab: 1.25});
    expect(range(4, ['Garchomp'], ['Blissey'], ['Earthquake'])).toEqual([474, 557, 16]);
    setHackMechanics(3, {stab: 1.25});
    expect(range(3, ['Swampert'], ['Blissey'], ['Earthquake'])).toEqual([409, 482, 16]);
    setHackMechanics(2, {stab: 1.25});
    expect(range(2, ['Snorlax'], ['Blissey'], ['Body Slam'])).toEqual([208, 245, 39]);
    setHackMechanics(1, {stab: 1.25});
    expect(range(1, ['Snorlax'], ['Chansey'], ['Body Slam'])).toEqual([222, 262, 39]);
    setHackMechanics(0, null);
    expect(range(9, ['Garchomp'], ['Blissey'], ['Earthquake'])).toEqual([568, 669, 16]);
    expect(range(1, ['Snorlax'], ['Chansey'], ['Body Slam'])).toEqual([268, 315, 39]);
  });

  test('a type-boost item percent of 20 on a Gen 3 engine and 10 on a Gen 4 engine', () => {
    const fire = (gen: I.GenerationNum) =>
      range(gen, ['Charizard', {item: 'Charcoal'}], ['Blissey'], ['Flamethrower']);
    const plain = (gen: I.GenerationNum) =>
      range(gen, ['Charizard'], ['Blissey'], ['Flamethrower']);
    const stock3 = fire(3);
    const stock4 = fire(4);
    expect(stock3).toEqual([94, 111, 16]);
    expect(stock4).toEqual([102, 121, 16]);
    setHackMechanics(3, {items: {charcoal: {powerBoost: 1.2}}});
    expect(fire(3)[1]).toBeGreaterThan(stock3[1]);
    expect(fire(4)).toEqual(stock4);
    setHackMechanics(4, {items: {charcoal: {powerBoost: 1.1}}});
    expect(fire(4)[1]).toBeLessThan(stock4[1]);
    expect(fire(4)[1]).toBeGreaterThan(plain(4)[1]);
    setHackMechanics(9, {items: {mysticwater: {powerBoost: 1.5}}});
    expect(fire(9)).toEqual([97, 115, 16]);
  });

  test('burnAttack, weather rows, stat stages and the damage roll', () => {
    setHackMechanics(9, {burnAttack: 0.75});
    expect(range(9, ['Garchomp', {status: 'brn'}], ['Blissey'], ['Earthquake']))
      .toEqual([426, 502, 16]);
    setHackMechanics(9, {weatherMoveModifiers: [{weather: 'rain', type: 'Water', multiplier: 2}]});
    expect(range(9, ['Blastoise'], ['Blissey'], ['Surf'], {weather: 'Rain'}))
      .toEqual([132, 156, 16]);
    expect(range(9, ['Charizard'], ['Blissey'], ['Flamethrower'], {weather: 'Sun'}))
      .toEqual(range(9, ['Charizard'], ['Blissey'], ['Flamethrower']));
    setHackMechanics(9, {statStages: STAGES});
    expect(range(9, ['Garchomp', {boosts: {atk: 2}}], ['Blissey'], ['Earthquake']))
      .toEqual([850, 1002, 16]);
    setHackMechanics(9, {damageRoll: {min: 93, max: 100, den: 100}});
    expect(range(9, ['Garchomp'], ['Blissey'], ['Earthquake'])).toEqual([621, 669, 16]);
    setHackMechanics(1, {damageRoll: {min: 236, max: 255, den: 255}});
    expect(range(1, ['Snorlax'], ['Chansey'], ['Body Slam'])).toEqual([291, 315, 20]);
  });

  test('malformed values and other generations fall back to stock', () => {
    setHackMechanics(9, {
      critMultiplier: 'two', stab: -1, burnAttack: 0, statStages: [[1, 2]],
      damageRoll: {min: 100, max: 85, den: 100}, weatherMoveModifiers: [{weather: 'fog'}],
      items: {charcoal: {powerBoost: null}},
    });
    expect(range(9, ['Garchomp'], ['Blissey'], ['Earthquake', {isCrit: true}]))
      .toEqual([852, 1003, 16]);
    const burned: [string, any] = ['Garchomp', {status: 'brn', boosts: {atk: 2}}];
    expect(range(9, burned, ['Blissey'], ['Earthquake']))
      .toEqual(range(8, burned, ['Blissey'], ['Earthquake']));
    expect(range(9, ['Charizard', {item: 'Charcoal'}], ['Blissey'], ['Flamethrower']))
      .toEqual([97, 115, 16]);
    setHackMechanics(9, {critMultiplier: 2, stab: 1.25});
    expect(range(8, ['Garchomp'], ['Blissey'], ['Earthquake', {isCrit: true}]))
      .toEqual([852, 1003, 16]);
  });

  test('residual damage keys change the KO text', () => {
    const text = () => calculate(
      3,
      new Pokemon(3, 'Swampert'),
      new Pokemon(3, 'Blissey', {status: 'brn'}),
      new Move(3, 'Earthquake')
    ).desc();
    const stock = text();
    expect(stock).toContain('burn damage');
    setHackMechanics(3, {burnDamage: [1, 2]});
    expect(text()).not.toEqual(stock);
    setHackMechanics(0, null);
    expect(text()).toEqual(stock);
  });
});
