import { calculateGraphLevels } from '../renderer/graphLayout';

describe('calculateGraphLevels', () => {
  test('preserves longest-path levels for acyclic graphs', () => {
    const levels = calculateGraphLevels(
      ['root', 'left', 'right', 'leaf'],
      [
        { from: 'root', to: 'left' },
        { from: 'root', to: 'right' },
        { from: 'left', to: 'leaf' },
        { from: 'right', to: 'leaf' },
      ],
    );

    expect(Object.fromEntries(levels)).toEqual({
      root: 0,
      left: 1,
      right: 1,
      leaf: 2,
    });
  });

  test('collapses a reachable cycle and continues through its outgoing edges', () => {
    const levels = calculateGraphLevels(
      ['root', 'a', 'b', 'leaf'],
      [
        { from: 'root', to: 'a' },
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
        { from: 'b', to: 'leaf' },
      ],
    );

    expect(levels.get('root')).toBe(0);
    expect(levels.get('a')).toBe(1);
    expect(levels.get('b')).toBe(1);
    expect(levels.get('leaf')).toBe(2);
  });

  test('handles isolated cycles, self-loops, and duplicate edges', () => {
    const levels = calculateGraphLevels(
      ['a', 'b', 'self', 'after'],
      [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
        { from: 'a', to: 'b' },
        { from: 'self', to: 'self' },
        { from: 'self', to: 'after' },
        { from: 'missing', to: 'after' },
      ],
    );

    expect(levels.get('a')).toBe(0);
    expect(levels.get('b')).toBe(0);
    expect(levels.get('self')).toBe(0);
    expect(levels.get('after')).toBe(1);
    expect(levels.has('missing')).toBe(false);
  });
});
