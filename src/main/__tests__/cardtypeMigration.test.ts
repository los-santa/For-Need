import {
  DEFAULT_CARDTYPE_BACKFILL_SQL,
  shouldBackfillDefaultCardtype,
} from '../cardtypeMigration';

describe('cardtype migration helpers', () => {
  it('only backfills cards without a cardtype', () => {
    expect(shouldBackfillDefaultCardtype(null)).toBe(true);
    expect(shouldBackfillDefaultCardtype(undefined)).toBe(true);
    expect(shouldBackfillDefaultCardtype(2)).toBe(false);
    expect(shouldBackfillDefaultCardtype('habit')).toBe(false);
  });

  it('does not overwrite existing non-null cardtypes in the SQL migration', () => {
    expect(DEFAULT_CARDTYPE_BACKFILL_SQL).toContain('WHERE cardtype IS NULL');
    expect(DEFAULT_CARDTYPE_BACKFILL_SQL).not.toContain('cardtype !=');
  });
});
