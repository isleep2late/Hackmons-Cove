import { describe, expect, it } from 'vitest';
import {
  applyPhnnMinConfusionSpread,
  buildPhnnMinConfusionPatch,
  calcPhnnConfusionDamage,
  calcPhnnPokemonConfusion,
  getPhnnConfusionSelfHitChance,
  getPhnnMinConfusionNature,
} from '@showdex/phnn';

/**
 * Expected values were generated from an INDEPENDENT transcription of the server sources
 * (sim/battle-actions.ts getConfusionDamage, sim/pokemon.ts calculateStat, sim/dex.ts trunc,
 * sim/battle.ts randomizer), not from this implementation, so the port is checked against
 * something other than itself.
 */
describe('calcPhnnConfusionDamage', () => {
  const cases: [string, Parameters<typeof calcPhnnConfusionDamage>[0], number, number][] = [
    ['neutral 300/300', { level: 100, atk: 300, def: 300 }, 29, 35],
    ['low atk, high def', { level: 100, atk: 200, def: 400 }, 15, 18],
    ['max-EV physical vs frail', { level: 100, atk: 504, def: 236 }, 62, 73],
    ['+2 atk', { level: 100, atk: 300, def: 300, atkStage: 2 }, 58, 69],
    ['-2 def', { level: 100, atk: 300, def: 300, defStage: -2 }, 58, 69],
    ['-6 atk (floor-divide, not multiply-by-reciprocal)', { level: 100, atk: 300, def: 300, atkStage: -6 }, 8, 10],
    ['+6 atk into -6 def', { level: 100, atk: 300, def: 300, atkStage: 6, defStage: -6 }, 458, 539],
    ['level 50', { level: 50, atk: 180, def: 150 }, 19, 23],
    ['level 1 floor', { level: 1, atk: 5, def: 5 }, 2, 3],
    ['16-bit WRAP, not clamp', { level: 100, atk: 4000, def: 20, atkStage: 6, defStage: -6 }, 35688, 41986],
  ];

  it.each(cases)('matches the server formula: %s', (_label, input, min, max) => {
    const result = calcPhnnConfusionDamage({ ...input, maxHp: 400 });

    expect(result).not.toBeNull();
    expect(result.minDamage).toBe(min);
    expect(result.maxDamage).toBe(max);
    expect(result.rolls).toHaveLength(16);
  });

  it('never returns a roll below 1', () => {
    const result = calcPhnnConfusionDamage({ level: 1, atk: 1, def: 999, maxHp: 100 });

    expect(result.rolls.every((r) => r >= 1)).toBe(true);
  });

  it('clamps boost stages beyond +/-6', () => {
    const clamped = calcPhnnConfusionDamage({ level: 100, atk: 300, def: 300, atkStage: 99, maxHp: 400 });
    const six = calcPhnnConfusionDamage({ level: 100, atk: 300, def: 300, atkStage: 6, maxHp: 400 });

    expect(clamped.maxDamage).toBe(six.maxDamage);
  });

  it('returns null rather than dividing by a missing stat', () => {
    expect(calcPhnnConfusionDamage({ level: 100, atk: 0, def: 300 })).toBeNull();
    expect(calcPhnnConfusionDamage({ level: 100, atk: 300, def: 0 })).toBeNull();
  });

  it('swaps Def for Spd under Wonder Room', () => {
    const normal = calcPhnnConfusionDamage({ level: 100, atk: 300, def: 300, spd: 150, maxHp: 400 });
    const wonder = calcPhnnConfusionDamage({ level: 100, atk: 300, def: 300, spd: 150, maxHp: 400, wonderRoom: true });

    expect(wonder.maxDamage).toBeGreaterThan(normal.maxDamage);
    expect(wonder.def).toBe(150);
  });
});

