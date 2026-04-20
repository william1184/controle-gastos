"use client";
import GenerativeLanguageApi from '@/lib/generative_ai_api';
import { useBackgroundTask } from '@/providers/BackgroundTaskProvider';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [gastos, setGastos] = useState([]);
  const [rendas, setRendas] = useState([]);
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [mesesDisponiveis, setMesesDisponiveis] = useState([]);

  // Estados Lançamento Rápido
  const [quickTipo, setQuickTipo] = useState('gasto');
  const [quickDescricao, setQuickDescricao] = useState('');
  const [quickValor, setQuickValor] = useState('');
  const [quickCategoria, setQuickCategoria] = useState('');
  const [quickData, setQuickData] = useState('');
  const [categoriasGastos, setCategoriasGastos] = useState([]);
  const [categoriasRendas, setCategoriasRendas] = useState([]);
  const [historicoInsights, setHistoricoInsights] = useState([]);

  // Estados da IA
  const [isInsightsModalOpen, setIsInsightsModalOpen] = useState(false);
  const [aiInsights, setAiInsights] = useState('');
  const { runTask, isTaskRunning } = useBackgroundTask();
  const loadingInsights = isTaskRunning('ai-insights');

  useEffect(() => {
    // Busca os dados do localStorage
    const storedGastos = JSON.parse(localStorage.getItem('gastos')) || [];
    const storedRendas = JSON.parse(localStorage.getItem('rendas')) || [];

    setGastos(storedGastos);
    setRendas(storedRendas);

    // Carrega configurações
    const config = JSON.parse(localStorage.getItem('configuracoes')) || {};
    let catGastos = config.categoriasGastos || [
      { nome: 'Moradia', tipo: 'Fixo' },
      { nome: 'Contas', tipo: 'Fixo' },
      { nome: 'Alimentação', tipo: 'Variável' },
      { nome: 'Transporte', tipo: 'Variável' },
      { nome: 'Saúde', tipo: 'Variável' },
      { nome: 'Educação', tipo: 'Fixo' },
      { nome: 'Lazer', tipo: 'Variável' },
      { nome: 'Investimentos', tipo: 'Variável' },
      { nome: 'Outros', tipo: 'Variável' }
    ];
    if (catGastos.length > 0 && typeof catGastos[0] === 'string') {
      catGastos = catGastos.map(c => ({ nome: c, tipo: 'Variável' }));
    }
    setCategoriasGastos(catGastos);
    setCategoriasRendas(config.categoriasRendas || ['Salário', 'Freelance', 'Investimentos', 'Rendimentos', 'Outros']);
    
    setQuickData(new Date().toISOString().split('T')[0]);
    setHistoricoInsights(JSON.parse(localStorage.getItem('historicoInsights')) || []);
  }, []);

  useEffect(() => {
    if (quickTipo === 'gasto') {
      setQuickCategoria(categoriasGastos.length > 0 ? categoriasGastos[0].nome : 'Outros');
    } else {
      setQuickCategoria(categoriasRendas[0] || 'Outros');
    }
  }, [quickTipo, categoriasGastos, categoriasRendas]);

  useEffect(() => {
    const meses = new Set();
    gastos.forEach(g => { if (g.data) meses.add(g.data.substring(0, 7)); });
    rendas.forEach(r => { if (r.data) meses.add(r.data.substring(0, 7)); });
    
    const mesesArr = Array.from(meses).sort().reverse();
    setMesesDisponiveis(mesesArr);
    
    if (mesSelecionado === '' && mesesArr.length > 0) {
      const currentMonth = new Date().toISOString().substring(0, 7);
      setMesSelecionado(mesesArr.includes(currentMonth) ? currentMonth : mesesArr[0]);
    }
  }, [gastos, rendas, mesSelecionado]);

  const gastosFiltrados = (mesSelecionado && mesSelecionado !== 'all') ? gastos.filter(g => g.data && g.data.substring(0, 7) === mesSelecionado) : gastos;
  const rendasFiltradas = (mesSelecionado && mesSelecionado !== 'all') ? rendas.filter(r => r.data && r.data.substring(0, 7) === mesSelecionado) : rendas;

  const totalGastos = gastosFiltrados.reduce((acc, gasto) => acc + (Number(gasto.total) || 0), 0);
  const totalRendas = rendasFiltradas.reduce((acc, renda) => acc + (Number(renda.valor) || 0), 0);

  const gastosPorCategoria = gastosFiltrados.reduce((acc, g) => {
    const cat = g.categoria || 'Sem Categoria';
    acc[cat] = (acc[cat] || 0) + (Number(g.total) || 0);
    return acc;
  }, {});

  const rendasPorCategoria = rendasFiltradas.reduce((acc, r) => {
    const cat = r.categoria || 'Sem Categoria';
    acc[cat] = (acc[cat] || 0) + (Number(r.valor) || 0);
    return acc;
  }, {});

  const despesasFixas = gastosFiltrados.reduce((acc, g) => {
    const catObj = categoriasGastos.find(c => c.nome === g.categoria);
    const tipo = catObj ? catObj.tipo : 'Variável';
    if (tipo === 'Fixo') return acc + (Number(g.total) || 0);
    return acc;
  }, 0);

  const despesasVariaveis = gastosFiltrados.reduce((acc, g) => {
    const catObj = categoriasGastos.find(c => c.nome === g.categoria);
    const tipo = catObj ? catObj.tipo : 'Variável';
    if (tipo === 'Variável') return acc + (Number(g.total) || 0);
    return acc;
  }, 0);

  const formatMonth = (yyyyMM) => {
    if (!yyyyMM) return '';
    const [year, month] = yyyyMM.split('-');
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${monthNames[parseInt(month, 10) - 1]}/${year}`;
  };

  const handleGetInsights = async () => {
    try {
      const config = JSON.parse(localStorage.getItem('configuracoes')) || {};
      const apiKey = config.geminiApiKey || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
      if (!apiKey) throw new Error('Chave de API do Gemini não configurada. Defina na aba de Configurações.');

      const resumo = {
        periodo: mesSelecionado === 'all' || !mesSelecionado ? 'Todos os meses (Consolidado)' : formatMonth(mesSelecionado),
        totalRendas: totalRendas.toFixed(2),
        totalGastos: totalGastos.toFixed(2),
        saldo: saldo.toFixed(2),
        despesasFixas: despesasFixas.toFixed(2),
        despesasVariaveis: despesasVariaveis.toFixed(2),
        gastosPorCategoria,
        rendasPorCategoria
      };

      runTask(
        'ai-insights',
        'Analisando a saúde financeira (IA)',
        async () => {
          const api = new GenerativeLanguageApi(apiKey);
          return await api.getBudgetInsights(resumo);
        },
        (text) => { 
          const novoInsight = {
            id: Date.now(),
            dataGeracao: new Date().toISOString(),
            periodo: resumo.periodo,
            texto: text
          };
          setHistoricoInsights(prev => {
            const atualizado = [novoInsight, ...prev];
            localStorage.setItem('historicoInsights', JSON.stringify(atualizado));
            return atualizado;
          });
          setAiInsights(text); setIsInsightsModalOpen(true); 
        },
        (err) => alert('Erro ao obter insights: ' + err.message)
      );
    } catch (error) {
      alert(error.message);
    }
  };

  const handleQuickSave = (e) => {
    e.preventDefault();
    if (!quickData || !quickCategoria || !quickValor || parseFloat(quickValor) <= 0) {
      alert('Por favor, preencha a data, a categoria e um valor maior que zero.');
      return;
    }

    if (quickTipo === 'gasto') {
      const novoGasto = {
        data: quickData,
        apelido: quickDescricao,
        categoria: quickCategoria,
        total: parseFloat(quickValor),
        produtos: []
      };
      const updatedGastos = [...gastos, novoGasto];
      setGastos(updatedGastos);
      localStorage.setItem('gastos', JSON.stringify(updatedGastos));
    } else {
      const novaRenda = {
        data: quickData,
        descricao: quickDescricao,
        categoria: quickCategoria,
        valor: parseFloat(quickValor)
      };
      const updatedRendas = [...rendas, novaRenda];
      setRendas(updatedRendas);
      localStorage.setItem('rendas', JSON.stringify(updatedRendas));
    }

    setQuickDescricao('');
    setQuickValor('');
    alert('Lançamento registrado com sucesso!');
  };

  const saldo = totalRendas - totalGastos;

  const viewInsight = (insight) => {
    setAiInsights(insight.texto);
    setIsInsightsModalOpen(true);
  };

  const deleteInsight = (id) => {
    if (!window.confirm("Deseja realmente excluir este insight?")) return;
    const atualizado = historicoInsights.filter(i => i.id !== id);
    setHistoricoInsights(atualizado);
    localStorage.setItem('historicoInsights', JSON.stringify(atualizado));
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Meu Orçamento - Dashboard</h1>
      
      {/* Controles do Topo */}
      <div className="mb-6 flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200 w-full md:w-fit">
        <div className="flex items-center gap-2">
          <label className="font-semibold text-gray-700">Mês de Referência:</label>
          <select 
            value={mesSelecionado} 
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer outline-none"
          >
            <option value="all">Todos os Meses (Geral)</option>
            {mesesDisponiveis.map(mes => (
              <option key={mes} value={mes}>{formatMonth(mes)}</option>
            ))}
          </select>
        </div>
        <div className="w-px h-8 bg-gray-300 hidden md:block"></div>
        <button
          onClick={handleGetInsights}
          disabled={loadingInsights}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded text-white font-medium transition w-full md:w-auto ${loadingInsights ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'}`}
        >
          <span>✨</span> {loadingInsights ? 'Gerando Insights...' : 'Insights com IA'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card Rendas */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <h2 className="text-lg font-semibold text-gray-600 mb-2">Total de Rendas</h2>
          <p className="text-3xl font-bold text-green-600">R$ {totalRendas.toFixed(2)}</p>
        </div>

        {/* Card Gastos */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-600 mb-2">Total de Despesas</h2>
            <p className="text-3xl font-bold text-red-600">R$ {totalGastos.toFixed(2)}</p>
          </div>
          <div className="mt-4 text-sm text-gray-600 flex justify-between">
            <span>Fixas: <strong className="text-red-500">R$ {despesasFixas.toFixed(2)}</strong></span>
            <span>Variáveis: <strong className="text-red-500">R$ {despesasVariaveis.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Card Saldo */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <h2 className="text-lg font-semibold text-gray-600 mb-2">Saldo Atual</h2>
          <p className={`text-3xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            R$ {saldo.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Lançamento Rápido */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-800">⚡ Lançamento Rápido</h2>
        <form onSubmit={handleQuickSave} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={quickTipo}
              onChange={(e) => setQuickTipo(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="gasto">Despesa</option>
              <option value="renda">Renda</option>
            </select>
          </div>
          <div className="w-full md:w-1/6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input
              type="date"
              value={quickData}
              onChange={(e) => setQuickData(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="w-full md:w-2/6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (Opcional)</label>
            <input
              type="text"
              value={quickDescricao}
              onChange={(e) => setQuickDescricao(e.target.value)}
              placeholder="Ex: Padaria, Salário..."
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="w-full md:w-1/6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={quickCategoria}
              onChange={(e) => setQuickCategoria(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              {quickTipo === 'gasto' 
                ? categoriasGastos.map(cat => <option key={cat.nome} value={cat.nome}>{cat.nome}</option>)
                : categoriasRendas.map(cat => <option key={cat} value={cat}>{cat}</option>)
              }
            </select>
          </div>
          <div className="w-full md:w-1/6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={quickValor}
              onChange={(e) => setQuickValor(e.target.value)}
              placeholder="0.00"
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="w-full md:w-auto">
            <button type="submit" className="w-full bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition font-medium h-[42px]">
              Salvar
            </button>
          </div>
        </form>
      </div>

      {/* Gráficos / Categorias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-red-500">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Despesas por Categoria</h3>
          {Object.keys(gastosPorCategoria).length > 0 ? (
            <ul className="space-y-3">
              {Object.entries(gastosPorCategoria).sort((a,b) => b[1]-a[1]).map(([cat, val]) => (
                <li key={cat} className="flex justify-between items-center text-gray-600 border-b border-gray-100 pb-2">
                  <span className="font-medium">{cat}</span>
                  <span className="font-semibold text-red-600">R$ {val.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Nenhuma despesa neste período.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-green-500">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Rendas por Categoria</h3>
          {Object.keys(rendasPorCategoria).length > 0 ? (
            <ul className="space-y-3">
              {Object.entries(rendasPorCategoria).sort((a,b) => b[1]-a[1]).map(([cat, val]) => (
                <li key={cat} className="flex justify-between items-center text-gray-600 border-b border-gray-100 pb-2">
                  <span className="font-medium">{cat}</span>
                  <span className="font-semibold text-green-600">R$ {val.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Nenhuma renda neste período.</p>
          )}
        </div>
      </div>

      {/* Histórico de Insights */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <span>📚</span> Histórico de Insights (IA)
        </h2>
        {historicoInsights.length > 0 ? (
          <div className="space-y-4">
            {historicoInsights.map(insight => (
              <div key={insight.id} className="p-4 border border-indigo-100 bg-indigo-50 rounded-lg flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <h3 className="font-bold text-indigo-800">Período: {insight.periodo}</h3>
                  <p className="text-sm text-gray-600">Gerado em: {new Date(insight.dataGeracao).toLocaleString('pt-BR')}</p>
                  <p className="text-sm text-gray-700 mt-2 italic border-l-2 border-indigo-300 pl-2">
                    "{insight.texto?.length > 200 ? insight.texto.substring(0, 200) + '...' : insight.texto}"
                  </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => viewInsight(insight)} className="flex-1 md:flex-none bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition font-medium text-sm text-center">Visualizar</button>
                  <button onClick={() => deleteInsight(insight.id)} className="flex-1 md:flex-none bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition font-medium text-sm text-center">Excluir</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Nenhum insight salvo. Gere seu primeiro insight clicando no botão acima!</p>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <Link href="/gastos" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium">Gerenciar Gastos</Link>
        <Link href="/rendas" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium">Gerenciar Rendas</Link>
      </div>

      {/* Modal de Insights */}
      {isInsightsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 10000 }}>
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col m-4">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-2xl font-bold text-indigo-700 flex items-center gap-2">
                <span>✨</span> Visão Inteligente
              </h2>
            </div>
            <div className="overflow-y-auto pr-2 flex-1 text-gray-700 whitespace-pre-wrap leading-relaxed">
              {aiInsights}
            </div>
            <div className="pt-4 border-t border-gray-200 mt-4 flex justify-end">
              <button
                onClick={() => setIsInsightsModalOpen(false)}
                className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 transition font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}