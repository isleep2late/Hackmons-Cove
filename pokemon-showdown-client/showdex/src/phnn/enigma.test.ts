import { describe, expect, it } from 'vitest';
import { getPhnnBaseItem, getPhnnEnigmaItem } from './enigma';

const items: Record<string, Record<string, unknown>> = {
  leftovers: { exists: true, name: 'Leftovers' },
  focusband: { exists: true, name: 'Focus Band' },
  enigmaberry: { exists: true, name: 'Enigma Berry' },
  enigmaleftovers: { exists: true, name: 'Enigma Leftovers', enigmaBase: 'leftovers' },
  enigmafocusband100: {
    exists: true, name: 'Enigma Focus Band (100)', enigmaBase: 'focusband', enigmaParam: 100,
  },
  stribberry: { exists: true, name: 'Strib Berry', enigmaBase: '', enigmaPreset: true },
  pechaberry: { exists: true, name: 'Pecha Berry' },
  drashberry: { exists: true, name: 'Drash Berry', enigmaBase: 'pechaberry', enigmaPreset: true },
};

const dex = {
  items: {
    get: (name: string) => items[name.toLowerCase().replace(/[^a-z0-9]+/g, '')] || { exists: false },
  },
};

describe('getPhnnEnigmaItem', () => {
  it('resolves an Enigma copy to its base item', () => {
    expect(getPhnnEnigmaItem(dex, 'Enigma Leftovers')).toEqual({
      item: 'Leftovers', enigmaItem: 'Enigma Leftovers', enigmaParam: null,
    });
    expect(getPhnnEnigmaItem(dex, 'Enigma Focus Band (100)')).toEqual({
      item: 'Focus Band', enigmaItem: 'Enigma Focus Band (100)', enigmaParam: 100,
    });
  });

  it('resolves the e-Reader berries', () => {
    expect(getPhnnEnigmaItem(dex, 'Drash Berry')).toEqual({
      item: 'Pecha Berry', enigmaItem: 'Drash Berry', enigmaParam: null,
    });
    expect(getPhnnEnigmaItem(dex, 'Strib Berry')).toEqual({
      item: 'Enigma Berry', enigmaItem: 'Strib Berry', enigmaParam: null,
    });
    expect(getPhnnBaseItem(dex, 'Strib Berry')).toBe('Enigma Berry');
  });

  it('leaves ordinary items alone', () => {
    expect(getPhnnEnigmaItem(dex, 'Leftovers')).toBeNull();
    expect(getPhnnEnigmaItem(dex, 'Enigma Berry')).toBeNull();
    expect(getPhnnEnigmaItem(dex, 'Nonsense')).toBeNull();
    expect(getPhnnEnigmaItem(dex, '')).toBeNull();
    expect(getPhnnEnigmaItem(null, 'Enigma Leftovers')).toBeNull();
  });

  it('gives the name the calc understands', () => {
    expect(getPhnnBaseItem(dex, 'Enigma Leftovers')).toBe('Leftovers');
    expect(getPhnnBaseItem(dex, 'Leftovers')).toBe('Leftovers');
    expect(getPhnnBaseItem(dex, null)).toBeNull();
  });
});