describe('getPhnnConfusionSelfHitChance', () => {
  // every mod: 'phnn' format in config/formats.ts is gen 9 with "nonerfs" in its id
  it.each([
    'gen9nonerfsstandard',
    'gen9nonerfsextended',
    'gen9nonerfsdisguises',
    'gen9nonerfsstatuses',
    'gen9nonerfs255purehackmons',
    'gen9nonerfslittlecup',
    'gen9nonerfsmiddlecup',
    'gen9nonerfscustomdisguises',
  ])('is a coin flip in %s, where the phnn mod overrides it', (format) => {
    expect(getPhnnConfusionSelfHitChance(format)).toBe(50);
  });

  it('is the standard 33 everywhere else', () => {
    expect(getPhnnConfusionSelfHitChance('gen9ou')).toBe(33);
    expect(getPhnnConfusionSelfHitChance('gen1phnn')).toBe(33);
    expect(getPhnnConfusionSelfHitChance('gen9championsdisguises')).toBe(33);
    expect(getPhnnConfusionSelfHitChance('gen2spaceworld')).toBe(33);
  });
});

describe('calcPhnnPokemonConfusion', () => {
  const pokemon = {
    level: 100,
    spreadStats: { hp: 400, atk: 300, def: 300, spa: 300, spd: 300, spe: 300 },
    maxhp: 400,
  };

  it('reads spreadStats and reports a percentage of max HP', () => {
    const result = calcPhnnPokemonConfusion('gen9nonerfs', pokemon);

    expect(result.minDamage).toBe(29);
    expect(result.maxPercent).toBeCloseTo((35 / 400) * 100, 5);
    expect(result.selfHitChance).toBe(50);
  });

  it('prefers dirtyBoosts over live boosts', () => {
    const boosted = calcPhnnPokemonConfusion('gen9nonerfs', {
      ...pokemon,
      boosts: { atk: 0 },
      dirtyBoosts: { atk: 2 },
    });

    expect(boosted.minDamage).toBe(58);
  });

  it('falls back to spread HP when maxhp is a percentage', () => {
    const result = calcPhnnPokemonConfusion('gen9nonerfs', { ...pokemon, maxhp: 100 });

    expect(result.maxHp).toBe(400);
  });

  it('uses transformed stats when transformed', () => {
    const result = calcPhnnPokemonConfusion('gen9nonerfs', {
      ...pokemon,
      transformedForme: 'Ditto',
      transformedSpreadStats: { hp: 400, atk: 504, def: 236, spa: 200, spd: 200, spe: 200 },
    });

    expect(result.minDamage).toBe(62);
  });

  it('returns null without stats', () => {
    expect(calcPhnnPokemonConfusion('gen9nonerfs', {})).toBeNull();
  });
});

describe('getPhnnMinConfusionNature', () => {
  const boosts: Record<string, [up?: string, down?: string]> = {
    Adamant: ['atk', 'spa'],
    Modest: ['spa', 'atk'],
    Timid: ['spe', 'atk'],
    Bold: ['def', 'atk'],
    Calm: ['spd', 'atk'],
    Jolly: ['spe', 'spa'],
    Impish: ['def', 'spa'],
    Careful: ['spd', 'spa'],
    Hardy: [],
  };

  it('leaves an already minus-Atk nature alone', () => {
    expect(getPhnnMinConfusionNature('Modest', boosts)).toBe('Modest');
    expect(getPhnnMinConfusionNature('Timid', boosts)).toBe('Timid');
    expect(getPhnnMinConfusionNature('Bold', boosts)).toBe('Bold');
    expect(getPhnnMinConfusionNature('Calm', boosts)).toBe('Calm');
  });

  it('preserves the boosted stat and moves the drop onto Atk', () => {
    expect(getPhnnMinConfusionNature('Jolly', boosts)).toBe('Timid');   // +spe
    expect(getPhnnMinConfusionNature('Impish', boosts)).toBe('Bold');   // +def
    expect(getPhnnMinConfusionNature('Careful', boosts)).toBe('Calm');  // +spd
  });

  it('falls back to Modest when there is nothing to preserve', () => {
    expect(getPhnnMinConfusionNature('Adamant', boosts)).toBe('Modest'); // +atk
    expect(getPhnnMinConfusionNature('Hardy', boosts)).toBe('Modest');   // neutral
    expect(getPhnnMinConfusionNature(undefined, boosts)).toBe('Modest');
  });
});

