import { getDb, initDb } from './db';

// Métodos genéricos para tabela de chave/valor
export async function getStoreItem(key) {
  await initDb();
  const db = getDb();
  const res = db.exec("SELECT value FROM store WHERE key = ?", [key]);
  if (!res[0] || res[0].values.length === 0) return null;
  return JSON.parse(res[0].values[0][0]);
}

export async function setStoreItem(key, value) {
  await initDb();
  const db = getDb();
  const jsonValue = JSON.stringify(value);
  db.run("INSERT OR REPLACE INTO store (key, value) VALUES (?, ?)", [key, jsonValue]);
}

// Helpers específicos

export async function getConfiguracoes() {
  const config = await getStoreItem('configuracoes');
  return config || {};
}

export async function setConfiguracoes(config) {
  await setStoreItem('configuracoes', config);
}

// Categorias
export async function getCategoriasGastos() {
  const config = await getConfiguracoes();
  let cats = config.categoriasGastos || ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Outros'];
  if (cats.length > 0 && typeof cats[0] === 'object') {
    cats = cats.map(c => c.nome);
  }
  return cats;
}

export async function setCategoriasGastos(categorias) {
  const config = await getConfiguracoes();
  await setConfiguracoes({ ...config, categoriasGastos: categorias });
}

export async function getCategoriasRendas() {
  const config = await getConfiguracoes();
  let cats = config.categoriasRendas || ['Salário', 'Freelance', 'Investimentos', 'Rendimentos', 'Outros'];
  if (cats.length > 0 && typeof cats[0] === 'object') {
    cats = cats.map(c => c.nome);
  }
  return cats;
}

export async function setCategoriasRendas(categorias) {
  const config = await getConfiguracoes();
  await setConfiguracoes({ ...config, categoriasRendas: categorias });
}

export async function getHistoricoInsights() {
  const insights = await getStoreItem('historicoInsights');
  return insights || [];
}

export async function setHistoricoInsights(insights) {
  await setStoreItem('historicoInsights', insights);
}
