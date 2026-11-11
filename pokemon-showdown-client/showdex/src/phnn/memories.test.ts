import { describe, expect, it } from 'vitest';
import { getMultiAttack } from '@smogon/calc/dist/items';
import { PokemonTypeAssociativeItems } from '@showdex/consts/dex';

describe('Custom Disguises Memories', () => {
  it('maps Question Memory and Shadow Memory to their types', () => {
    expect(PokemonTypeAssociativeItems['Question Memory']).toBe('???');
    expect(PokemonTypeAssociativeItems['Shadow Memory']).toBe('Shadow');
  });

  it('gives Multi-Attack the Memory type in the patched calc', () => {
    expect(getMultiAttack('Question Memory')).toBe('???');
    expect(getMultiAttack('Shadow Memory')).toBe('Shadow');
    expect(getMultiAttack('Fire Memory')).toBe('Fire');
  });
});
