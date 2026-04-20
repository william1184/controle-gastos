"use client";
import { getActiveEntidade } from '@/lib/entidadeDb';
import { getEntradas } from '@/lib/entradasDb';
import GenerativeLanguageApi from '@/lib/generative_ai_api';
import { getSaidas } from '@/lib/saidasDb';
import { getConfiguracoes, getHistoricoInsights, setHistoricoInsights as saveHistoricoInsights } from '@/lib/storeDb';
import { getUsuarios } from '@/lib/usuarioDb';
import { useBackgroundTask } from '@/providers/BackgroundTaskProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [saidas, setSaidas] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [mesesDisponiveis, setMesesDisponiveis] = useState([]);

  // Estados de Primeiro Acesso e Filtro de Usuário
  const [isLoading, setIsLoading] = useState(true);
  const [entidadeAtiva, setEntidadeAtiva] = useState(null);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('all');
  const router = useRouter();

  // Estados Lançamento Rápido
  const [quickTipo, setQuickTipo] = useState('saida');
  const [quickDescricao, setQuickDescricao] = useState('');
  const [quickValor, setQuickValor] = useState('');
  const [quickCategoria, setQuickCategoria] = useState('');
  const [quickTipoCusto, setQuickTipoCusto] = useState('Variável');
  const [quickData, setQuickData] = useState('');
  const [quickUsuario, setQuickUsuario] = useState('');
  const [categoriasSaidas, setCategoriasSaidas] = useState([]);
  const [categoriasEntradas, setCategoriasEntradas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [historicoInsights, setHistoricoInsights] = useState([]);

  // Estados da IA
  const [isInsightsModalOpen, setIsInsightsModalOpen] = useState(false);
  const [aiInsights, setAiInsights] = useState('');
  const { runTask, isTaskRunning } = useBackgroundTask();
  const loadingInsights = isTaskRunning('ai-insights');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const entidade = await getActiveEntidade();
      if (!entidade) {
        router.push('/');
        return;
      }

      // Reset data before loading new entity data
      setSaidas([]);
      setEntradas([]);
      setEntidadeAtiva(entidade);

      const storedSaidas = await getSaidas();
      const storedEntradas = await getEntradas();

      setSaidas(storedSaidas);
      setEntradas(storedEntradas);

      const config = await getConfiguracoes();
      let catSaidas = config.categoriasSaidas || ['Moradia', 'Contas', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Investimentos', 'Outros'];
      if (catSaidas.length > 0 && typeof catSaidas[0] === 'object') {
        catSaidas = catSaidas.map(c => c.nome);
      }
      setCategoriasSaidas(catSaidas);
      setCategoriasEntradas(config.categoriasEntradas || ['Salário', 'Freelance', 'Investimentos', 'Rendimentos', 'Outros']);

      const loadedUsuarios = await getUsuarios(entidade.id);
      setUsuarios(loadedUsuarios);
      if (loadedUsuarios.length > 0) {
        setQuickUsuario(loadedUsuarios[0].id);
      }

      setQuickData(new Date().toISOString().split('T')[0]);
      const insights = await getHistoricoInsights();
      setHistoricoInsights(insights);

      setIsLoading(false);
    }
    loadData();
  }, [router]);

  useEffect(() => {
    if (quickTipo === 'saida') {
      setQuickCategoria(categoriasSaidas.length > 0 ? categoriasSaidas[0] : 'Outros');
    } else {
      setQuickCategoria(categoriasEntradas[0] || 'Outros');
    }
  }, [quickTipo, categoriasSaidas, categoriasEntradas]);

  useEffect(() => {
    const meses = new Set();
    saidas.forEach(g => { if (g.data) meses.add(g.data.substring(0, 7)); });
    entradas.forEach(r => { if (r.data) meses.add(r.data.substring(0, 7)); });

    const mesesArr = Array.from(meses).sort().reverse();
    setMesesDisponiveis(mesesArr);

    if (mesSelecionado === '' && mesesArr.length > 0) {
      const currentMonth = new Date().toISOString().substring(0, 7);
      setMesSelecionado(mesesArr.includes(currentMonth) ? currentMonth : mesesArr[0]);
    }
  }, [saidas, entradas, mesSelecionado]);

  useEffect(() => {
    if (usuarioSelecionado !== 'all') {
      setQuickUsuario(usuarioSelecionado);
    }
  }, [usuarioSelecionado]);

  const saidasFiltrados = saidas.filter(g => {
    const matchMes = (mesSelecionado === 'all' || !mesSelecionado) ? true : g.data?.substring(0, 7) === mesSelecionado;
    const matchUsuario = usuarioSelecionado === 'all' ? true : g.usuarioId === usuarioSelecionado;
    return matchMes && matchUsuario;
  });
  const entradasFiltradas = entradas.filter(r => {
    const matchMes = (mesSelecionado === 'all' || !mesSelecionado) ? true : r.data?.substring(0, 7) === mesSelecionado;
    const matchUsuario = usuarioSelecionado === 'all' ? true : r.usuarioId === usuarioSelecionado;
    return matchMes && matchUsuario;
  });

  const totalSaidas = saidasFiltrados.reduce((acc, saida) => acc + (Number(saida.total) || 0), 0);
  const totalEntradas = entradasFiltradas.reduce((acc, entrada) => acc + (Number(entrada.valor) || 0), 0);

  const saidasPorCategoria = saidasFiltrados.reduce((acc, g) => {
    const cat = g.categoria || 'Sem Categoria';
    acc[cat] = (acc[cat] || 0) + (Number(g.total) || 0);
    return acc;
  }, {});

  const entradasPorCategoria = entradasFiltradas.reduce((acc, r) => {
    const cat = r.categoria || 'Sem Categoria';
    acc[cat] = (acc[cat] || 0) + (Number(r.valor) || 0);
    return acc;
  }, {});

  const despesasFixas = saidasFiltrados.reduce((acc, g) => {
    let tipo = g.tipoCusto;
    if (tipo === 'Fixo') return acc + (Number(g.total) || 0);
    return acc;
  }, 0);

  const despesasVariaveis = saidasFiltrados.reduce((acc, g) => {
    let tipo = g.tipoCusto;
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
      const config = await getConfiguracoes();
      const apiKey = config.geminiApiKey || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
      if (!apiKey) throw new Error('Chave de API do Gemini não configurada. Defina na aba de Configurações.');

      const resumo = {
        periodo: mesSelecionado === 'all' || !mesSelecionado ? 'Todos os meses (Consolidado)' : formatMonth(mesSelecionado),
        usuario: usuarioSelecionado === 'all' ? 'Todos (Geral)' : usuarios.find(p => p.id === usuarioSelecionado)?.nome,
        totalEntradas: totalEntradas.toFixed(2),
        totalSaidas: totalSaidas.toFixed(2),
        saldo: saldo.toFixed(2),
        despesasFixas: despesasFixas.toFixed(2),
        despesasVariaveis: despesasVariaveis.toFixed(2),
        saidasPorCategoria,
        entradasPorCategoria,
        usuarios: usuarioSelecionado === 'all' ? usuarios : usuarios.filter(p => p.id === usuarioSelecionado)
      };

      runTask(
        'ai-insights',
        'Analisando a saúde financeira (IA)',
        async () => {
          const api = new GenerativeLanguageApi(apiKey);
          return await api.getBudgetInsights(resumo);
        },
        async (text) => {
          const novoInsight = {
            id: Date.now(),
            dataGeracao: new Date().toISOString(),
            periodo: resumo.periodo,
            texto: text
          };
          const atualizado = [novoInsight, ...historicoInsights];
          setHistoricoInsights(atualizado);
          await saveHistoricoInsights(atualizado);
          setAiInsights(text); setIsInsightsModalOpen(true);
        },
        (err) => alert('Erro ao obter insights: ' + err.message)
      );
    } catch (error) {
      alert(error.message);
    }
  };

  const handleQuickSave = async (e) => {
    e.preventDefault();
    if (!quickData || !quickCategoria || !quickValor || parseFloat(quickValor) <= 0) {
      alert('Por favor, preencha a data, a categoria e um valor maior que zero.');
      return;
    }

    const { addSaida: addSaidaDb } = await import('@/lib/saidasDb');
    const { addEntrada: addEntradaDb } = await import('@/lib/entradasDb');

    if (quickTipo === 'saida') {
      const novoSaida = {
        data: quickData,
        apelido: quickDescricao,
        categoria: quickCategoria,
        tipoCusto: quickTipoCusto,
        total: parseFloat(quickValor),
        usuarioId: quickUsuario,
        produtos: []
      };
      await addSaidaDb(novoSaida);
      const updatedSaidas = await getSaidas();
      setSaidas(updatedSaidas);
    } else {
      const novaEntrada = {
        data: quickData,
        descricao: quickDescricao,
        categoria: quickCategoria,
        usuarioId: quickUsuario,
        valor: parseFloat(quickValor)
      };
      await addEntradaDb(novaEntrada);
      const updatedEntradas = await getEntradas();
      setEntradas(updatedEntradas);
    }

    setQuickDescricao('');
    setQuickValor('');
    alert('Lançamento registrado com sucesso!');
  };

  const saldo = totalEntradas - totalSaidas;

  const viewInsight = (insight) => {
    setAiInsights(insight.texto);
    setIsInsightsModalOpen(true);
  };

  const deleteInsight = async (id) => {
    if (!window.confirm("Deseja realmente excluir este insight?")) return;
    const atualizado = historicoInsights.filter(i => i.id !== id);
    setHistoricoInsights(atualizado);
    await saveHistoricoInsights(atualizado);
  };

  if (isLoading) {
    return <div className="p-6 bg-gray-100 min-h-screen flex items-center justify-center"><p className="text-gray-500 font-medium">Carregando...</p></div>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Meu Orçamento - {entidadeAtiva?.nome || 'Dashboard'}
          <span className={`ml-3 text-sm px-2 py-1 rounded-full ${entidadeAtiva?.is_contexto_pessoal ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
            {entidadeAtiva?.is_contexto_pessoal ? 'Pessoal' : 'Empresarial'}
          </span>
        </h1>
      </div>

      {/* Controles do Topo */}
      <div className="mb-6 flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200 w-full">
        <div className="flex items-center gap-2">
          <label className="font-semibold text-gray-700">Mês de Referência:</label>
          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer outline-none min-w-[140px]"
          >
            <option value="all">Todos os Meses (Geral)</option>
            {mesesDisponiveis.map(mes => (
              <option key={mes} value={mes}>{formatMonth(mes)}</option>
            ))}
          </select>
        </div>

        <div className="w-px h-8 bg-gray-300 hidden md:block"></div>

        <div className="flex items-center gap-2">
          <label className="font-semibold text-gray-700">Filtrar por Usuário:</label>
          <select
            value={usuarioSelecionado}
            onChange={(e) => setUsuarioSelecionado(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer outline-none min-w-[140px]"
          >
            <option value="all">Todos (Geral)</option>
            {usuarios.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <Link href="/usuarios" className="ml-2 text-sm text-blue-600 hover:underline font-medium whitespace-nowrap">
            + Gerenciar
          </Link>
        </div>

        <div className="w-px h-8 bg-gray-300 hidden lg:block flex-grow"></div>

        <button
          onClick={handleGetInsights}
          disabled={loadingInsights}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded text-white font-medium transition w-full lg:w-auto lg:ml-auto ${loadingInsights ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'}`}
        >
          <span>✨</span> {loadingInsights ? 'Gerando Insights...' : 'Insights com IA'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card Entradas */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <h2 className="text-lg font-semibold text-gray-600 mb-2">Total de Entradas</h2>
          <p className="text-3xl font-bold text-green-600">R$ {totalEntradas.toFixed(2)}</p>
        </div>

        {/* Card Saidas */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-600 mb-2">Total de Despesas</h2>
            <p className="text-3xl font-bold text-red-600">R$ {totalSaidas.toFixed(2)}</p>
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
        <form onSubmit={handleQuickSave} className="flex flex-col md:flex-row flex-wrap gap-4 items-end">
          <div className="w-full md:w-auto flex-1 min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={quickTipo}
              onChange={(e) => setQuickTipo(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="saida">Despesa</option>
              <option value="entrada">Entrada</option>
            </select>
          </div>
          {quickTipo === 'saida' && (
            <div className="w-full md:w-auto flex-1 min-w-[120px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Custo</label>
              <select
                value={quickTipoCusto}
                onChange={(e) => setQuickTipoCusto(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="Fixo">Fixo</option>
                <option value="Variável">Variável</option>
              </select>
            </div>
          )}
          <div className="w-full md:w-auto flex-1 min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Lançar para</label>
            <select
              value={quickUsuario}
              onChange={(e) => setQuickUsuario(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              {usuarios.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="w-full md:w-auto flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input
              type="date"
              value={quickData}
              onChange={(e) => setQuickData(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="w-full md:w-auto flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (Opcional)</label>
            <input
              type="text"
              value={quickDescricao}
              onChange={(e) => setQuickDescricao(e.target.value)}
              placeholder="Ex: Padaria, Salário..."
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="w-full md:w-auto flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={quickCategoria}
              onChange={(e) => setQuickCategoria(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              {quickTipo === 'saida'
                ? categoriasSaidas.map(cat => <option key={cat} value={cat}>{cat}</option>)
                : categoriasEntradas.map(cat => <option key={cat} value={cat}>{cat}</option>)
              }
            </select>
          </div>
          <div className="w-full md:w-auto flex-1 min-w-[120px]">
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
          <div className="w-full md:w-auto flex-none">
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
          {Object.keys(saidasPorCategoria).length > 0 ? (
            <ul className="space-y-3">
              {Object.entries(saidasPorCategoria).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
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
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Entradas por Categoria</h3>
          {Object.keys(entradasPorCategoria).length > 0 ? (
            <ul className="space-y-3">
              {Object.entries(entradasPorCategoria).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                <li key={cat} className="flex justify-between items-center text-gray-600 border-b border-gray-100 pb-2">
                  <span className="font-medium">{cat}</span>
                  <span className="font-semibold text-green-600">R$ {val.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Nenhuma entrada neste período.</p>
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
                    &quot;{insight.texto?.length > 200 ? insight.texto.substring(0, 200) + '...' : insight.texto}&quot;
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
        <Link href="/transacoes" className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-500/20">Ver Todas as Transações</Link>
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