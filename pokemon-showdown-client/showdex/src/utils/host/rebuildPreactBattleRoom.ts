type Args = string[];

interface RebuildableRoom {
  connected?: unknown;
  connectMode?: string | null;
  battle?: { stepQueue?: string[]; destroy?: () => void; } | null;
  pendingLines?: Args[];
  request?: unknown;
  choices?: { isDone?: () => boolean; toString(): string; } | null;
  infinite?: Record<string, unknown>;
  receiveBatch(batch: Args[]): void;
  [key: string]: unknown;
}

interface RebuildableHost {
  rooms: Record<string, RebuildableRoom>;
  pendingFocus?: { room?: unknown } | null;
  queueFocus?: (room: unknown, options?: Record<string, unknown>) => void;
  [key: string]: unknown;
}

const CARRIED_KEYS = [
  'users',
  'userCount',
  'onlineUsers',
  'requireForfeit',
  'autoTimerActivated',
  'notifications',
  'isSubtleNotifying',
  'connectError',
] as const;
const PANEL_KEYS = ['leftPanel', 'rightPanel', 'room', 'baseRoom'] as const;

export const rebuildPreactBattleRoom = <TRoom extends RebuildableRoom>(
  host: RebuildableHost,
  roomId: string,
  Model: new (options: RebuildableRoom) => TRoom,
  parseLine: (line: string) => Args,
  replacementBatch?: Args[] | null,
): TRoom | null => {
  const old = host?.rooms?.[roomId];

  if (!old || old instanceof Model) {
    return null;
  }

  const batch: Args[] = replacementBatch ? [...replacementBatch] : old.battle
    ? (old.battle.stepQueue || []).map((line) => parseLine(line))
    : [...(old.pendingLines || [])];

  if (!replacementBatch && old.battle && old.request) {
    batch.push(['request', JSON.stringify(old.request)]);

    if (old.choices?.isDone?.()) {
      batch.push(['sentchoice', old.choices.toString()]);
    }
  }

  const room = new Model(old.connected ? old : { ...old, connectMode: null });

  room.connectMode = old.connectMode;

  CARRIED_KEYS.forEach((key) => {
    if (key in old) {
      (room as RebuildableRoom)[key] = old[key];
    }
  });

  (room as RebuildableRoom).rejoining = true;

  if (old.infinite) {
    room.infinite = JSON.parse(JSON.stringify(old.infinite)) as Record<string, unknown>;
  }

  host.rooms[roomId] = room;

  const wasFocused = host.room === old;

  PANEL_KEYS.forEach((key) => {
    if (host[key] === old) {
      host[key] = room;
    }
  });

  if (host.pendingFocus?.room === old) {
    host.pendingFocus.room = room;
  }

  if (wasFocused) {
    host.queueFocus?.(room, { preventScroll: true });
  }

  room.receiveBatch(batch);
  old.battle?.destroy?.();

  return room;
};
