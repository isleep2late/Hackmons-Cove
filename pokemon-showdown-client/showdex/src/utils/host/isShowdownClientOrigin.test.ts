import { describe, expect, it } from 'vitest';
import { isShowdownClientOrigin } from './isShowdownClientOrigin';

describe('isShowdownClientOrigin()', () => {
  it('is true only for the Showdown client origin that serves action.php', () => {
    expect(isShowdownClientOrigin('https://play.pokemonshowdown.com')).toBe(true);
    expect(isShowdownClientOrigin('https://beta.hackmons.com')).toBe(false);
    expect(isShowdownClientOrigin('https://play.hackmons.com')).toBe(false);
    expect(isShowdownClientOrigin('http://play.pokemonshowdown.com')).toBe(false);
  });

  it('is false without an origin', () => {
    expect(isShowdownClientOrigin('')).toBe(false);
    expect(isShowdownClientOrigin(null)).toBe(false);
  });
});
