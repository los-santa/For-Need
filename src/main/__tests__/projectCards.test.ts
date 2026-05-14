import { getProjectCardsWithRelationCounts } from '../projectCards';

describe('getProjectCardsWithRelationCounts', () => {
  it('uses the RELATION table schema when loading project cards', () => {
    let capturedSql = '';
    let capturedProjectId = '';
    const db = {
      prepare(sql: string) {
        capturedSql = sql;
        return {
          all(projectId: string) {
            capturedProjectId = projectId;

            if (sql.includes('RELATIONS') || sql.includes('source_card') || sql.includes('target_card')) {
              throw new Error('Query uses stale relation schema');
            }

            return [
              { id: 'card-b', cardtype_name: 'todo', relation_count: 1 },
              { id: 'card-a', cardtype_name: 'todo', relation_count: 1 },
            ];
          },
        };
      },
    };

    const rows = getProjectCardsWithRelationCounts(db as any, 'project-1') as Array<{
      id: string;
      cardtype_name: string;
      relation_count: number;
    }>;

    expect(capturedProjectId).toBe('project-1');
    expect(capturedSql).toContain('COUNT(r.relation_id)');
    expect(capturedSql).toContain('LEFT JOIN RELATION r');
    expect(capturedSql).toContain('c.id = r.source OR c.id = r.target');
    expect(capturedSql).not.toContain('RELATIONS');
    expect(capturedSql).not.toContain('source_card');
    expect(capturedSql).not.toContain('target_card');
    expect(rows.map((row) => row.id)).toEqual(['card-b', 'card-a']);
    expect(rows.find((row) => row.id === 'card-a')).toMatchObject({
      cardtype_name: 'todo',
      relation_count: 1,
    });
    expect(rows.find((row) => row.id === 'card-b')).toMatchObject({
      cardtype_name: 'todo',
      relation_count: 1,
    });
  });
});
