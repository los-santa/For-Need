import { migrateMissingCardTypesToTodo } from '../main/cardTypeMigration';

describe('migrateMissingCardTypesToTodo', () => {
  it('only migrates cards with missing cardtype to todo', () => {
    const cards: Array<{ id: string; cardtype: number | null }> = [
      { id: 'missing-type', cardtype: null },
      { id: 'todo-card', cardtype: 2 },
      { id: 'habit-card', cardtype: 4 },
      { id: 'entity-card', cardtype: 3 },
    ];

    const db = {
      prepare(sql: string) {
        if (sql === "SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'") {
          return {
            get: () => ({ cardtype_id: 2 }),
          };
        }

        if (sql === 'UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL') {
          return {
            run: (todoCardTypeId: number) => {
              let changes = 0;
              cards.forEach((card) => {
                if (card.cardtype === null) {
                  card.cardtype = todoCardTypeId;
                  changes += 1;
                }
              });
              return { changes };
            },
          };
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      },
    };

    expect(migrateMissingCardTypesToTodo(db)).toBe(1);
    expect(cards).toEqual([
      { id: 'missing-type', cardtype: 2 },
      { id: 'todo-card', cardtype: 2 },
      { id: 'habit-card', cardtype: 4 },
      { id: 'entity-card', cardtype: 3 },
    ]);
  });

  it('does nothing when the todo card type is unavailable', () => {
    const db = {
      prepare(sql: string) {
        if (sql === "SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'") {
          return {
            get: () => undefined,
          };
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      },
    };

    expect(migrateMissingCardTypesToTodo(db)).toBe(0);
  });
});
