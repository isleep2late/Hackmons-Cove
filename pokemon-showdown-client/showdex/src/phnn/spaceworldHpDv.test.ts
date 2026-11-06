import { describe, expect, it } from 'vitest';
import { getPhnnSw97HpDv } from '@showdex/phnn/spaceworld';
import { calcPokemonSpreadStats } from '@showdex/utils/calc/calcPokemonSpreadStats';

const SNORLAX = {
  baseStats: {
    hp: 160,
    atk: 110,
    def: 65,
    spa: 65,
    spd: 110,
    spe: 30,
  },
  evs: {
    hp: 252,
    atk: 252,
    def: 252,
    spa: 252,
    spd: 252,
    spe: 252,
  },
};

const ivs = (atk: number, def: number, spe: number, spc: number) => ({
  hp: 30,
  atk: atk * 2,
  def: def * 2,
  spa: spc * 2,
  spd: spc * 2,
  spe: spe * 2,
});

describe('Calcdex SpaceWorld HP DV', () => {
  it('derives the demo HP DV from the other DVs', () => {
    expect(getPhnnSw97HpDv(ivs(15, 15, 15, 15))).toBe(26);
    expect(getPhnnSw97HpDv(ivs(14, 14, 14, 14))).toBe(0);
    expect(getPhnnSw97HpDv(ivs(15, 14, 14, 14))).toBe(16);
    expect(getPhnnSw97HpDv(ivs(14, 15, 14, 14))).toBe(8);
    expect(getPhnnSw97HpDv(ivs(14, 14, 15, 15))).toBe(2);
    expect(getPhnnSw97HpDv({})).toBe(26);
  });

  it('uses it for SpaceWorld max HP and leaves gen 2 on the GSC HP DV', () => {
    expect(calcPokemonSpreadStats('gen2spaceworldou', { ...SNORLAX, level: 100, ivs: ivs(15, 15, 15, 15) }).hp).toBe(545);
    expect(calcPokemonSpreadStats('gen2spaceworlddisguises', { ...SNORLAX, level: 255, ivs: ivs(15, 15, 15, 15) }).hp).toBe(999);
    expect(calcPokemonSpreadStats('gen2spaceworldou', { ...SNORLAX, level: 100, ivs: ivs(14, 14, 14, 14) }).hp).toBe(493);
    expect(calcPokemonSpreadStats('gen2ou', { ...SNORLAX, level: 100, ivs: ivs(15, 15, 15, 15) }).hp).toBe(523);
    expect(calcPokemonSpreadStats('gen2ou', { ...SNORLAX, level: 255, ivs: ivs(15, 15, 15, 15) }).hp).toBe(1318);
  });
});
