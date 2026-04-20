"use client";
import { deleteRenda, getRendas, updateRenda } from '@/lib/rendasDb';
import { getContas } from '@/lib/contaDb';
import { getConfiguracoes } from '@/lib/storeDb';
import GenerativeLanguageApi from '@/lib/generative_ai_api';
import { useBackgroundTask } from '@/providers/BackgroundTaskProvider';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Rendas() {
  const [rendas, setRendas] = useState([]);
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filters, setFilters] = useState({
    categoria: '',
    accountId: '',
    startDate: '',
    endDate: ''
  });
  
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const { runTask, isTaskRunning } = useBackgroundTask();
  const loadingAi = isTaskRunning('ai-categorias-rendas');

  useEffect(() => {
    const loadInitialData = async () => {
      const config = await getConfiguracoes();
      setCategorias(config.categoriasRendas || ['Salário', 'Freelance', 'Investimentos', 'Rendimentos', 'Outros']);
      
      const loadedContas = await getContas();
      setContas(loadedContas);
      
      loadRendas();
    };
    loadInitialData();
  }, []);

  const loadRendas = async (currentFilters = filters) => {
    const loadedRendas = await getRendas(currentFilters);
    setRendas(loadedRendas);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    loadRendas(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      categoria: '',
      accountId: '',
      startDate: '',
      endDate: ''
    };
    setFilters(clearedFilters);
    loadRendas(clearedFilters);
  };

  const handleDelete = async (index) => {
    const renda = rendas[index];
    if (renda && renda.id) {
      await deleteRenda(renda.id);
      setRendas(rendas.filter((_, i) => i !== index));
    }
  };

  const handleSuggestCategories = async () => {
    if (rendas.length === 0) return alert('Nenhuma renda cadastrada para analisar.');

    try {
      const config = await getConfiguracoes();
      const apiKey = config.geminiApiKey || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

      if (!apiKey) {
        throw new Error('Chave de API do Gemini não configurada. Defina na aba de Configurações.');
      }

      const categoriasRendas = config.categoriasRendas || ['Salário', 'Pix','Freelance', 'Investimentos', 'Rendimentos', 'Outros'];

      runTask(
        'ai-categorias-rendas',
        'Analisando categorias de rendas (IA)',
        async () => {
          const generativeApi = new GenerativeLanguageApi(apiKey);
          return await generativeApi.suggestCategoriesRendas(rendas, categoriasRendas);
        },
        (suggestions) => {
          if (suggestions && suggestions.length > 0) {
            setAiSuggestions(suggestions.map(s => ({ ...s, accepted: true })));
            setIsAiModalOpen(true);
          } else {
            alert('A IA não encontrou necessidades de alteração. Suas categorias de renda parecem estar corretas!');
          }
        },
        (error) => alert('Erro ao obter sugestões da IA: ' + error.message)
      );
    } catch (error) {
      console.error('[Rendas] Erro ao obter sugestões de categorias da IA:', error);
      alert('Erro ao obter sugestões da IA: ' + error.message);
    }
  };

  const toggleSuggestion = (index) => {
    const updated = [...aiSuggestions];
    updated[index].accepted = !updated[index].accepted;
    setAiSuggestions(updated);
  };

  const handleApplyAiSuggestions = async () => {
    const updatedRendas = [...rendas];
    for (const sug of aiSuggestions) {
      if (sug.accepted && updatedRendas[sug.index]) {
        updatedRendas[sug.index].categoria = sug.categoria_sugerida;
        await updateRenda(updatedRendas[sug.index].id, updatedRendas[sug.index]);
      }
    }
    setRendas(updatedRendas);
    setIsAiModalOpen(false);
    setAiSuggestions([]);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-green-600">Lista de Rendas</h1>
        <div className="flex gap-4">
          <Link
            href="/rendas/nova"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition font-medium shadow-sm"
          >
            + Adicionar Renda
          </Link>
          <button
            onClick={handleSuggestCategories}
            disabled={loadingAi}
            className={`text-white px-4 py-2 rounded transition font-medium shadow-sm ${loadingAi ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {loadingAi ? 'Analisando...' : 'IA: Corrigir Categorias'}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Categoria</label>
          <select
            name="categoria"
            value={filters.categoria}
            onChange={handleFilterChange}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Todas</option>
            {categorias.map((cat, i) => (
              <option key={i} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Conta</label>
          <select
            name="accountId"
            value={filters.accountId}
            onChange={handleFilterChange}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Todas</option>
            {contas.map((conta) => (
              <option key={conta.id} value={conta.id}>{conta.nome}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Início</label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fim</label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <button
          onClick={handleClearFilters}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition text-sm font-medium h-[38px]"
        >
          Limpar
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <th className="p-4 font-semibold text-sm">Data</th>
              <th className="p-4 font-semibold text-sm">Descrição</th>
              <th className="p-4 font-semibold text-sm">Categoria</th>
              <th className="p-4 font-semibold text-sm">Conta</th>
              <th className="p-4 font-semibold text-sm text-right">Valor (R$)</th>
              <th className="p-4 font-semibold text-sm text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rendas.map((renda, index) => (
              <tr key={index} className="hover:bg-gray-50 transition">
                <td className="p-4 text-sm text-gray-600">{renda.data}</td>
                <td className="p-4 text-sm text-gray-800 font-medium">{renda.descricao || '-'}</td>
                <td className="p-4 text-sm text-center">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                    {renda.categoria || 'Outros'}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-600">{renda.contaNome || '-'}</td>
                <td className="p-4 text-sm text-right text-green-700 font-bold">R$ {parseFloat(renda.valor).toFixed(2)}</td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-2">
                    <Link
                      href={`/rendas/editar?id=${renda.id}`}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition"
                      title="Editar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleDelete(index)}
                      className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition"
                      title="Excluir"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rendas.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-500 italic">
                  Nenhuma renda encontrada com os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-200">
            <h2 className="text-xl font-bold mb-2 text-indigo-700">Sugestões Inteligentes de Categoria</h2>
            <p className="text-sm text-gray-600 mb-4">A IA analisou suas rendas e sugeriu as seguintes correções.</p>
            <div className="space-y-4 mb-6 overflow-y-auto pr-2 custom-scrollbar">
              {aiSuggestions.map((sug, i) => {
                const rendaOriginal = rendas[sug.index];
                if (!rendaOriginal) return null;
                return (
                  <div key={i} className="flex items-start gap-4 p-3 border border-gray-100 rounded bg-gray-50 hover:bg-white transition shadow-sm">
                    <input
                      type="checkbox"
                      checked={sug.accepted}
                      onChange={() => toggleSuggestion(i)}
                      className="mt-1 w-5 h-5 cursor-pointer accent-indigo-600"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{rendaOriginal.descricao || 'Sem descrição'} <span className="text-gray-400 font-normal text-xs">({rendaOriginal.data})</span></p>
                      <p className="text-sm mt-1">De: <span className="line-through text-red-400">{rendaOriginal.categoria || 'Nenhuma'}</span> Para: <span className="font-bold text-green-600">{sug.categoria_sugerida}</span></p>
                      <p className="text-xs text-gray-600 mt-2 bg-indigo-50 p-2 rounded border border-indigo-100"><span className="font-semibold text-indigo-800">Motivo:</span> {sug.motivo}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 pt-4 border-t border-gray-200 mt-auto">
              <button onClick={handleApplyAiSuggestions} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition w-full font-bold shadow-md">Aplicar Selecionados</button>
              <button onClick={() => setIsAiModalOpen(false)} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition w-full font-bold shadow-md">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}