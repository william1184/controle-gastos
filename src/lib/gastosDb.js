import { getDb, initDb } from './db';

export async function getGastos() {
  await initDb();
  const db = getDb();
  const res = db.exec("SELECT * FROM gastos ORDER BY data DESC");
  let loadedGastos = res[0] ? res[0].values.map(row => {
    const obj = {};
    res[0].columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  }) : [];

  const prodRes = db.exec("SELECT * FROM produtos");
  const todosProdutos = prodRes[0] ? prodRes[0].values.map(row => {
    const obj = {};
    prodRes[0].columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  }) : [];

  loadedGastos = loadedGastos.map(g => ({
    ...g,
    produtos: todosProdutos.filter(p => p.gasto_id === g.id)
  }));
  return loadedGastos;
}

export async function getGastoById(id) {
  await initDb();
  const db = getDb();
  const res = db.exec("SELECT * FROM gastos WHERE id = ?", [id]);
  if (!res[0]) return null;
  const row = res[0].values[0];
  const obj = {};
  res[0].columns.forEach((col, i) => obj[col] = row[i]);

  const prodRes = db.exec("SELECT * FROM produtos WHERE gasto_id = ?", [id]);
  const produtos = prodRes[0] ? prodRes[0].values.map(pRow => {
    const pObj = {};
    prodRes[0].columns.forEach((col, i) => pObj[col] = pRow[i]);
    return pObj;
  }) : [];
  obj.produtos = produtos;
  return obj;
}

export async function addGasto(gasto) {
  await initDb();
  const db = getDb();
  db.run("INSERT INTO gastos (data, apelido, categoria, total, tipoCusto, perfilId) VALUES (?, ?, ?, ?, ?, ?)",
    [gasto.data, gasto.apelido, gasto.categoria, gasto.total, gasto.tipoCusto || 'Variável', gasto.perfilId || 0]);
  const res = db.exec("SELECT last_insert_rowid()");
  const gastoId = res[0].values[0][0];

  if (gasto.produtos && gasto.produtos.length > 0) {
    gasto.produtos.forEach(p => {
      db.run("INSERT INTO produtos (gasto_id, nome, codigo, quantidade, unidade, preco_unitario, preco_total) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [gastoId, p.nome, p.codigo, p.quantidade, p.unidade, p.preco_unitario, p.preco_total]);
    });
  }
  return gastoId;
}

export async function updateGasto(id, gasto) {
  await initDb();
  const db = getDb();
  db.run("UPDATE gastos SET data = ?, apelido = ?, categoria = ?, total = ?, tipoCusto = ?, perfilId = ? WHERE id = ?",
    [gasto.data, gasto.apelido, gasto.categoria, gasto.total, gasto.tipoCusto || 'Variável', gasto.perfilId || 0, id]);
  
  // Exclui produtos antigos e re-insere
  db.run("DELETE FROM produtos WHERE gasto_id = ?", [id]);
  if (gasto.produtos && gasto.produtos.length > 0) {
    gasto.produtos.forEach(p => {
      db.run("INSERT INTO produtos (gasto_id, nome, codigo, quantidade, unidade, preco_unitario, preco_total) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, p.nome, p.codigo, p.quantidade, p.unidade, p.preco_unitario, p.preco_total]);
    });
  }
}

export async function deleteGasto(id) {
  await initDb();
  const db = getDb();
  // Produtos são excluídos em cascata pelo DB, mas só para garantir:
  db.run("DELETE FROM produtos WHERE gasto_id = ?", [id]);
  db.run("DELETE FROM gastos WHERE id = ?", [id]);
}

export async function clearGastos() {
  await initDb();
  const db = getDb();
  db.run("DELETE FROM produtos");
  db.run("DELETE FROM gastos");
}
