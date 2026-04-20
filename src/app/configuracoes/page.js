"use client";
import { getConfiguracoes, setConfiguracoes } from '@/lib/storeDb';
import { getActiveEntidade, updateEntidade } from '@/lib/entidadeDb';
import { syncDatabase } from '@/lib/googleDriveSync';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import packageJson from '../../../package.json';

export default function Configuracoes() {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [categoriasGastos, setCategoriasGastos] = useState([]);
  const [categoriasRendas, setCategoriasRendas] = useState([]);

  const [novoGasto, setNovoGasto] = useState('');
  const [novaRenda, setNovaRenda] = useState('');

  // 13.1 Geral
  const [entidadeId, setEntidadeId] = useState(null);
  const [entidadeNome, setEntidadeNome] = useState('');
  const [entidadeTipo, setEntidadeTipo] = useState('Pessoal');

  // 13.2 Preferências
  const [moeda, setMoeda] = useState('R$');
  const [formatoData, setFormatoData] = useState('DD/MM/YYYY');

  // 13.3 Labels
  const [labels, setLabels] = useState({ gasto: 'Gasto', renda: 'Renda', conta: 'Conta' });

  // 13.4 Integrações
  const [googleDriveClientId, setGoogleDriveClientId] = useState('');
  const [googleDriveApiKey, setGoogleDriveApiKey] = useState('');
  const [googleDriveSyncEnabled, setGoogleDriveSyncEnabled] = useState(false);
  const [oneDriveClientId, setOneDriveClientId] = useState('');

  // 13.5 Backup & Sync
  const [syncStatus, setSyncStatus] = useState('Pronto');

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
      setOneDriveClientId(config.oneDriveClientId || '');

      setMoeda(config.moeda || 'R$');
      setFormatoData(config.formatoData || 'DD/MM/YYYY');
      if (config.labels) setLabels(config.labels);

      // Load active entity
      const entity = await getActiveEntidade();
      if (entity) {
        setEntidadeId(entity.id);
        setEntidadeNome(entity.nome || '');
        setEntidadeTipo(entity.is_contexto_pessoal ? 'Pessoal' : 'Empresarial');
      }
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
      googleDriveSyncEnabled,
      oneDriveClientId,
      moeda,
      formatoData,
      labels
    };
    await setConfiguracoes(config);

    if (entidadeId) {
      await updateEntidade(entidadeId, {
        nome: entidadeNome,
        is_contexto_pessoal: entidadeTipo === 'Pessoal'
      });
    }

    alert('Configurações salvas com sucesso!');
  };

  const handleManualSync = async () => {
    setSyncStatus('Sincronizando...');
    try {
      const msg = await syncDatabase();
      setSyncStatus('Sincronizado: ' + new Date().toLocaleTimeString());
      alert(msg);
    } catch (err) {
      console.error(err);
      setSyncStatus('Erro na sincronização');
      alert('Erro ao sincronizar: ' + err.message);
    }
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

      {/* 13.1 Geral */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-3xl border-l-4 border-blue-600">
        <h2 className="text-xl font-semibold mb-4">13.1 Geral</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da entidade</label>
            <input
              type="text"
              value={entidadeNome}
              onChange={(e) => setEntidadeNome(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={entidadeTipo}
              onChange={(e) => setEntidadeTipo(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Pessoal">Pessoal</option>
              <option value="Empresarial">Empresarial</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <Link href="/usuarios" className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm font-medium">
            <span>👥</span> Gerenciar Usuários
          </Link>
        </div>
      </div>

      {/* 13.2 Preferências */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-3xl border-l-4 border-purple-600">
        <h2 className="text-xl font-semibold mb-4">13.2 Preferências</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Moeda</label>
            <input
              type="text"
              value={moeda}
              onChange={(e) => setMoeda(e.target.value)}
              placeholder="Ex: R$, US$"
              className="w-full p-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Formato de data</label>
            <select
              value={formatoData}
              onChange={(e) => setFormatoData(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </div>

      {/* 13.3 Labels (avançado) */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-3xl border-l-4 border-orange-500">
        <h2 className="text-xl font-semibold mb-4">13.3 Labels (avançado)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Termo para Gasto</label>
            <input
              type="text"
              value={labels.gasto}
              onChange={(e) => setLabels({ ...labels, gasto: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Termo para Renda</label>
            <input
              type="text"
              value={labels.renda}
              onChange={(e) => setLabels({ ...labels, renda: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Termo para Conta</label>
            <input
              type="text"
              value={labels.conta}
              onChange={(e) => setLabels({ ...labels, conta: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded focus:ring-orange-500"
            />
          </div>
        </div>
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
        <p className="text-sm text-gray-500 mt-2">Usada para categorização automática e insights com IA.</p>
      </div>

      {/* Card: Categorias (Link) */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-3xl border-l-4 border-indigo-600">
        <h2 className="text-xl font-semibold mb-2">Categorias</h2>
        <p className="text-gray-600 mb-4 text-sm">Gerencie suas categorias de gastos e rendas para organizar melhor suas transações.</p>
        <Link href="/categorias" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-500/20">
          <span>🗂️</span> Gerenciar Categorias
        </Link>
      </div>

      {/* 13.4 Integrações */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-3xl border-l-4 border-green-600">
        <h2 className="text-xl font-semibold mb-4">13.4 Integrações</h2>
        
        <div className="mb-6">
          <h3 className="font-medium text-green-700 mb-2 flex items-center gap-2">
            <span>☁️</span> Google Drive
          </h3>
          <div className="flex items-center gap-2 mb-4">
            <input 
              type="checkbox" 
              id="syncEnabled" 
              checked={googleDriveSyncEnabled} 
              onChange={(e) => setGoogleDriveSyncEnabled(e.target.checked)}
              className="w-4 h-4 text-green-600"
            />
            <label htmlFor="syncEnabled" className="text-sm font-medium text-gray-700">Habilitar Sincronismo Automático</label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Client ID</label>
              <input
                type="text"
                value={googleDriveClientId}
                onChange={(e) => setGoogleDriveClientId(e.target.value)}
                placeholder="Ex: 123...apps.googleusercontent.com"
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
        </div>

        <div className="pt-4 border-t border-gray-100">
          <h3 className="font-medium text-blue-700 mb-2 flex items-center gap-2">
            <span>🟦</span> OneDrive (Microsoft)
          </h3>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client ID / Application ID</label>
          <input
            type="text"
            value={oneDriveClientId}
            onChange={(e) => setOneDriveClientId(e.target.value)}
            placeholder="Em breve..."
            className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500"
            disabled
          />
          <p className="text-xs text-gray-500 mt-1 italic">Integração com OneDrive está em desenvolvimento.</p>
        </div>
      </div>

      {/* 13.5 Backup & Sync */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-3xl border-l-4 border-yellow-500">
        <h2 className="text-xl font-semibold mb-4">13.5 Backup & Sync</h2>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <button 
            onClick={handleManualSync}
            className="bg-yellow-500 text-white px-6 py-2 rounded-lg hover:bg-yellow-600 transition font-bold shadow-md w-full md:w-auto"
          >
            Sincronização Manual
          </button>
          <div className="text-sm">
            <span className="font-medium text-gray-700">Status: </span>
            <span className={`font-bold ${syncStatus.includes('Erro') ? 'text-red-600' : 'text-green-600'}`}>
              {syncStatus}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          A sincronização manual força o upload imediato do seu banco de dados para o provedor configurado.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 max-w-3xl mb-8">
        <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition font-bold shadow-lg">Salvar Configurações</button>
        <button onClick={handleExport} className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition font-medium border border-gray-300">Exportar JSON</button>
        <button onClick={() => fileInputRef.current.click()} className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition font-medium border border-gray-300">Importar JSON</button>
        <input type="file" accept=".json" onChange={handleImport} ref={fileInputRef} className="hidden" />
      </div>

      <div className="max-w-3xl text-center text-gray-400 text-sm mt-12 pb-8">
        <p>Meu Mercado AI - Versão {packageJson.version}</p>
      </div>
    </div>
  );
}