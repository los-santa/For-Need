describe('graph detail persistence helpers', () => {
  const shouldPersistField = (
    currentValue: string | null | undefined,
    nextValue: string,
  ) => (currentValue || '') !== nextValue;

  it('persists when name or content actually changed', () => {
    expect(shouldPersistField('Old', 'New')).toBe(true);
    expect(shouldPersistField(null, 'New')).toBe(true);
    expect(shouldPersistField(undefined, 'New')).toBe(true);
    expect(shouldPersistField('', 'New')).toBe(true);
  });

  it('skips no-op blur updates that would otherwise spam IPC writes', () => {
    expect(shouldPersistField('Same', 'Same')).toBe(false);
    expect(shouldPersistField(null, '')).toBe(false);
    expect(shouldPersistField(undefined, '')).toBe(false);
  });
});
