"use client";
import { getSaidaById } from '@/lib/saidasDb';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';

function ConsultaSaidaContent() {
  const [saida, setSaida] = useState(null);
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        const data = await getSaidaById(Number(id));
        setSaida(data);
      }
    };
    loadData();
  }, [id]);

  if (!saida) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-center px-4 md:px-0">
        <button
          onClick={() => router.back()}
          className="text-sm font-bold text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors"
        >
          ← Voltar
        </button>
        <div className="flex gap-2">
           <button className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 shadow-sm transition-all" title="Imprimir">
             🖨️
           </button>
           <button className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 shadow-sm transition-all" title="Exportar PDF">
             📄
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl shadow-blue-900/5 overflow-hidden border border-gray-100 relative">
        {/* Receipt Header Decor */}
        <div className="h-4 bg-gradient-to-r from-blue-600 to-indigo-600 w-full"></div>
        
        <div className="p-8 md:p-12">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">
               💸
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Comprovante de Saída</h1>
            <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">ID: #{saida.id?.toString().padStart(6, '0')}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12 pb-12 border-b border-dashed border-gray-200">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Descrição</p>
              <p className="font-bold text-gray-900 text-lg leading-tight">{saida.apelido || 'Sem descrição'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Data da Operação</p>
              <p className="font-bold text-gray-900 text-lg">{new Date(saida.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Categoria</p>
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full font-bold text-xs">
                {saida.categoria}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tipo de Custo</p>
              <span className={`inline-block px-3 py-1 rounded-full font-bold text-xs ${saida.tipoCusto === 'Fixo' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                {saida.tipoCusto}
              </span>
            </div>
          </div>

          <div className="space-y-6 mb-12">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
              Itens da Transação
            </h2>
            
            {saida.produtos && saida.produtos.length > 0 ? (
              <div className="space-y-4">
                {saida.produtos.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center group">
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{item.nome}</p>
                      <p className="text-xs text-gray-400 font-medium">
                        {item.quantidade}x R$ {item.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <p className="font-black text-gray-900">
                      R$ {item.preco_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-gray-400 font-medium italic border-2 border-dashed border-gray-100 rounded-3xl">
                Nenhum detalhe de itens registrado.
              </p>
            )}
          </div>

          <div className="bg-gray-50 rounded-[2rem] p-8">
            <div className="flex justify-between items-center">
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Valor Total</p>
              <p className="text-4xl font-black text-gray-900 tracking-tighter">
                R$ {saida.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
               <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
               Transação Confirmada
            </div>
          </div>
        </div>

        {/* Footer Teeth Decor */}
        <div className="flex justify-between px-2 pb-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-4 h-4 bg-[var(--background)] rounded-full -mb-3"></div>
          ))}
        </div>
      </div>
      
      <div className="text-center pb-8">
        <p className="text-gray-400 text-xs font-medium">Este comprovante é gerado automaticamente pelo Meu Orçamento AI.</p>
      </div>
    </div>
  );
}

export default function ConsultaSaida() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    }>
      <ConsultaSaidaContent />
    </Suspense>
  );
}
