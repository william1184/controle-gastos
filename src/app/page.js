"use client";
import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white selection:bg-blue-500/30">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-48">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px] animate-pulse delay-700"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full mb-8 animate-fade-in">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
            <span className="text-blue-400 text-sm font-medium">Nova era na gestão financeira</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
            Assuma o controle total <br /> com <span className="text-blue-500">Inteligência Artificial</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-xl text-gray-400 mb-12 leading-relaxed">
            O Meu Orçamento AI transforma a maneira como você lida com dinheiro. 
            Gestão pessoal e empresarial em um só lugar, potencializada por insights inteligentes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/selecao-entidade" 
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95"
            >
              Começar Agora — É Grátis
            </Link>
            <a 
              href="#features" 
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-lg transition-all border border-white/10 hover:border-white/20"
            >
              Ver Funcionalidades
            </a>
          </div>

          <div className="mt-20 relative max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-blue-500/20 blur-[100px] -z-10"></div>
            <div className="bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl">
              <div className="bg-gray-950 rounded-2xl aspect-[16/9] flex items-center justify-center overflow-hidden border border-white/5">
                <Image 
                   src="/logo_branco.png" 
                   alt="Preview do Dashboard" 
                   width={400} 
                   height={400} 
                   className="opacity-20 grayscale"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                   <p className="text-2xl font-bold text-blue-500/50 uppercase tracking-[0.2em]">Dashboard Inteligente</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">Tudo o que você precisa</h2>
            <p className="text-gray-400 text-lg">Funcionalidades pensadas para simplificar sua vida financeira.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all hover:bg-white/[0.07]">
              <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Insights de IA</h3>
              <p className="text-gray-400 leading-relaxed">
                Análise automática dos seus gastos e rendas com sugestões personalizadas para economizar mais.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all hover:bg-white/[0.07]">
              <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Multi-entidade</h3>
              <p className="text-gray-400 leading-relaxed">
                Gerencie suas finanças pessoais (PF) e seus centros de custo empresariais (PJ) em fluxos separados.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all hover:bg-white/[0.07]">
              <div className="w-12 h-12 bg-green-600/20 text-green-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Importação Inteligente</h3>
              <p className="text-gray-400 leading-relaxed">
                Importe seus extratos bancários via CSV e deixe que nossa IA categorize tudo automaticamente para você.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-8">Pronto para transformar sua realidade financeira?</h2>
          <Link 
            href="/selecao-entidade" 
            className="inline-block px-12 py-5 bg-white text-black hover:bg-gray-200 rounded-2xl font-black text-xl transition-all hover:scale-105 active:scale-95"
          >
            Começar Gratuitamente
          </Link>
          <p className="mt-6 text-gray-500">Sem cartões, sem complicação. 100% Local e Privado.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-gray-600 text-sm">
        <p>&copy; {new Date().getFullYear()} Meu Orçamento AI. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
