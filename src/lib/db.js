// src/lib/db.js (New File)
import initSqlJs from '@jlongster/sql.js';
import { SQLiteFS } from 'absurd-sql';

import IndexedDBBackend from 'absurd-sql/dist/indexeddb-backend';

let SQL; // The SQL.js object
let db;  // The database instance
let initPromise = null;

export async function initDb() {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Prevent execution during Server-Side Rendering (SSR)
    if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') return null;

    if (process.env.NODE_ENV === 'test') {
      const fs = require('fs');
      const path = require('path');
      const wasmPath = path.resolve(process.cwd(), 'node_modules/@jlongster/sql.js/dist/sql-wasm.wasm');
      const wasmBinary = fs.readFileSync(wasmPath);

      SQL = await initSqlJs({
        wasmBinary
      });

      db = new SQL.Database(); // In-memory
      await createTables(db);
      await seedDefaultData(db);
      return db;
    }

    // Load sql.js WebAssembly module
    SQL = await initSqlJs({
      locateFile: file => `/sql-wasm.wasm`, // Adjust path based on your setup
    });

    // Configure SQLiteFS for IndexedDB persistence
    let sqlFS = new SQLiteFS(SQL.FS, new IndexedDBBackend());
    SQL.register_for_idb(sqlFS);

    try {
      SQL.FS.mkdir('/sql');
    } catch (e) {
      // Ignore error if directory already exists
    }

    SQL.FS.mount(sqlFS, {}, '/sql');

    const dbPath = '/sql/orcamento.sqlite';

    // Support environments without SharedArrayBuffer
    if (typeof SharedArrayBuffer === 'undefined') {
      let stream = SQL.FS.open(dbPath, 'a+');
      await stream.node.contents.readIfFallback();
      SQL.FS.close(stream);
    }

    // Open the database with persistence
    db = new SQL.Database(dbPath, { filename: true });

    // absurd-sql requires journal_mode=MEMORY and benefits from page_size=8192
    db.exec(`
    PRAGMA page_size=8192;
    PRAGMA journal_mode=MEMORY;
    PRAGMA foreign_keys = ON;
  `);

    await createTables(db);
    await seedDefaultData(db);

    console.log('SQLite database initialized and persisted to IndexedDB.');
    return db;
  })();

  return initPromise;
}

