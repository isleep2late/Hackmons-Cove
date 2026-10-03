import {Field, Generations, Move, Pokemon, calculate} from '../index';

const ev0 = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};

function run(
  genNum: number,
  moveName: string,
  defenderName: string,
  attackerOptions: {[key: string]: unknown} = {},
  defenderOptions: {[key: string]: unknown} = {},
  field?: Field
) {
  const gen = Generations.get(genNum as 1);
  return calculate(
    gen,
    new Pokemon(gen, 'Raticate', {evs: ev0, ...attackerOptions}),
    new Pokemon(gen, defenderName, {evs: ev0, ...defenderOptions}),
    new Move(gen, moveName),
    field
  );
}

describe('fixed damage moves', () => {
  test('SpaceWorld fixed-damage moves ignore immunity', () => {
    expect(run(11, 'Super Fang', 'Gengar').damage).toBe(130);
    expect(run(11, 'Seismic Toss', 'Gengar').damage).toBe(100);
    expect(run(11, 'Night Shade', 'Snorlax').damage).toBe(100);
    expect(run(11, 'Sonic Boom', 'Gengar').damage).toBe(20);
    expect(run(11, 'Dragon Rage', 'Clefable').damage).toBe(40);
    expect(run(11, 'Psywave', 'Umbreon').range()).toEqual([1, 149]);
  });

  test('SpaceWorld Flail and Reversal use the demo power formula', () => {
    const evs = {hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252};
    const at = (hp: number, move: string, foe: string) =>
      run(11, move, foe, {evs, curHP: hp}, {evs}).damage;
    const foes = ['Gengar', 'Golem', 'Snorlax'];
    expect(foes.map(foe => at(215, 'Flail', foe))).toEqual([22, 14, 21]);
    expect(foes.map(foe => at(65, 'Reversal', foe))).toEqual([82, 51, 78]);
    expect(foes.map(foe => at(13, 'Flail', foe))).toEqual([153, 94, 145]);
  });

  test('half-HP moves report the uses needed to KO', () => {
    expect(run(11, 'Super Fang', 'Snorlax', {}, {curHP: 3}).kochance().text)
      .toBe('guaranteed 3HKO');
    expect(run(11, 'Super Fang', 'Snorlax', {}, {curHP: 7}).kochance().text)
      .toBe('guaranteed 4HKO');
    expect(run(11, 'Super Fang', 'Gengar', {}, {curHP: 101}).kochance().text)
      .toBe('guaranteed 8HKO');
    expect(run(2, 'Super Fang', 'Onix').kochance().text).toBe('guaranteed 9HKO');
    expect(run(1, 'Super Fang', 'Snorlax', {}, {curHP: 1}).kochance().text)
      .toBe('guaranteed OHKO');
    expect(run(11, 'Super Fang', 'Snorlax').kochance().text).toBe('');
    const bond = {ability: 'Parental Bond'};
    expect(run(10, 'Super Fang', 'Snorlax', bond, {curHP: 461}).kochance().text)
      .toBe('guaranteed 5HKO');
    expect(run(10, 'Super Fang', 'Snorlax', bond, {curHP: 3}).kochance().text)
      .toBe('guaranteed 2HKO');
    expect(run(10, 'Super Fang', 'Snorlax', bond, {curHP: 2}).kochance().text)
      .toBe('guaranteed OHKO');
    expect(run(10, 'Ruination', 'Gengar', bond).kochance().text).toBe('guaranteed 5HKO');
  });

  test('SpaceWorld trapping moves deal no end-of-turn damage', () => {
    expect(run(11, 'Wrap', 'Gengar').kochance().text).toBe('');
    expect(run(11, 'Wrap', 'Gengar').range()).toEqual([22, 27]);
    expect(run(11, 'Bind', 'Gengar').range()).toEqual([22, 27]);
    expect(run(2, 'Wrap', 'Gengar').range()).toEqual([0, 0]);
    expect(run(11, 'Wrap', 'Snorlax', {}, {curHP: 60}).kochance().text).toBe('guaranteed 3HKO');
    expect(run(2, 'Wrap', 'Snorlax', {}, {curHP: 60}).kochance().text)
      .toBe('guaranteed 2HKO after trapping damage');
  });

  test('badly poisoned KO counts follow each server\'s toxic damage', () => {
    const cases: Array<[number, string, string, number | undefined, number]> = [
      [11, 'Dragon Rage', 'Snorlax', undefined, 3],
      [11, 'Dragon Rage', 'Cloyster', undefined, 3],
      [11, 'Sonic Boom', 'Snorlax', undefined, 4],
      [11, 'Seismic Toss', 'Snorlax', undefined, 3],
      [11, 'Super Fang', 'Snorlax', undefined, 2],
      [11, 'Super Fang', 'Cloyster', undefined, 2],
      [11, 'Dragon Rage', 'Snorlax', 165, 2],
      [2, 'Dragon Rage', 'Snorlax', undefined, 5],
      [2, 'Dragon Rage', 'Snorlax', 165, 3],
      [2, 'Dragon Rage', 'Cloyster', undefined, 4],
      [2, 'Sonic Boom', 'Snorlax', undefined, 5],
      [2, 'Sonic Boom', 'Snorlax', 125, 3],
      [2, 'Seismic Toss', 'Snorlax', undefined, 3],
      [2, 'Super Fang', 'Snorlax', undefined, 3],
    ];
    const tox = ([genNum, move, foe, curHP]: typeof cases[number]) =>
      `${genNum} ${move} ${foe} ${curHP || ''}: ` +
      run(genNum, move, foe, {}, {status: 'tox', toxicCounter: 1, curHP}).kochance().text;
    expect(cases.map(tox)).toEqual(cases.map(c =>
      `${c[0]} ${c[1]} ${c[2]} ${c[3] || ''}: guaranteed ${c[4]}HKO after toxic damage`));
  });

  test('Psywave at a freezing level says so instead of looking immune', () => {
    expect(run(11, 'Psywave', 'Snorlax', {level: 171}).kochance(false).text)
      .toBe('fails, the game freezes at this level');
    expect(run(1, 'Psywave', 'Snorlax', {level: 1}).kochance(false).text)
      .toBe('fails, the game freezes at this level');
    expect(run(2, 'Psywave', 'Snorlax', {level: 171}).range()).toEqual([1, 255]);
  });

  test('half-HP KO counts start from the HP left after entry hazards', () => {
    const spikes = new Field({defenderSide: {spikes: 1}});
    const rocks = new Field({defenderSide: {isSR: true}});
    expect(run(11, 'Super Fang', 'Snorlax', {}, {curHP: 60}, spikes).kochance().text)
      .toBe('guaranteed 3HKO after 1 layer of Spikes');
    expect(run(11, 'Super Fang', 'Snorlax', {}, {curHP: 200}, spikes).kochance().text)
      .toBe('guaranteed 9HKO after 1 layer of Spikes');
    expect(run(2, 'Super Fang', 'Snorlax', {}, {curHP: 60}, spikes).kochance().text)
      .toBe('guaranteed 3HKO after Spikes');
    expect(run(10, 'Super Fang', 'Charizard', {}, {}, rocks).kochance().text)
      .toBe('guaranteed 9HKO after Stealth Rock');
    expect(run(10, 'Nature\'s Madness', 'Charizard', {}, {}, rocks).kochance().text)
      .toBe('guaranteed 9HKO after Stealth Rock');
    const bond = {ability: 'Parental Bond'};
    expect(run(10, 'Super Fang', 'Charizard', bond, {}, rocks).kochance().text)
      .toBe('guaranteed 5HKO after Stealth Rock');
  });

  test('half-HP moves halve the undynamaxed HP', () => {
    const dmax = {isDynamaxed: true};
    const bond = {ability: 'Parental Bond'};
    expect(run(10, 'Super Fang', 'Snorlax', {}, {...dmax, curHP: 1}).damage).toBe(1);
    expect(run(10, 'Super Fang', 'Snorlax', {}, {...dmax, curHP: 1}).kochance().text)
      .toBe('guaranteed 2HKO');
    expect(run(10, 'Super Fang', 'Snorlax', {}, {...dmax, curHP: 100}).damage).toBe(50);
    expect(run(10, 'Super Fang', 'Snorlax', bond, {...dmax, curHP: 100}).damage).toEqual([50, 37]);
    expect(run(10, 'Super Fang', 'Snorlax', bond, {...dmax, curHP: 1}).kochance().text)
      .toBe('guaranteed OHKO');
  });

  test('SpaceWorld clamps damage to at least 1 before adding 2', () => {
    expect(run(11, 'Flail', 'Cloyster', {level: 5}, {level: 5}).damage).toBe(3);
    expect(run(11, 'Flail', 'Steelix', {level: 10}, {level: 10}).damage).toBe(5);
    expect(run(11, 'Reversal', 'Cloyster', {level: 5}, {level: 5}).damage).toBe(3);
  });

  test('SpaceWorld type-boost items raise base power, not damage', () => {
    const fang = (hp: number | undefined, foe: string) =>
      run(11, 'Flail', foe, {item: 'Sharp Fang', curHP: hp}).damage;
    expect(fang(120, 'Gengar')).toBe(53);
    expect(fang(30, 'Gengar')).toBe(130);
    expect(fang(undefined, 'Chansey')).toBe(90);
    expect(fang(13, 'Steelix')).toBe(222);
    expect(fang(13, 'Golem')).toBe(103);
  });

  test('No Nerfs Parental Bond second hit is a quarter-power hit, doubled', () => {
    const bond = {ability: 'Parental Bond'};
    const hits = (move: string, foe: string, options = {}) => {
      const [first, second] = run(10, move, foe, {...bond, ...options}).damage as number[][];
      return [first[0], first[15], second[0], second[15]];
    };
    expect(hits('Reversal', 'Snorlax')).toEqual([36, 44, 16, 20]);
    expect(hits('Body Slam', 'Snorlax')).toEqual([109, 130, 54, 66]);
  });
});

