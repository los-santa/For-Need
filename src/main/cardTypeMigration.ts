type RunResult = { changes: number };

type Statement = {
  get?: () => unknown;
  run?: (...params: unknown[]) => RunResult;
};

type MigrationDb = {
  prepare: (sql: string) => Statement;
};

export function migrateMissingCardTypesToTodo(db: MigrationDb): number {
  const todoCardType = db
    .prepare("SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'")
    .get?.() as { cardtype_id?: number } | undefined;

  if (!todoCardType?.cardtype_id) {
    return 0;
  }

  const updateResult = db
    .prepare('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')
    .run?.(todoCardType.cardtype_id);

  return updateResult?.changes ?? 0;
}
