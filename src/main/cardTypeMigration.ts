interface CardTypeRow {
  cardtype_id: number;
}

interface RunResult {
  changes?: number;
}

interface Statement {
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): RunResult;
}

interface DatabaseLike {
  prepare(sql: string): Statement;
}

interface LoggerLike {
  log(...args: unknown[]): void;
}

export function migrateMissingCardTypesToTodo(
  db: DatabaseLike,
  logger: LoggerLike = console,
): number {
  try {
    logger.log('Migrating existing cards without a cardtype to todo cardtype...');

    const todoCardType = db
      .prepare("SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'")
      .get() as CardTypeRow | undefined;

    if (!todoCardType) {
      return 0;
    }

    const updateResult = db
      .prepare('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')
      .run(todoCardType.cardtype_id);

    const changed = updateResult.changes ?? 0;
    if (changed > 0) {
      logger.log(`Updated ${changed} cards to 'todo' cardtype`);
    }

    return changed;
  } catch (error) {
    logger.log('Card migration error:', error);
    return 0;
  }
}
