import {
  ACTIVE_RELATION_EXISTS_SQL,
  DELETED_RELATION_LOOKUP_SQL,
  ensureActiveRelation,
  INSERT_RELATION_SQL,
  RESTORE_RELATION_SQL,
} from '../main/ensureRelation';

describe('ensureActiveRelation', () => {
  it('does nothing when an active relation already exists', () => {
    const restore = jest.fn();
    const insert = jest.fn();

    const result = ensureActiveRelation(
      {
        findActive: { get: () => 1 },
        findDeleted: { get: jest.fn() },
        restore: { run: restore },
        insert: { run: insert },
      },
      1,
      'card-a',
      'card-b',
      'project-1',
      '2026-07-29T00:00:00.000Z',
    );

    expect(result).toBe('active');
    expect(restore).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('restores a soft-deleted relation instead of silently skipping create', () => {
    const restore = jest.fn();
    const insert = jest.fn();
    const findDeleted = jest.fn(() => ({ relation_id: 42 }));

    const result = ensureActiveRelation(
      {
        findActive: { get: () => undefined },
        findDeleted: { get: findDeleted },
        restore: { run: restore },
        insert: { run: insert },
      },
      1,
      'card-a',
      'card-b',
      'project-1',
      '2026-07-29T00:00:00.000Z',
    );

    expect(result).toBe('restored');
    expect(findDeleted).toHaveBeenCalledWith(1, 'card-a', 'card-b');
    expect(restore).toHaveBeenCalledWith(
      'project-1',
      '2026-07-29T00:00:00.000Z',
      42,
    );
    expect(insert).not.toHaveBeenCalled();
  });

  it('inserts a new relation when none exist (active or deleted)', () => {
    const restore = jest.fn();
    const insert = jest.fn();

    const result = ensureActiveRelation(
      {
        findActive: { get: () => undefined },
        findDeleted: { get: () => undefined },
        restore: { run: restore },
        insert: { run: insert },
      },
      2,
      'card-a',
      'card-b',
      '',
      '2026-07-29T00:00:00.000Z',
    );

    expect(result).toBe('inserted');
    expect(insert).toHaveBeenCalledWith(
      2,
      'card-a',
      'card-b',
      '',
      '2026-07-29T00:00:00.000Z',
    );
    expect(restore).not.toHaveBeenCalled();
  });

  it('uses deleted_at-aware SQL so soft-deleted rows cannot block recreation', () => {
    expect(ACTIVE_RELATION_EXISTS_SQL).toContain('deleted_at IS NULL');
    expect(DELETED_RELATION_LOOKUP_SQL).toContain('deleted_at IS NOT NULL');
    expect(RESTORE_RELATION_SQL).toContain('deleted_at = NULL');
    expect(INSERT_RELATION_SQL).toContain('INSERT INTO RELATION');
  });
});
