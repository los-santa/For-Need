interface SqliteRunResult {
  changes: number;
}

interface SqliteStatement<T = unknown> {
  get(...params: unknown[]): T | undefined;
  run(...params: unknown[]): SqliteRunResult;
}

interface SqliteDatabase {
  prepare<T = unknown>(sql: string): SqliteStatement<T>;
}

interface CardTypeRow {
  cardtype_id: number;
}

export function migrateMissingCardtypesToTodo(db: SqliteDatabase): number {
  const todoCardType = db
    .prepare<CardTypeRow>(
      "SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'",
    )
    .get();

  if (!todoCardType) {
    return 0;
  }

  const updateResult = db
    .prepare('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')
    .run(todoCardType.cardtype_id);

  return updateResult.changes;
}
