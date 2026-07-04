type RunResult = {
  changes?: number;
};

type PreparedStatement = {
  get: (...params: unknown[]) => unknown;
  run: (...params: unknown[]) => RunResult;
};

type MigrationDb = {
  prepare: (sql: string) => PreparedStatement;
};

type CardTypeRow = {
  cardtype_id: number;
};

export function migrateMissingCardTypesToTodo(
  db: MigrationDb,
  logger: Pick<Console, 'log'> = console,
): number {
  logger.log('Migrating cards with missing cardtype to todo cardtype...');

  const todoCardType = db
    .prepare("SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'")
    .get() as CardTypeRow | undefined;

  if (!todoCardType) {
    return 0;
  }

  const updateResult = db
    .prepare('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')
    .run(todoCardType.cardtype_id);

  const changes = updateResult.changes ?? 0;
  if (changes > 0) {
    logger.log(
      `Updated ${changes} cards with missing cardtype to 'todo' cardtype`,
    );
  }

  return changes;
}
