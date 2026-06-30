type MigrationStatement = {
  get?: () => unknown;
  run?: (...args: any[]) => { changes?: number };
};

type MigrationDatabase = {
  prepare: (sql: string) => MigrationStatement;
};

type CardTypeRow = {
  cardtype_id: unknown;
};

export function migrateMissingCardTypesToTodo(db: MigrationDatabase): number {
  const todoCardType = db
    .prepare("SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'")
    .get?.() as CardTypeRow | undefined;

  if (!todoCardType || todoCardType.cardtype_id == null) {
    return 0;
  }

  const updateResult = db
    .prepare('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')
    .run?.(todoCardType.cardtype_id);

  return updateResult?.changes ?? 0;
}
