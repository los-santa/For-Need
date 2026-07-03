import { migrateMissingCardTypesToTodo } from '../main/cardTypeMigration';

describe('migrateMissingCardTypesToTodo', () => {
  it('backfills only cards with a missing cardtype', () => {
    const run = jest.fn(() => ({ changes: 3 }));
    const preparedSql: string[] = [];
    const db = {
      prepare: jest.fn((sql: string) => {
        preparedSql.push(sql);
        return {
          get: jest.fn(() => ({ cardtype_id: 2 })),
          run,
        };
      }),
    };

    const updatedCount = migrateMissingCardTypesToTodo(db);

    expect(updatedCount).toBe(3);
    expect(run).toHaveBeenCalledWith(2);
    expect(preparedSql).toContain(
      'UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL',
    );
    expect(preparedSql.join('\n')).not.toContain('cardtype !=');
  });

  it('does not update cards when the todo cardtype is missing', () => {
    const run = jest.fn();
    const db = {
      prepare: jest.fn(() => ({
        get: jest.fn(() => undefined),
        run,
      })),
    };

    const updatedCount = migrateMissingCardTypesToTodo(db);

    expect(updatedCount).toBe(0);
    expect(run).not.toHaveBeenCalled();
  });
});
