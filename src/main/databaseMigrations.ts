interface Statement<Result = unknown> {
  get?: (...params: unknown[]) => Result;
  run?: (...params: unknown[]) => { changes?: number };
}

interface MigrationDatabase {
  prepare: (sql: string) => Statement;
}

export function migrateMissingCardtypesToTodo(db: MigrationDatabase): number {
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
