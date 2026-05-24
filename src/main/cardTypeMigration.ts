interface DatabaseStatement {
  get(...args: unknown[]): unknown;
  run(...args: unknown[]): { changes?: number };
}

interface DatabaseLike {
  prepare(sql: string): DatabaseStatement;
}

export function assignDefaultCardTypeToUnclassifiedCards(
  db: DatabaseLike,
  defaultTypeName = 'no type yet',
): number {
  const defaultCardType = db
    .prepare('SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = ?')
    .get(defaultTypeName) as { cardtype_id?: number } | undefined;

  if (!defaultCardType?.cardtype_id) {
    return 0;
  }

  const updateResult = db
    .prepare('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')
    .run(defaultCardType.cardtype_id);

  return updateResult.changes ?? 0;
}
