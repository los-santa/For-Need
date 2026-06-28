type CardTypeRow = {
  cardtype_id: number;
};

type RunResult = {
  changes?: number;
};

type Statement = {
  get: (...args: unknown[]) => unknown;
  run: (...args: unknown[]) => RunResult;
};

export type CardTypeMigrationDb = {
  prepare: (sql: string) => Statement;
};

export function migrateMissingCardTypesToTodo(db: CardTypeMigrationDb): number {
  const todoCardType = db
    .prepare("SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'")
    .get() as CardTypeRow | undefined;

  if (!todoCardType) {
    return 0;
  }

  const updateResult = db
    .prepare('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')
    .run(todoCardType.cardtype_id);

  return updateResult.changes ?? 0;
}
