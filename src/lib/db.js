// src/lib/db.js (New File)
import { SQLiteFS } from 'absurd-sql';
import initSqlJs from '@jlongster/sql.js';

import IndexedDBBackend from 'absurd-sql/dist/indexeddb-backend';

let SQL; // The SQL.js object
let db;  // The database instance

export async function initDb() {
  if (db) return db; // Return existing instance if already initialized

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

  const dbPath = '/sql/gastos.sqlite';
  
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
  `);

  await createTables(db);

  console.log('SQLite database initialized and persisted to IndexedDB.');
  return db;
}

async function createTables(database) {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS gastos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      apelido TEXT,
      categoria TEXT,
      total REAL NOT NULL,
      tipoCusto TEXT,
      perfilId INTEGER
    );
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gasto_id INTEGER NOT NULL,
      nome TEXT,
      codigo TEXT,
      quantidade REAL,
      unidade TEXT,
      preco_unitario REAL,
      preco_total REAL,
      FOREIGN KEY (gasto_id) REFERENCES gastos(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS rendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      descricao TEXT,
      categoria TEXT,
      valor REAL NOT NULL,
      perfilId INTEGER
    );
    CREATE TABLE IF NOT EXISTS store (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}
