import { getDb, initDb } from './db';

export async function getRendas() {
  await initDb();
  const db = getDb();
  const res = db.exec("SELECT * FROM rendas ORDER BY data DESC");
  if (!res[0]) return [];
  return res[0].values.map(row => {
    const obj = {};
    res[0].columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

export async function getRendaById(id) {
  await initDb();
  const db = getDb();
  const res = db.exec("SELECT * FROM rendas WHERE id = ?", [id]);
  if (!res[0]) return null;
  const row = res[0].values[0];
  const obj = {};
  res[0].columns.forEach((col, i) => obj[col] = row[i]);
  return obj;
}

export async function addRenda(renda) {
  await initDb();
  const db = getDb();
  db.run("INSERT INTO rendas (data, descricao, categoria, valor, perfilId) VALUES (?, ?, ?, ?, ?)",
    [renda.data, renda.descricao, renda.categoria, renda.valor, renda.perfilId || 0]);
  const res = db.exec("SELECT last_insert_rowid()");
  return res[0].values[0][0];
}

export async function updateRenda(id, renda) {
  await initDb();
  const db = getDb();
  db.run("UPDATE rendas SET data = ?, descricao = ?, categoria = ?, valor = ?, perfilId = ? WHERE id = ?",
    [renda.data, renda.descricao, renda.categoria, renda.valor, renda.perfilId || 0, id]);
}

export async function deleteRenda(id) {
  await initDb();
  const db = getDb();
  db.run("DELETE FROM rendas WHERE id = ?", [id]);
}

export async function clearRendas() {
  await initDb();
  const db = getDb();
  db.run("DELETE FROM rendas");
}
