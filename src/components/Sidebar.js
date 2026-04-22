"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect } from 'react';

const menuItems = [
  { name: 'Dashboard', icon: '🏠', href: '/dashboard' },
  { 
    name: 'Transações', 
    icon: '💸', 
    href: '/transacoes',
    submenu: [
      { name: 'Histórico', icon: '📋', href: '/transacoes' },
      { name: 'Consulta', icon: '🔍', href: '/transacoes/consulta' },
      { name: 'Itens', icon: '🧾', href: '/itens' },
    ]
  },
  { name: 'Orçamento', icon: '📊', href: '/orcamento' },
  { name: 'Recorrências', icon: '🔁', href: '/recorrencias' },
  { name: 'Categorias', icon: '🗂️', href: '/categorias' },
  { name: 'Contas', icon: '💳', href: '/contas' },
  { name: 'Usuários', icon: '👥', href: '/usuarios' },
  { name: 'Tags', icon: '🏷️', href: '/tags' },
];

export default function Sidebar({ activeEntidade, handleSwitchEntidade, isMobileOpen, setIsMobileOpen }) {
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = useState(null);

  // Auto-open submenu if pathname matches a child
  useEffect(() => {
    const activeItem = menuItems.find(item => 
      item.submenu?.some(sub => pathname === sub.href)
    );
    if (activeItem) {
      setOpenSubmenu(activeItem.name);
    }
  }, [pathname]);

  useEffect(() => {
    // Close sidebar on navigation (mobile)
    if (isMobileOpen) setIsMobileOpen(false);
  }, [pathname]);

  const toggleSubmenu = (name) => {
    setOpenSubmenu(openSubmenu === name ? null : name);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] lg:hidden backdrop-blur-sm animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        ></div>
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-64 bg-[var(--card)] border-r border-[var(--border)] flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image src="/logo_branco.png" alt="Logo" width={32} height={32} className="bg-blue-600 rounded-lg p-1 shadow-lg shadow-blue-500/20" />
            <span className="font-bold text-[var(--foreground)] tracking-tight">Meu Orçamento</span>
          </Link>
          <button 
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            onClick={() => setIsMobileOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="flex-grow overflow-y-auto p-4 space-y-1">
          <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Menu Principal</p>
          {menuItems.map((item) => {
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isChildActive = hasSubmenu && item.submenu.some(sub => pathname === sub.href);
            const isActive = pathname === item.href || isChildActive;
            const isOpen = openSubmenu === item.name;

            return (
              <div key={item.name} className="space-y-1">
                {hasSubmenu ? (
                  <button
                    onClick={() => toggleSubmenu(item.name)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                      isActive 
                        ? 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold' 
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    <span className={`text-xl transition-transform group-hover:scale-110 ${isActive ? 'grayscale-0' : 'grayscale opacity-70'}`}>
                      {item.icon}
                    </span>
                    <span className="text-sm">{item.name}</span>
                    <svg 
                      className={`ml-auto w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                      isActive 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold' 
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    <span className={`text-xl transition-transform group-hover:scale-110 ${isActive ? 'grayscale-0' : 'grayscale opacity-70'}`}>
                      {item.icon}
                    </span>
                    <span className="text-sm">{item.name}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full"></div>}
                  </Link>
                )}

                {hasSubmenu && isOpen && (
                  <div className="ml-4 pl-4 border-l border-[var(--border)] space-y-1 mt-1">
                    {item.submenu.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                            isSubActive 
                              ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-900/20' 
                              : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <span className="text-sm">{sub.icon}</span>
                          <span className="text-xs">{sub.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="px-4 py-2 border-t border-[var(--border)]">
          <Link
            href="/ajuda"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
              pathname === '/ajuda' 
                ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            <span className={`text-xl transition-transform group-hover:scale-110 ${pathname === '/ajuda' ? 'grayscale-0' : 'grayscale opacity-70'}`}>
              ❓
            </span>
            <span className="text-sm">Central de Ajuda</span>
          </Link>
        </div>

        {activeEntidade && (
          <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]/50">
            <div className="mb-4 px-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Entidade Ativa</p>
              <div className="flex items-center gap-3 bg-[var(--card)] p-3 rounded-xl border border-[var(--border)] shadow-sm">
                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${activeEntidade.is_contexto_pessoal ? 'bg-green-500' : 'bg-purple-500'}`}>
                    {activeEntidade.is_contexto_pessoal ? '👤' : '🏢'}
                 </div>
                 <div className="overflow-hidden">
                    <p className="text-sm font-bold text-[var(--foreground)] truncate">{activeEntidade.nome}</p>
                    <p className="text-[10px] text-gray-500 uppercase font-medium">{activeEntidade.is_contexto_pessoal ? 'Pessoal' : 'Empresa'}</p>
                 </div>
              </div>
            </div>
            
            <button
              onClick={handleSwitchEntidade}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-900/50"
            >
              <span>🔄</span> Trocar Entidade
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
