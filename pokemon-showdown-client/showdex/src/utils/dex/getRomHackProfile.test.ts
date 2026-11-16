import { describe, expect, it } from 'vitest';
import { buildRomHackProfile } from './getRomHackProfile';
import { getTypesDex } from './getTypesDex';

const hack = {
  sha256: 'a'.repeat(64),
  parentMod: 'gen1',
  TypeChart: {
    wind: {
 name: 'Wind',
damageTaken: {
 Wind: 0, Rock: 2, Electric: 1, Ground: 3, Dark: 0,
},
},
    rock: { damageTaken: { Wind: 1, Normal: 2, Ghost: 0 } },
    psychic: { damageTaken: { Ghost: 1, Wind: 0 } },
    dark: { damageTaken: { Wind: 2, Psychic: 3 } },
  },
  Pokedex: { zubat: { types: ['Poison', 'Wind'] } },
  Moves: { gust: { type: 'Wind' } },
  mechanics: { critMultiplier: 2 },
};

describe('buildRomHackProfile', () => {
  const profile = buildRomHackProfile(hack);

  it('reads the engine generation and keeps the mechanics', () => {
    expect(profile.gen).toBe(1);
    expect(profile.mechanics).toEqual({ critMultiplier: 2 });
  });

  it('adds the new types', () => {
    expect(profile.newTypes).toEqual(['Wind']);
    expect(profile.typeNames).toContain('Wind');
    expect(profile.typeNames).toContain('Dark');
  });

  it('turns damageTaken codes into multipliers', () => {
    expect(profile.typeChart.Wind.Rock).toBe(2);
    expect(profile.typeChart.Rock.Wind).toBe(0.5);
    expect(profile.typeChart.Electric.Wind).toBe(2);
    expect(profile.typeChart.Ground.Wind).toBe(0);
    expect(profile.typeChart.Ghost.Psychic).toBe(2);
    expect(profile.typeChart.Wind.Dark).toBe(0.5);
    expect(profile.typeChart.Psychic.Dark).toBe(0);
  });

  it('keeps the stock matchups the hack does not list', () => {
    expect(profile.typeChart.Water.Fire).toBe(2);
    expect(profile.typeChart.Normal.Ghost).toBe(0);
    expect(profile.typeChart.Wind.Water).toBe(1);
  });

  it('has no chart for a hack without one', () => {
    const plain = buildRomHackProfile({ sha256: 'b'.repeat(64), parentMod: 'gen9' });

    expect(plain.typeChart).toBeNull();
    expect(plain.gen).toBe(9);
  });
});

describe('getTypesDex', () => {
  it('returns the stock types outside ROM hack formats', () => {
    expect(getTypesDex(1, 'gen1ou').get('wind' as never)).toBeUndefined();
    expect(getTypesDex(1, 'gen1ou').get('ghost' as never).effectiveness.Psychic).toBe(0);
  });
});
