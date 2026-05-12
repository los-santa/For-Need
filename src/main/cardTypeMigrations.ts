import type Database from 'better-sqlite3';

export const UNSET_CARDTYPE_NAME = 'no type yet';

export function migrateUnsetCardTypesToNoTypeYet(
  database: Database.Database,
): number {
  const unsetCardType = database
    .prepare('SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = ?')
    .get(UNSET_CARDTYPE_NAME) as { cardtype_id: number } | undefined;

  if (!unsetCardType) {
    return 0;
  }

  const updateResult = database
    .prepare('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')
    .run(unsetCardType.cardtype_id);

  return updateResult.changes;
}
