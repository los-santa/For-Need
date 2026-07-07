import { migrateMissingCardTypesToTodo } from '../main/cardTypeMigration';

describe('migrateMissingCardTypesToTodo', () => {
  it('only backfills cards that do not have a card type', () => {
    const run = jest.fn(() => ({ changes: 2 }));
    const prepare = jest.fn((sql: string) => {
      if (sql.includes('SELECT cardtype_id')) {
        return { get: () => ({ cardtype_id: 7 }) };
      }

      return { run };
    });

    const changes = migrateMissingCardTypesToTodo({ prepare });

    expect(changes).toBe(2);
    expect(prepare).toHaveBeenCalledWith(
      'UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL',
    );
    expect(run).toHaveBeenCalledWith(7);
  });

  it('does not run an update when the todo card type is missing', () => {
    const prepare = jest.fn((sql: string) => {
      if (sql.includes('SELECT cardtype_id')) {
        return { get: () => undefined };
      }

      return { run: jest.fn() };
    });

    expect(migrateMissingCardTypesToTodo({ prepare })).toBe(0);
    expect(prepare).toHaveBeenCalledTimes(1);
  });
});
