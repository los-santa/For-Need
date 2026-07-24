import { getProjectCardsWithRelationCounts } from '../main/projectCardsQuery';

describe('getProjectCardsWithRelationCounts', () => {
  it('uses the current RELATION schema for relation counts', () => {
    let preparedSql = '';
    const all = jest.fn(() => []);
    const prepare = jest.fn((sql: string) => {
      preparedSql = sql;
      return { all };
    });

    const rows = getProjectCardsWithRelationCounts({ prepare }, 'project-1');

    expect(rows).toEqual([]);
    expect(all).toHaveBeenCalledWith('project-1');
    expect(preparedSql).toContain('LEFT JOIN RELATION r');
    expect(preparedSql).toContain('r.source');
    expect(preparedSql).toContain('r.target');
    expect(preparedSql).toContain('COUNT(r.relation_id)');
    expect(preparedSql).not.toContain('RELATIONS');
    expect(preparedSql).not.toContain('source_card');
    expect(preparedSql).not.toContain('target_card');
  });
});
