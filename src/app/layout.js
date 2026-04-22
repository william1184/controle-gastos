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
import { APP_VERSION } from "@/lib/constants";
import "./globals.css";
import { NotificationProvider } from "@/lib/NotificationContext";

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

import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";

function HeaderContent({ activeUsuario, usuarios, isUserMenuOpen, setIsUserMenuOpen, handleSwitchUser, pathname, setIsMobileOpen }) {
  const { runTask, isTaskRunning } = useBackgroundTask();
  const { theme, toggleTheme } = useTheme();
  
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
    <header className="bg-[var(--header-bg)] backdrop-blur-md border-b border-[var(--border)] h-16 flex items-center px-4 md:px-8 sticky top-0 z-50 transition-colors duration-300">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setIsMobileOpen(true)}
             className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
           >
             <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
             </svg>
           </button>
           <h2 className="text-lg font-bold text-[var(--foreground)] capitalize hidden sm:block">
             {pathname.split('/').filter(x => x).pop() || 'Início'}
           </h2>
        </div>
        
        <div className="flex gap-2 md:gap-4 items-center">
          <button
            onClick={toggleTheme}
            className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all shadow-sm border border-gray-200 dark:border-gray-700"
            title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          <Link
            href={`/ajuda?tab=${
              pathname.includes('transacoes') || pathname.includes('itens') || pathname.includes('categorias') || pathname.includes('contas') || pathname.includes('recorrencias') || pathname.includes('tags')
                ? 'transacoes'
                : pathname.includes('orcamento')
                  ? 'orcamento'
                  : pathname.includes('configuracoes')
                    ? 'seguranca'
                    : 'inicio'
            }`}
            className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all shadow-sm border border-blue-100 dark:border-blue-900/50 flex items-center gap-2 px-3"
            title="Ajuda desta página"
          >
            <span className="text-xs font-bold hidden sm:inline">Ajuda</span>
            <span className="text-base sm:text-lg">❓</span>
          </Link>

          <button
            onClick={handleSync}
            disabled={isTaskRunning('google-drive-sync')}
            className={`p-2 rounded-xl transition-all flex items-center justify-center ${isTaskRunning('google-drive-sync') ? 'bg-green-100 text-green-600 animate-pulse' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'} shadow-sm`}
            title="Sincronizar com Google Drive"
          >
            <svg className={`w-5 h-5 ${isTaskRunning('google-drive-sync') ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 md:px-3 py-1.5 rounded-xl transition-all border border-gray-200 dark:border-gray-700"
            >
              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-[10px] text-white font-bold">
                {activeUsuario?.nome?.charAt(0) || 'U'}
              </div>
              <span className="hidden lg:inline text-xs font-bold">{activeUsuario?.nome || 'Usuário'}</span>
              <svg className={`w-3 h-3 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 z-50 py-2">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 mb-2">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Trocar Usuário</p>
                </div>
                {usuarios.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleSwitchUser(user)}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors ${activeUsuario?.id === user.id ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] ${activeUsuario?.id === user.id ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                      {user.nome.charAt(0)}
                    </div>
                    {user.nome}
                  </button>
                ))}
                <div className="border-t border-gray-100 dark:border-gray-800 mt-2 pt-2">
                  <Link href="/usuarios" onClick={() => setIsUserMenuOpen(false)} className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-2 font-bold">
                    <span>👥</span> Gerenciar Equipe
                  </Link>
                  <Link href="/configuracoes" onClick={() => setIsUserMenuOpen(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 flex items-center gap-2 font-medium">
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check version for bundle refresh
    if (typeof window !== 'undefined') {
      const lastVersion = localStorage.getItem('appVersion');
      if (lastVersion && lastVersion !== APP_VERSION) {
        localStorage.setItem('appVersion', APP_VERSION);
        window.location.reload();
        return;
      } else if (!lastVersion) {
        localStorage.setItem('appVersion', APP_VERSION);
      }
    }

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)] text-[var(--foreground)] min-h-screen flex`}>
        <ThemeProvider>
          <NotificationProvider>
            <BackgroundTaskProvider>
              {showSidebar && (
                <Sidebar 
                  activeEntidade={activeEntidade} 
                  handleSwitchEntidade={handleSwitchEntidade} 
                  isMobileOpen={isMobileOpen}
                  setIsMobileOpen={setIsMobileOpen}
                />
              )}
              
              <div className="flex-grow flex flex-col min-w-0">
                {!isPublicPage && (
                  <HeaderContent 
                    activeUsuario={activeUsuario}
                    usuarios={usuarios}
                    isUserMenuOpen={isUserMenuOpen}
                    setIsUserMenuOpen={setIsUserMenuOpen}
                    handleSwitchUser={handleSwitchUser}
                    pathname={pathname}
                    setIsMobileOpen={setIsMobileOpen}
                  />
                )}
                
                <main className={`${isPublicPage ? '' : 'p-4 md:p-8'} flex-grow overflow-auto`}>
                  {children}
                </main>
              </div>
            </BackgroundTaskProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}