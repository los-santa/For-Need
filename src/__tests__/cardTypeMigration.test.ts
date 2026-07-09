import { migrateMissingCardTypesToTodo } from '../main/cardTypeMigration';

describe('migrateMissingCardTypesToTodo', () => {
  it('only backfills cards without a cardtype', () => {
    const run = jest.fn(() => ({ changes: 2 }));
    const prepare = jest.fn((sql: string) => {
      if (sql.includes('SELECT cardtype_id')) {
        return { get: () => ({ cardtype_id: 2 }), run: jest.fn() };
      }

      return { get: jest.fn(), run };
    });

    const changes = migrateMissingCardTypesToTodo({ prepare: prepare as any });

    expect(changes).toBe(2);
    expect(prepare).toHaveBeenCalledWith(
      'UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL',
    );
    expect(run).toHaveBeenCalledWith(2);
  });

  it('does not update cards when the todo cardtype is unavailable', () => {
    const run = jest.fn();
    const prepare = jest.fn(() => ({ get: () => undefined, run }));

    const changes = migrateMissingCardTypesToTodo({ prepare: prepare as any });

    expect(changes).toBe(0);
    expect(run).not.toHaveBeenCalled();
  });
});
