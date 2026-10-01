import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { rebuildPreactBattleRoom } from './rebuildPreactBattleRoom';

type Room = Parameters<typeof rebuildPreactBattleRoom>[0]['rooms'][string];

class NewRoom implements Room {
  [key: string]: unknown;
  public options: Room;
  public batches: string[][][] = [];

  public constructor(options: Room) {
    this.options = options;
  }

  public receiveBatch(batch: string[][]) {
    this.batches.push(batch);
  }
}

const parseLine = (line: string) => line.slice(1).split('|');

const oldRoom = (overrides: Partial<Room> = {}): Room => ({
  id: 'battle-gen9customgame-1',
  connected: true,
  battle: { stepQueue: ['|player|p1|A|1', '|turn|1'], destroy: vi.fn() },
  request: { requestType: 'move', rqid: 3 },
  choices: { isDone: () => false, toString: () => '' },
  users: { a: ' A' },
  userCount: 2,
  onlineUsers: [['a', ' A']],
  requireForfeit: true,
  rejoining: true,
  receiveBatch: vi.fn(),
  ...overrides,
});

describe('rebuildPreactBattleRoom()', () => {
  it('rebuilds a room from its battle lines and its last request, and puts it everywhere the old one was', () => {
    const old = oldRoom();
    const host = {
      rooms: { [old.id as string]: old },
      room: old,
      leftPanel: old,
      rightPanel: null,
      pendingFocus: { room: old },
    };
    const room = rebuildPreactBattleRoom(host, old.id as string, NewRoom, parseLine);

    expect(room).toBeInstanceOf(NewRoom);
    expect(room.options).toBe(old);
    expect(room.batches).toEqual([[
      ['player', 'p1', 'A', '1'],
      ['turn', '1'],
      ['request', JSON.stringify(old.request)],
    ]]);
    expect(host.rooms[old.id as string]).toBe(room);
    expect(host.room).toBe(room);
    expect(host.leftPanel).toBe(room);
    expect(host.rightPanel).toBe(null);
    expect(host.pendingFocus.room).toBe(room);
    expect([room.users, room.userCount, room.onlineUsers]).toEqual([old.users, 2, old.onlineUsers]);
    expect([room.requireForfeit, room.rejoining]).toEqual([true, true]);
    expect(old.battle.destroy).toHaveBeenCalled();
  });

  it('keeps the notifications it already showed, and is treated as rejoined so a player sees the current turn', () => {
    const notifications = [{
      id: 'choice',
      title: 'Your move',
      body: 'Pick a move',
      noAutoDismiss: true,
    }];
    const old = oldRoom({
      notifications,
      isSubtleNotifying: true,
      connectError: 'gone',
      rejoining: false,
    });
    const room = rebuildPreactBattleRoom({ rooms: { x: old } }, 'x', NewRoom, parseLine);

    expect(room.notifications).toBe(notifications);
    expect([room.isSubtleNotifying, room.connectError, room.rejoining]).toEqual([true, 'gone', true]);
  });

  it('passes on a choice that was already sent', () => {
    const old = oldRoom({ choices: { isDone: () => true, toString: () => 'move 1' } });
    const room = rebuildPreactBattleRoom({ rooms: { x: old } }, 'x', NewRoom, parseLine);

    expect(room.batches[0].slice(-2)).toEqual([['request', JSON.stringify(old.request)], ['sentchoice', 'move 1']]);
  });

  it('adds no request for a spectator, or for a room whose lines are still waiting for its panel', () => {
    const spectator = rebuildPreactBattleRoom({ rooms: { x: oldRoom({ request: null }) } }, 'x', NewRoom, parseLine);
    expect(spectator.batches[0]).toEqual([['player', 'p1', 'A', '1'], ['turn', '1']]);

    const pendingLines = [['init', 'battle'], ['request', '{"wait":true}']];
    const unbuilt = rebuildPreactBattleRoom({ rooms: { x: oldRoom({ battle: null, pendingLines }) } }, 'x', NewRoom, parseLine);
    expect(unbuilt.batches[0]).toEqual(pendingLines);
    expect(unbuilt.batches[0]).not.toBe(pendingLines);
  });

  it('keeps an Infinite Mod set being typed, as a copy', () => {
    const old = oldRoom({ infinite: { p1: { slots: 1, total: 1, draft: 'Mew' } } });
    const room = rebuildPreactBattleRoom({ rooms: { x: old } }, 'x', NewRoom, parseLine);

    expect(room.infinite).toEqual(old.infinite);
    expect(room.infinite).not.toBe(old.infinite);
  });

  it('queues focus for the rebuilt room when the old one was focused, as updateRoomTypes does', () => {
    const old = oldRoom();
    const queueFocus = vi.fn();
    const host = { rooms: { x: old }, room: old, queueFocus };
    const room = rebuildPreactBattleRoom(host, 'x', NewRoom, parseLine);

    expect(queueFocus).toHaveBeenCalledTimes(1);
    expect(queueFocus).toHaveBeenCalledWith(room, { preventScroll: true });

    const other = oldRoom();
    const backgroundQueueFocus = vi.fn();
    rebuildPreactBattleRoom({ rooms: { y: other }, room: {}, queueFocus: backgroundQueueFocus }, 'y', NewRoom, parseLine);

    expect(backgroundQueueFocus).not.toHaveBeenCalled();
  });

  it('does nothing for a missing room or one that is already the new type', () => {
    expect(rebuildPreactBattleRoom({ rooms: {} }, 'x', NewRoom, parseLine)).toBe(null);
    expect(rebuildPreactBattleRoom(null, 'x', NewRoom, parseLine)).toBe(null);

    const already = new NewRoom(oldRoom());
    const host = { rooms: { x: already } };
    expect(rebuildPreactBattleRoom(host, 'x', NewRoom, parseLine)).toBe(null);
    expect(host.rooms.x).toBe(already);
  });

  it('does not queue a /join for a room waiting to reconnect', () => {
    const old = oldRoom({ connected: false, connectMode: 'pending-reconnect' });
    const room = rebuildPreactBattleRoom({ rooms: { x: old } }, 'x', NewRoom, parseLine);

    expect(room.options).not.toBe(old);
    expect(room.options.connectMode).toBe(null);
    expect(room.connectMode).toBe('pending-reconnect');
  });

  it('reloads from a replacement batch instead of the old lines, and adds no request', () => {
    const old = oldRoom({ connected: false, connectMode: 'not-found', connectError: 'Battle "x" not found' });
    const room = rebuildPreactBattleRoom({ rooms: { x: old } }, 'x', NewRoom, parseLine, [['noinit', 'joinfailed', 'Battle "x" not found']]);

    expect(room.batches).toEqual([[['noinit', 'joinfailed', 'Battle "x" not found']]]);
    expect(room.options.connectMode).toBe(null);
    expect([room.connectMode, room.connectError]).toEqual(['not-found', 'Battle "x" not found']);
    expect(old.battle.destroy).toHaveBeenCalled();
  });
});
