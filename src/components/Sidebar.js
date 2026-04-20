"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const menuItems = [
  { name: 'Dashboard', icon: '🏠', href: '/dashboard' },
  { name: 'Transações', icon: '💸', href: '/transacoes' },
  { name: 'Itens', icon: '🧾', href: '/itens' },
  { name: 'Orçamento', icon: '📊', href: '/orcamento' },
  { name: 'Recorrências', icon: '🔁', href: '/recorrencias' },
  { name: 'Categorias', icon: '🗂️', href: '/categorias' },
  { name: 'Contas', icon: '💳', href: '/contas' },
  { name: 'Usuários', icon: '👥', href: '/usuarios' },
  { name: 'Tags', icon: '🏷️', href: '/tags' },
];

export default function Sidebar({ activeEntidade, handleSwitchEntidade }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image src="/logo_branco.png" alt="Logo" width={32} height={32} className="bg-blue-600 rounded-lg p-1" />
          <span className="font-bold text-gray-900 tracking-tight">Meu Orçamento</span>
        </Link>
      </div>

      <nav className="flex-grow overflow-y-auto p-4 space-y-1">
        <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Menu Principal</p>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                isActive 
                  ? 'bg-blue-50 text-blue-600 font-bold' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={`text-xl transition-transform group-hover:scale-110 ${isActive ? 'grayscale-0' : 'grayscale opacity-70'}`}>
                {item.icon}
              </span>
              <span className="text-sm">{item.name}</span>
              {isActive && <div className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full"></div>}
            </Link>
          );
        })}
      </nav>

      {activeEntidade && (
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="mb-4 px-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Entidade Ativa</p>
            <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
               <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${activeEntidade.is_contexto_pessoal ? 'bg-green-500' : 'bg-purple-500'}`}>
                  {activeEntidade.is_contexto_pessoal ? '👤' : '🏢'}
               </div>
               <div className="overflow-hidden">
                  <p className="text-sm font-bold text-gray-900 truncate">{activeEntidade.nome}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">{activeEntidade.is_contexto_pessoal ? 'Pessoal' : 'Empresa'}</p>
               </div>
            </div>
          </div>
          
          <button
            onClick={handleSwitchEntidade}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100"
          >
            <span>🔄</span> Trocar Entidade
          </button>
        </div>
      )}
    </aside>
  );
}
