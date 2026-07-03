interface StatementResult {
  changes?: number;
}

interface PreparedStatement {
  get: (...args: unknown[]) => unknown;
  run: (...args: unknown[]) => StatementResult;
}

export interface CardTypeMigrationDatabase {
  prepare: (sql: string) => PreparedStatement;
}

interface CardTypeRow {
  cardtype_id: number;
}

function isCardTypeRow(value: unknown): value is CardTypeRow {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as CardTypeRow).cardtype_id === 'number'
  );
}

export function migrateMissingCardTypesToTodo(
  db: CardTypeMigrationDatabase,
): number {
  const todoCardType = db
    .prepare("SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'")
    .get();

  if (!isCardTypeRow(todoCardType)) {
    return 0;
  }

  const updateResult = db
    .prepare('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')
    .run(todoCardType.cardtype_id);

  return updateResult.changes ?? 0;
}
