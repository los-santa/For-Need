export const assignDefaultCardTypeSql =
  'UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL';

export function shouldAssignDefaultCardType(
  cardtype: number | null | undefined,
): boolean {
  return cardtype == null;
}
