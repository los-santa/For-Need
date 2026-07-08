import { GET_PROJECT_CARDS_QUERY } from '../main/projectCardsQuery';

describe('GET_PROJECT_CARDS_QUERY', () => {
  it('uses the current RELATION table schema for relation counts', () => {
    expect(GET_PROJECT_CARDS_QUERY).toContain('COUNT(r.relation_id)');
    expect(GET_PROJECT_CARDS_QUERY).toContain('LEFT JOIN RELATION r');
    expect(GET_PROJECT_CARDS_QUERY).toContain('c.id = r.source');
    expect(GET_PROJECT_CARDS_QUERY).toContain('c.id = r.target');

    expect(GET_PROJECT_CARDS_QUERY).not.toContain('RELATIONS');
    expect(GET_PROJECT_CARDS_QUERY).not.toContain('source_card');
    expect(GET_PROJECT_CARDS_QUERY).not.toContain('target_card');
    expect(GET_PROJECT_CARDS_QUERY).not.toContain('COUNT(r.id)');
  });
});
