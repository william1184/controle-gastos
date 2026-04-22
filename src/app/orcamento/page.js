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
  const [copyLoading, setCopyLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [tempValue, setTempValue] = useState("");
  const [changedIds, setChangedIds] = useState(new Set());

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
    const cleanValor = parseFloat(valor.toString().replace(',', '.')) || 0;
    await orcamentoDb.saveLimiteCategoria(resumo.orcamentoId, categoriaId, cleanValor);
    setEditingId(null);
    loadData();
  };

  const handleAiSuggestions = async () => {
    setAiLoading(true);
    setChangedIds(new Set());
    try {
      const ent = await getActiveEntidade();
      const ai = new GenerativeLanguageApi();

      const historicoPromessas = resumo.categoriasSaida.concat(resumo.categoriasEntrada).map(async (cat) => {
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

      const newChangedIds = new Set();
      for (const [catId, valor] of Object.entries(sugestoes)) {
        await orcamentoDb.saveLimiteCategoria(resumo.orcamentoId, parseInt(catId), valor);
        newChangedIds.add(parseInt(catId));
      }

      setChangedIds(newChangedIds);
      loadData();
      // Limpa os destaques após 5 segundos
      setTimeout(() => setChangedIds(new Set()), 5000);
    } catch (error) {
      console.error("Erro na IA:", error);
      alert("Não foi possível obter sugestões no momento.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyFromPrevious = async () => {
    setCopyLoading(true);
    try {
      const ent = await getActiveEntidade();
      const count = await orcamentoDb.copyBudgetFromPreviousMonth(ent.id, mes, ano);
      if (count > 0) {
        await loadData();
        alert(`${count} metas copiadas do mês anterior!`);
      } else {
        alert("Nenhuma meta encontrada no mês anterior ou todas já estão preenchidas.");
      }
    } catch (error) {
      alert("Erro ao copiar metas: " + error.message);
    } finally {
      setCopyLoading(false);
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
          <p className="text-gray-500 font-medium">Planeje suas saídas e acompanhe sua evolução.</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Renda Realizada</p>
          <p className="text-2xl font-black text-green-600">{formatCurrency(resumo?.totalRealizadoEntrada || 0)}</p>
          <p className="text-[10px] text-gray-400">Meta: {formatCurrency(resumo?.totalPlanejadoEntrada || 0)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Saída Realizada</p>
          <p className="text-2xl font-black text-red-600">{formatCurrency(resumo?.totalRealizadoSaida || 0)}</p>
          <p className="text-[10px] text-gray-400">Limite: {formatCurrency(resumo?.totalPlanejadoSaida || 0)}</p>
        </div>
        <div className={`p-6 rounded-3xl border shadow-sm hover:shadow-md transition-shadow ${resumo?.saldoOrcamento >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Saldo Orçamento</p>
          <p className={`text-2xl font-black ${resumo?.saldoOrcamento >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            {formatCurrency(resumo?.saldoOrcamento || 0)}
          </p>
          <p className="text-[10px] text-gray-400">Economia no mês</p>
        </div>
        <div className={`p-6 rounded-3xl border shadow-sm hover:shadow-md transition-shadow ${resumo?.saldoGeral >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Saldo Geral</p>
          <p className={`text-2xl font-black ${resumo?.saldoGeral >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(resumo?.saldoGeral || 0)}
          </p>
          <p className="text-[10px] text-gray-400">Renda - Saída</p>
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap justify-end gap-4">
        <button
          onClick={handleCopyFromPrevious}
          disabled={copyLoading}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-2xl font-bold border border-gray-200 shadow-sm transition-all active:scale-95 disabled:opacity-50"
        >
          {copyLoading ? <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div> : <span>📋</span>}
          <span>Copiar do Mês Anterior</span>
        </button>

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

      {/* Metas de Entrada */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-green-50/30">
          <h2 className="font-black text-xl text-gray-900">Metas de Entrada</h2>
          <span className="text-xs font-bold bg-green-100 text-green-600 px-3 py-1 rounded-full uppercase">Receitas</span>
        </div>
        <div className="divide-y divide-gray-100">
          {resumo?.categoriasEntrada.map((cat) => (
            <BudgetRow 
              key={cat.categoria_id} 
              cat={cat} 
              formatCurrency={formatCurrency} 
              editingId={editingId} 
              setEditingId={setEditingId} 
              tempValue={tempValue} 
              setTempValue={setTempValue} 
              handleSaveLimite={handleSaveLimite} 
              isIncome={true}
              isChanged={changedIds.has(cat.categoria_id)}
            />
          ))}
        </div>
      </div>

      {/* Limites de Saída */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-red-50/30">
          <h2 className="font-black text-xl text-gray-900">Limites de Saída</h2>
          <span className="text-xs font-bold bg-red-100 text-red-600 px-3 py-1 rounded-full uppercase">Gastos</span>
        </div>
        <div className="divide-y divide-gray-100">
          {resumo?.categoriasSaida.map((cat) => (
            <BudgetRow 
              key={cat.categoria_id} 
              cat={cat} 
              formatCurrency={formatCurrency} 
              editingId={editingId} 
              setEditingId={setEditingId} 
              tempValue={tempValue} 
              setTempValue={setTempValue} 
              handleSaveLimite={handleSaveLimite} 
              isIncome={false}
              isChanged={changedIds.has(cat.categoria_id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BudgetRow({ cat, formatCurrency, editingId, setEditingId, tempValue, setTempValue, handleSaveLimite, isIncome, isChanged }) {
  return (
    <div className={`p-6 transition-all duration-500 ${isChanged ? 'bg-yellow-50 animate-pulse' : 'hover:bg-gray-50/50'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
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
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">{isIncome ? 'Meta' : 'Limite'}</p>
            {editingId === cat.categoria_id ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveLimite(cat.categoria_id, tempValue);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={() => handleSaveLimite(cat.categoria_id, tempValue)}
                  className="w-32 px-3 py-1.5 border-2 border-blue-600 rounded-xl text-sm font-bold text-right outline-none shadow-sm"
                />
              </div>
            ) : (
              <div 
                onClick={() => {
                  setEditingId(cat.categoria_id);
                  setTempValue(cat.valor_limite.toString());
                }}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <p className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">
                  {formatCurrency(cat.valor_limite)}
                </p>
                <div className="p-1.5 bg-gray-100 group-hover:bg-blue-100 text-gray-400 group-hover:text-blue-600 rounded-lg transition-all">
                  <span className="text-xs">✎</span>
                </div>
              </div>
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
            <span className={`text-[10px] font-black inline-block py-1 px-2 uppercase rounded-full ${isIncome ? (cat.raw_percentual >= 100 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600') : (cat.raw_percentual >= 100 ? 'bg-red-100 text-red-600' :
              cat.raw_percentual >= 80 ? 'bg-orange-100 text-orange-600' :
                'bg-blue-100 text-blue-600'
            )}`}>
              {cat.raw_percentual.toFixed(1)}% {isIncome ? 'alcançado' : 'utilizado'}
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-gray-100">
          <div
            style={{ width: `${cat.percentual}%` }}
            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-1000 ${isIncome ? 'bg-green-500' : (cat.raw_percentual >= 100 ? 'bg-red-500' :
              cat.raw_percentual >= 80 ? 'bg-orange-400' :
                'bg-blue-500'
            )}`}
          ></div>
        </div>
      </div>
    </div>
  );
}