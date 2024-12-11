"use client";
import GenerativeLanguageApi from '@/lib/generative_ai_api';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [gastos, setGastos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedGastos = JSON.parse(localStorage.getItem('gastos')) || [];
    setGastos(storedGastos);
  }, []);

  const handleDelete = (index) => {
    const updatedGastos = [...gastos];
    updatedGastos.splice(index, 1);
    setGastos(updatedGastos);
    localStorage.setItem('gastos', JSON.stringify(updatedGastos));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const config = JSON.parse(localStorage.getItem('configuracoes')) || {};
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

      // Chama a API do Gemini diretamente pelo navegador
      const generativeApi = new GenerativeLanguageApi(apiKey);
      const data = await generativeApi.uploadImageGenerateContent(base64String, image.type, catNames);

      if (data) {
        const updatedGastos = [...gastos, data];
        setGastos(updatedGastos);
        localStorage.setItem('gastos', JSON.stringify(updatedGastos));
        return
      }
      throw Error('Contrato invalido')
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao processar imagem: ' + error.message);
    } finally {
      setLoading(false);
      setIsModalOpen(false);
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

  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!window.confirm('A importação irá substituir a base de gastos atual. Deseja continuar?')) {
      event.target.value = ''; // Reseta o input para permitir nova seleção do mesmo arquivo
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
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

      setGastos(importedGastos);
      localStorage.setItem('gastos', JSON.stringify(importedGastos));
      alert('Base importada com sucesso!');
      event.target.value = ''; // Limpa o input
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
          onClick={handleExportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Exportar CSV
        </button>
        <label className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition cursor-pointer">
          Importar CSV
          <input
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
        </label>
      </div>
      <table className="w-full border-collapse border border-gray-300 bg-white">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 p-2">Data</th>
            <th className="border border-gray-300 p-2">Apelido</th>
            <th className="border border-gray-300 p-2">Categoria</th>
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
              <td className="border border-gray-300 p-2">R$ {gasto.total.toFixed(2)}</td>
              <td className="border border-gray-300 p-2">
                <div className="flex gap-2">
                  <Link
                    href={`/gastos/editar/${index}`}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                  >
                    Editar
                  </Link>
                  <Link
                    href={`/gastos/${index}`}
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
                disabled={loading}
                className={`w-full p-2 text-white rounded ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                  }`}
              >
                {loading ? 'Processando...' : 'Enviar'}
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
    </div>
  );
}