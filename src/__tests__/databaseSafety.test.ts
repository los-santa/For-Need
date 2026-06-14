import { migrateMissingCardtypesToTodo } from '../main/databaseMigrations';
import { validateLocalDatabaseDeletePath } from '../main/databasePaths';

describe('database safety helpers', () => {
  it('migrates only cards whose cardtype is missing', () => {
    const statements: string[] = [];
    const db = {
      prepare: (sql: string) => {
        statements.push(sql);
        if (sql.startsWith('SELECT cardtype_id')) {
          return { get: () => ({ cardtype_id: 2 }) };
        }

        return { run: () => ({ changes: 3 }) };
      },
    };

    expect(migrateMissingCardtypesToTodo(db)).toBe(3);
    expect(statements).toContain(
      'UPDATE CARDS SET cardtype = ? WHERE cardtype IS NULL',
    );
    expect(statements.join('\n')).not.toContain('cardtype !=');
  });

  it('rejects deletion outside the managed local database directory', () => {
    const validation = validateLocalDatabaseDeletePath(
      '/tmp/important.db',
      '/home/user/app/local-databases',
      '/home/user/app/local-databases/current.db',
    );

    expect(validation).toEqual({
      valid: false,
      error: 'Database is outside the local database folder',
    });
  });

  it('rejects deletion of the active database', () => {
    const validation = validateLocalDatabaseDeletePath(
      '/home/user/app/local-databases/current.db',
      '/home/user/app/local-databases',
      '/home/user/app/local-databases/current.db',
    );

    expect(validation).toEqual({
      valid: false,
      error: 'Cannot delete the active database',
    });
  });

  it('allows inactive db files inside the managed local database directory', () => {
    expect(
      validateLocalDatabaseDeletePath(
        '/home/user/app/local-databases/archive.db',
        '/home/user/app/local-databases',
        '/home/user/app/local-databases/current.db',
      ),
    ).toEqual({ valid: true });
  });
});
