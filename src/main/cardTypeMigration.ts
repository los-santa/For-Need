type RunResult = {
  changes: number;
};

type Statement = {
  get: (...args: unknown[]) => unknown;
  run: (...args: unknown[]) => RunResult;
};

export type CardTypeMigrationDatabase = {
  prepare: (sql: string) => Statement;
};

export function migrateMissingCardTypesToTodo(
  database: CardTypeMigrationDatabase,
): number {
  const todoCardType = database
    .prepare("SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'")
    .get() as { cardtype_id?: number } | undefined;

  if (todoCardType?.cardtype_id == null) {
    return 0;
  }

  const updateResult = database
    .prepare('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')
    .run(todoCardType.cardtype_id);

  return updateResult.changes;
}
