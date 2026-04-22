"use client";
import { getActiveEntidade } from '@/lib/entidadeDb';
import { getEntradas } from '@/lib/entradasDb';
import GenerativeLanguageApi from '@/lib/generative_ai_api';
import { getSaidas } from '@/lib/saidasDb';
import { getConfiguracoes, getHistoricoInsights, setHistoricoInsights as saveHistoricoInsights } from '@/lib/storeDb';
import { getConfig } from '@/lib/configuracaoDb';
import { getUsuarios } from '@/lib/usuarioDb';
import { calculateTotals, calculateTotalsByCategory, calculateTotalsByCostType } from '@/lib/financialCalculations';
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

  const totalSaidas = calculateTotals(saidasFiltrados, 'total');
  const totalEntradas = calculateTotals(entradasFiltradas, 'valor');

  const saidasPorCategoria = calculateTotalsByCategory(saidasFiltrados, 'total');
  const entradasPorCategoria = calculateTotalsByCategory(entradasFiltradas, 'valor');

  const costsByType = calculateTotalsByCostType(saidasFiltrados, 'total');
  const despesasFixas = costsByType['Fixo'] || 0;
  const despesasVariaveis = costsByType['Variável'] || 0;

  const formatMonth = (yyyyMM) => {
    if (!yyyyMM) return '';
    const [year, month] = yyyyMM.split('-');
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${monthNames[parseInt(month, 10) - 1]}/${year}`;
  };

  const handleGetInsights = async () => {
    try {
      const apiKey = await getConfig('geminiApiKey') || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
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
    return <div className="p-6 bg-[var(--background)] min-h-screen flex items-center justify-center"><p className="text-[var(--muted)] font-medium">Carregando...</p></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight flex items-center gap-3">
            {entidadeAtiva?.nome || 'Dashboard'}
            <span className={`text-[10px] uppercase px-3 py-1 rounded-full font-black tracking-widest ${entidadeAtiva?.is_contexto_pessoal ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'}`}>
              {entidadeAtiva?.is_contexto_pessoal ? 'Pessoal' : 'Empresa'}
            </span>
          </h1>
          <p className="text-[var(--muted)] font-medium">Bem-vindo de volta! Aqui está o resumo das suas finanças.</p>
        </div>
        
        <button
          onClick={handleGetInsights}
          disabled={loadingInsights}
          className="btn-primary w-full md:w-auto bg-gradient-to-r from-indigo-600 to-blue-600 shadow-indigo-500/20"
        >
          {loadingInsights ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : <span>✨</span>}
          {loadingInsights ? 'Analisando...' : 'Insights com IA'}
        </button>
      </div>

      {/* Controles do Topo */}
      <div className="flex flex-col lg:flex-row gap-4 bg-[var(--card)]/50 backdrop-blur-sm p-4 rounded-[2rem] border border-[var(--border)] shadow-sm">
        <div className="flex flex-1 items-center gap-3 px-2">
          <span className="text-xs font-black text-[var(--muted)] uppercase tracking-widest">Período</span>
          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 font-bold text-[var(--foreground)] cursor-pointer outline-none"
          >
            <option value="all">Todos os Meses</option>
            {mesesDisponiveis.map(mes => (
              <option key={mes} value={mes}>{formatMonth(mes)}</option>
            ))}
          </select>
        </div>

        <div className="hidden lg:block w-px h-8 bg-[var(--border)]"></div>

        <div className="flex flex-1 items-center gap-3 px-2">
          <span className="text-xs font-black text-[var(--muted)] uppercase tracking-widest">Usuário</span>
          <select
            value={usuarioSelecionado}
            onChange={(e) => setUsuarioSelecionado(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="flex-1 bg-transparent border-none focus:ring-0 font-bold text-[var(--foreground)] cursor-pointer outline-none"
          >
            <option value="all">Todos os Usuários</option>
            {usuarios.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card-premium p-8 border-l-[6px] border-l-emerald-500">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-black text-[var(--muted)] uppercase tracking-widest">Total Entradas</p>
            <span className="text-2xl">📈</span>
          </div>
          <p className="text-4xl font-black text-emerald-600 tracking-tighter">
            R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-4 h-1.5 w-full bg-emerald-100 dark:bg-emerald-900/30 rounded-full overflow-hidden">
             <div className="h-full bg-emerald-500 w-full animate-pulse"></div>
          </div>
        </div>

        <div className="card-premium p-8 border-l-[6px] border-l-rose-500">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-black text-[var(--muted)] uppercase tracking-widest">Total Saídas</p>
            <span className="text-2xl">📉</span>
          </div>
          <p className="text-4xl font-black text-rose-600 tracking-tighter">
            R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-4 flex justify-between text-[10px] font-bold uppercase tracking-widest">
            <span className="text-[var(--muted)]">Fixas: <span className="text-rose-500">R$ {despesasFixas.toFixed(0)}</span></span>
            <span className="text-[var(--muted)]">Var: <span className="text-rose-500">R$ {despesasVariaveis.toFixed(0)}</span></span>
          </div>
        </div>

        <div className={`card-premium p-8 border-l-[6px] transition-all duration-500 ${saldo >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-black text-[var(--muted)] uppercase tracking-widest">Saldo Disponível</p>
            <span className="text-2xl">{saldo >= 0 ? '💰' : '⚠️'}</span>
          </div>
          <p className={`text-4xl font-black tracking-tighter ${saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-4 text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
            {saldo >= 0 ? 'Saúde financeira em dia' : 'Atenção ao seu orçamento'}
          </p>
        </div>
      </div>

      {/* Lançamento Rápido */}
      <div className="card-premium p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            ⚡
          </div>
          <h2 className="text-xl font-black text-[var(--foreground)]">Lançamento Rápido</h2>
        </div>
        
        <form onSubmit={handleQuickSave} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Tipo</label>
            <select
              value={quickTipo}
              onChange={(e) => setQuickTipo(e.target.value)}
              className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm outline-none focus:border-blue-500 transition-all cursor-pointer text-[var(--foreground)]"
            >
              <option value="saida">Despesa</option>
              <option value="entrada">Entrada</option>
            </select>
          </div>

          {quickTipo === 'saida' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Custo</label>
              <select
                value={quickTipoCusto}
                onChange={(e) => setQuickTipoCusto(e.target.value)}
                className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm outline-none focus:border-blue-500 transition-all cursor-pointer text-[var(--foreground)]"
              >
                <option value="Fixo">Fixo</option>
                <option value="Variável">Variável</option>
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Usuário</label>
            <select
              value={quickUsuario}
              onChange={(e) => setQuickUsuario(Number(e.target.value))}
              className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm outline-none focus:border-blue-500 transition-all cursor-pointer text-[var(--foreground)]"
            >
              {usuarios.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Data</label>
            <input
              type="date"
              value={quickData}
              onChange={(e) => setQuickData(e.target.value)}
              className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm outline-none focus:border-blue-500 transition-all text-[var(--foreground)]"
            />
          </div>

          <div className="space-y-2 lg:col-span-2 xl:col-span-1">
            <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Descrição</label>
            <input
              type="text"
              value={quickDescricao}
              onChange={(e) => setQuickDescricao(e.target.value)}
              placeholder="O que você comprou?"
              className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm outline-none focus:border-blue-500 transition-all text-[var(--foreground)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Categoria</label>
            <select
              value={quickCategoria}
              onChange={(e) => setQuickCategoria(e.target.value)}
              className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm outline-none focus:border-blue-500 transition-all cursor-pointer text-[var(--foreground)]"
            >
              {quickTipo === 'saida'
                ? categoriasSaidas.map(cat => <option key={cat} value={cat}>{cat}</option>)
                : categoriasEntradas.map(cat => <option key={cat} value={cat}>{cat}</option>)
              }
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Valor</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={quickValor}
                onChange={(e) => setQuickValor(e.target.value)}
                placeholder="0,00"
                className="w-full p-3 pl-8 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-black text-sm outline-none focus:border-blue-500 transition-all text-[var(--foreground)]"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full h-[50px] shadow-blue-500/10">
            Salvar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card-premium p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-[var(--foreground)]">Despesas por Categoria</h3>
            <span className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-full uppercase">Saídas</span>
          </div>
          {Object.keys(saidasPorCategoria).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(saidasPorCategoria).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                <div key={cat} className="group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-[var(--muted)] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{cat}</span>
                    <span className="font-black text-[var(--foreground)]">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--background)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full transition-all duration-1000"
                      style={{ width: `${(val / totalSaidas * 100).toFixed(0)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)]">
              <span className="text-4xl mb-4">📝</span>
              <p className="font-medium">Nenhuma despesa registrada.</p>
            </div>
          )}
        </div>

        <div className="card-premium p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-[var(--foreground)]">Entradas por Categoria</h3>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full uppercase">Rendas</span>
          </div>
          {Object.keys(entradasPorCategoria).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(entradasPorCategoria).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                <div key={cat} className="group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-[var(--muted)] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{cat}</span>
                    <span className="font-black text-[var(--foreground)]">R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--background)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                      style={{ width: `${(val / totalEntradas * 100).toFixed(0)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)]">
              <span className="text-4xl mb-4">💰</span>
              <p className="font-medium">Nenhuma entrada registrada.</p>
            </div>
          )}
        </div>
      </div>

      {/* Histórico de Insights */}
      <div className="card-premium p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              📚
            </div>
            <h2 className="text-xl font-black text-[var(--foreground)]">Histórico de Insights</h2>
          </div>
          <Link href="/transacoes" className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">Ver Todas Transações →</Link>
        </div>

        {historicoInsights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {historicoInsights.map(insight => (
              <div key={insight.id} className="p-6 bg-[var(--background)] border border-[var(--border)] rounded-3xl hover:border-indigo-200 dark:hover:border-indigo-900 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-[var(--foreground)]">Período: {insight.periodo}</h3>
                    <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest">{new Date(insight.dataGeracao).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => viewInsight(insight)} className="p-2 bg-[var(--card)] text-indigo-600 dark:text-indigo-400 rounded-xl shadow-sm border border-[var(--border)] hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all">👁️</button>
                    <button onClick={() => deleteInsight(insight.id)} className="p-2 bg-[var(--card)] text-rose-600 dark:text-rose-400 rounded-xl shadow-sm border border-[var(--border)] hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all">🗑️</button>
                  </div>
                </div>
                <p className="text-sm text-[var(--muted)] line-clamp-3 italic leading-relaxed">
                  &quot;{insight.texto}&quot;
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-[var(--background)] rounded-[2rem] border-2 border-dashed border-[var(--border)]">
             <p className="text-[var(--muted)] font-medium">Nenhum insight salvo ainda.</p>
          </div>
        )}
      </div>

      {/* Modal de Insights */}
      {isInsightsModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--card)] rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-up border border-[var(--border)]">
            <div className="p-8 border-b border-[var(--border)] flex justify-between items-center bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
                  ✨
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[var(--foreground)]">Visão Inteligente</h2>
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">IA Financial Assistant</p>
                </div>
              </div>
              <button 
                onClick={() => setIsInsightsModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--background)] transition-colors text-[var(--muted)]"
              >
                ✕
              </button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 text-[var(--foreground)] whitespace-pre-wrap leading-relaxed font-medium">
              {aiInsights}
            </div>
            <div className="p-8 border-t border-[var(--border)] bg-[var(--background)] flex justify-end">
              <button
                onClick={() => setIsInsightsModalOpen(false)}
                className="btn-primary"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}