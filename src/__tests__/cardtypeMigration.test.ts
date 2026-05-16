import { migrateCardsWithoutTypeToTodo } from '../main/cardtypeMigration';

describe('migrateCardsWithoutTypeToTodo', () => {
  it('only updates cards with a null cardtype', () => {
    const prepare = jest.fn((sql: string) => {
      if (sql === "SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'") {
        return { get: () => ({ cardtype_id: 2 }) };
      }

      if (sql === 'UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL') {
        return { run: jest.fn(() => ({ changes: 3 })) };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const changedCount = migrateCardsWithoutTypeToTodo({ prepare } as never);

    expect(changedCount).toBe(3);
    expect(prepare).toHaveBeenCalledWith('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL');
    expect(prepare).not.toHaveBeenCalledWith(expect.stringContaining('cardtype !='));
  });
});
