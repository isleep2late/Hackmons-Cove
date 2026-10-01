import { describe, expect, it } from 'vitest';
import { getPreactPanel } from './getPreactPanel';

const room = (id: string) => ({ id }) as Showdown.PSRoom;

describe('getPreactPanel()', () => {
  it('uses PS.getPanel() on hosts that have it', () => {
    const panel = room('battle-gen9ou-1');

    expect(getPreactPanel({ getPanel: () => panel })).toBe(panel);
  });

  it('calls PS.getPanel() on PS itself, since it reads this.baseRoom', () => {
    const ps = {
      baseRoom: room('battle-gen9ou-1'),
      getPanel() { return this.baseRoom as Showdown.PSRoom; },
    };

    expect(getPreactPanel(ps)).toBe(ps.baseRoom);
  });

  it('falls back to PS.panel on hosts without PS.getPanel()', () => {
    const panel = room('battle-gen9ou-1');

    expect(getPreactPanel({ panel })).toBe(panel);
  });

  it('prefers PS.getPanel() over a leftover PS.panel', () => {
    const panel = room('battle-gen9ou-2');

    expect(getPreactPanel({ getPanel: () => panel, panel: room('battle-gen9ou-1') })).toBe(panel);
  });

  it('returns null when there is no panel to read', () => {
    expect(getPreactPanel(null)).toBeNull();
    expect(getPreactPanel({})).toBeNull();
    expect(getPreactPanel({ getPanel: () => null })).toBeNull();
    expect(getPreactPanel({ panel: null })).toBeNull();
  });
});
