export interface CardTypeMigrationDatabase {
  prepare(sql: string): {
    get?: () => unknown;
    run?: (...params: unknown[]) => { changes?: number };
  };
}

export function migrateMissingCardTypesToTodo(db: CardTypeMigrationDatabase): number {
  const todoCardType = db
    .prepare("SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'")
    .get?.() as { cardtype_id?: number | string } | undefined;

  if (!todoCardType?.cardtype_id) {
    return 0;
  }

  const updateResult = db
    .prepare('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')
    .run?.(todoCardType.cardtype_id);

  return updateResult?.changes ?? 0;
}
