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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <header className="mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Central de Ajuda</h1>
            <p className="text-gray-500">Tudo o que você precisa saber para dominar suas finanças com o Meu Orçamento AI.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <aside className="md:col-span-1 space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                    activeTab === section.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 font-bold'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
                  }`}
                >
                  <span className="text-xl">{section.icon}</span>
                  <span className="text-sm">{section.title}</span>
                </button>
              ))}
            </aside>

            <section className="md:col-span-3">
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm min-h-[400px]">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">{sections.find(s => s.id === activeTab)?.icon}</span>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {sections.find(s => s.id === activeTab)?.title}
                  </h2>
                </div>
                
                <div className="prose prose-blue max-w-none">
                  {sections.find(s => s.id === activeTab)?.content}
                </div>
              </div>

              <div className="mt-12 bg-gray-900 text-white rounded-2xl p-8 shadow-xl">
                <h3 className="text-xl font-bold mb-6">Perguntas Frequentes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-bold text-blue-400 mb-2">Meus dados estão seguros?</h4>
                    <p className="text-gray-400 text-sm">Sim. Os dados são salvos localmente e só saem do seu dispositivo se você ativar a sincronização com o Google Drive.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-400 mb-2">Posso usar offline?</h4>
                    <p className="text-gray-400 text-sm">Sim. Todas as funcionalidades de registro e consulta funcionam sem internet.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
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
