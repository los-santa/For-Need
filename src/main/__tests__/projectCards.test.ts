import Database from 'better-sqlite3';
import { getProjectCardsWithRelationCounts } from '../projectCards';

describe('getProjectCardsWithRelationCounts', () => {
  it('uses the RELATION table schema when loading project cards', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE CARDTYPES (
        cardtype_id INTEGER PRIMARY KEY,
        cardtype_name TEXT UNIQUE NOT NULL
      );
      CREATE TABLE CARDS (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        title TEXT NOT NULL,
        cardtype INTEGER,
        createdat TEXT,
        deleted_at TEXT
      );
      CREATE TABLE RELATION (
        relation_id INTEGER PRIMARY KEY,
        relationtype_id INTEGER NOT NULL,
        source TEXT NOT NULL,
        target TEXT NOT NULL,
        project_id TEXT NOT NULL,
        createdat TEXT,
        deleted_at TEXT
      );
      INSERT INTO CARDTYPES (cardtype_id, cardtype_name) VALUES (1, 'todo');
      INSERT INTO CARDS (id, project_id, title, cardtype, createdat, deleted_at) VALUES
        ('card-a', 'project-1', 'A', 1, '2026-01-01T00:00:00.000Z', NULL),
        ('card-b', 'project-1', 'B', 1, '2026-01-02T00:00:00.000Z', NULL),
        ('deleted-card', 'project-1', 'Deleted', 1, '2026-01-03T00:00:00.000Z', '2026-01-04T00:00:00.000Z'),
        ('other-project-card', 'project-2', 'Other', 1, '2026-01-05T00:00:00.000Z', NULL);
      INSERT INTO RELATION (relation_id, relationtype_id, source, target, project_id, createdat, deleted_at) VALUES
        (10, 1, 'card-a', 'card-b', 'project-1', '2026-01-01T00:00:00.000Z', NULL),
        (11, 1, 'card-a', 'other-project-card', 'project-1', '2026-01-01T00:00:00.000Z', '2026-01-04T00:00:00.000Z');
    `);

    const rows = getProjectCardsWithRelationCounts(db as any, 'project-1') as Array<{
      id: string;
      cardtype_name: string;
      relation_count: number;
    }>;

    expect(rows.map((row) => row.id)).toEqual(['card-b', 'card-a']);
    expect(rows.find((row) => row.id === 'card-a')).toMatchObject({
      cardtype_name: 'todo',
      relation_count: 1,
    });
    expect(rows.find((row) => row.id === 'card-b')).toMatchObject({
      cardtype_name: 'todo',
      relation_count: 1,
    });

    db.close();
  });
});
