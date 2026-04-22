"use client";
import { getActiveEntidade, updateEntidade } from '@/lib/entidadeDb';
import { syncDatabase } from '@/lib/googleDriveSync';
import { getConfiguracoes, setConfiguracoes } from '@/lib/storeDb';
import { getConfig, setConfig, migrateLegacyConfigs } from '@/lib/configuracaoDb';
import { getActiveUsuario } from '@/lib/usuarioDb';
import { APP_VERSION } from '@/lib/constants';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export default function Configuracoes() {
  const [activeUser, setActiveUser] = useState(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [categoriasSaidas, setCategoriasSaidas] = useState([]);
  const [categoriasEntradas, setCategoriasEntradas] = useState([]);

  const [novoSaida, setNovoSaida] = useState('');
  const [novaEntrada, setNovaEntrada] = useState('');

  // 13.1 Geral
  const [entidadeId, setEntidadeId] = useState(null);
  const [entidadeNome, setEntidadeNome] = useState('');
  const [entidadeTipo, setEntidadeTipo] = useState('Pessoal');

  // 13.2 Preferências
  const [moeda, setMoeda] = useState('R$');
  const [formatoData, setFormatoData] = useState('DD/MM/YYYY');

  // 13.3 Labels
  const [labels, setLabels] = useState({ saida: 'Saida', entrada: 'Entrada', conta: 'Conta' });

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
      await migrateLegacyConfigs(); // Migration check
      
      const user = await getActiveUsuario();
      setActiveUser(user);

      // Global Settings
      setGeminiApiKey(await getConfig('geminiApiKey') || '');
      setGoogleDriveClientId(await getConfig('googleDriveClientId') || '');
      setGoogleDriveApiKey(await getConfig('googleDriveApiKey') || '');
      setGoogleDriveSyncEnabled(!!(await getConfig('googleDriveSyncEnabled')));
      setOneDriveClientId(await getConfig('oneDriveClientId') || '');

      // User Preferences (with fallback to global)
      const userId = user?.id;
      setMoeda(await getConfig('moeda', userId) || await getConfig('moeda') || 'R$');
      setFormatoData(await getConfig('formatoData', userId) || await getConfig('formatoData') || 'DD/MM/YYYY');
      setLabels(await getConfig('labels', userId) || await getConfig('labels') || { saida: 'Saida', entrada: 'Entrada', conta: 'Conta' });

      // Legacy support for categories (keep using storeDb for now or migrate them too)
      const legacyConfig = await getConfiguracoes();
      let catSaidas = legacyConfig.categoriasSaidas || ['Moradia', 'Contas', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Investimentos', 'Outros'];
      setCategoriasSaidas(catSaidas);
      setCategoriasEntradas(legacyConfig.categoriasEntradas || ['Salário', 'Freelance', 'Investimentos', 'Rendimentos', 'Outros']);

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
    // Global Settings
    await setConfig('geminiApiKey', geminiApiKey);
    await setConfig('googleDriveClientId', googleDriveClientId);
    await setConfig('googleDriveApiKey', googleDriveApiKey);
    await setConfig('googleDriveSyncEnabled', googleDriveSyncEnabled);

    // User Preferences
    const userId = activeUser?.id;
    await setConfig('moeda', moeda, userId);
    await setConfig('formatoData', formatoData, userId);
    await setConfig('labels', labels, userId);

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
    const config = { geminiApiKey, categoriasSaidas, categoriasEntradas };
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
        if (config.categoriasSaidas) {
          let importedCats = config.categoriasSaidas;
          if (importedCats.length > 0 && typeof importedCats[0] === 'object') {
            importedCats = importedCats.map(c => c.nome);
          }
          setCategoriasSaidas(importedCats);
        }
        if (config.categoriasEntradas) setCategoriasEntradas(config.categoriasEntradas);
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

  const addItemSaida = () => {
    if (novoSaida && !categoriasSaidas.includes(novoSaida)) {
      setCategoriasSaidas([...categoriasSaidas, novoSaida]);
      setNovoSaida('');
    }
  };

  const removeItemSaida = (itemNome) => {
    setCategoriasSaidas(categoriasSaidas.filter(i => i !== itemNome));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-fade-in-up pb-12">
      <div className="flex justify-between items-center px-4 md:px-0">
        <div>
          <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight">Configurações</h1>
          <p className="text-[var(--muted)] font-medium">Personalize sua experiência e gerencie integrações.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4 md:px-0">
        <div className="space-y-8">
          {/* 13.1 Geral */}
          <div className="card-premium p-8 border-l-4 border-blue-600">
            <h2 className="text-sm font-black text-[var(--foreground)] uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
              13.1 Geral
            </h2>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Nome da entidade</label>
                <input
                  type="text"
                  value={entidadeNome}
                  onChange={(e) => setEntidadeNome(e.target.value)}
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Tipo</label>
                <select
                  value={entidadeTipo}
                  onChange={(e) => setEntidadeTipo(e.target.value)}
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                >
                  <option value="Pessoal">Pessoal</option>
                  <option value="Empresarial">Empresarial</option>
                </select>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-[var(--border)]">
              <Link href="/usuarios" className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <span className="text-xl">👥</span>
                  <span className="text-sm font-black text-[var(--foreground)] group-hover:text-blue-600 transition-colors uppercase tracking-widest">Gerenciar Usuários</span>
                </div>
                <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">→</span>
              </Link>
            </div>
          </div>

          {/* 13.2 Preferências */}
          <div className="card-premium p-8 border-l-4 border-purple-600">
            <h2 className="text-sm font-black text-[var(--foreground)] uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-purple-600 rounded-full"></span>
              13.2 Preferências
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Moeda</label>
                <input
                  type="text"
                  value={moeda}
                  onChange={(e) => setMoeda(e.target.value)}
                  placeholder="Ex: R$, US$"
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Formato de data</label>
                <select
                  value={formatoData}
                  onChange={(e) => setFormatoData(e.target.value)}
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>

          {/* 13.3 Labels */}
          <div className="card-premium p-8 border-l-4 border-orange-500">
            <h2 className="text-sm font-black text-[var(--foreground)] uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-orange-600 rounded-full"></span>
              13.3 Labels (Avançado)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Saída</label>
                <input
                  type="text"
                  value={labels.saida}
                  onChange={(e) => setLabels({ ...labels, saida: e.target.value })}
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Entrada</label>
                <input
                  type="text"
                  value={labels.entrada}
                  onChange={(e) => setLabels({ ...labels, entrada: e.target.value })}
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Conta</label>
                <input
                  type="text"
                  value={labels.conta}
                  onChange={(e) => setLabels({ ...labels, conta: e.target.value })}
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Card: Categorias Link */}
          <div className="card-premium p-8 border-l-4 border-indigo-600">
            <h2 className="text-sm font-black text-[var(--foreground)] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
              Categorias
            </h2>
            <p className="text-[var(--muted)] mb-8 font-medium">Gerencie suas categorias de forma detalhada em uma tela dedicada.</p>
            <Link href="/categorias" className="btn-primary w-full py-4 text-center block bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20">
              Gerenciar Categorias 🗂️
            </Link>
          </div>

          {/* Card: Chave API Gemini */}
          <div className="card-premium p-8 border-l-4 border-blue-400">
            <h2 className="text-sm font-black text-[var(--foreground)] uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-400 rounded-full"></span>
              IA & Gemini
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Google Gemini API Key</label>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Insira sua API Key..."
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                />
              </div>
              <p className="text-[10px] font-medium text-[var(--muted)] leading-relaxed italic">Usada para categorização automática e insights inteligentes com IA.</p>
            </div>
          </div>

          {/* 13.4 Integrações */}
          <div className="card-premium p-8 border-l-4 border-emerald-600">
            <h2 className="text-sm font-black text-[var(--foreground)] uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-600 rounded-full"></span>
              13.4 Integrações
            </h2>

            <div className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-[var(--foreground)] uppercase tracking-widest text-[11px] flex items-center gap-2">
                    <span className="text-lg">☁️</span> Google Drive
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={googleDriveSyncEnabled}
                      onChange={(e) => setGoogleDriveSyncEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[var(--background)] border border-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-emerald-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600/10"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Google Client ID</label>
                    <input
                      type="text"
                      value={googleDriveClientId}
                      onChange={(e) => setGoogleDriveClientId(e.target.value)}
                      placeholder="Client ID..."
                      className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Google API Key</label>
                    <input
                      type="password"
                      value={googleDriveApiKey}
                      onChange={(e) => setGoogleDriveApiKey(e.target.value)}
                      placeholder="API Key..."
                      className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[var(--border)] opacity-50 grayscale">
                <h3 className="font-black text-[var(--foreground)] uppercase tracking-widest text-[11px] flex items-center gap-2 mb-4">
                  <span className="text-lg">🟦</span> OneDrive
                </h3>
                <p className="text-[10px] text-[var(--muted)] font-black uppercase tracking-widest">Em breve...</p>
              </div>
            </div>
          </div>

          {/* 13.5 Backup & Sync */}
          <div className="card-premium p-8 border-l-4 border-yellow-500">
            <h2 className="text-sm font-black text-[var(--foreground)] uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-yellow-500 rounded-full"></span>
              13.5 Backup & Sincronia
            </h2>
            <div className="flex flex-col gap-4">
              <button
                onClick={handleManualSync}
                className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-lg shadow-yellow-500/20"
              >
                Sincronização Manual 🔄
              </button>
              <div className="p-4 bg-[var(--background)] rounded-2xl border border-[var(--border)] flex items-center justify-between">
                <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Status Atual</span>
                <span className={`text-[11px] font-black uppercase tracking-widest ${syncStatus.includes('Erro') ? 'text-red-500' : 'text-emerald-500'}`}>
                  {syncStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-0 pt-8 border-t border-[var(--border)]">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3">
             <button onClick={handleSave} className="btn-primary px-10 py-4 shadow-blue-500/30">Salvar Tudo</button>
             <button onClick={handleExport} className="px-6 py-4 bg-[var(--card)] text-[var(--muted)] font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-[var(--background)] transition border border-[var(--border)]">Exportar Config</button>
             <button onClick={() => fileInputRef.current.click()} className="px-6 py-4 bg-[var(--card)] text-[var(--muted)] font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-[var(--background)] transition border border-[var(--border)]">Importar Config</button>
             <input type="file" accept=".json" onChange={handleImport} ref={fileInputRef} className="hidden" />
          </div>
          
          <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">
            Meu Mercado AI - v{APP_VERSION}
          </div>
        </div>
      </div>
    </div>
  );
}