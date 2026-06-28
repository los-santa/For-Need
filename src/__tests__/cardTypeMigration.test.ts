import {
  CardTypeMigrationDb,
  migrateMissingCardTypesToTodo,
} from '../main/cardTypeMigration';

type CardRow = {
  id: string;
  cardtype: number | null;
};

function createFakeDb(cards: CardRow[], todoTypeId?: number): CardTypeMigrationDb {
  return {
    prepare(sql: string) {
      if (sql === "SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'") {
        return {
          get: () =>
            todoTypeId === undefined ? undefined : { cardtype_id: todoTypeId },
          run: () => ({ changes: 0 }),
        };
      }

      if (sql === 'UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL') {
        return {
          get: () => undefined,
          run: (cardtype: unknown) => {
            let changes = 0;

            for (const card of cards) {
              if (card.cardtype === null) {
                card.cardtype = Number(cardtype);
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
}

describe('migrateMissingCardTypesToTodo', () => {
  it('fills only missing card types and preserves existing non-todo types', () => {
    const cards = [
      { id: 'missing-type', cardtype: null },
      { id: 'already-todo', cardtype: 2 },
      { id: 'entity-card', cardtype: 3 },
      { id: 'habit-card', cardtype: 4 },
    ];

    const changes = migrateMissingCardTypesToTodo(createFakeDb(cards, 2));

    expect(changes).toBe(1);
    expect(cards).toEqual([
      { id: 'missing-type', cardtype: 2 },
      { id: 'already-todo', cardtype: 2 },
      { id: 'entity-card', cardtype: 3 },
      { id: 'habit-card', cardtype: 4 },
    ]);
  });

  it('does not update cards when the todo card type is missing', () => {
    const cards = [{ id: 'missing-type', cardtype: null }];

    const changes = migrateMissingCardTypesToTodo(createFakeDb(cards));

    expect(changes).toBe(0);
    expect(cards).toEqual([{ id: 'missing-type', cardtype: null }]);
  });
});
