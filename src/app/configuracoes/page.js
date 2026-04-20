"use client";
import { getConfiguracoes, setConfiguracoes } from '@/lib/storeDb';
import { useEffect, useRef, useState } from 'react';

export default function Configuracoes() {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [categoriasGastos, setCategoriasGastos] = useState([]);
  const [categoriasRendas, setCategoriasRendas] = useState([]);
  const [perfis, setPerfis] = useState([]);

  const [novoGasto, setNovoGasto] = useState('');
  const [novaRenda, setNovaRenda] = useState('');
  const fileInputRef = useRef(null);

  const [novoPerfilNome, setNovoPerfilNome] = useState('');
  const [novoPerfilRenda, setNovoPerfilRenda] = useState('');
  const [novoPerfilDataNasc, setNovoPerfilDataNasc] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const config = await getConfiguracoes();
      
      setGeminiApiKey(config.geminiApiKey || '');
      
      let catGastos = config.categoriasGastos || ['Moradia', 'Contas', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Investimentos', 'Outros'];
      if (catGastos.length > 0 && typeof catGastos[0] === 'object') {
        catGastos = catGastos.map(c => c.nome);
      }
      setCategoriasGastos(catGastos);
      setCategoriasRendas(config.categoriasRendas || ['Salário', 'Freelance', 'Investimentos', 'Rendimentos', 'Outros']);
      
      let loadedPerfis = config.perfis || [];
      if (loadedPerfis.length === 0) {
        loadedPerfis = [{ id: 0, nome: 'Perfil Padrão', renda: 1200, dataNascimento: '1992-04-27' }];
      } else {
        loadedPerfis = loadedPerfis.map((p, i) => ({ ...p, id: p.id !== undefined ? p.id : i }));
      }
      setPerfis(loadedPerfis);
    };
    loadData();
  }, []);

  const handleSave = async () => {
    const config = { geminiApiKey, categoriasGastos, categoriasRendas, perfis };
    await setConfiguracoes(config);
    alert('Configurações salvas com sucesso!');
  };

  const handleExport = () => {
    const config = { geminiApiKey, categoriasGastos, categoriasRendas, perfis };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'configuracoes.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target.result);
        if (config.geminiApiKey !== undefined) setGeminiApiKey(config.geminiApiKey);
        if (config.categoriasGastos) {
          let importedCats = config.categoriasGastos;
          if (importedCats.length > 0 && typeof importedCats[0] === 'object') {
            importedCats = importedCats.map(c => c.nome);
          }
          setCategoriasGastos(importedCats);
        }
        if (config.categoriasRendas) setCategoriasRendas(config.categoriasRendas);
        if (config.perfis) {
          let importedPerfis = config.perfis;
          if (importedPerfis.length === 0) {
            importedPerfis = [{ id: 0, nome: 'Perfil Padrão', renda: 1200, dataNascimento: '1992-04-27' }];
          } else {
            importedPerfis = importedPerfis.map((p, idx) => ({ ...p, id: p.id !== undefined ? p.id : idx }));
          }
          setPerfis(importedPerfis);
        }
        alert('Configurações importadas com sucesso! Não se esqueça de salvá-las.');
      } catch (error) {
        console.error('[Configuracoes] Erro ao ler e fazer o parse do JSON importado:', error);
        alert('Erro ao importar o arquivo JSON. Verifique o formato do arquivo.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reseta o input para permitir selecionar o mesmo arquivo futuramente
  };

  const addItem = (item, list, setList, setInput) => {
    if (item && !list.includes(item)) {
      setList([...list, item]);
      setInput('');
    }
  };

  const removeItem = (item, list, setList) => {
    setList(list.filter(i => i !== item));
  };

  const addItemGasto = () => {
    if (novoGasto && !categoriasGastos.includes(novoGasto)) {
      setCategoriasGastos([...categoriasGastos, novoGasto]);
      setNovoGasto('');
    }
  };

  const removeItemGasto = (itemNome) => {
    setCategoriasGastos(categoriasGastos.filter(i => i !== itemNome));
  };

  const handleAddPerfil = () => {
    if (novoPerfilNome && novoPerfilRenda && novoPerfilDataNasc) {
      const newId = perfis.length > 0 ? Math.max(...perfis.map(p => p.id)) + 1 : 0;
      setPerfis([...perfis, { id: newId, nome: novoPerfilNome, renda: parseFloat(novoPerfilRenda), dataNascimento: novoPerfilDataNasc }]);
      setNovoPerfilNome('');
      setNovoPerfilRenda('');
      setNovoPerfilDataNasc('');
    } else {
      alert('Preencha nome, renda e data de nascimento para adicionar um perfil.');
    }
  };

  const handleRemovePerfil = (id) => {
    if (perfis.length <= 1) {
      alert('É obrigatório ter pelo menos um perfil cadastrado.');
      return;
    }
    setPerfis(perfis.filter(p => p.id !== id));
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-blue-600">Configurações</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-3xl">
        <h2 className="text-xl font-semibold mb-4">Chave de API Gemini</h2>
        <input
          type="password"
          value={geminiApiKey}
          onChange={(e) => setGeminiApiKey(e.target.value)}
          placeholder="Insira sua Google Gemini API Key customizada"
          className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-sm text-gray-500 mt-2">Deixe em branco para usar a chave padrão do servidor (se configurada).</p>
      </div>

      {/* Card: Categorias de Gastos */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-3xl">
        <h2 className="text-xl font-semibold mb-4">Categorias de Gastos (Enviadas para IA)</h2>
        <div className="flex gap-2 mb-4">
          <input type="text" value={novoGasto} onChange={(e) => setNovoGasto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItemGasto()} placeholder="Nova categoria de gasto" className="flex-grow p-2 border border-gray-300 rounded" />
          <button onClick={addItemGasto} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Adicionar</button>
        </div>
        <ul className="flex flex-wrap gap-2">
          {categoriasGastos.map(cat => (
            <li key={cat} className="bg-gray-200 px-3 py-1 rounded-full flex items-center gap-2">
              {cat}
              <button onClick={() => removeItemGasto(cat)} className="text-red-500 font-bold hover:text-red-700">&times;</button>
            </li>
          ))}
        </ul>
      </div>

      {/* Card: Categorias de Rendas */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-3xl">
        <h2 className="text-xl font-semibold mb-4">Categorias de Rendas</h2>
        <div className="flex gap-2 mb-4">
          <input type="text" value={novaRenda} onChange={(e) => setNovaRenda(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem(novaRenda, categoriasRendas, setCategoriasRendas, setNovaRenda)} placeholder="Nova categoria de renda" className="flex-grow p-2 border border-gray-300 rounded" />
          <button onClick={() => addItem(novaRenda, categoriasRendas, setCategoriasRendas, setNovaRenda)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Adicionar</button>
        </div>
        <ul className="flex flex-wrap gap-2">{categoriasRendas.map(cat => (<li key={cat} className="bg-gray-200 px-3 py-1 rounded-full flex items-center gap-2">{cat} <button onClick={() => removeItem(cat, categoriasRendas, setCategoriasRendas)} className="text-red-500 font-bold hover:text-red-700">&times;</button></li>))}</ul>
      </div>

      {/* Card: Perfis Familiares */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-3xl">
        <h2 className="text-xl font-semibold mb-4">Perfis da Casa (Considerados pela IA)</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <input type="text" value={novoPerfilNome} onChange={(e) => setNovoPerfilNome(e.target.value)} placeholder="Nome do perfil" className="flex-grow p-2 border border-gray-300 rounded" />
          <input type="number" step="0.01" min="0" value={novoPerfilRenda} onChange={(e) => setNovoPerfilRenda(e.target.value)} placeholder="Renda Base (R$)" className="w-40 p-2 border border-gray-300 rounded" />
          <input type="date" value={novoPerfilDataNasc} onChange={(e) => setNovoPerfilDataNasc(e.target.value)} title="Data de Nascimento" className="w-40 p-2 border border-gray-300 rounded bg-white" />
          <button onClick={handleAddPerfil} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Adicionar</button>
        </div>
        <ul className="flex flex-col gap-2">
          {perfis.map((p) => (
            <li key={p.id} className="bg-gray-100 p-3 rounded-lg flex justify-between items-center border border-gray-200">
              <div>
                <span className="font-bold text-gray-800">{p.nome}</span>
                <span className="text-sm text-gray-600 ml-3">ID: {p.id} | Nasc: {p.dataNascimento} | Renda: R$ {parseFloat(p.renda).toFixed(2)}</span>
              </div>
              <button onClick={() => handleRemovePerfil(p.id)} className="text-red-500 font-bold hover:text-red-700 bg-red-100 px-2 py-1 rounded">&times; Remover</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-4 max-w-3xl">
        <button onClick={handleSave} className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 transition">Salvar Configurações</button>
        <button onClick={handleExport} className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 transition">Exportar JSON</button>
        <button onClick={() => fileInputRef.current.click()} className="bg-yellow-600 text-white px-6 py-2 rounded hover:bg-yellow-700 transition">Importar JSON</button>
        <input type="file" accept=".json" onChange={handleImport} ref={fileInputRef} className="hidden" />
      </div>
    </div>
  );
}