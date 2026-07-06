import { migrateMissingCardTypesToTodo } from '../main/cardTypeMigration';

describe('migrateMissingCardTypesToTodo', () => {
  it('only backfills cards whose cardtype is null', () => {
    const preparedStatements: string[] = [];
    const runCalls: unknown[][] = [];

    const db = {
      prepare(sql: string) {
        preparedStatements.push(sql);
        return {
          get: () => ({ cardtype_id: 2 }),
          run: (...args: unknown[]) => {
            runCalls.push(args);
            return { changes: 3 };
          },
        };
      },
    };

    const changes = migrateMissingCardTypesToTodo(db);

    expect(changes).toBe(3);
    expect(preparedStatements[1]).toBe(
      'UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL',
    );
    expect(runCalls).toEqual([[2]]);
  });

  it('does not update cards when the todo card type is missing', () => {
    const preparedStatements: string[] = [];

    const db = {
      prepare(sql: string) {
        preparedStatements.push(sql);
        return {
          get: () => undefined,
          run: () => {
            throw new Error('unexpected update');
          },
        };
      },
    };

    const changes = migrateMissingCardTypesToTodo(db);

    expect(changes).toBe(0);
    expect(preparedStatements).toEqual([
      "SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'",
    ]);
  });
});
