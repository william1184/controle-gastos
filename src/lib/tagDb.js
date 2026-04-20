import { getDb, initDb } from './db';

export async function getTags() {
  await initDb();
  const db = getDb();
  const res = db.exec("SELECT * FROM tag WHERE deleted_at IS NULL ORDER BY nome ASC");
  if (!res[0]) return [];
  
  return res[0].values.map(row => {
    const obj = {};
    res[0].columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

export async function addTag(nome) {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();
  db.run("INSERT INTO tag (nome, created_at) VALUES (?, ?)", [nome, now]);
  const res = db.exec("SELECT last_insert_rowid()");
  return res[0].values[0][0];
}

export async function updateTag(id, nome) {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();
  db.run("UPDATE tag SET nome = ?, updated_at = ? WHERE id = ?", [nome, now, id]);
}

export async function deleteTag(id) {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();
  db.run("UPDATE tag SET deleted_at = ? WHERE id = ?", [now, id]);
}

export async function getTagsByTransacao(transacaoId) {
  await initDb();
  const db = getDb();
  const res = db.exec(`
    SELECT t.* 
    FROM tag t
    JOIN transacao_tag tt ON t.id = tt.tag_id
    WHERE tt.transacao_id = ? AND t.deleted_at IS NULL
  `, [transacaoId]);
  
  if (!res[0]) return [];
  return res[0].values.map(row => {
    const obj = {};
    res[0].columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

export async function linkTagsToTransacao(transacaoId, tagIds) {
  await initDb();
  const db = getDb();
  // Clear existing links
  db.run("DELETE FROM transacao_tag WHERE transacao_id = ?", [transacaoId]);
  // Add new links
  tagIds.forEach(tagId => {
    db.run("INSERT INTO transacao_tag (transacao_id, tag_id) VALUES (?, ?)", [transacaoId, tagId]);
  });
}
