interface ActiveRelationLookup {
  get: (
    relationtypeId: number,
    source: string,
    target: string,
  ) => unknown;
}

interface DeletedRelationLookup {
  get: (
    relationtypeId: number,
    source: string,
    target: string,
  ) => { relation_id: number } | undefined;
}

interface RestoreRelationStatement {
  run: (projectId: string, createdat: string, relationId: number) => unknown;
}

interface InsertRelationStatement {
  run: (
    relationtypeId: number,
    source: string,
    target: string,
    projectId: string,
    createdat: string,
  ) => unknown;
}

export interface EnsureRelationDeps {
  findActive: ActiveRelationLookup;
  findDeleted: DeletedRelationLookup;
  restore: RestoreRelationStatement;
  insert: InsertRelationStatement;
}

/**
 * Ensures an active relation exists for the given endpoints.
 * Soft-deleted rows are restored instead of being treated as duplicates,
 * which would otherwise silently leave no active relation.
 */
export function ensureActiveRelation(
  deps: EnsureRelationDeps,
  relationtypeId: number,
  source: string,
  target: string,
  projectId: string,
  createdat: string,
): 'active' | 'restored' | 'inserted' {
  if (deps.findActive.get(relationtypeId, source, target)) {
    return 'active';
  }

  const deletedRelation = deps.findDeleted.get(relationtypeId, source, target);
  if (deletedRelation) {
    deps.restore.run(projectId, createdat, deletedRelation.relation_id);
    return 'restored';
  }

  deps.insert.run(relationtypeId, source, target, projectId, createdat);
  return 'inserted';
}

export const ACTIVE_RELATION_EXISTS_SQL =
  'SELECT 1 FROM RELATION WHERE relationtype_id = ? AND source = ? AND target = ? AND deleted_at IS NULL';

export const DELETED_RELATION_LOOKUP_SQL =
  'SELECT relation_id FROM RELATION WHERE relationtype_id = ? AND source = ? AND target = ? AND deleted_at IS NOT NULL ORDER BY relation_id DESC LIMIT 1';

export const RESTORE_RELATION_SQL =
  'UPDATE RELATION SET project_id = ?, createdat = ?, deleted_at = NULL WHERE relation_id = ?';

export const INSERT_RELATION_SQL =
  'INSERT INTO RELATION (relationtype_id, source, target, project_id, createdat) VALUES (?, ?, ?, ?, ?)';
