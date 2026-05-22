import path from 'path';

export const migrateCardsMissingTypeToTodoSql = `
  UPDATE CARDS
  SET cardtype = ?
  WHERE cardtype IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM CARDTYPES
       WHERE CARDTYPES.cardtype_id = CARDS.cardtype
     )
`;

export function isPathInsideDirectory(candidatePath: string, directoryPath: string): boolean {
  const resolvedCandidate = path.resolve(candidatePath);
  const resolvedDirectory = path.resolve(directoryPath);
  const relativePath = path.relative(resolvedDirectory, resolvedCandidate);

  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export function isSafeLocalDatabasePath(candidatePath: string, localDbDir: string): boolean {
  if (!candidatePath || path.extname(candidatePath).toLowerCase() !== '.db') {
    return false;
  }

  return isPathInsideDirectory(candidatePath, localDbDir);
}
