import { assignDefaultCardTypeToUnclassifiedCards } from './cardTypeMigration';

describe('assignDefaultCardTypeToUnclassifiedCards', () => {
  it('only assigns a default cardtype to cards without a cardtype', () => {
    const get = jest.fn(() => ({ cardtype_id: 7 }));
    const run = jest.fn(() => ({ changes: 3 }));
    const prepare = jest.fn((sql: string) => {
      if (sql.startsWith('SELECT')) {
        return { get, run: jest.fn() };
      }
      return { get: jest.fn(), run };
    });

    const changed = assignDefaultCardTypeToUnclassifiedCards({ prepare });

    expect(changed).toBe(3);
    expect(get).toHaveBeenCalledWith('no type yet');
    expect(run).toHaveBeenCalledWith(7);

    const updateSql = prepare.mock.calls
      .map(([sql]) => sql)
      .find((sql) => sql.startsWith('UPDATE'));

    expect(updateSql).toBe('UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL');
    expect(updateSql).not.toContain('cardtype !=');
  });

  it('does not update cards when the default cardtype is missing', () => {
    const get = jest.fn(() => undefined);
    const run = jest.fn();
    const prepare = jest.fn((sql: string) => {
      if (sql.startsWith('SELECT')) {
        return { get, run: jest.fn() };
      }
      return { get: jest.fn(), run };
    });

    const changed = assignDefaultCardTypeToUnclassifiedCards({ prepare });

    expect(changed).toBe(0);
    expect(run).not.toHaveBeenCalled();
  });
});
