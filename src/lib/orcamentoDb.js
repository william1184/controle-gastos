import { getDb } from './db';

export const orcamentoDb = {
  /**
   * Busca ou cria um orçamento para uma entidade, mês e ano específicos.
   */
  async getOrCreateOrcamento(entidadeId, mes, ano) {
    const db = getDb();
    const now = new Date().toISOString();

    // Tentar buscar orçamento existente
    const res = db.exec("SELECT * FROM orcamento WHERE entidade_id = ? AND mes = ? AND ano = ?", [entidadeId, mes, ano]);

    if (res.length > 0 && res[0].values.length > 0) {
      const orcamento = this._mapRowToOrcamento(res[0].columns, res[0].values[0]);
      return orcamento;
    }

    // Criar novo orçamento
    db.run("INSERT INTO orcamento (entidade_id, mes, ano, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [entidadeId, mes, ano, now, now]);

    const lastIdRes = db.exec("SELECT last_insert_rowid()");
    const newId = lastIdRes[0].values[0][0];

    return { id: newId, entidade_id: entidadeId, mes, ano };
  },

  /**
   * Busca os limites por categoria para um orçamento específico.
   */
  async getLimitesPorCategoria(orcamentoId) {
    const db = getDb();
    const sql = `
      SELECT 
        c.id as categoria_id,
        c.nome as categoria_nome,
        c.tipo as categoria_tipo,
        oc.id as orcamento_categoria_id,
        COALESCE(oc.valor_limite, 0) as valor_limite
      FROM categoria c
      LEFT JOIN orcamento_categoria oc ON c.id = oc.categoria_id AND oc.orcamento_id = ?
      WHERE c.deleted_at IS NULL
      ORDER BY c.nome ASC
    `;

    const res = db.exec(sql, [orcamentoId]);
    if (res.length === 0) return [];

    return res[0].values.map(row => {
      const obj = {};
      res[0].columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
  },

  /**
   * Salva ou atualiza o limite de uma categoria no orçamento.
   */
  async saveLimiteCategoria(orcamentoId, categoriaId, valor) {
    const db = getDb();
    const now = new Date().toISOString();

    const res = db.exec("SELECT id FROM orcamento_categoria WHERE orcamento_id = ? AND categoria_id = ?", [orcamentoId, categoriaId]);

    if (res.length > 0 && res[0].values.length > 0) {
      db.run("UPDATE orcamento_categoria SET valor_limite = ?, updated_at = ? WHERE id = ?",
        [valor, now, res[0].values[0][0]]);
    } else {
      db.run("INSERT INTO orcamento_categoria (orcamento_id, categoria_id, valor_limite, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [orcamentoId, categoriaId, valor, now, now]);
    }
  },

  /**
   * Calcula o valor realizado (saidas) por categoria para um determinado mês e ano.
   */
  async getRealizadoPorCategoria(entidadeId, mes, ano) {
    const db = getDb();

    // Formata o período para busca (YYYY-MM)
    const periodo = `${ano}-${String(mes).padStart(2, '0')}%`;

    const sql = `
      SELECT 
        categoria_id,
        tipo,
        SUM(valor) as total_realizado
      FROM transacao
      WHERE data LIKE ? 
        AND usuario_id IN (SELECT id FROM usuario WHERE entidade_id = ?)
        AND deleted_at IS NULL
      GROUP BY categoria_id, tipo
    `;

    const res = db.exec(sql, [periodo, entidadeId]);
    if (res.length === 0) return {};

    const realizado = {};
    res[0].values.forEach(row => {
      realizado[row[0]] = row[1];
    });

    return realizado;
  },

  /**
   * Busca o histórico de saidas de uma categoria para sugerir limites.
   */
  async getHistoricoSaidas(entidadeId, categoriaId, meses = 3) {
    const db = getDb();
    const sql = `
      SELECT 
        strftime('%Y-%m', data) as mes_referencia,
        SUM(valor) as total
      FROM transacao
      WHERE categoria_id = ?
        AND usuario_id IN (SELECT id FROM usuario WHERE entidade_id = ?)
        AND deleted_at IS NULL
      GROUP BY mes_referencia
      ORDER BY mes_referencia DESC
      LIMIT ?
    `;

    const res = db.exec(sql, [categoriaId, entidadeId, meses]);
    if (res.length === 0) return [];

    return res[0].values.map(row => ({
      mes: row[0],
      total: row[1]
    }));
  },

  /**
   * Consolida todos os dados para a UI de orçamento.
   */
  async getResumoOrcamento(entidadeId, mes, ano) {
    const orcamento = await this.getOrCreateOrcamento(entidadeId, mes, ano);
    const limites = await this.getLimitesPorCategoria(orcamento.id);
    const realizado = await this.getRealizadoPorCategoria(entidadeId, mes, ano);

    const categoriasCompletas = limites.map(cat => {
      const valorRealizado = realizado[cat.categoria_id] || 0;
      const valorLimite = cat.valor_limite || 0;
      const saldo = cat.categoria_tipo === 'saida' ? (valorLimite - valorRealizado) : (valorRealizado - valorLimite);
      const percentual = valorLimite > 0 ? (valorRealizado / valorLimite) * 100 : 0;

      return {
        ...cat,
        valor_realizado: valorRealizado,
        saldo: saldo,
        percentual: Math.min(percentual, 100),
        raw_percentual: percentual
      };
    });

    const categoriasSaida = categoriasCompletas.filter(c => c.categoria_tipo === 'saida');
    const categoriasEntrada = categoriasCompletas.filter(c => c.categoria_tipo === 'entrada');

    const totalPlanejadoSaida = categoriasSaida.reduce((acc, cat) => acc + cat.valor_limite, 0);
    const totalRealizadoSaida = categoriasSaida.reduce((acc, cat) => acc + cat.valor_realizado, 0);

    const totalPlanejadoEntrada = categoriasEntrada.reduce((acc, cat) => acc + cat.valor_limite, 0);
    const totalRealizadoEntrada = categoriasEntrada.reduce((acc, cat) => acc + cat.valor_realizado, 0);

    return {
      orcamentoId: orcamento.id,
      categoriasSaida,
      categoriasEntrada,
      totalPlanejadoSaida,
      totalRealizadoSaida,
      totalPlanejadoEntrada,
      totalRealizadoEntrada,
      saldoGeral: (totalRealizadoEntrada - totalRealizadoSaida),
      saldoOrcamento: (totalPlanejadoSaida - totalRealizadoSaida)
    };
  },

  /**
   * Copia as metas do mês anterior para o mês atual, se o mês atual não tiver metas definidas.
   */
  async copyBudgetFromPreviousMonth(entidadeId, mesAtual, anoAtual) {
    const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
    const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;

    const orcamentoAnterior = await this.getOrCreateOrcamento(entidadeId, mesAnterior, anoAnterior);
    const limitesAnteriores = await this.getLimitesPorCategoria(orcamentoAnterior.id);
    
    if (limitesAnteriores.length === 0) return 0;

    const orcamentoAtual = await this.getOrCreateOrcamento(entidadeId, mesAtual, anoAtual);
    const limitesAtuais = await this.getLimitesPorCategoria(orcamentoAtual.id);
    
    // Filtra apenas categorias que ainda não têm limite definido no mês atual (valor_limite === 0)
    const categoriasParaCopiar = limitesAnteriores.filter(ant => ant.valor_limite > 0);
    
    let count = 0;
    for (const cat of categoriasParaCopiar) {
      // Verifica se já existe um limite não-zero no mês atual para esta categoria
      const atual = limitesAtuais.find(a => a.categoria_id === cat.categoria_id);
      if (!atual || atual.valor_limite === 0) {
        await this.saveLimiteCategoria(orcamentoAtual.id, cat.categoria_id, cat.valor_limite);
        count++;
      }
    }
    
    return count;
  },

  _mapRowToOrcamento(columns, values) {
    const obj = {};
    columns.forEach((col, i) => obj[col] = values[i]);
    return obj;
  }
};
