import { getTags, addTag, updateTag, deleteTag, linkTagsToTransacao, getTagsByTransacao } from '@/lib/tagDb';
import { initDb } from '@/lib/db';

describe('tagDb Service', () => {
  beforeAll(async () => {
    await initDb();
  });

  test('should create and retrieve tags', async () => {
    const id = await addTag('Test Tag');
    expect(id).toBeDefined();

    const tags = await getTags();
    expect(tags.some(t => t.nome === 'Test Tag')).toBe(true);
  });

  test('should update a tag', async () => {
    const id = await addTag('Old Name');
    await updateTag(id, 'New Name');
    
    const tags = await getTags();
    const tag = tags.find(t => t.id === id);
    expect(tag.nome).toBe('New Name');
  });

  test('should soft delete a tag', async () => {
    const id = await addTag('To Delete');
    await deleteTag(id);
    
    const tags = await getTags();
    expect(tags.find(t => t.id === id)).toBeUndefined();
  });

  test('should link and retrieve tags for a transaction', async () => {
    // Note: We use a dummy transaction ID since we're testing the linking logic
    const dummyTransacaoId = 999;
    const tagId1 = await addTag('Tag 1');
    const tagId2 = await addTag('Tag 2');
    
    await linkTagsToTransacao(dummyTransacaoId, [tagId1, tagId2]);
    
    const linkedTags = await getTagsByTransacao(dummyTransacaoId);
    expect(linkedTags).toHaveLength(2);
    expect(linkedTags.map(t => t.nome)).toContain('Tag 1');
    expect(linkedTags.map(t => t.nome)).toContain('Tag 2');
  });
});
