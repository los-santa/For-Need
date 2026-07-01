import { migrateMissingCardTypesToTodo } from '../main/cardTypeMigration';

describe('migrateMissingCardTypesToTodo', () => {
  it('backfills only cards with a missing cardtype', () => {
    const cards: Array<{ id: string; cardtype: number | null }> = [
      { id: 'legacy-null', cardtype: null },
      { id: 'no-type-yet', cardtype: 1 },
      { id: 'todo', cardtype: 2 },
      { id: 'entity', cardtype: 3 },
      { id: 'habit', cardtype: 4 },
    ];

    const db = {
      prepare(sql: string) {
        if (sql.includes("cardtype_name = 'todo'")) {
          return {
            get: () => ({ cardtype_id: 2 }),
            run: () => ({ changes: 0 }),
          };
        }

        if (sql === 'UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL') {
          return {
            get: () => undefined,
            run: (...args: unknown[]) => {
              const [todoCardTypeId] = args as [number];
              let changes = 0;
              for (const card of cards) {
                if (card.cardtype === null) {
                  card.cardtype = todoCardTypeId;
                  changes += 1;
                }
              }

              return { changes };
            },
          };
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      },
    };

    expect(migrateMissingCardTypesToTodo(db)).toBe(1);
    expect(cards).toEqual([
      { id: 'legacy-null', cardtype: 2 },
      { id: 'no-type-yet', cardtype: 1 },
      { id: 'todo', cardtype: 2 },
      { id: 'entity', cardtype: 3 },
      { id: 'habit', cardtype: 4 },
    ]);
  });

  it('leaves cards untouched when the todo cardtype is missing', () => {
    const db = {
      prepare(sql: string) {
        if (sql.includes("cardtype_name = 'todo'")) {
          return {
            get: () => undefined,
            run: () => ({ changes: 0 }),
          };
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      },
    };

    expect(migrateMissingCardTypesToTodo(db)).toBe(0);
  });
});
