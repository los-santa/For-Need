export const DEFAULT_CARDTYPE_BACKFILL_SQL =
  'UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL';

export function shouldBackfillDefaultCardtype(
  cardtype: number | string | null | undefined,
): boolean {
  return cardtype === null || cardtype === undefined;
}
