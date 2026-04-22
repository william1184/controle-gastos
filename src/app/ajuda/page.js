"use client";
import Sidebar from '@/components/Sidebar';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AjudaContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState('inicio');

  useEffect(() => {
    if (tabParam && ['inicio', 'transacoes', 'orcamento', 'seguranca'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const sections = [
    {
      id: 'inicio',
      title: 'Primeiros Passos',
      icon: '🚀',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Seleção de Entidade</h3>
            <p className="text-gray-600 leading-relaxed">
              Ao abrir o sistema, você escolhe uma <strong>Entidade</strong>. Pessoal para finanças individuais ou Empresarial para negócios. Você pode trocar a qualquer momento no menu lateral.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Usuários e Perfis</h3>
            <p className="text-gray-600 leading-relaxed">
              Dentro de cada entidade, cadastre diferentes <strong>Usuários</strong>. Isso permite separar quem realizou cada transação, ideal para famílias ou pequenas equipes.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'transacoes',
      title: 'Transações',
      icon: '💸',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Adicionando Gastos e Rendas</h3>
            <p className="text-gray-600 leading-relaxed">
              No menu <strong>Transações</strong>, você pode registrar entradas e saídas. O formulário permite definir valor, data, conta associada e categoria.
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h3 className="text-blue-800 font-bold mb-1 flex items-center gap-2">
              <span>🤖</span> Dica de IA
            </h3>
            <p className="text-blue-700 text-sm">
              Ao digitar a descrição, a IA sugere automaticamente a categoria. Basta aceitar a sugestão para economizar tempo!
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'orcamento',
      title: 'Orçamento',
      icon: '📊',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Planejamento Mensal</h3>
            <p className="text-gray-600 leading-relaxed">
              Defina metas de gastos por categoria. O sistema monitora seus gastos reais e mostra barras de progresso para que você não ultrapasse seu limite.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'seguranca',
      title: 'Sincronização',
      icon: '☁️',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Google Drive Sync</h3>
            <p className="text-gray-600 leading-relaxed">
              Seus dados são locais, mas você pode sincronizá-los com o Google Drive para backup e uso em múltiplos dispositivos. Configure isso em <strong>Configurações</strong>.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <header className="mb-10 px-4 md:px-0">
            <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight mb-2">Central de Ajuda</h1>
            <p className="text-[var(--muted)] font-medium">Tudo o que você precisa saber para dominar suas finanças com o Meu Orçamento AI.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <aside className="md:col-span-1 space-y-3">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left border ${
                    activeTab === section.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 border-blue-600 font-bold'
                      : 'bg-[var(--card)] text-[var(--muted)] hover:bg-[var(--background)] border-[var(--border)]'
                  }`}
                >
                  <span className="text-xl">{section.icon}</span>
                  <span className="text-sm font-bold uppercase tracking-widest text-[10px]">{section.title}</span>
                </button>
              ))}
            </aside>

            <section className="md:col-span-3">
              <div className="bg-[var(--card)] rounded-[2rem] p-8 border border-[var(--border)] shadow-sm min-h-[400px]">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-2xl border border-blue-600/20">
                    {sections.find(s => s.id === activeTab)?.icon}
                  </div>
                  <h2 className="text-2xl font-black text-[var(--foreground)] tracking-tight">
                    {sections.find(s => s.id === activeTab)?.title}
                  </h2>
                </div>
                
                <div className="prose prose-blue dark:prose-invert max-w-none text-[var(--foreground)] font-medium">
                  {sections.find(s => s.id === activeTab)?.content}
                </div>
              </div>

              <div className="mt-12 bg-gray-900 dark:bg-blue-900/10 text-white rounded-[2rem] p-8 border border-gray-800 dark:border-blue-900/20 shadow-xl">
                <h3 className="text-xl font-black mb-8 uppercase tracking-widest text-xs flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                  Perguntas Frequentes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <h4 className="font-bold text-blue-400 flex items-center gap-2">
                      <span className="text-xs">✦</span> Meus dados estão seguros?
                    </h4>
                    <p className="text-gray-400 text-sm font-medium leading-relaxed">Sim. Os dados são salvos localmente e só saem do seu dispositivo se você ativar a sincronização com o Google Drive.</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-blue-400 flex items-center gap-2">
                      <span className="text-xs">✦</span> Posso usar offline?
                    </h4>
                    <p className="text-gray-400 text-sm font-medium leading-relaxed">Sim. Todas as funcionalidades de registro e consulta funcionam sem internet.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
    </div>
  );
}

export default function AjudaPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Carregando...</div>}>
      <AjudaContent />
    </Suspense>
  );
}
