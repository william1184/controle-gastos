"use client";
import { getActiveEntidade } from "@/lib/entidadeDb";
import GenerativeLanguageApi from "@/lib/generative_ai_api";
import { orcamentoDb } from "@/lib/orcamentoDb";
import { useCallback, useEffect, useState } from "react";

export default function OrcamentoPage() {
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [resumo, setResumo] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [tempValue, setTempValue] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const ent = await getActiveEntidade();
    if (ent) {
      const data = await orcamentoDb.getResumoOrcamento(ent.id, mes, ano);
      setResumo(data);
    }
    setLoading(false);
  }, [mes, ano]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveLimite = async (categoriaId, valor) => {
    if (!resumo) return;
    const cleanValor = parseFloat(valor.replace(',', '.')) || 0;
    await orcamentoDb.saveLimiteCategoria(resumo.orcamentoId, categoriaId, cleanValor);
    setEditingId(null);
    loadData();
  };

  const handleAiSuggestions = async () => {
    setAiLoading(true);
    try {
      const ent = await getActiveEntidade();
      const ai = new GenerativeLanguageApi();

      // Busca histórico das categorias para passar para a IA
      const historicoPromessas = resumo.categorias.map(async (cat) => {
        const hist = await orcamentoDb.getHistoricoSaidas(ent.id, cat.categoria_id, 3);
        const media = hist.length > 0 ? hist.reduce((acc, h) => acc + h.total, 0) / hist.length : 0;
        return {
          id: cat.categoria_id,
          nome: cat.categoria_nome,
          media_3_meses: media,
          historico: hist
        };
      });

      const historicoCompletos = await Promise.all(historicoPromessas);
      const sugestoes = await ai.suggestBudgetLimits(historicoCompletos);

      // Salva as sugestões
      for (const [catId, valor] of Object.entries(sugestoes)) {
        await orcamentoDb.saveLimiteCategoria(resumo.orcamentoId, parseInt(catId), valor);
      }

      loadData();
      alert("Sugestões da IA aplicadas com sucesso!");
    } catch (error) {
      console.error("Erro na IA:", error);
      alert("Não foi possível obter sugestões no momento.");
    } finally {
      setAiLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading && !resumo) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header com Seletores */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Orçamento</h1>
          <p className="text-gray-500 font-medium">Planeje seus saidas e acompanhe sua evolução.</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
          <select
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value))}
            className="bg-transparent border-none focus:ring-0 font-bold text-gray-700 cursor-pointer"
          >
            {[
              "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
              "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
            ].map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <div className="w-px h-6 bg-gray-200"></div>
          <select
            value={ano}
            onChange={(e) => setAno(parseInt(e.target.value))}
            className="bg-transparent border-none focus:ring-0 font-bold text-gray-700 cursor-pointer"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Total Planejado</p>
          <p className="text-3xl font-black text-gray-900">{formatCurrency(resumo?.totalPlanejado || 0)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Total Realizado</p>
          <p className="text-3xl font-black text-gray-900">{formatCurrency(resumo?.totalRealizado || 0)}</p>
        </div>
        <div className={`p-6 rounded-3xl border shadow-sm hover:shadow-md transition-shadow ${resumo?.saldoGeral >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Saldo do Orçamento</p>
          <p className={`text-3xl font-black ${resumo?.saldoGeral >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(resumo?.saldoGeral || 0)}
          </p>
        </div>
      </div>

      {/* Ações */}
      <div className="flex justify-end">
        <button
          onClick={handleAiSuggestions}
          disabled={aiLoading}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
        >
          {aiLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Analisando Histórico...</span>
            </>
          ) : (
            <>
              <span>✨</span>
              <span>Sugestões da IA</span>
            </>
          )}
        </button>
      </div>

      {/* Tabela de Categorias */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-black text-xl text-gray-900">Limites por Categoria</h2>
          <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full uppercase">Saídas</span>
        </div>

        <div className="divide-y divide-gray-100">
          {resumo?.categorias.map((cat) => (
            <div key={cat.categoria_id} className="p-6 hover:bg-gray-50/50 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg shadow-sm">
                    {cat.categoria_nome.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{cat.categoria_nome}</h3>
                    <p className="text-xs font-medium text-gray-400">
                      Realizado: <span className="text-gray-600">{formatCurrency(cat.valor_realizado)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Limite</p>
                    {editingId === cat.categoria_id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveLimite(cat.categoria_id, tempValue)}
                          onBlur={() => setEditingId(null)}
                          className="w-24 px-2 py-1 border border-blue-400 rounded-lg text-sm font-bold text-right focus:ring-2 focus:ring-blue-100 outline-none"
                        />
                        <button onClick={() => handleSaveLimite(cat.categoria_id, tempValue)} className="text-green-500 hover:text-green-600">✓</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(cat.categoria_id);
                          setTempValue(cat.valor_limite.toString());
                        }}
                        className="font-black text-gray-900 hover:text-blue-600 transition-colors cursor-pointer group"
                      >
                        {formatCurrency(cat.valor_limite)}
                        <span className="ml-1 opacity-0 group-hover:opacity-100 text-xs">✎</span>
                      </button>
                    )}
                  </div>

                  <div className="text-right w-32">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Saldo</p>
                    <p className={`font-black ${cat.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(cat.saldo)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="relative pt-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className={`text-[10px] font-black inline-block py-1 px-2 uppercase rounded-full ${cat.raw_percentual >= 100 ? 'bg-red-100 text-red-600' :
                      cat.raw_percentual >= 80 ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                      {cat.raw_percentual.toFixed(1)}% utilizado
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-gray-100">
                  <div
                    style={{ width: `${cat.percentual}%` }}
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-1000 ${cat.raw_percentual >= 100 ? 'bg-red-500' :
                      cat.raw_percentual >= 80 ? 'bg-orange-400' :
                        'bg-blue-500'
                      }`}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
