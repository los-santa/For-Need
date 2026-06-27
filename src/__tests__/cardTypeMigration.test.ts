import { assignDefaultCardTypeToUntypedCards } from '../main/cardTypeMigration';

describe('assignDefaultCardTypeToUntypedCards', () => {
  it('only assigns the todo card type to cards without an existing type', () => {
    const preparedSql: string[] = [];
    const run = jest.fn().mockReturnValue({ changes: 2 });
    const database = {
      prepare: jest.fn((sql: string) => {
        preparedSql.push(sql);

        if (sql.includes('SELECT cardtype_id')) {
          return {
            get: jest.fn().mockReturnValue({ cardtype_id: 2 }),
            run: jest.fn(),
          };
        }

        return {
          get: jest.fn(),
          run,
        };
      }),
    };

    const changedCards = assignDefaultCardTypeToUntypedCards(database);

    expect(changedCards).toBe(2);
    expect(run).toHaveBeenCalledWith(2);
    expect(preparedSql).toContain(
      'UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL',
    );
    expect(preparedSql.join('\n')).not.toContain('cardtype !=');
  });

  it('does not update cards when the todo card type is missing', () => {
    const run = jest.fn();
    const database = {
      prepare: jest.fn(() => ({
        get: jest.fn().mockReturnValue(undefined),
        run,
      })),
    };

    const changedCards = assignDefaultCardTypeToUntypedCards(database);

    expect(changedCards).toBe(0);
    expect(run).not.toHaveBeenCalled();
  });
});
