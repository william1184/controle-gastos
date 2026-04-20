"use client";
import { getActiveEntidade } from "@/lib/entidadeDb";
import { getActiveUsuario, getUsuarios, setActiveUsuario } from "@/lib/usuarioDb";
import { BackgroundTaskProvider } from "@/providers/BackgroundTaskProvider";
import localFont from "next/font/local";
import Image from 'next/image';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { syncDatabase } from "@/lib/googleDriveSync";
import { useBackgroundTask } from "@/providers/BackgroundTaskProvider";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

function HeaderContent({ activeEntidade, activeUsuario, usuarios, isUserMenuOpen, setIsUserMenuOpen, handleSwitchUser, handleSwitchEntidade }) {
  const { runTask, isTaskRunning } = useBackgroundTask();
  
  const handleSync = async () => {
    await runTask(
      'google-drive-sync',
      'Sincronizando com Google Drive',
      () => syncDatabase(),
      (result) => alert(result),
      (error) => alert(`Erro no sincronismo: ${error.message || 'Erro desconhecido'}`)
    );
  };

  return (
    <header>
      <nav className="bg-blue-600 border-gray-200 px-4 lg:px-6 py-2.5">
        <div className="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl">
          <Link href="/" className="flex items-center">
            <span className="self-center text-xl font-semibold whitespace-nowrap text-white">
              <Image src="/logo_branco.png" alt="Logo do Meu Mercado" width={50} height={50} className="mx-auto mt-4" />
            </span>
          </Link>
          <div className="flex gap-4 mt-4 lg:mt-0 items-center">
            <Link href="/dashboard" className="text-white hover:text-gray-200 font-medium transition text-sm">Dashboard</Link>
            <Link href="/gastos" className="text-white hover:text-gray-200 font-medium transition text-sm">Gastos</Link>
            <Link href="/rendas" className="text-white hover:text-gray-200 font-medium transition text-sm">Rendas</Link>
            <Link href="/contas" className="text-white hover:text-gray-200 font-medium transition text-sm">Contas</Link>
            <Link href="/importar-exportar" className="text-white hover:text-gray-200 font-medium transition text-sm">Importar</Link>
            <Link href="/configuracoes" className="text-white hover:text-gray-200 font-medium transition text-sm">Configurações</Link>

            {activeEntidade && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSync}
                  disabled={isTaskRunning('google-drive-sync')}
                  className={`p-2 rounded-full transition-all flex items-center justify-center ${isTaskRunning('google-drive-sync') ? 'bg-green-700 animate-pulse' : 'bg-green-600 hover:bg-green-700'} text-white shadow-lg`}
                  title="Sincronizar com Google Drive"
                >
                  <svg className={`w-4 h-4 ${isTaskRunning('google-drive-sync') ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-full transition-all border border-blue-500 border-opacity-30"
                  >
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                      {activeUsuario?.nome?.charAt(0) || 'U'}
                    </div>
                    <span className="hidden sm:inline text-xs font-semibold">{activeUsuario?.nome || 'Usuário'}</span>
                    <svg className={`w-3 h-3 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-2">
                      <div className="px-4 py-2 border-b border-gray-100 mb-2">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Trocar Usuário</p>
                      </div>
                      {usuarios.map(user => (
                        <button
                          key={user.id}
                          onClick={() => handleSwitchUser(user)}
                          className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-blue-50 transition-colors ${activeUsuario?.id === user.id ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-gray-700'}`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${activeUsuario?.id === user.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {user.nome.charAt(0)}
                          </div>
                          {user.nome}
                        </button>
                      ))}
                      <div className="border-t border-gray-100 mt-2 pt-2">
                        <Link href="/usuarios" onClick={() => setIsUserMenuOpen(false)} className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2 font-medium">
                          <span>⚙️</span> Gerenciar Pessoas
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleSwitchEntidade}
              className="text-blue-100 hover:text-white transition text-xs flex items-center gap-1 bg-blue-700/50 px-2 py-1 rounded"
              title="Trocar Entidade"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default function RootLayout({ children }) {
  const [activeEntidade, setActiveEntidadeState] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [activeUsuario, setActiveUsuarioState] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const ent = await getActiveEntidade();
      if (ent) {
        setActiveEntidadeState(ent);
        const users = await getUsuarios(ent.id);
        setUsuarios(users);

        let currentUsr = await getActiveUsuario();

        // Ensure user belongs to the active entity
        if (currentUsr && currentUsr.entidade_id !== ent.id) {
          currentUsr = null;
        }

        if (!currentUsr && users.length > 0) {
          currentUsr = users[0];
          setActiveUsuario(users[0].id);
        }
        setActiveUsuarioState(currentUsr);
      }
    }
    load();

    // Listen for storage changes and custom events
    window.addEventListener('storage', load);
    window.addEventListener('app:usuarios-updated', load);
    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener('app:usuarios-updated', load);
    };
  }, []);

  const handleSwitchEntidade = () => {
    setActiveUsuario(null);
    window.dispatchEvent(new Event('app:usuarios-updated'));
    router.push('/');
  };

  const handleSwitchUser = (user) => {
    setActiveUsuario(user.id);
    setActiveUsuarioState(user);
    setIsUserMenuOpen(false);
    // Force refresh or trigger event if needed
    window.location.reload();
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Meu Orçamento AI</title>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased max-h-screen flex flex-col`}
      >
        <BackgroundTaskProvider>
          <HeaderContent 
            activeEntidade={activeEntidade}
            activeUsuario={activeUsuario}
            usuarios={usuarios}
            isUserMenuOpen={isUserMenuOpen}
            setIsUserMenuOpen={setIsUserMenuOpen}
            handleSwitchUser={handleSwitchUser}
            handleSwitchEntidade={handleSwitchEntidade}
          />
          <main className="bg-gray-100 text-gray-800 flex-grow overflow-auto">{children}</main>
        </BackgroundTaskProvider>
      </body>
    </html>
  );
}