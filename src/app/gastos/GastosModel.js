import { getDb, initDb } from '@/lib/db';

export const GastosModel = {
  async listarTodosDb() {
    await initDb();
    const db = getDb();
    const res = db.exec("SELECT * FROM gastos ORDER BY data DESC");
    return res[0] ? res[0].values.map(row => {
      const obj = {};
      res[0].columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    }) : [];
  },
  deletarDb(id) {
    const db = getDb();
    db.run("DELETE FROM gastos WHERE id = ?", [id]);
  },
  async listarTodosStorage() {
    return this.listarTodosDb();
  },
  salvarStorage(gastos) {
    console.warn('salvarStorage foi depreciado, utilize as transações diretamente.');
  }
};