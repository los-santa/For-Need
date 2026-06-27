interface PreparedStatement<T = unknown> {
  get(...params: unknown[]): T | undefined;
  run(...params: unknown[]): { changes?: number };
}

export interface CardTypeMigrationDatabase {
  prepare<T = unknown>(sql: string): PreparedStatement<T>;
}

interface CardTypeRow {
  cardtype_id: number;
}

export function assignDefaultCardTypeToUntypedCards(
  database: CardTypeMigrationDatabase,
): number {
  const todoCardType = database
    .prepare<CardTypeRow>(
      "SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'",
    )
    .get();

  if (!todoCardType) {
    return 0;
  }

  const updateResult = database
    .prepare('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')
    .run(todoCardType.cardtype_id);

  return updateResult.changes ?? 0;
}
