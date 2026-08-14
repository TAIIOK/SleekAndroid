/** First mounted catalog poster with the lowest priority wins (rail 0 before rail 1). */
export function shouldClaimHandoffSlot(
  currentPriority: number,
  incomingPriority: number,
): boolean {
  return incomingPriority <= currentPriority;
}
