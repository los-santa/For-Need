import Database from 'better-sqlite3';
import { migrateUnsetCardTypesToNoTypeYet } from './cardTypeMigrations';

describe('card type migrations', () => {
  it('only assigns the default type to cards without a cardtype', () => {
    const db = new Database(':memory:');

    try {
      db.exec(`
        CREATE TABLE CARDTYPES (
          cardtype_id INTEGER PRIMARY KEY,
          cardtype_name TEXT UNIQUE NOT NULL
        );
        CREATE TABLE CARDS (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          cardtype INTEGER
        );
      `);

      db.prepare('INSERT INTO CARDTYPES (cardtype_id, cardtype_name) VALUES (?, ?)').run(1, 'no type yet');
      db.prepare('INSERT INTO CARDTYPES (cardtype_id, cardtype_name) VALUES (?, ?)').run(2, 'todo');
      db.prepare('INSERT INTO CARDTYPES (cardtype_id, cardtype_name) VALUES (?, ?)').run(3, 'habit');

      db.prepare('INSERT INTO CARDS (id, title, cardtype) VALUES (?, ?, ?)').run('unset', 'Unset', null);
      db.prepare('INSERT INTO CARDS (id, title, cardtype) VALUES (?, ?, ?)').run('todo', 'Todo', 2);
      db.prepare('INSERT INTO CARDS (id, title, cardtype) VALUES (?, ?, ?)').run('habit', 'Habit', 3);

      expect(migrateUnsetCardTypesToNoTypeYet(db)).toBe(1);

      const cards = db
        .prepare('SELECT id, cardtype FROM CARDS ORDER BY id')
        .all() as Array<{ id: string; cardtype: number }>;

      expect(cards).toEqual([
        { id: 'habit', cardtype: 3 },
        { id: 'todo', cardtype: 2 },
        { id: 'unset', cardtype: 1 },
      ]);
    } finally {
      db.close();
    }
  });
});
