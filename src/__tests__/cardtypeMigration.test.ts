import {
  assignDefaultCardTypeSql,
  shouldAssignDefaultCardType,
} from '../main/cardtypeMigration';

describe('cardtype migration', () => {
  it('only assigns the default cardtype to cards without a type', () => {
    expect(shouldAssignDefaultCardType(null)).toBe(true);
    expect(shouldAssignDefaultCardType(undefined)).toBe(true);
    expect(shouldAssignDefaultCardType(2)).toBe(false);
    expect(shouldAssignDefaultCardType(3)).toBe(false);
  });

  it('does not overwrite existing non-default cardtypes in the migration SQL', () => {
    expect(assignDefaultCardTypeSql).toBe(
      'UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL',
    );
    expect(assignDefaultCardTypeSql).not.toContain('cardtype !=');
  });
});
