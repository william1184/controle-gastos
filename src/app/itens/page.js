"use client";
import { useEffect, useState } from 'react';
import { getItens, deleteItem, updateItem } from '@/lib/itensDb';

export default function ItensPage() {
  const [itens, setItens] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    const data = await getItens({ nome: search });
    setItens(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    await deleteItem(id);
    loadData();
  };

  // Group items by name to show "Price History" for the selected item
  const itemHistory = selectedItemForHistory 
    ? itens.filter(i => i.nome === selectedItemForHistory).sort((a, b) => new Date(a.data) - new Date(b.data))
    : [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Itens</h1>
          <p className="text-gray-500">Detalhamento individual de produtos e serviços.</p>
        </div>
        <div className="w-full md:w-96 relative">
          <input
            type="text"
            placeholder="Buscar por nome do item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3 pl-12 bg-white border border-gray-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <span className="absolute left-4 top-3.5 text-gray-400">🔍</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Itens */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
             <div className="p-20 text-center text-gray-400">Carregando itens...</div>
          ) : itens.length === 0 ? (
            <div className="bg-white p-20 rounded-3xl border border-gray-100 text-center">
              <p className="text-gray-400 font-medium">Nenhum item encontrado.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Item</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Transação</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Preço Un.</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Total</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {itens.map((item) => (
                    <tr key={item.id} className="group hover:bg-gray-50/50 transition-all cursor-pointer" onClick={() => setSelectedItemForHistory(item.nome)}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{item.nome}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">{item.categoriaNome}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <p className="text-xs text-gray-500 font-medium">{item.transacaoDescricao || 'Sem descrição'}</p>
                         <p className="text-[10px] text-gray-400">{new Date(item.data).toLocaleDateString('pt-BR')}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600 font-medium">
                        R$ {item.precoUnitario.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-black text-gray-900">
                        R$ {item.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Painel Lateral: Histórico de Preços */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-blue-500">📈</span> Análise de Preços
            </h3>
            {selectedItemForHistory ? (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">Item Selecionado</p>
                  <p className="text-xl font-black text-blue-600">{selectedItemForHistory}</p>
                </div>
                
                <div className="space-y-4">
                  {itemHistory.map((hist, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(hist.data).toLocaleDateString('pt-BR')}</p>
                        <p className="text-xs text-gray-500">{hist.transacaoDescricao}</p>
                      </div>
                      <p className="text-sm font-black text-gray-900">R$ {hist.precoUnitario.toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                {itemHistory.length > 1 && (
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-xs text-blue-800 font-medium">
                      Variância de preço: 
                      <strong className="ml-1">
                        R$ {(Math.max(...itemHistory.map(i => i.precoUnitario)) - Math.min(...itemHistory.map(i => i.precoUnitario))).toFixed(2)}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📊</div>
                <p className="text-sm text-gray-400 px-6">Clique em um item da lista para ver o histórico de preços e variações.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
