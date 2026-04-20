"use client";
import { getConfiguracoes, setConfiguracoes } from '@/lib/storeDb';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export default function Configuracoes() {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [categoriasGastos, setCategoriasGastos] = useState([]);
  const [categoriasRendas, setCategoriasRendas] = useState([]);

  const [novoGasto, setNovoGasto] = useState('');
  const [novaRenda, setNovaRenda] = useState('');

  // Google Drive Sync Config
  const [googleDriveClientId, setGoogleDriveClientId] = useState('');
  const [googleDriveApiKey, setGoogleDriveApiKey] = useState('');
  const [googleDriveSyncEnabled, setGoogleDriveSyncEnabled] = useState(false);

  const fileInputRef = useRef(null);

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

      setGoogleDriveClientId(config.googleDriveClientId || '');
      setGoogleDriveApiKey(config.googleDriveApiKey || '');
      setGoogleDriveSyncEnabled(!!config.googleDriveSyncEnabled);
    };
    loadData();
  }, []);

  const handleSave = async () => {
    const config = {
      geminiApiKey,
      categoriasGastos,
      categoriasRendas,
      googleDriveClientId,
      googleDriveApiKey,
      googleDriveSyncEnabled
    };
    await setConfiguracoes(config);
    alert('Configurações salvas com sucesso!');
  };

  const handleExport = () => {
    const config = { geminiApiKey, categoriasGastos, categoriasRendas };
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
        alert('Configurações importadas com sucesso! Não se esqueça de salvá-las.');
      } catch (error) {
        console.error('[Configuracoes] Erro ao ler e fazer o parse do JSON importado:', error);
        alert('Erro ao importar o arquivo JSON. Verifique o formato do arquivo.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-blue-600">Configurações</h1>

      {/* Card: Gerenciamento de Pessoas (Link) */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-3xl border-l-4 border-blue-600">
        <h2 className="text-xl font-semibold mb-2">Pessoas e Perfis</h2>
        <p className="text-gray-600 mb-4 text-sm">Gerencie quem são os membros da sua casa ou empresa para atribuição de gastos.</p>
        <Link href="/usuarios" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition font-bold">
          <span>👥</span> Gerenciar Pessoas
        </Link>
      </div>

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

      {/* Card: Categorias (Link) */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-3xl border-l-4 border-indigo-600">
        <h2 className="text-xl font-semibold mb-2">Categorias</h2>
        <p className="text-gray-600 mb-4 text-sm">Gerencie suas categorias de gastos e rendas para organizar melhor suas transações.</p>
        <Link href="/categorias" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-500/20">
          <span>🗂️</span> Gerenciar Categorias
        </Link>
      </div>

      {/* Card: Sincronismo Google Drive */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-3xl border-l-4 border-green-600">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>☁️</span> Sincronismo com Google Drive
        </h2>
        
        <div className="flex items-center gap-2 mb-6">
          <input 
            type="checkbox" 
            id="syncEnabled" 
            checked={googleDriveSyncEnabled} 
            onChange={(e) => setGoogleDriveSyncEnabled(e.target.checked)}
            className="w-4 h-4 text-green-600"
          />
          <label htmlFor="syncEnabled" className="text-sm font-medium text-gray-700">Habilitar Sincronismo Automático</label>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Client ID</label>
            <input
              type="text"
              value={googleDriveClientId}
              onChange={(e) => setGoogleDriveClientId(e.target.value)}
              placeholder="Ex: 123456789-abc.apps.googleusercontent.com"
              className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Google API Key</label>
            <input
              type="password"
              value={googleDriveApiKey}
              onChange={(e) => setGoogleDriveApiKey(e.target.value)}
              placeholder="Insira sua API Key do Google Cloud"
              className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          O sincronismo permite salvar seu banco de dados (SQLite) diretamente no seu Google Drive. 
          Isso garante que seus dados estejam seguros e acessíveis em outros dispositivos.
        </p>
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