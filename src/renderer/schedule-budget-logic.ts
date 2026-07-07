export const MAX_BALANCE_TIMELINE_POINT_COUNT = 1000;

export function clampBalanceTimelinePointCount(value: string | number): number {
  const parsedValue =
    typeof value === 'number' ? value : Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue)) {
    return 1;
  }

  return Math.min(
    MAX_BALANCE_TIMELINE_POINT_COUNT,
    Math.max(1, Math.trunc(parsedValue)),
  );
}

export function deleteDebtById<TDebt extends { id: string }>(
  debts: TDebt[],
  id: string,
): TDebt[] {
  return debts.filter((debt) => debt.id !== id);
}
