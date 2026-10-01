import { hasPreactBattleContent } from './hasPreactBattleContent';

type BootRoom = Parameters<typeof hasPreactBattleContent>[0] & {
  connectMode?: string | null;
};

export interface PreactBattleRoomPartition {
  rebuild: Showdown.RoomID[];
  reload: Showdown.RoomID[];
  rejoin: Showdown.RoomID[];
}

const isReplayRoom = (
  roomId: string,
  room: BootRoom,
): boolean => !!room
  && room.connected !== true
  && (room.connectMode === null || room.connectMode === 'not-found')
  && !roomId.startsWith('battle-uploaded-');

const canReload = (
  roomId: string,
  room: BootRoom,
): boolean => isReplayRoom(roomId, room)
  && (hasPreactBattleContent(room) || !!room.battle);

export const partitionPreactBattleRooms = (
  rooms: Record<string, BootRoom>,
): PreactBattleRoomPartition => {
  const battleRoomIds = Object.keys(rooms || {})
    .filter((roomId) => roomId.startsWith('battle-') && !!rooms[roomId]) as Showdown.RoomID[];

  return {
    rebuild: battleRoomIds.filter((roomId) => (
      (rooms[roomId].connected === true || rooms[roomId].connectMode === 'pending-reconnect')
        && hasPreactBattleContent(rooms[roomId])
    )),
    reload: battleRoomIds.filter((roomId) => canReload(roomId, rooms[roomId])),
    rejoin: battleRoomIds.filter((roomId) => (
      !hasPreactBattleContent(rooms[roomId]) && !canReload(roomId, rooms[roomId])
    )),
  };
};
