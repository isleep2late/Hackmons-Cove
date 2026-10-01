import { describe, expect, it } from 'vitest';
import { hasPreactBattleContent } from './hasPreactBattleContent';

type Room = Parameters<typeof hasPreactBattleContent>[0];

const battle = (stepQueue: string[]) => ({ stepQueue }) as Showdown.Battle;

describe('hasPreactBattleContent()', () => {
  it('is false for a room that has not heard back from the server yet', () => {
    expect(hasPreactBattleContent({ connected: false })).toBe(false);
    expect(hasPreactBattleContent({ connected: 'pending' } as unknown as Room)).toBe(false);
    expect(hasPreactBattleContent({ connected: 'pending', battle: battle([]), pendingLines: [] } as unknown as Room)).toBe(false);
  });

  it('is true once the server has sent the room its init, even before the panel builds the battle', () => {
    expect(hasPreactBattleContent({ connected: true })).toBe(true);
    expect(hasPreactBattleContent({ connected: true, battle: null })).toBe(true);
  });

  it('is true for lines still waiting for the panel to mount', () => {
    expect(hasPreactBattleContent({ connected: false, battle: null, pendingLines: [['init', 'battle']] })).toBe(true);
  });

  it('is true for battles filled client-side, like replays and uploaded logs', () => {
    expect(hasPreactBattleContent({ connected: false, battle: battle(['|player|p1|a|1|', '|turn|1']) })).toBe(true);
  });

  it('is false when there is no room', () => {
    expect(hasPreactBattleContent(null)).toBe(false);
    expect(hasPreactBattleContent(undefined)).toBe(false);
  });
});
