"use client";
import Sidebar from "@/components/Sidebar";
import { syncDatabase } from "@/lib/googleDriveSync";
import { getActiveUsuario, getUsuarios, setActiveUsuario } from "@/lib/usuarioDb";
import { getActiveEntidade } from "@/lib/entidadeDb";
import { BackgroundTaskProvider, useBackgroundTask } from "@/providers/BackgroundTaskProvider";
import localFont from "next/font/local";
import Image from 'next/image';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

function HeaderContent({ activeUsuario, usuarios, isUserMenuOpen, setIsUserMenuOpen, handleSwitchUser }) {
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
    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-8 sticky top-0 z-30">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-4">
           {/* Aqui pode ir o título da página atual ou algo do tipo */}
        </div>
        
        <div className="flex gap-4 items-center">
          <button
            onClick={handleSync}
            disabled={isTaskRunning('google-drive-sync')}
            className={`p-2 rounded-xl transition-all flex items-center justify-center ${isTaskRunning('google-drive-sync') ? 'bg-green-100 text-green-600 animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} shadow-sm`}
            title="Sincronizar com Google Drive"
          >
            <svg className={`w-5 h-5 ${isTaskRunning('google-drive-sync') ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 px-3 py-1.5 rounded-xl transition-all border border-gray-200"
            >
              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-[10px] text-white font-bold">
                {activeUsuario?.nome?.charAt(0) || 'U'}
              </div>
              <span className="hidden sm:inline text-xs font-bold">{activeUsuario?.nome || 'Usuário'}</span>
              <svg className={`w-3 h-3 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 py-2">
                <div className="px-4 py-2 border-b border-gray-100 mb-2">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Trocar Usuário</p>
                </div>
                {usuarios.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleSwitchUser(user)}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-blue-50 transition-colors ${activeUsuario?.id === user.id ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-gray-700'}`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] ${activeUsuario?.id === user.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {user.nome.charAt(0)}
                    </div>
                    {user.nome}
                  </button>
                ))}
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <Link href="/usuarios" onClick={() => setIsUserMenuOpen(false)} className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2 font-bold">
                    <span>👥</span> Gerenciar Equipe
                  </Link>
                  <Link href="/configuracoes" onClick={() => setIsUserMenuOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2 font-medium">
                    <span>⚙️</span> Configurações
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({ children }) {
  const [activeEntidade, setActiveEntidadeState] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [activeUsuario, setActiveUsuarioState] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function load() {
      const ent = await getActiveEntidade();
      if (ent) {
        setActiveEntidadeState(ent);
        const users = await getUsuarios(ent.id);
        setUsuarios(users);

        let currentUsr = await getActiveUsuario();
        if (currentUsr && currentUsr.entidade_id !== ent.id) {
          currentUsr = null;
        }

        if (!currentUsr && users.length > 0) {
          currentUsr = users[0];
          setActiveUsuario(users[0].id);
        }
        setActiveUsuarioState(currentUsr);
      } else {
        setActiveEntidadeState(null);
      }
    }
    load();

    window.addEventListener('storage', load);
    window.addEventListener('app:usuarios-updated', load);
    return () => {
      window.removeEventListener('storage', load);
      window.removeEventListener('app:usuarios-updated', load);
    };
  }, [pathname]);

  const handleSwitchEntidade = () => {
    setActiveUsuario(null);
    window.dispatchEvent(new Event('app:usuarios-updated'));
    router.push('/selecao-entidade');
  };

  const handleSwitchUser = (user) => {
    setActiveUsuario(user.id);
    setActiveUsuarioState(user);
    setIsUserMenuOpen(false);
    window.location.reload();
  };

  const isPublicPage = pathname === '/' || pathname === '/selecao-entidade';
  const showSidebar = activeEntidade && !isPublicPage;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Meu Orçamento AI</title>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900 min-h-screen flex`}>
        <BackgroundTaskProvider>
          {showSidebar && (
            <Sidebar activeEntidade={activeEntidade} handleSwitchEntidade={handleSwitchEntidade} />
          )}
          
          <div className="flex-grow flex flex-col min-w-0">
            {!isPublicPage && (
              <HeaderContent 
                activeUsuario={activeUsuario}
                usuarios={usuarios}
                isUserMenuOpen={isUserMenuOpen}
                setIsUserMenuOpen={setIsUserMenuOpen}
                handleSwitchUser={handleSwitchUser}
              />
            )}
            
            <main className={`${isPublicPage ? '' : 'p-8'} flex-grow overflow-auto`}>
              {children}
            </main>
          </div>
        </BackgroundTaskProvider>
      </body>
    </html>
  );
}