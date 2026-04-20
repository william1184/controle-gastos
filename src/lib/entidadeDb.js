import { getDb, initDb } from './db';

export async function getEntidades() {
  await initDb();
  const db = getDb();
  const res = db.exec("SELECT * FROM entidade WHERE deleted_at IS NULL");
  if (!res[0]) return [];
  
  return res[0].values.map(row => {
    const obj = {};
    res[0].columns.forEach((col, i) => obj[col] = row[i]);
    return {
      ...obj,
      is_contexto_pessoal: Boolean(obj.is_contexto_pessoal)
    };
  });
}

export async function addEntidade(entidade) {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO entidade (nome, is_contexto_pessoal, created_at)
    VALUES (?, ?, ?)
  `, [entidade.nome, entidade.is_contexto_pessoal ? 1 : 0, now]);
  
  const res = db.exec("SELECT last_insert_rowid()");
  const entidadeId = res[0].values[0][0];

  // Criar um usuário padrão para a entidade
  db.run(`
    INSERT INTO usuario (nome, entidade_id, created_at)
    VALUES (?, ?, ?)
  `, ['Usuário Padrão', entidadeId, now]);

  // Criar uma conta padrão para a entidade
  db.run(`
    INSERT INTO conta (nome, tipo, saldo_inicial, entidade_id, created_at)
    VALUES (?, 'carteira', 0, ?, ?)
  `, ['Carteira Principal', entidadeId, now]);

  return entidadeId;
}

export async function getActiveEntidade() {
  if (typeof window === 'undefined') return null;
  const id = localStorage.getItem('activeEntidadeId');
  if (!id) return null;
  
  await initDb();
  const db = getDb();
  const res = db.exec("SELECT * FROM entidade WHERE id = ?", [id]);
  if (!res[0]) return null;
  
  const row = res[0].values[0];
  const obj = {};
  res[0].columns.forEach((col, i) => obj[col] = row[i]);
  return {
    ...obj,
    is_contexto_pessoal: Boolean(obj.is_contexto_pessoal)
  };
}

export function setActiveEntidade(id) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('activeEntidadeId', id);
  }
}

export async function updateEntidade(id, data) {
  await initDb();
  const db = getDb();
  const now = new Date().toISOString();
  
  db.run(`
    UPDATE entidade 
    SET nome = ?, is_contexto_pessoal = ?, updated_at = ?
    WHERE id = ?
  `, [data.nome, data.is_contexto_pessoal ? 1 : 0, now, id]);
}
