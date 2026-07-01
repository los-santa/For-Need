interface CardTypeMigrationStatement {
  get: () => unknown;
  run: (...args: unknown[]) => { changes?: number };
}

interface CardTypeMigrationDatabase {
  prepare: (sql: string) => CardTypeMigrationStatement;
}

/**
 * Backfills only legacy cards that do not have a card type yet.
 * Existing non-todo card types are user data and must never be rewritten here.
 */
export function migrateMissingCardTypesToTodo(
  db: CardTypeMigrationDatabase,
): number {
  const todoCardType = db
    .prepare(
      "SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'",
    )
    .get() as { cardtype_id?: number } | undefined;

  if (typeof todoCardType?.cardtype_id !== 'number') {
    return 0;
  }

  const updateResult = db
    .prepare('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')
    .run(todoCardType.cardtype_id);

  return updateResult.changes ?? 0;
}
