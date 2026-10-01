export const hasPreactBattleContent = (
  room: Partial<Pick<Showdown.BattleRoom, 'connected' | 'battle'>> & { pendingLines?: unknown[] },
): boolean => !!room && (
  room.connected === true
    || !!room.battle?.stepQueue?.length
    || !!room.pendingLines?.length
);
