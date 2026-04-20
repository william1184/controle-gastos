"use client";
import { addGasto, clearGastos, deleteGasto, getGastos, updateGasto } from '@/lib/gastosDb';
import { getContas } from '@/lib/contaDb';
import GenerativeLanguageApi from '@/lib/generative_ai_api';
import { getConfiguracoes } from '@/lib/storeDb';
import { useBackgroundTask } from '@/providers/BackgroundTaskProvider';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [gastos, setGastos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [categoriasGastos, setCategoriasGastos] = useState([]);
  const [contas, setContas] = useState([]);
  const [filters, setFilters] = useState({
    categoria: '',
    accountId: '',
    startDate: '',
    endDate: '',
    tipoCusto: ''
  });
  
  const { runTask, isTaskRunning } = useBackgroundTask();
  const loadingAi = isTaskRunning('ai-categorias-gastos');

  const loadData = async () => {
    const loadedGastos = await getGastos(filters);
    setGastos(loadedGastos);

    const config = await getConfiguracoes();
    let catGastos = config.categoriasGastos || [];
    if (catGastos.length > 0 && typeof catGastos[0] === 'object') {
      catGastos = catGastos.map(c => c.nome);
    }
    setCategoriasGastos(catGastos);

    const loadedContas = await getContas();
    setContas(loadedContas);
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      categoria: '',
      accountId: '',
      startDate: '',
      endDate: '',
      tipoCusto: ''
    });
  };

  const handleDelete = async (index) => {
    const gastoToDelete = gastos[index];
    if (!gastoToDelete || !gastoToDelete.id) {
      console.error('Gasto ID not found for deletion:', gastoToDelete);
      return;
    }
    try {
      await deleteGasto(gastoToDelete.id);
      const updatedGastos = gastos.filter((_, i) => i !== index);
      setGastos(updatedGastos);
      alert('Gasto excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir gasto do DB:', error);
      alert('Erro ao excluir gasto.');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    try {
      const config = await getConfiguracoes();
      const apiKey = config.geminiApiKey || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

      if (!apiKey) {
        throw new Error('Chave de API do Gemini não configurada. Defina na aba de Configurações.');
      }

      let catNames = [];
      if (config.categoriasGastos && config.categoriasGastos.length > 0) {
        catNames = typeof config.categoriasGastos[0] === 'string'
          ? config.categoriasGastos
          : config.categoriasGastos.map(c => c.nome);
      }

      const base64String = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(image);
      });

      setIsModalOpen(false);

      runTask(
        `upload-image-${Date.now()}`,
        'Processando cupom fiscal (IA)',
        async () => {
          const generativeApi = new GenerativeLanguageApi(apiKey);
          const data = await generativeApi.uploadImageGenerateContent(base64String, image.type, catNames);
          if (!data) throw new Error('Conteúdo inválido retornado pela IA');
          return data;
        },
        (data) => {
          const saveAiToDb = async (gasto) => {
            await addGasto({ ...gasto, tipoCusto: 'Variável' });
            loadData();
          };
          saveAiToDb(data);
        },
        (error) => {
          alert('Erro ao processar imagem: ' + error.message);
        }
      );
    } catch (error) {
      console.error('[Gastos] Erro ao processar a imagem e comunicar com a IA:', error);
      alert('Erro ao processar imagem: ' + error.message);
    }
  };

  const handleSuggestCategories = async () => {
    if (gastos.length === 0) return alert('Nenhum gasto cadastrado para analisar.');

    try {
      const config = await getConfiguracoes();
      const apiKey = config.geminiApiKey || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

      if (!apiKey) {
        throw new Error('Chave de API do Gemini não configurada. Defina na aba de Configurações.');
      }

      let catNames = [];
      if (config.categoriasGastos && config.categoriasGastos.length > 0) {
        catNames = typeof config.categoriasGastos[0] === 'string'
          ? config.categoriasGastos
          : config.categoriasGastos.map(c => c.nome);
      }

      runTask(
        'ai-categorias-gastos',
        'Analisando categorias de gastos (IA)',
        async () => {
          const generativeApi = new GenerativeLanguageApi(apiKey);
          return await generativeApi.suggestCategories(gastos, catNames);
        },
        (suggestions) => {
          if (suggestions && suggestions.length > 0) {
            setAiSuggestions(suggestions.map(s => ({ ...s, accepted: true })));
            setIsAiModalOpen(true);
          } else {
            alert('A IA não encontrou necessidades de alteração. Suas categorias parecem estar corretas!');
          }
        },
        (error) => alert('Erro ao obter sugestões da IA: ' + error.message)
      );
    } catch (error) {
      console.error('[Gastos] Erro ao obter sugestões de categorias da IA:', error);
      alert('Erro ao obter sugestões da IA: ' + error.message);
    }
  };

  const toggleSuggestion = (index) => {
    const updated = [...aiSuggestions];
    updated[index].accepted = !updated[index].accepted;
    setAiSuggestions(updated);
  };

  const handleApplyAiSuggestions = async () => {
    for (const sug of aiSuggestions) {
      if (sug.accepted && gastos[sug.index]) {
        const updatedGasto = { ...gastos[sug.index], categoria: sug.categoria_sugerida };
        await updateGasto(updatedGasto.id, updatedGasto);
      }
    }
    loadData();
    setIsAiModalOpen(false);
    setAiSuggestions([]);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-600">Lista de Gastos</h1>
        <div className="flex gap-4">
          <Link
            href="/gastos/nova"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition font-medium shadow-sm"
          >
            + Adicionar Gasto
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition font-medium shadow-sm"
          >
            📸 Scan de NF
          </button>
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
            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">Todas</option>
            {categoriasGastos.map((cat, i) => (
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
            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">Todas</option>
            {contas.map((conta) => (
              <option key={conta.id} value={conta.id}>{conta.nome}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tipo</label>
          <select
            name="tipoCusto"
            value={filters.tipoCusto}
            onChange={handleFilterChange}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">Todos</option>
            <option value="Variável">Variável</option>
            <option value="Fixo">Fixo</option>
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Início</label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fim</label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={clearFilters}
          className="px-4 py-2 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition text-sm font-bold h-[38px]"
        >
          Limpar
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Data</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Apelido</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Categoria</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Conta</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Tipo</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Total</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {gastos.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500 italic bg-gray-50">
                  Nenhum gasto cadastrado com estes filtros.
                </td>
              </tr>
            ) : (
              gastos.map((gasto, index) => (
                <tr key={index} className="hover:bg-blue-50 transition-colors">
                  <td className="p-4 text-sm text-gray-600">{gasto.data}</td>
                  <td className="p-4 text-sm font-bold text-gray-800">{gasto.apelido || 'Sem Apelido'}</td>
                  <td className="p-4">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase">{gasto.categoria || '-'}</span>
                  </td>
                  <td className="p-4 text-sm text-gray-600 font-medium">{gasto.contaNome}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${gasto.tipoCusto === 'Fixo' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {gasto.tipoCusto}
                    </span>
                  </td>
                  <td className="p-4 text-right font-black text-gray-800">R$ {gasto.total.toFixed(2)}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <Link
                        href={`/gastos/editar/${gasto.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded transition"
                        title="Editar"
                      >
                        ✏️
                      </Link>
                      <Link
                        href={`/gastos/${gasto.id}`}
                        className="p-2 text-emerald-600 hover:bg-emerald-100 rounded transition"
                        title="Detalhes"
                      >
                        🔍
                      </Link>
                      <button
                        onClick={() => handleDelete(index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded transition"
                        title="Excluir"
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-96 border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Carregar Nota Fiscal</h2>
            <form onSubmit={handleUpload}>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 mb-6 text-center hover:border-purple-400 transition-colors cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files[0])}
                  className="hidden"
                  id="nf-upload"
                />
                <label htmlFor="nf-upload" className="cursor-pointer">
                  <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📸</div>
                  <span className="text-sm font-bold text-gray-500">{image ? image.name : 'Selecionar imagem'}</span>
                </label>
              </div>
              <button
                type="submit"
                className="w-full p-3 text-white rounded-xl bg-purple-600 hover:bg-purple-700 font-bold shadow-lg shadow-purple-100 transition-all"
              >
                Processar Agora
              </button>
            </form>
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 w-full p-3 text-gray-400 font-bold hover:text-gray-600 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Sugestões de Categoria (IA)</h2>
              <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Inteligência Artificial</span>
            </div>
            <p className="text-sm text-gray-600 mb-6 italic">Selecione as sugestões que deseja aplicar para organizar melhor seus gastos.</p>
            <div className="space-y-4 mb-6 overflow-y-auto pr-2 custom-scrollbar">
              {aiSuggestions.map((sug, i) => {
                const gastoOriginal = gastos[sug.index];
                if (!gastoOriginal) return null;
                return (
                  <div key={i} className="flex items-start gap-4 p-4 border rounded-xl bg-gray-50 hover:bg-indigo-50 transition-colors border-gray-200">
                    <input
                      type="checkbox"
                      checked={sug.accepted}
                      onChange={() => toggleSuggestion(i)}
                      className="mt-1 w-5 h-5 cursor-pointer accent-indigo-600"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <p className="font-bold text-gray-800">{gastoOriginal.apelido || 'Sem apelido'}</p>
                        <span className="text-xs text-gray-400">{gastoOriginal.data}</span>
                      </div>
                      <p className="text-sm mt-1">
                        De: <span className="line-through text-red-400">{gastoOriginal.categoria || 'Nenhuma'}</span> 
                        <span className="mx-2">➔</span>
                        Para: <span className="font-black text-emerald-600 uppercase">{sug.categoria_sugerida}</span>
                      </p>
                      <div className="text-xs text-gray-600 mt-3 bg-white p-3 rounded-lg border border-indigo-100">
                        <span className="font-bold text-indigo-800 uppercase text-[10px] block mb-1">Motivo da Sugestão:</span> 
                        {sug.motivo}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 pt-6 border-t border-gray-100 mt-auto">
              <button onClick={handleApplyAiSuggestions} className="bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition w-full font-bold shadow-lg shadow-emerald-100">Aplicar Sugestões</button>
              <button onClick={() => setIsAiModalOpen(false)} className="bg-gray-100 text-gray-500 px-6 py-3 rounded-xl hover:bg-gray-200 transition w-full font-bold">Descartar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}