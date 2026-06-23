import {
  PROJECT_CARDS_QUERY,
  PreparedStatementLike,
  migrateNullCardTypesToTodo,
  getProjectCardsByProjectId,
} from '../main/cardDb';

function makeStatement(overrides: Partial<PreparedStatementLike>): PreparedStatementLike {
  return {
    get: () => undefined,
    run: () => ({ changes: 0 }),
    all: () => [],
    ...overrides,
  };
}

describe('card database helpers', () => {
  it('only backfills cards whose cardtype is NULL', () => {
    let updateSql = '';
    let updateParams: unknown[] = [];

    const db = {
      prepare: (sql: string) => {
        if (sql.includes('SELECT cardtype_id')) {
          return makeStatement({ get: () => ({ cardtype_id: 2 }) });
        }

        updateSql = sql;
        return makeStatement({
          run: (...params: unknown[]) => {
            updateParams = params;
            return { changes: 3 };
          },
        });
      },
    };

    expect(migrateNullCardTypesToTodo(db)).toBe(3);
    expect(updateSql).toBe('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL');
    expect(updateSql).not.toContain('cardtype !=');
    expect(updateParams).toEqual([2]);
  });

  it('does not run a cardtype backfill when the todo type is missing', () => {
    const preparedSqls: string[] = [];

    const db = {
      prepare: (sql: string) => {
        preparedSqls.push(sql);
        return makeStatement({ get: () => undefined });
      },
    };

    expect(migrateNullCardTypesToTodo(db)).toBe(0);
    expect(preparedSqls).toEqual([
      "SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'",
    ]);
  });

  it('uses the real RELATION schema for project card relation counts', () => {
    expect(PROJECT_CARDS_QUERY).toContain('COUNT(r.relation_id)');
    expect(PROJECT_CARDS_QUERY).toContain('LEFT JOIN RELATION r');
    expect(PROJECT_CARDS_QUERY).toContain('c.id = r.source');
    expect(PROJECT_CARDS_QUERY).toContain('c.id = r.target');
    expect(PROJECT_CARDS_QUERY).not.toContain('RELATIONS');
    expect(PROJECT_CARDS_QUERY).not.toContain('source_card');
    expect(PROJECT_CARDS_QUERY).not.toContain('target_card');
  });

  it('loads project cards with the project id parameter', () => {
    let query = '';
    let params: unknown[] = [];
    const rows = [{ id: 'card-1', relation_count: 2 }];

    const db = {
      prepare: (sql: string) => {
        query = sql;
        return makeStatement({
          all: (...nextParams: unknown[]) => {
            params = nextParams;
            return rows;
          },
        });
      },
    };

    expect(getProjectCardsByProjectId(db, 'project-1')).toBe(rows);
    expect(query).toBe(PROJECT_CARDS_QUERY);
    expect(params).toEqual(['project-1']);
  });
});