describe('applyPhnnMinConfusionSpread', () => {
  it('zeroes only Atk and leaves every other stat alone', () => {
    const evs = { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 };
    const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

    applyPhnnMinConfusionSpread(evs, ivs);

    expect(evs).toStrictEqual({ hp: 252, atk: 0, def: 252, spa: 252, spd: 252, spe: 252 });
    expect(ivs).toStrictEqual({ hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 });
  });

  it('is safe on missing tables', () => {
    expect(() => applyPhnnMinConfusionSpread(undefined, undefined)).not.toThrow();
  });

  it('measurably reduces confusion damage', () => {
    const before = calcPhnnConfusionDamage({ level: 100, atk: 504, def: 300, maxHp: 400 });
    // 0 EV / 0 IV Atk with a minus nature on a base-100 Atk mon lands near 184
    const after = calcPhnnConfusionDamage({ level: 100, atk: 184, def: 300, maxHp: 400 });

    expect(after.maxDamage).toBeLessThan(before.maxDamage);
  });
});

describe('buildPhnnMinConfusionPatch', () => {
  const boosts: Record<string, [up?: string, down?: string]> = {
    Adamant: ['atk', 'spa'],
    Modest: ['spa', 'atk'],
    Timid: ['spe', 'atk'],
    Jolly: ['spe', 'spa'],
  };
  const base = {
    nature: 'Jolly',
    evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  };

  it('turning it ON zeroes Atk AND swaps to a minus-Atk nature', () => {
    const patch = buildPhnnMinConfusionPatch('gen9nonerfsstandard', base, boosts);

    expect(patch.phnnMinConfusion).toBe(true);
    expect((patch.evs as Record<string, number>).atk).toBe(0);
    expect((patch.ivs as Record<string, number>).atk).toBe(0);
    expect(patch.nature).toBe('Timid');            // +spe preserved, drop moved to atk
    expect(patch.phnnPrevNature).toBe('Jolly');    // remembers what it displaced
  });

  it('leaves every other stat at the max-EV default', () => {
    const patch = buildPhnnMinConfusionPatch('gen9nonerfsstandard', base, boosts);
    const evs = patch.evs as Record<string, number>;

    expect(evs).toStrictEqual({ hp: 252, atk: 0, def: 252, spa: 252, spd: 252, spe: 252 });
  });

  it('turning it OFF restores both the Atk investment and the original nature', () => {
    const on = buildPhnnMinConfusionPatch('gen9nonerfsstandard', base, boosts);
    const toggled = {
      phnnMinConfusion: true,
      phnnPrevNature: on.phnnPrevNature as string,
      nature: on.nature as string,
      evs: on.evs as Record<string, number>,
      ivs: on.ivs as Record<string, number>,
    };

    const off = buildPhnnMinConfusionPatch('gen9nonerfsstandard', toggled, boosts);

    expect(off.phnnMinConfusion).toBe(false);
    expect((off.evs as Record<string, number>).atk).toBe(252);
    expect((off.ivs as Record<string, number>).atk).toBe(31);
    expect(off.nature).toBe('Jolly');        // the one we started with
    expect(off.phnnPrevNature).toBeNull();   // and the memory is cleared
  });

  it('round-trips back to the original state', () => {
    const on = buildPhnnMinConfusionPatch('gen9nonerfsstandard', base, boosts);
    const off = buildPhnnMinConfusionPatch('gen9nonerfsstandard', {
      phnnMinConfusion: true,
      phnnPrevNature: on.phnnPrevNature as string,
      nature: on.nature as string,
      evs: on.evs as Record<string, number>,
      ivs: on.ivs as Record<string, number>,
    }, boosts);

    expect(off.evs).toStrictEqual(base.evs);
    expect(off.ivs).toStrictEqual(base.ivs);
    expect(off.nature).toBe(base.nature);
  });

  it('uses the letsgo max when turning off in a letsgo format', () => {
    const off = buildPhnnMinConfusionPatch('gen7letsgopikachu', {
      phnnMinConfusion: true, evs: { atk: 0 }, ivs: { atk: 0 },
    }, boosts);

    expect((off.evs as Record<string, number>).atk).toBe(200);
  });

  it('does not invent a nature when the Pokemon had none', () => {
    const off = buildPhnnMinConfusionPatch('gen9nonerfsstandard', {
      phnnMinConfusion: true, evs: { atk: 0 }, ivs: { atk: 0 },
    }, boosts);

    expect('nature' in off).toBe(false);
  });
});
