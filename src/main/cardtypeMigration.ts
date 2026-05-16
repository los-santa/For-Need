interface StatementWithGet<T> {
  get: (...params: unknown[]) => T | undefined;
}

interface StatementWithRun {
  run: (...params: unknown[]) => { changes?: number };
}

export interface CardtypeMigrationDb {
  prepare(sql: "SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'"): StatementWithGet<{ cardtype_id: number }>;
  prepare(sql: "UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL"): StatementWithRun;
}

export function migrateCardsWithoutTypeToTodo(db: CardtypeMigrationDb): number {
  const todoCardType = db
    .prepare("SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'")
    .get();

  if (!todoCardType) {
    return 0;
  }

  const updateResult = db
    .prepare("UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL")
    .run(todoCardType.cardtype_id);

  return updateResult.changes ?? 0;
}
