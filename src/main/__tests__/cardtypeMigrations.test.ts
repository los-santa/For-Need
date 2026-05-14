import { migrateMissingCardtypesToTodo } from '../cardtypeMigrations';

describe('migrateMissingCardtypesToTodo', () => {
  it('only fills missing cardtypes and preserves existing user-selected types', () => {
    const cards = new Map<string, number | null>([
      ['missing', null],
      ['todo', 1],
      ['entity', 2],
      ['no-type-yet', 3],
    ]);

    const db = {
      prepare(sql: string) {
        if (sql.includes('SELECT cardtype_id')) {
          return {
            get: () => ({ cardtype_id: 1 }),
          };
        }

        if (sql.includes('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')) {
          return {
            run: (cardtypeId: number) => {
              let changes = 0;
              for (const [id, cardtype] of cards) {
                if (cardtype === null) {
                  cards.set(id, cardtypeId);
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

    const changes = migrateMissingCardtypesToTodo(db as any);

    expect(changes).toBe(1);
    expect(cards.get('missing')).toBe(1);
    expect(cards.get('todo')).toBe(1);
    expect(cards.get('entity')).toBe(2);
    expect(cards.get('no-type-yet')).toBe(3);
  });
});
