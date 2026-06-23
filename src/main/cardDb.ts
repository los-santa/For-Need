export interface PreparedStatementLike {
  get: (...params: any[]) => unknown;
  run: (...params: any[]) => { changes?: number };
  all: (...params: any[]) => unknown[];
}

export interface DatabaseLike {
  prepare: (sql: string) => PreparedStatementLike;
}

export function migrateNullCardTypesToTodo(db: DatabaseLike): number {
  const todoCardType = db
    .prepare("SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'")
    .get() as { cardtype_id: number } | undefined;

  if (!todoCardType) {
    return 0;
  }

  const updateResult = db
    .prepare('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')
    .run(todoCardType.cardtype_id);

  return updateResult.changes ?? 0;
}

export const PROJECT_CARDS_QUERY = `
      SELECT
        c.*,
        ct.cardtype_name,
        COUNT(r.relation_id) as relation_count
      FROM CARDS c
      LEFT JOIN CARDTYPES ct ON c.cardtype = ct.cardtype_id
      LEFT JOIN RELATION r ON (c.id = r.source OR c.id = r.target) AND r.deleted_at IS NULL
      WHERE c.project_id = ? AND c.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY c.createdat DESC
    `;

export function getProjectCardsByProjectId(db: DatabaseLike, projectId: string): unknown[] {
  return db.prepare(PROJECT_CARDS_QUERY).all(projectId);
}
