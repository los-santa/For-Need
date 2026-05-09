export const UNTYPED_CARDTYPE_NAME = 'no type yet';

interface CardTypeRow {
  cardtype_id: number;
}

interface RunResult {
  changes?: number;
}

interface MigrationDatabase {
  prepare(sql: string): {
    get(...params: unknown[]): CardTypeRow | undefined;
    run(...params: unknown[]): RunResult;
  };
}

export function migrateCardsWithoutType(
  db: MigrationDatabase,
  fallbackCardTypeName = UNTYPED_CARDTYPE_NAME,
) {
  const fallbackCardType = db
    .prepare('SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = ?')
    .get(fallbackCardTypeName);

  if (typeof fallbackCardType?.cardtype_id !== 'number') {
    return { changes: 0, cardtypeId: null };
  }

  const updateResult = db
    .prepare('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')
    .run(fallbackCardType.cardtype_id);

  return {
    changes: updateResult.changes ?? 0,
    cardtypeId: fallbackCardType.cardtype_id,
  };
}
