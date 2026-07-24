interface Statement<TGet = unknown> {
  get: (...params: unknown[]) => TGet;
  run: (...params: unknown[]) => { changes: number };
}

interface CardTypeMigrationDatabase {
  prepare: <TGet = unknown>(sql: string) => Statement<TGet>;
}

interface CardTypeRow {
  cardtype_id: number;
}

export function migrateMissingCardTypesToTodo(
  database: CardTypeMigrationDatabase,
): number {
  const todoCardType = database
    .prepare<CardTypeRow | undefined>(
      "SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'",
    )
    .get();

  if (!todoCardType) {
    return 0;
  }

  const updateResult = database
    .prepare('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')
    .run(todoCardType.cardtype_id);

  return updateResult.changes;
}
