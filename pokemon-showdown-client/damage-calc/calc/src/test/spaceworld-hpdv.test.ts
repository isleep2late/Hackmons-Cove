import {Generations, Pokemon, Stats} from '../index';

const sw = Generations.get(11 as 1);
const gsc = Generations.get(2);
const evs = {hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252};
const dvs = (atk: number, def: number, spe: number, spc: number) =>
  ({atk: atk * 2, def: def * 2, spe: spe * 2, spa: spc * 2, spd: spc * 2});

describe('SpaceWorld HP DV', () => {
  test('is 16*(Atk&1) + 8*(Def&1) + (Spe&1) + (Spc&1)', () => {
    expect(Stats.getSW97HPDV({atk: 30, def: 30, spe: 30, spc: 30})).toBe(26);
    expect(Stats.getSW97HPDV({atk: 28, def: 28, spe: 28, spc: 28})).toBe(0);
    expect(Stats.getSW97HPDV({atk: 30, def: 28, spe: 28, spc: 28})).toBe(16);
    expect(Stats.getSW97HPDV({atk: 28, def: 30, spe: 28, spc: 28})).toBe(8);
    expect(Stats.getSW97HPDV({atk: 28, def: 28, spe: 30, spc: 30})).toBe(2);
  });

  test('sets SpaceWorld max HP and leaves gen 2 alone', () => {
    expect(new Pokemon(sw, 'Snorlax', {evs, level: 100}).maxHP()).toBe(545);
    expect(new Pokemon(sw, 'Snorlax', {evs, level: 255}).maxHP()).toBe(999);
    const odd = (ivs: ReturnType<typeof dvs>) => new Pokemon(sw, 'Snorlax', {evs, ivs}).maxHP();
    expect(odd(dvs(14, 14, 14, 14))).toBe(493);
    expect(odd(dvs(15, 14, 15, 14))).toBe(527);
    expect(new Pokemon(gsc, 'Snorlax', {evs, level: 100}).maxHP()).toBe(523);
    expect(new Pokemon(gsc, 'Snorlax', {evs, level: 255}).maxHP()).toBe(1318);
  });
});
