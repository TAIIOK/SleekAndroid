/** Party room plays in the root `/watch` modal so TV HW keys are not swallowed by AppShell. */
export function partyRoomHref(roomId: string) {
  return {
    pathname: '/watch/party/[roomId]' as const,
    params: { roomId },
  };
}
