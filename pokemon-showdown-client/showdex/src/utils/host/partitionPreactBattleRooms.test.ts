import { describe, expect, it } from 'vitest';
import { partitionPreactBattleRooms } from './partitionPreactBattleRooms';

type Rooms = Parameters<typeof partitionPreactBattleRooms>[0];

const battle = (stepQueue: string[]) => ({ stepQueue }) as Showdown.Battle;
const log = ['|player|p1|a|1|', '|turn|1'];

describe('partitionPreactBattleRooms()', () => {
  it('rebuilds live battles, including one waiting to reconnect', () => {
    const rooms = {
      'battle-live': { connected: true, connectMode: 'normal', battle: battle(log) },
      'battle-reconnecting': { connected: false, connectMode: 'pending-reconnect', battle: battle(log) },
      'battle-rejoin-sent': { connected: 'pending', connectMode: 'pending-reconnect', battle: battle(log) },
    } as unknown as Rooms;

    expect(partitionPreactBattleRooms(rooms)).toEqual({
      rebuild: ['battle-live', 'battle-reconnecting', 'battle-rejoin-sent'],
      reload: [],
      rejoin: [],
    });
  });

  it('rejoins rooms that have nothing yet, and replays so they load again at turn 0', () => {
    const rooms = {
      'battle-pending': { connected: 'pending', connectMode: 'normal' },
      'battle-reconnect-empty': { connected: false, connectMode: 'pending-reconnect' },
      'battle-replay': { connected: false, connectMode: null, battle: battle(log) },
      'battle-replay-loading': { connected: false, connectMode: 'not-found', pendingLines: [['noinit', 'nonexistent']] },
      'battle-replay-fetching': { connected: false, connectMode: 'not-found', battle: battle([]) },
      'battle-replay-idle': { connected: false, connectMode: 'not-found' },
    } as unknown as Rooms;

    expect(partitionPreactBattleRooms(rooms)).toEqual({
      rebuild: [],
      reload: ['battle-replay', 'battle-replay-loading', 'battle-replay-fetching'],
      rejoin: ['battle-pending', 'battle-reconnect-empty', 'battle-replay-idle'],
    });
  });

  it('leaves uploaded replays and ended battles alone, since their log may exist only here', () => {
    const rooms = {
      'battle-uploaded-1': { connected: false, connectMode: null, battle: battle(log) },
      'battle-ended': { connected: false, connectMode: 'deleted', battle: battle(log) },
    } as unknown as Rooms;

    expect(partitionPreactBattleRooms(rooms)).toEqual({ rebuild: [], reload: [], rejoin: [] });
  });

  it('only looks at battle rooms', () => {
    const rooms = {
      lobby: { connected: true },
      'view-ladder': { connected: false, connectMode: null },
      'battle-gone': null,
    } as unknown as Rooms;

    expect(partitionPreactBattleRooms(rooms)).toEqual({ rebuild: [], reload: [], rejoin: [] });
    expect(partitionPreactBattleRooms(null)).toEqual({ rebuild: [], reload: [], rejoin: [] });
  });
});
