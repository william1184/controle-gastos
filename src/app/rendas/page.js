"use client";
import GenerativeLanguageApi from '@/lib/generative_ai_api';
import { useBackgroundTask } from '@/providers/BackgroundTaskProvider';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Rendas() {
  const [rendas, setRendas] = useState([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const { runTask, isTaskRunning } = useBackgroundTask();
  const loadingAi = isTaskRunning('ai-categorias-rendas');

  useEffect(() => {
    const storedRendas = JSON.parse(localStorage.getItem('rendas')) || [];
    setRendas(storedRendas);
  }, []);

  const handleDelete = (index) => {
    const updatedRendas = [...rendas];
    updatedRendas.splice(index, 1);
    setRendas(updatedRendas);
    localStorage.setItem('rendas', JSON.stringify(updatedRendas));
  };

  const handleSuggestCategories = async () => {
    if (rendas.length === 0) return alert('Nenhuma renda cadastrada para analisar.');

    try {
      const config = JSON.parse(localStorage.getItem('configuracoes')) || {};
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

  const handleApplyAiSuggestions = () => {
    setRendas((prevRendas) => {
      const updatedRendas = [...prevRendas];
      aiSuggestions.forEach(sug => {
        if (sug.accepted && updatedRendas[sug.index]) {
          updatedRendas[sug.index].categoria = sug.categoria_sugerida;
        }
      });
      localStorage.setItem('rendas', JSON.stringify(updatedRendas));
      return updatedRendas;
    });
    setIsAiModalOpen(false);
    setAiSuggestions([]);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-green-600">Lista de Rendas</h1>
      <div className="flex flex-wrap gap-4 mb-4">
        <Link
          href="/rendas/nova"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Adicionar Renda
        </Link>
        <button
          onClick={handleSuggestCategories}
          disabled={loadingAi}
          className={`text-white px-4 py-2 rounded transition ${loadingAi ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {loadingAi ? 'Analisando...' : 'Corrigir Categorias (IA)'}
        </button>
      </div>
      <table className="w-full border-collapse border border-gray-300 bg-white shadow-sm">
        <thead>
          <tr className="bg-gray-200 text-gray-700">
            <th className="border border-gray-300 p-2">Data</th>
            <th className="border border-gray-300 p-2">Descrição</th>
            <th className="border border-gray-300 p-2">Categoria</th>
            <th className="border border-gray-300 p-2">Valor (R$)</th>
            <th className="border border-gray-300 p-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rendas.map((renda, index) => (
            <tr key={index}>
              <td className="border border-gray-300 p-2 text-center">{renda.data}</td>
              <td className="border border-gray-300 p-2">{renda.descricao || '-'}</td>
              <td className="border border-gray-300 p-2 text-center">{renda.categoria || '-'}</td>
              <td className="border border-gray-300 p-2 text-center text-green-700 font-bold">R$ {parseFloat(renda.valor).toFixed(2)}</td>
              <td className="border border-gray-300 p-2 text-center">
                <div className="flex justify-center gap-2">
                  <Link
                    href={`/rendas/editar/${index}`}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(index)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {rendas.length === 0 && (
            <tr>
              <td colSpan="5" className="border border-gray-300 p-4 text-center text-gray-500">
                Nenhuma renda cadastrada até o momento.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
            <h2 className="text-xl font-bold mb-2">Sugestões Inteligentes de Categoria (Rendas)</h2>
            <p className="text-sm text-gray-600 mb-4">A IA analisou suas rendas e sugeriu as seguintes correções. Selecione quais deseja aplicar.</p>
            <div className="space-y-4 mb-6 overflow-y-auto pr-2">
              {aiSuggestions.map((sug, i) => {
                const rendaOriginal = rendas[sug.index];
                if (!rendaOriginal) return null;
                return (
                  <div key={i} className="flex items-start gap-4 p-3 border rounded bg-gray-50">
                    <input
                      type="checkbox"
                      checked={sug.accepted}
                      onChange={() => toggleSuggestion(i)}
                      className="mt-1 w-5 h-5 cursor-pointer accent-indigo-600"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{rendaOriginal.descricao || 'Sem descrição'} <span className="text-gray-500 font-normal text-sm">({rendaOriginal.data})</span></p>
                      <p className="text-sm mt-1">De: <span className="line-through text-red-500">{rendaOriginal.categoria || 'Nenhuma'}</span> Para: <span className="font-bold text-green-600">{sug.categoria_sugerida}</span></p>
                      <p className="text-xs text-gray-600 mt-2 bg-indigo-50 p-2 rounded border border-indigo-100"><span className="font-semibold text-indigo-800">Motivo:</span> {sug.motivo}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 pt-4 border-t border-gray-200 mt-auto">
              <button onClick={handleApplyAiSuggestions} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition w-full font-medium">Aplicar Selecionados</button>
              <button onClick={() => setIsAiModalOpen(false)} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition w-full font-medium">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}