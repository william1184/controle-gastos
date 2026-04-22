"use client";
import ImportadorCSV from '@/components/ImportadorCSV';
import { getCategorias } from '@/lib/categoriaDb';
import { getContas } from '@/lib/contaDb';
import { deleteEntrada, getEntradas, updateEntradaCategory } from '@/lib/entradasDb';
import GenerativeLanguageApi from '@/lib/generative_ai_api';
import { deleteSaida, getSaidas, updateSaidaCategoryAndType } from '@/lib/saidasDb';
import { getConfiguracoes } from '@/lib/storeDb';
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
    const config = await getConfiguracoes();
    if (!config.geminiApiKey) {
      alert('Por favor, configure sua Gemini API Key nas configurações.');
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
        const api = new GenerativeLanguageApi(config.geminiApiKey);
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
  };

  const handleAICategorizeEntradas = async () => {
    const config = await getConfiguracoes();
    if (!config.geminiApiKey) {
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
        const api = new GenerativeLanguageApi(config.geminiApiKey);
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
      console.error(err);
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
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transações</h1>
          <p className="text-gray-500">Histórico unificado de movimentações financeiras.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/transacoes/saidas/nova" className="px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all border border-red-100">
            - Saída
          </Link>
          <Link href="/transacoes/entradas/nova" className="px-5 py-2.5 bg-green-50 text-green-600 rounded-xl font-bold hover:bg-green-100 transition-all border border-green-100">
            + Entrada
          </Link>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-200 w-fit">
          {['todas', 'entradas', 'saidas', 'importar'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize ${activeTab === tab
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-gray-500 hover:bg-gray-50'
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
              className="px-4 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-black uppercase tracking-wider border border-green-200 hover:bg-green-100 transition-all disabled:opacity-50"
            >
              {isCategorizing ? 'Processando...' : '🪄 Categorizar Entradas'}
            </button>
          )}
          {(activeTab === 'todas' || activeTab === 'saidas') && (
            <button
              onClick={handleAICategorizeSaidas}
              disabled={isCategorizing}
              className="px-4 py-2 bg-red-50 text-red-700 rounded-xl text-xs font-black uppercase tracking-wider border border-red-200 hover:bg-red-100 transition-all disabled:opacity-50"
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
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Categoria</label>
              <select name="categoria" value={filters.categoria} onChange={handleFilterChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none">
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
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Conta</label>
              <select name="accountId" value={filters.accountId} onChange={handleFilterChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none">
                <option value="">Todas</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Início</label>
              <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Fim</label>
              <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
            </div>
            <div className="lg:col-span-2 flex gap-2">
              <button
                onClick={() => setFilters({ categoria: '', accountId: '', startDate: '', endDate: '' })}
                className="px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 transition-all"
              >
                Limpar Filtros
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descrição</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Categoria</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conta</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Valor</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transacoesData.data.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-20 text-center">
                      <p className="text-gray-400 font-medium">Nenhuma transação encontrada.</p>
                    </td>
                  </tr>
                ) : (
                  transacoesData.data.map((t) => (
                    <tr key={`${t.tipo}-${t.id}`} className="group hover:bg-gray-50/50 transition-all">
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(t.data).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${t.tipo === 'entrada' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {t.tipo === 'entrada' ? '↗' : '↘'}
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="text-sm font-bold text-gray-900 truncate max-w-[200px] md:max-w-[300px]" title={t.descricao || '-'}>{t.descricao || '-'}</span>
                            {t.tags && t.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {t.tags.map(tag => (
                                  <span key={tag.id} className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-500 text-[8px] font-black uppercase tracking-wider border border-blue-100">
                                    {tag.nome}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider truncate max-w-[120px] inline-block" title={t.categoria || 'Outros'}>
                          {t.categoria || 'Outros'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-medium">{t.contaNome || '-'}</td>
                      <td className={`px-6 py-4 text-sm font-black text-right ${t.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.tipo === 'entrada' ? '+' : '-'} R$ {parseFloat(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={t.tipo === 'saida' ? `/transacoes/saidas/editar?id=${t.id}` : `/transacoes/entradas/editar?id=${t.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            ✏️
                          </Link>
                          <button
                            onClick={() => handleDelete(t)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Sugestões de Categorização (IA)</h3>
                <p className="text-sm text-gray-500">Revise e selecione quais alterações você deseja aplicar.</p>
              </div>
              <button onClick={() => setShowSuggestionsModal(false)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="flex-grow overflow-auto p-6">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-10">
                      <input
                        type="checkbox"
                        checked={selectedIndices.size === aiSuggestions.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                    </th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descrição</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Original</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sugerido</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {aiSuggestions.map((sug, i) => {
                    const original = currentTransactionsForAI[sug.index];
                    return (
                      <tr key={i} className={`hover:bg-gray-50 transition-colors ${selectedIndices.has(i) ? 'bg-blue-50/20' : ''}`}>
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
                            <span className="text-sm font-bold text-gray-900">{original?.descricao}</span>
                            <span className="text-[10px] text-gray-400">R$ {parseFloat(original?.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-bold uppercase w-fit">{original?.categoria}</span>
                            {currentCategorizationType === 'saida' && (
                              <span className="text-[9px] text-gray-400">{original?.tipoCusto}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold uppercase w-fit">{sug.categoria_sugerida}</span>
                            {currentCategorizationType === 'saida' && (
                              <span className="text-[9px] font-bold text-blue-600">{sug.tipo_custo_sugerido}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-500 italic">
                          {sug.motivo}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button
                onClick={() => setShowSuggestionsModal(false)}
                className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={applySelectedSuggestions}
                disabled={isCategorizing || selectedIndices.size === 0}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {isCategorizing ? 'Aplicando...' : `Aplicar Sugestões (${selectedIndices.size})`}
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
    <Suspense fallback={<div className="p-8 text-center">Carregando transações...</div>}>
      <TransacoesPageContent />
    </Suspense>
  );
}
