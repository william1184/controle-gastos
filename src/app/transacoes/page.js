"use client";
import ImportadorCSV from '@/components/ImportadorCSV';
import { getCategorias } from '@/lib/categoriaDb';
import { getContas } from '@/lib/contaDb';
import { deleteEntrada, getEntradas, updateEntradaCategory } from '@/lib/entradasDb';
import GenerativeLanguageApi from '@/lib/generative_ai_api';
import { deleteSaida, getSaidas, updateSaidaCategoryAndType } from '@/lib/saidasDb';
import { getConfiguracoes } from '@/lib/storeDb';
import { getConfig } from '@/lib/configuracaoDb';
import { normalizeTransactions, sortTransactionsByDate } from '@/lib/transactionMapper';
import { useBackgroundTask } from '@/providers/BackgroundTaskProvider';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { getTransactions } from '@/lib/transactionDb';
import Pagination from '@/components/Pagination';

function TransacoesPageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tipo') === 'entrada' ? 'entradas' : (searchParams.get('tipo') === 'saida' ? 'saidas' : 'todas');

  const [transacoesData, setTransacoesData] = useState({ data: [], total: 0, page: 1, pageSize: 20 });
  const [activeTab, setActiveTab] = useState(initialTab); // todas, entradas, saidas, importar
  const [contas, setContas] = useState([]);
  const [categoriasSaidas, setCategoriasSaidas] = useState([]);
  const [categoriasEntradas, setCategoriasEntradas] = useState([]);
  const [filters, setFilters] = useState({
    categoria: '',
    accountId: '',
    startDate: '',
    endDate: ''
  });
  const [isCategorizing, setIsCategorizing] = useState(false);
  const { runTask } = useBackgroundTask();

  // Suggestions Modal State
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [currentCategorizationType, setCurrentCategorizationType] = useState('saida');
  const [currentTransactionsForAI, setCurrentTransactionsForAI] = useState([]);

  const loadData = async (page = 1) => {
    const [cs, catsG, catsR] = await Promise.all([
      getContas(),
      getCategorias('saida'),
      getCategorias('entrada')
    ]);

    const queryFilters = {
      ...filters,
      page,
      pageSize: transacoesData.pageSize,
      tipo: activeTab === 'entradas' ? 'entrada' : (activeTab === 'saidas' ? 'saida' : ''),
    };

    if (filters.categoria) {
      const cat = [...catsG, ...catsR].find(c => c.nome === filters.categoria);
      if (cat) queryFilters.categoriaId = cat.id;
    }
    
    if (filters.accountId) queryFilters.contaId = filters.accountId;

    const result = await getTransactions(queryFilters);

    setTransacoesData(result);
    setContas(cs);
    setCategoriasSaidas(catsG);
    setCategoriasEntradas(catsR);
  };

  useEffect(() => {
    loadData(1);
  }, [filters, activeTab]);

  const onPageChange = (p) => {
    loadData(p);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleDelete = async (t) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
    if (t.tipo === 'saida') await deleteSaida(t.id);
    else await deleteEntrada(t.id);
    loadData();
  };

  const handleAICategorizeSaidas = async () => {
    try {
      const apiKey = await getConfig('geminiApiKey');
      if (!apiKey) {
        alert('Chave de API do Gemini não configurada. Defina na aba de Configurações.');
        return;
      }


      const saidasParaCategorizar = transacoesData.data.filter(t => t.tipo === 'saida');
      
      if (saidasParaCategorizar.length === 0) {
        alert('Nenhuma saída encontrada para categorizar.');
        return;
      }


    runTask(
      'categorize-saidas',
      'Categorizando Saídas com IA',
      async () => {
        const api = new GenerativeLanguageApi(apiKey);
        return await api.suggestCategories(
          saidasParaCategorizar,
          categoriasSaidas.map(c => c.nome)
        );
      },
      (suggestions) => {
        if (suggestions.length === 0) {
          alert('A IA não encontrou sugestões de melhoria para as categorias atuais.');
        } else {
          setAiSuggestions(suggestions);
          setSelectedIndices(new Set(suggestions.map((_, i) => i)));
          setCurrentCategorizationType('saida');
          setCurrentTransactionsForAI(saidasParaCategorizar);
          setShowSuggestionsModal(true);
        }
      },
      (error) => alert('Erro na categorização: ' + error.message)
    );
    } catch (error) {
      alert('Erro ao iniciar categorização: ' + error.message);
    }
  };


  const handleAICategorizeEntradas = async () => {
    const apiKey = await getConfig('geminiApiKey');
    if (!apiKey) {
      alert('Por favor, configure sua Gemini API Key nas configurações.');
      return;
    }

    const entradasParaCategorizar = transacoesData.data.filter(t => t.tipo === 'entrada');
    if (entradasParaCategorizar.length === 0) {
      alert('Nenhuma entrada encontrada para categorizar.');
      return;
    }

    runTask(
      'categorize-entradas',
      'Categorizando Entradas com IA',
      async () => {
        const api = new GenerativeLanguageApi(apiKey);
        return await api.suggestCategoriesEntradas(
          entradasParaCategorizar,
          categoriasEntradas.map(c => c.nome)
        );
      },
      (suggestions) => {
        if (suggestions.length === 0) {
          alert('A IA não encontrou sugestões de melhoria para as categorias atuais.');
        } else {
          setAiSuggestions(suggestions);
          setSelectedIndices(new Set(suggestions.map((_, i) => i)));
          setCurrentCategorizationType('entrada');
          setCurrentTransactionsForAI(entradasParaCategorizar);
          setShowSuggestionsModal(true);
        }
      },
      (error) => alert('Erro na categorização: ' + error.message)
    );
  };

  const applySelectedSuggestions = async () => {
    setIsCategorizing(true);
    try {
      let count = 0;
      for (const index of selectedIndices) {
        const sug = aiSuggestions[index];
        const original = currentTransactionsForAI[sug.index];
        if (original) {
          if (currentCategorizationType === 'saida') {
            await updateSaidaCategoryAndType(original.id, sug.categoria_sugerida, sug.tipo_custo_sugerido);
          } else {
            await updateEntradaCategory(original.id, sug.categoria_sugerida);
          }
          count++;
        }
      }
      alert(`${count} transações foram atualizadas com sucesso!`);
      setShowSuggestionsModal(false);
      loadData();
    } catch (err) {
      alert('Erro ao aplicar sugestões: ' + err.message);
    } finally {
      setIsCategorizing(false);
    }
  };

  const toggleSelection = (index) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedIndices(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === aiSuggestions.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(aiSuggestions.map((_, i) => i)));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight">Transações</h1>
          <p className="text-[var(--muted)] font-medium">Histórico unificado de movimentações financeiras.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/transacoes/saidas/nova" className="px-5 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all border border-red-100 dark:border-red-900/50">
            - Saída
          </Link>
          <Link href="/transacoes/entradas/nova" className="px-5 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl font-bold hover:bg-green-100 dark:hover:bg-green-900/30 transition-all border border-green-100 dark:border-green-900/50">
            + Entrada
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex gap-2 bg-[var(--card)] p-1.5 rounded-2xl border border-[var(--border)] w-fit">
          {['todas', 'entradas', 'saidas', 'importar'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize ${activeTab === tab
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-[var(--muted)] hover:bg-[var(--background)]'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {(activeTab === 'todas' || activeTab === 'entradas') && (
            <button
              onClick={handleAICategorizeEntradas}
              disabled={isCategorizing}
              className="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl text-xs font-black uppercase tracking-wider border border-green-200 dark:border-green-900/50 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all disabled:opacity-50"
            >
              {isCategorizing ? 'Processando...' : '🪄 Categorizar Entradas'}
            </button>
          )}
          {(activeTab === 'todas' || activeTab === 'saidas') && (
            <button
              onClick={handleAICategorizeSaidas}
              disabled={isCategorizing}
              className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl text-xs font-black uppercase tracking-wider border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all disabled:opacity-50"
            >
              {isCategorizing ? 'Processando...' : '🪄 Categorizar Saídas'}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'importar' ? (
        <ImportadorCSV onImportComplete={() => setActiveTab('todas')} />
      ) : (
        <>
          <div className="bg-[var(--card)] p-6 rounded-3xl shadow-sm border border-[var(--border)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-2 ml-1">Categoria</label>
                <select name="categoria" value={filters.categoria} onChange={handleFilterChange} className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all cursor-pointer text-[var(--foreground)]">
                  <option value="">Todas</option>
                  {activeTab === 'todas' && (
                    <>
                      <optgroup label="Entradas">
                        {categoriasEntradas.map(c => <option key={`in-${c.id}`} value={c.nome}>{c.nome}</option>)}
                      </optgroup>
                      <optgroup label="Saídas">
                        {categoriasSaidas.map(c => <option key={`out-${c.id}`} value={c.nome}>{c.nome}</option>)}
                      </optgroup>
                    </>
                  )}
                  {activeTab === 'entradas' && categoriasEntradas.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  {activeTab === 'saidas' && categoriasSaidas.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-2 ml-1">Conta</label>
                <select name="accountId" value={filters.accountId} onChange={handleFilterChange} className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all cursor-pointer text-[var(--foreground)]">
                  <option value="">Todas</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-2 ml-1">Início</label>
                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all text-[var(--foreground)]" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-2 ml-1">Fim</label>
                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl text-sm font-bold outline-none focus:border-blue-500 transition-all text-[var(--foreground)]" />
              </div>
              <div className="lg:col-span-1 flex items-end">
                <button
                  onClick={() => setFilters({ categoria: '', accountId: '', startDate: '', endDate: '' })}
                  className="w-full p-3 text-sm font-black text-[var(--muted)] hover:text-[var(--foreground)] transition-all uppercase tracking-widest"
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)] overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--background)]/50 border-b border-[var(--border)]">
                    <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Data</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Descrição</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Categoria</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Conta</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest text-right">Valor</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {transacoesData.data.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-20 text-center">
                        <p className="text-[var(--muted)] font-medium">Nenhuma transação encontrada.</p>
                      </td>
                    </tr>
                  ) : (
                    transacoesData.data.map((t) => (
                      <tr key={`${t.tipo}-${t.id}`} className="group hover:bg-[var(--background)]/50 transition-all">
                        <td className="px-6 py-4 text-sm text-[var(--muted)] font-medium">{new Date(t.data).toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${t.tipo === 'entrada' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                              {t.tipo === 'entrada' ? '↗' : '↘'}
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className="text-sm font-bold text-[var(--foreground)] truncate max-w-[200px] lg:max-w-[300px]" title={t.descricao || '-'}>{t.descricao || '-'}</span>
                              {t.tags && t.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {t.tags.map(tag => (
                                    <span key={tag.id} className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 text-[8px] font-black uppercase tracking-wider border border-blue-100 dark:border-blue-900/50">
                                      {tag.nome}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg bg-[var(--background)] text-[var(--muted)] text-[10px] font-black uppercase tracking-wider truncate max-w-[120px] inline-block border border-[var(--border)]" title={t.categoria || 'Outros'}>
                            {t.categoria || 'Outros'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--muted)] font-bold">{t.contaNome || '-'}</td>
                        <td className={`px-6 py-4 text-sm font-black text-right ${t.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.tipo === 'entrada' ? '+' : '-'} R$ {parseFloat(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              href={t.tipo === 'saida' ? `/transacoes/saidas/editar?id=${t.id}` : `/transacoes/entradas/editar?id=${t.id}`}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                            >
                              ✏️
                            </Link>
                            <Link
                              href={t.tipo === 'saida' ? `/transacoes/saidas/detalhes?id=${t.id}` : `/transacoes/entradas/detalhes?id=${t.id}`}
                              className="p-2 text-gray-400 hover:bg-[var(--background)] rounded-lg transition-all"
                            >
                              👁️
                            </Link>
                            <button
                              onClick={() => handleDelete(t)}
                              className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-[var(--border)]">
              {transacoesData.data.length === 0 ? (
                <div className="px-6 py-20 text-center">
                  <p className="text-[var(--muted)] font-medium">Nenhuma transação encontrada.</p>
                </div>
              ) : (
                transacoesData.data.map((t) => (
                  <div key={`${t.tipo}-${t.id}`} className="p-4 space-y-4 hover:bg-[var(--background)]/50 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm ${t.tipo === 'entrada' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                          {t.tipo === 'entrada' ? '↗' : '↘'}
                        </div>
                        <div>
                          <p className="text-sm font-black text-[var(--foreground)] leading-tight">{t.descricao || '-'}</p>
                          <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest">{new Date(t.data).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <p className={`text-sm font-black ${t.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.tipo === 'entrada' ? '+' : '-'} R$ {parseFloat(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                       <div className="flex gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-[var(--background)] text-[var(--muted)] text-[9px] font-black uppercase tracking-wider border border-[var(--border)]">
                             {t.categoria || 'Outros'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 text-[9px] font-black uppercase tracking-wider border border-blue-100 dark:border-blue-900/50">
                             {t.contaNome || '-'}
                          </span>
                       </div>
                       <div className="flex gap-1">
                         <Link href={t.tipo === 'saida' ? `/transacoes/saidas/editar?id=${t.id}` : `/transacoes/entradas/editar?id=${t.id}`} className="p-1.5 text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-lg">✏️</Link>
                         <Link href={t.tipo === 'saida' ? `/transacoes/saidas/detalhes?id=${t.id}` : `/transacoes/entradas/detalhes?id=${t.id}`} className="p-1.5 text-gray-600 bg-gray-50 dark:bg-gray-800 rounded-lg">👁️</Link>
                         <button onClick={() => handleDelete(t)} className="p-1.5 text-rose-600 bg-rose-50 dark:bg-rose-900/30 rounded-lg">🗑️</button>
                       </div>
                    </div>
                  </div>
                )
              ))}
            </div>
            
            <Pagination 
              total={transacoesData.total} 
              page={transacoesData.page} 
              pageSize={transacoesData.pageSize} 
              onPageChange={onPageChange} 
            />
          </div>
        </>
      )}

      {showSuggestionsModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--card)] rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-fade-in-up border border-[var(--border)]">
            <div className="p-8 border-b border-[var(--border)] flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
                  🪄
                </div>
                <div>
                  <h3 className="text-xl font-black text-[var(--foreground)]">Sugestões de IA</h3>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">IA Categorization Engine</p>
                </div>
              </div>
              <button onClick={() => setShowSuggestionsModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--background)] transition-colors text-[var(--muted)]">✕</button>
            </div>

            <div className="flex-grow overflow-auto p-8">
              {/* Responsive Table for suggestions */}
              <div className="hidden lg:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-4 py-3 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest w-10">
                        <input
                          type="checkbox"
                          checked={selectedIndices.size === aiSuggestions.length}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                      </th>
                      <th className="px-4 py-3 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Descrição</th>
                      <th className="px-4 py-3 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Original</th>
                      <th className="px-4 py-3 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Sugerido</th>
                      <th className="px-4 py-3 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {aiSuggestions.map((sug, i) => {
                      const original = currentTransactionsForAI[sug.index];
                      return (
                        <tr key={i} className={`hover:bg-[var(--background)]/50 transition-colors ${selectedIndices.has(i) ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}>
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIndices.has(i)}
                              onChange={() => toggleSelection(i)}
                              className="w-4 h-4 rounded text-blue-600"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-[var(--foreground)]">{original?.descricao}</span>
                              <span className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest">R$ {parseFloat(original?.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--background)] text-[var(--muted)] font-black uppercase w-fit tracking-wider border border-[var(--border)]">{original?.categoria}</span>
                              {currentCategorizationType === 'saida' && (
                                <span className="text-[9px] text-[var(--muted)] font-bold">{original?.tipoCusto}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-black uppercase w-fit tracking-wider">{sug.categoria_sugerida}</span>
                              {currentCategorizationType === 'saida' && (
                                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-500">{sug.tipo_custo_sugerido}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-xs text-[var(--muted)] italic leading-relaxed">
                            &quot;{sug.motivo}&quot;
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Mobile suggestions cards */}
              <div className="lg:hidden space-y-4">
                 {aiSuggestions.map((sug, i) => {
                    const original = currentTransactionsForAI[sug.index];
                    return (
                       <div key={i} className={`p-6 border rounded-3xl transition-all ${selectedIndices.has(i) ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-900/10' : 'border-[var(--border)] bg-[var(--card)]'}`} onClick={() => toggleSelection(i)}>
                          <div className="flex justify-between items-start mb-4">
                             <div className="flex gap-3">
                                <input type="checkbox" checked={selectedIndices.has(i)} onChange={() => {}} className="w-5 h-5 rounded text-blue-600 mt-1" />
                                <div>
                                   <p className="font-black text-[var(--foreground)]">{original?.descricao}</p>
                                   <p className="text-[10px] text-[var(--muted)] font-black uppercase tracking-widest">R$ {parseFloat(original?.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                             <div>
                                <p className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest mb-1">De:</p>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--background)] text-[var(--muted)] font-black uppercase border border-[var(--border)]">{original?.categoria}</span>
                             </div>
                             <div>
                                <p className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest mb-1">Para:</p>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-black uppercase">{sug.categoria_sugerida}</span>
                             </div>
                          </div>
                          <p className="text-xs text-[var(--muted)] italic leading-relaxed bg-[var(--background)]/50 p-3 rounded-2xl">&quot;{sug.motivo}&quot;</p>
                       </div>
                    );
                 })}
              </div>
            </div>

            <div className="p-8 border-t border-[var(--border)] bg-[var(--background)] flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setShowSuggestionsModal(false)}
                className="px-6 py-3 text-sm font-black text-[var(--muted)] hover:text-[var(--foreground)] transition-all uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={applySelectedSuggestions}
                disabled={isCategorizing || selectedIndices.size === 0}
                className="btn-primary"
              >
                {isCategorizing ? 'Processando...' : `Aplicar (${selectedIndices.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransacoesPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center animate-pulse">
        <div className="w-12 h-12 bg-gray-200 rounded-2xl mx-auto mb-4"></div>
        <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Sincronizando Dados...</p>
      </div>
    }>
      <TransacoesPageContent />
    </Suspense>
  );
}
