import {
  migrateCardsWithoutType,
  UNTYPED_CARDTYPE_NAME,
} from './cardTypeMigration';

describe('migrateCardsWithoutType', () => {
  it('only assigns the fallback type to cards whose cardtype is NULL', () => {
    const calls: { sql: string; params: unknown[] }[] = [];
    const db = {
      prepare(sql: string) {
        if (sql.startsWith('SELECT')) {
          return {
            get(...params: unknown[]) {
              calls.push({ sql, params });
              return { cardtype_id: 7 };
            },
            run: jest.fn(),
          };
        }

        return {
          get: jest.fn(),
          run(...params: unknown[]) {
            calls.push({ sql, params });
            return { changes: 2 };
          },
        };
      },
    };

    const result = migrateCardsWithoutType(db);
    const updateCall = calls.find((call) => call.sql.startsWith('UPDATE'));
    const normalizedUpdateSql = updateCall?.sql.replace(/\s+/g, ' ');

    expect(calls[0]).toEqual({
      sql: 'SELECT cardtype_id FROM CARDTYPES WHERE cardtype_name = ?',
      params: [UNTYPED_CARDTYPE_NAME],
    });
    expect(normalizedUpdateSql).toBe(
      'UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL',
    );
    expect(normalizedUpdateSql).not.toContain('cardtype !=');
    expect(updateCall?.params).toEqual([7]);
    expect(result).toEqual({ changes: 2, cardtypeId: 7 });
  });

  it('does not update cards if the fallback card type is unavailable', () => {
    const run = jest.fn();
    const db = {
      prepare() {
        return {
          get: jest.fn(() => undefined),
          run,
        };
      },
    };

    expect(migrateCardsWithoutType(db)).toEqual({
      changes: 0,
      cardtypeId: null,
    });
    expect(run).not.toHaveBeenCalled();
  });
});
