import { getDb, initDb } from './db';

export async function getCategorias(tipo = 'saida') {
  await initDb();
  const db = getDb();
  const res = db.exec("SELECT * FROM categoria WHERE tipo = ? AND deleted_at IS NULL", [tipo]);
  if (!res[0]) return [];
  
  return res[0].values.map(row => {
    const obj = {};
    res[0].columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

export async function addCategoria(categoria) {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO categoria (nome, tipo, created_at)
    VALUES (?, ?, ?)
  `, [categoria.nome, categoria.tipo, now]);
}
