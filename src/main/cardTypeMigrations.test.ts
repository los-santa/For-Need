import type Database from 'better-sqlite3';
import { migrateUnsetCardTypesToNoTypeYet } from './cardTypeMigrations';

function createDatabaseStub(cards: Array<{ id: string; cardtype: number | null }>) {
  return {
    prepare(sql: string) {
      if (sql.startsWith('SELECT cardtype_id')) {
        return {
          get: () => ({ cardtype_id: 1 }),
        };
      }

      if (sql.startsWith('UPDATE CARDS SET cardtype')) {
        return {
          run: (cardtypeId: number) => {
            let changes = 0;

            cards.forEach((card) => {
              if (card.cardtype === null) {
                card.cardtype = cardtypeId;
                changes += 1;
              }
            });

            return { changes };
          },
        };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    },
  } as unknown as Database.Database;
}

describe('card type migrations', () => {
  it('only assigns the default type to cards without a cardtype', () => {
    const cards = [
      { id: 'unset', cardtype: null },
      { id: 'todo', cardtype: 2 },
      { id: 'habit', cardtype: 3 },
    ];
    const db = createDatabaseStub(cards);

    expect(migrateUnsetCardTypesToNoTypeYet(db)).toBe(1);

    expect(cards).toEqual([
      { id: 'unset', cardtype: 1 },
      { id: 'todo', cardtype: 2 },
      { id: 'habit', cardtype: 3 },
    ]);
  });
});