async function createTables(database) {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS entidade (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      is_contexto_pessoal INTEGER DEFAULT 1, -- 1 para Pessoal, 0 para Empresarial
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT,
      sync_status TEXT
    );
    CREATE TABLE IF NOT EXISTS usuario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      entrada REAL DEFAULT 0,
      data_nascimento TEXT,
      entidade_id INTEGER,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT,
      sync_status TEXT,
      FOREIGN KEY (entidade_id) REFERENCES entidade(id)
    );
    CREATE TABLE IF NOT EXISTS conta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      tipo TEXT, -- carteira, banco, credito
      saldo_inicial REAL,
      entidade_id INTEGER,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT,
      sync_status TEXT,
      FOREIGN KEY (entidade_id) REFERENCES entidade(id)
    );
    CREATE TABLE IF NOT EXISTS categoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      tipo TEXT CHECK(tipo IN ('entrada','saida')),
      parent_id INTEGER,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT,
      sync_status TEXT
    );
    CREATE TABLE IF NOT EXISTS transacao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      descricao TEXT,
      valor REAL NOT NULL,
      tipo TEXT CHECK(tipo IN ('entrada','saida')),
      categoria_id INTEGER,
      conta_id INTEGER,
      usuario_id INTEGER,
      recorrencia_id INTEGER,
      tipo_custo TEXT, -- Fixo, Variável
      ai_categoria_sugerida TEXT,
      ai_confianca REAL,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT,
      sync_status TEXT,
      FOREIGN KEY (categoria_id) REFERENCES categoria(id),
      FOREIGN KEY (conta_id) REFERENCES conta(id),
      FOREIGN KEY (usuario_id) REFERENCES usuario(id)
    );
    CREATE TABLE IF NOT EXISTS itens_transacao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transacao_id INTEGER,
      nome TEXT,
      quantidade REAL,
      unidade TEXT,
      preco_unitario REAL,
      total REAL,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT,
      sync_status TEXT,
      FOREIGN KEY (transacao_id) REFERENCES transacao(id)
    );
    CREATE TABLE IF NOT EXISTS recorrencia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descricao TEXT,
      frequencia TEXT, -- mensal, semanal, anual
      proxima_execucao TEXT,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT,
      sync_status TEXT
    );
    CREATE TABLE IF NOT EXISTS tag (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      created_at TEXT,
      updated_at TEXT,
      deleted_at TEXT,
      sync_status TEXT
    );
    CREATE TABLE IF NOT EXISTS transacao_tag (
      transacao_id INTEGER,
      tag_id INTEGER,
      PRIMARY KEY (transacao_id, tag_id),
      FOREIGN KEY (transacao_id) REFERENCES transacao(id),
      FOREIGN KEY (tag_id) REFERENCES tag(id)
    );
    -- Tabela de configuração/store legada
    CREATE TABLE IF NOT EXISTS store (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- Feature de Orçamento
    CREATE TABLE IF NOT EXISTS orcamento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entidade_id INTEGER,
      mes INTEGER, -- 1 a 12
      ano INTEGER,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (entidade_id) REFERENCES entidade(id)
    );

    CREATE TABLE IF NOT EXISTS orcamento_categoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orcamento_id INTEGER,
      categoria_id INTEGER,
      valor_limite REAL,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (orcamento_id) REFERENCES orcamento(id),
      FOREIGN KEY (categoria_id) REFERENCES categoria(id)
    );
  `);

  // Migração simples para quem já tem a base antiga
  try {
    await database.exec("ALTER TABLE entidade ADD COLUMN is_contexto_pessoal INTEGER DEFAULT 1");
  } catch (e) {
    // Coluna já existe ou erro ignorável
  }
  try {
    await database.exec("ALTER TABLE transacao ADD COLUMN tipo_custo TEXT");
  } catch (e) {
    // Erro ignorável
  }
  try {
    await database.exec("ALTER TABLE usuario ADD COLUMN entrada REAL DEFAULT 0");
  } catch (e) {
    // Erro ignorável
  }
  try {
    await database.exec("ALTER TABLE usuario ADD COLUMN data_nascimento TEXT");
  } catch (e) {
    // Erro ignorável
  }
}

async function seedDefaultData(database) {
  // Verifica se já existem dados para evitar duplicidade
  const res = database.exec("SELECT COUNT(*) FROM entidade");
  if (res[0].values[0][0] > 0) return;

  const now = new Date().toISOString();

  database.run("INSERT INTO entidade (id, nome, is_contexto_pessoal, created_at) VALUES (1, 'Família Padrão', 1, ?)", [now]);
  database.run("INSERT INTO usuario (id, nome, entrada, data_nascimento, entidade_id, created_at) VALUES (1, 'Usuário Padrão', 0, '1990-01-01', 1, ?)", [now]);
  database.run("INSERT INTO conta (id, nome, tipo, saldo_inicial, entidade_id, created_at) VALUES (1, 'Itaú', 'banco', 0, 1, ?)", [now]);
  database.run("INSERT INTO conta (id, nome, tipo, saldo_inicial, entidade_id, created_at) VALUES (2, 'Nubank', 'banco', 0, 1, ?)", [now]);
  database.run("INSERT INTO conta (id, nome, tipo, saldo_inicial, entidade_id, created_at) VALUES (3, 'Mercado Pago', 'banco', 0, 1, ?)", [now]);



  // Categorias iniciais
  const categorias = [
    ['Salário', 'entrada'],
    ['Freelance', 'entrada'],
    ['Investimentos', 'entrada'],
    ['Rendimentos', 'entrada'],
    ['Transferencia', 'entrada'],
    ['Outros', 'entrada'],
    ['Moradia', 'saida'],
    ['Contas', 'saida'],
    ['Alimentação', 'saida'],
    ['Lazer', 'saida'],
    ['Transporte', 'saida'],
    ['Saúde', 'saida'],
    ['Educação', 'saida'],
    ['Investimentos', 'saida'],
    ['Outros', 'saida']
  ];

  categorias.forEach(cat => {
    database.run("INSERT INTO categoria (nome, tipo, created_at) VALUES (?, ?, ?)", [...cat, now]);
  });
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

/**
 * Returns the raw binary data of the SQLite database file.
 */
export async function getDatabaseBinary() {
  await initDb();
  const dbPath = '/sql/orcamento.sqlite';
  return SQL.FS.readFile(dbPath);
}

/**
 * Overwrites the local SQLite database file with new binary data.
 * This effectively restores a backup.
 */
export async function overwriteDatabaseWithBinary(binaryData) {
  await initDb();
  const dbPath = '/sql/orcamento.sqlite';

  // Close existing DB to avoid corruption
  if (db) {
    db.close();
    db = null;
  }

  SQL.FS.writeFile(dbPath, binaryData);

  // Re-initialize or signal reload
  await initDb();
  window.location.reload();
}
