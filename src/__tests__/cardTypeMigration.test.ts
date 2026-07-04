import { migrateMissingCardTypesToTodo } from '../main/cardTypeMigration';

type FakeCard = {
  id: string;
  cardtype: number | null;
};

function createFakeDb(todoCardTypeId: number | undefined, cards: FakeCard[]) {
  const preparedSql: string[] = [];

  return {
    preparedSql,
    db: {
      prepare(sql: string) {
        preparedSql.push(sql);

        if (sql.includes('FROM CARDTYPES')) {
          return {
            get: () =>
              todoCardTypeId === undefined
                ? undefined
                : { cardtype_id: todoCardTypeId },
            run: () => ({ changes: 0 }),
          };
        }

        if (sql.includes('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL')) {
          return {
            get: () => undefined,
            run: (...params: unknown[]) => {
              const [cardtypeId] = params as [number];
              let changes = 0;
              cards.forEach((card) => {
                if (card.cardtype === null) {
                  card.cardtype = cardtypeId;
                  changes += 1;
                }
              });
              return { changes };
            },
          };
        }

        throw new Error(`Unexpected SQL: ${sql}`);
      },
    },
  };
}

describe('migrateMissingCardTypesToTodo', () => {
  const logger = { log: jest.fn() };

  beforeEach(() => {
    logger.log.mockClear();
  });

  it('fills only missing cardtype values and preserves existing non-todo cardtypes', () => {
    const cards: FakeCard[] = [
      { id: 'missing', cardtype: null },
      { id: 'entity', cardtype: 3 },
      { id: 'todo', cardtype: 2 },
    ];
    const { db, preparedSql } = createFakeDb(2, cards);

    const changes = migrateMissingCardTypesToTodo(db, logger);

    expect(changes).toBe(1);
    expect(cards).toEqual([
      { id: 'missing', cardtype: 2 },
      { id: 'entity', cardtype: 3 },
      { id: 'todo', cardtype: 2 },
    ]);
    expect(preparedSql.join('\n')).not.toContain('cardtype !=');
  });

  it('does not change cards when the todo cardtype is unavailable', () => {
    const cards: FakeCard[] = [
      { id: 'missing', cardtype: null },
      { id: 'habit', cardtype: 4 },
    ];
    const { db } = createFakeDb(undefined, cards);

    const changes = migrateMissingCardTypesToTodo(db, logger);

    expect(changes).toBe(0);
    expect(cards).toEqual([
      { id: 'missing', cardtype: null },
      { id: 'habit', cardtype: 4 },
    ]);
  });
});
