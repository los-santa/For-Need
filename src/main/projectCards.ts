interface SqliteStatement<T = unknown> {
  all(...params: unknown[]): T[];
}

interface SqliteDatabase {
  prepare<T = unknown>(sql: string): SqliteStatement<T>;
}

export function getProjectCardsWithRelationCounts(
  db: SqliteDatabase,
  projectId: string,
) {
  return db
    .prepare(`
      SELECT
        c.*,
        ct.cardtype_name,
        COUNT(r.relation_id) as relation_count
      FROM CARDS c
      LEFT JOIN CARDTYPES ct ON c.cardtype = ct.cardtype_id
      LEFT JOIN RELATION r
        ON (c.id = r.source OR c.id = r.target)
        AND r.deleted_at IS NULL
      WHERE c.project_id = ? AND c.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY c.createdat DESC
    `)
    .all(projectId);
}
