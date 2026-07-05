import { migrateMissingCardTypesToTodo } from '../main/cardTypeMigration';

interface FakeCard {
  id: string;
  cardtype: number | null;
}

class FakeDb {
  public readonly preparedSql: string[] = [];

  public updateCalls = 0;

  constructor(
    private readonly todoCardTypeId: number | undefined,
    private readonly cards: FakeCard[],
  ) {}

  prepare(sql: string): any {
    this.preparedSql.push(sql);

    if (sql.includes("SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = 'todo'")) {
      return {
        get: () =>
          this.todoCardTypeId === undefined
            ? undefined
            : { cardtype_id: this.todoCardTypeId },
        run: () => ({ changes: 0 }),
      };
    }

    if (sql.includes('UPDATE CARDS SET cardtype = ?')) {
      return {
        get: () => undefined,
        run: (todoCardTypeId: number) => {
          this.updateCalls += 1;

          if (sql.includes('cardtype !=')) {
            throw new Error('unsafe migration would overwrite existing card types');
          }

          let changes = 0;
          for (const card of this.cards) {
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
  }
}

const quietLogger = { log: jest.fn() };

describe('migrateMissingCardTypesToTodo', () => {
  beforeEach(() => {
    quietLogger.log.mockClear();
  });

  it('only backfills cards with a missing cardtype', () => {
    const cards: FakeCard[] = [
      { id: 'missing-1', cardtype: null },
      { id: 'todo', cardtype: 2 },
      { id: 'entity', cardtype: 3 },
      { id: 'missing-2', cardtype: null },
    ];
    const db = new FakeDb(2, cards);

    const changed = migrateMissingCardTypesToTodo(db, quietLogger);

    expect(changed).toBe(2);
    expect(cards).toEqual([
      { id: 'missing-1', cardtype: 2 },
      { id: 'todo', cardtype: 2 },
      { id: 'entity', cardtype: 3 },
      { id: 'missing-2', cardtype: 2 },
    ]);
    expect(db.updateCalls).toBe(1);
    expect(db.preparedSql.join('\n')).not.toContain('cardtype !=');
  });

  it('does not update cards when the todo cardtype is missing', () => {
    const cards: FakeCard[] = [{ id: 'missing', cardtype: null }];
    const db = new FakeDb(undefined, cards);

    const changed = migrateMissingCardTypesToTodo(db, quietLogger);

    expect(changed).toBe(0);
    expect(cards).toEqual([{ id: 'missing', cardtype: null }]);
    expect(db.updateCalls).toBe(0);
  });
});
