"use client";
import { addGasto, clearGastos, deleteGasto, getGastos, updateGasto } from '@/lib/gastosDb';
import { getConfiguracoes } from '@/lib/storeDb';
import GenerativeLanguageApi from '@/lib/generative_ai_api';
import { useBackgroundTask } from '@/providers/BackgroundTaskProvider';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [gastos, setGastos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [categoriasGastos, setCategoriasGastos] = useState([]); // This would also likely come from DB
  const { runTask, isTaskRunning } = useBackgroundTask();
  const loadingAi = isTaskRunning('ai-categorias-gastos');

  useEffect(() => {
    const loadData = async () => {
      const loadedGastos = await getGastos();
      setGastos(loadedGastos);

      const config = await getConfiguracoes();
      let catGastos = config.categoriasGastos || [];
      if (catGastos.length > 0 && typeof catGastos[0] === 'object') {
        catGastos = catGastos.map(c => c.nome);
      }
      setCategoriasGastos(catGastos);
    };
    loadData();
  }, []);

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

      // Lê o arquivo no navegador como Base64
      const base64String = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(image);
      });

      setIsModalOpen(false); // Fecha o modal imediatamente

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
            const loadedGastos = await getGastos();
            setGastos(loadedGastos);
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

  const handleExportCSV = () => {
    if (gastos.length === 0) {
      return alert('Nenhum dado para exportar.');
    }

    let csvContent = "ID Gasto,Data,Apelido,Categoria,Total Gasto,Nome do Produto,Codigo do Produto,Quantidade,Unidade,Preco Unitario,Preco Total\n";

    gastos.forEach((gasto, index) => {
      if (!gasto.produtos || gasto.produtos.length === 0) {
        const row = [index, gasto.data, gasto.apelido || '', gasto.categoria || '', gasto.total, '', '', '', '', '', ''];
        csvContent += row.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',') + "\n";
      } else {
        gasto.produtos.forEach(produto => {
          const row = [
            index,
            gasto.data,
            gasto.apelido || '',
            gasto.categoria || '',
            gasto.total,
            produto.nome || '',
            produto.codigo || '',
            produto.quantidade || 0,
            produto.unidade || '',
            produto.preco_unitario || 0,
            produto.preco_total || 0
          ];
          csvContent += row.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',') + "\n";
        });
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'gastos_base.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    const updatedGastos = [...gastos];
    for (const sug of aiSuggestions) {
      if (sug.accepted && updatedGastos[sug.index]) {
        updatedGastos[sug.index].categoria = sug.categoria_sugerida;
        await updateGasto(updatedGastos[sug.index].id, updatedGastos[sug.index]);
      }
    }
    setGastos(updatedGastos);
    setIsAiModalOpen(false);
    setAiSuggestions([]);
  };

  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!window.confirm('A importação irá substituir a base de gastos atual. Deseja continuar?')) {
      event.target.value = ''; // Reseta o input para permitir nova seleção do mesmo arquivo
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length <= 1) return alert('O arquivo CSV parece estar vazio ou não possui dados válidos.');

        const importedGastos = [];
        let currentGastoId = null;
        let currentGasto = null;

        // Função auxiliar para interpretar a linha CSV corretamente ignorando vírgulas entre aspas
        const parseLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && line[i + 1] === '"') {
              current += '"';
              i++;
            } else if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current);
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current);
          return result;
        };

        for (let i = 1; i < lines.length; i++) {
          const cols = parseLine(lines[i]);
          if (cols.length < 10) continue;

          let idStr, data, apelido, categoria, totalStr, pNome, pCodigo, pQtdStr, pUnidade, pPrecoUniStr, pPrecoTotStr;
          if (cols.length === 10) {
            [idStr, data, apelido, totalStr, pNome, pCodigo, pQtdStr, pUnidade, pPrecoUniStr, pPrecoTotStr] = cols;
            categoria = '';
          } else {
            [idStr, data, apelido, categoria, totalStr, pNome, pCodigo, pQtdStr, pUnidade, pPrecoUniStr, pPrecoTotStr] = cols;
          }

          const id = parseInt(idStr, 10);

          if (id !== currentGastoId) {
            currentGastoId = id;
            currentGasto = {
              data: data,
              apelido: apelido,
              categoria: categoria,
              total: parseFloat(totalStr) || 0,
              produtos: []
            };
            importedGastos.push(currentGasto);
          }

          if (pNome || pCodigo) {
            currentGasto.produtos.push({
              nome: pNome,
              codigo: pCodigo,
              quantidade: parseFloat(pQtdStr) || 0,
              unidade: pUnidade,
              preco_unitario: parseFloat(pPrecoUniStr) || 0,
              preco_total: parseFloat(pPrecoTotStr) || 0
            });
          }
        }

        await clearGastos();
        for (const g of importedGastos) {
          await addGasto(g);
        }
        const finalGastos = await getGastos();
        setGastos(finalGastos);
        
        alert('Base importada com sucesso!');
        event.target.value = ''; // Limpa o input
      } catch (error) {
        console.error('[Gastos] Falha não tratada ao importar CSV:', error);
        alert('Ocorreu um erro ao processar o arquivo CSV. Verifique o formato.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-blue-600">Lista de Gastos</h1>
      <div className="flex flex-wrap gap-4 mb-4">
        <Link
          href="/gastos/nova"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Adicionar Gasto
        </Link>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
        >
          Carregar Nota via Imagem
        </button>
        <button
          onClick={handleSuggestCategories}
          disabled={loadingAi}
          className={`text-white px-4 py-2 rounded transition ${loadingAi ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {loadingAi ? 'Analisando...' : 'Corrigir Categorias (IA)'}
        </button>
      </div>
      <table className="w-full border-collapse border border-gray-300 bg-white">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 p-2">Data</th>
            <th className="border border-gray-300 p-2">Apelido</th>
            <th className="border border-gray-300 p-2">Categoria</th>
            <th className="border border-gray-300 p-2">Tipo</th>
            <th className="border border-gray-300 p-2">Total</th>
            <th className="border border-gray-300 p-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {gastos.map((gasto, index) => (
            <tr key={index}>
              <td className="border border-gray-300 p-2">{gasto.data}</td>
              <td className="border border-gray-300 p-2">{gasto.apelido || 'Sem Apelido'}</td>
              <td className="border border-gray-300 p-2">{gasto.categoria || '-'}</td>
              <td className="border border-gray-300 p-2 text-center">
                {(() => {
                  const tipo = gasto.tipoCusto || 'Variável';
                  return (
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${tipo === 'Fixo' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{tipo}</span>
                  );
                })()}
              </td>
              <td className="border border-gray-300 p-2">R$ {gasto.total.toFixed(2)}</td>
              <td className="border border-gray-300 p-2">
                <div className="flex gap-2">
                  <Link
                    href={`/gastos/editar/${gasto.id}`}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                  >
                    Editar
                  </Link>
                  <Link
                    href={`/gastos/${gasto.id}`}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
                  >
                    Consultar
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
        </tbody>
      </table>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Carregar Nota Fiscal</h2>
            <form onSubmit={handleUpload}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0])}
                className="w-full p-2 border border-gray-300 rounded mb-4"
              />
              <button
                type="submit"
              className="w-full p-2 text-white rounded bg-purple-600 hover:bg-purple-700 font-medium"
              >
              Enviar para Processamento em 2º Plano
              </button>
            </form>
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 w-full p-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
            <h2 className="text-xl font-bold mb-2">Sugestões Inteligentes de Categoria</h2>
            <p className="text-sm text-gray-600 mb-4">A IA analisou seus gastos e sugeriu as seguintes correções. Selecione quais deseja aplicar.</p>
            <div className="space-y-4 mb-6 overflow-y-auto pr-2">
              {aiSuggestions.map((sug, i) => {
                const gastoOriginal = gastos[sug.index];
                if (!gastoOriginal) return null;
                return (
                  <div key={i} className="flex items-start gap-4 p-3 border rounded bg-gray-50">
                    <input
                      type="checkbox"
                      checked={sug.accepted}
                      onChange={() => toggleSuggestion(i)}
                      className="mt-1 w-5 h-5 cursor-pointer accent-indigo-600"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{gastoOriginal.apelido || 'Sem apelido'} <span className="text-gray-500 font-normal text-sm">({gastoOriginal.data})</span></p>
                      <p className="text-sm mt-1">De: <span className="line-through text-red-500">{gastoOriginal.categoria || 'Nenhuma'}</span> Para: <span className="font-bold text-green-600">{sug.categoria_sugerida}</span></p>
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