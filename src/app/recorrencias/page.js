"use client";
import { useEffect, useState } from 'react';
import { getRecorrencias, deleteRecorrencia, updateRecorrencia } from '@/lib/recorrenciaDb';
import Link from 'next/link';

export default function RecorrenciasPage() {
  const [recorrencias, setRecorrencias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const data = await getRecorrencias();
    setRecorrencias(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente cancelar esta recorrência? A transação original será mantida, mas não haverá novos lançamentos automáticos.')) return;
    await deleteRecorrencia(id);
    loadData();
  };

  const getFrequenciaLabel = (f) => {
    const map = { 'mensal': 'Mensal', 'semanal': 'Semanal', 'anual': 'Anual' };
    return map[f] || f;
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recorrências</h1>
          <p className="text-gray-500">Gestão de assinaturas, contas fixas e automatizações.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Ativas</p>
          <p className="text-3xl font-black text-blue-600">{recorrencias.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Próximo Vencimento</p>
          <p className="text-3xl font-black text-gray-900">
            {recorrencias.length > 0 ? new Date(recorrencias[0].proximaExecucao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-20 text-center text-gray-400">Carregando recorrências...</div>
        ) : recorrencias.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🔁</div>
            <p className="text-gray-400 font-medium">Nenhuma recorrência ativa.</p>
            <p className="text-sm text-gray-400 mt-1">Crie uma nova transação e marque como &quot;Recorrente&quot; para aparecer aqui.</p>
            <Link href="/transacoes" className="inline-block mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all">Ir para Transações</Link>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descrição</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Frequência</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Próxima Execução</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recorrencias.map((rec) => (
                <tr key={rec.id} className="group hover:bg-gray-50/50 transition-all">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-900">{rec.descricao}</p>
                    <p className="text-[10px] text-gray-400 font-medium">ORIGEM: {new Date(rec.dataOrigem).toLocaleDateString('pt-BR')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider">
                      {getFrequenciaLabel(rec.frequencia)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                       <p className="text-sm font-bold text-gray-700">{new Date(rec.proximaExecucao).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => handleDelete(rec.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Cancelar Recorrência">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
