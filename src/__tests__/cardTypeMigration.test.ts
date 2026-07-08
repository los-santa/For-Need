import { migrateMissingCardTypesToTodo } from '../main/cardTypeMigration';

describe('migrateMissingCardTypesToTodo', () => {
  it('only backfills cards whose cardtype is NULL', () => {
    const preparedSql: string[] = [];
    const updateParams: unknown[] = [];

    const db = {
      prepare: (sql: string) => {
        preparedSql.push(sql);

        if (sql.startsWith('SELECT cardtype_id')) {
          return {
            get: () => ({ cardtype_id: 2 }),
          };
        }

        return {
          run: (...params: unknown[]) => {
            updateParams.push(...params);
            return { changes: 3 };
          },
        };
      },
    };

    expect(migrateMissingCardTypesToTodo(db)).toBe(3);
    expect(updateParams).toEqual([2]);

    const updateSql = preparedSql.find((sql) => sql.startsWith('UPDATE CARDS'));
    expect(updateSql).toBe('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL');
    expect(updateSql).not.toContain('cardtype !=');
  });

  it('does not update cards when the todo cardtype is missing', () => {
    const preparedSql: string[] = [];

    const db = {
      prepare: (sql: string) => {
        preparedSql.push(sql);
        return {
          get: () => undefined,
          run: () => {
            throw new Error('update should not run');
          },
        };
      },
    };

    expect(migrateMissingCardTypesToTodo(db)).toBe(0);
    expect(preparedSql).toEqual([
      "SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'",
    ]);
  });
});
