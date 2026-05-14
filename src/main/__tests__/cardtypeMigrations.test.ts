import Database from 'better-sqlite3';
import { migrateMissingCardtypesToTodo } from '../cardtypeMigrations';

describe('migrateMissingCardtypesToTodo', () => {
  it('only fills missing cardtypes and preserves existing user-selected types', () => {
    const db = new Database(':memory:');
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
      INSERT INTO CARDTYPES (cardtype_id, cardtype_name) VALUES
        (1, 'todo'),
        (2, 'entity'),
        (3, 'no type yet');
      INSERT INTO CARDS (id, title, cardtype) VALUES
        ('missing', 'Missing type', NULL),
        ('todo', 'Todo type', 1),
        ('entity', 'Entity type', 2),
        ('no-type-yet', 'No type yet', 3);
    `);

    const changes = migrateMissingCardtypesToTodo(db as any);

    expect(changes).toBe(1);
    expect(db.prepare('SELECT cardtype FROM CARDS WHERE id = ?').get('missing')).toEqual({ cardtype: 1 });
    expect(db.prepare('SELECT cardtype FROM CARDS WHERE id = ?').get('todo')).toEqual({ cardtype: 1 });
    expect(db.prepare('SELECT cardtype FROM CARDS WHERE id = ?').get('entity')).toEqual({ cardtype: 2 });
    expect(db.prepare('SELECT cardtype FROM CARDS WHERE id = ?').get('no-type-yet')).toEqual({ cardtype: 3 });

    db.close();
  });
});
