"use client";
import { useEffect, useState } from 'react';
import { getGastos, deleteGasto } from '@/lib/gastosDb';
import { getRendas, deleteRenda } from '@/lib/rendasDb';
import { getContas } from '@/lib/contaDb';
import { getConfiguracoes } from '@/lib/storeDb';
import Link from 'next/link';
import ImportadorCSV from '@/components/ImportadorCSV';

export default function TransacoesPage() {
  const [transacoes, setTransacoes] = useState([]);
  const [activeTab, setActiveTab] = useState('todas'); // todas, entradas, saidas, importar
  const [contas, setContas] = useState([]);
  const [categoriasGastos, setCategoriasGastos] = useState([]);
  const [categoriasRendas, setCategoriasRendas] = useState([]);
  const [filters, setFilters] = useState({
    categoria: '',
    accountId: '',
    startDate: '',
    endDate: ''
  });

  const loadData = async () => {
    const [gs, rs, cs, config] = await Promise.all([
      getGastos(filters),
      getRendas(filters),
      getContas(),
      getConfiguracoes()
    ]);

    // Format and merge
    const normalizedGastos = gs.map(g => ({
      ...g,
      tipo: 'saida',
      valor: g.total,
      descricao: g.apelido
    }));
    const normalizedRendas = rs.map(r => ({
      ...r,
      tipo: 'entrada'
    }));

    let merged = [...normalizedGastos, ...normalizedRendas];
    
    // Sort by date desc
    merged.sort((a, b) => new Date(b.data) - new Date(a.data));

    // Filter by tab
    if (activeTab === 'entradas') merged = merged.filter(t => t.tipo === 'entrada');
    if (activeTab === 'saidas') merged = merged.filter(t => t.tipo === 'saida');

    setTransacoes(merged);
    setContas(cs);
    setCategoriasGastos(config.categoriasGastos || []);
    setCategoriasRendas(config.categoriasRendas || []);
  };

  useEffect(() => {
    loadData();
  }, [filters, activeTab]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleDelete = async (t) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
    if (t.tipo === 'saida') await deleteGasto(t.id);
    else await deleteRenda(t.id);
    loadData();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transações</h1>
          <p className="text-gray-500">Histórico unificado de movimentações financeiras.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/gastos/nova" className="px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all border border-red-100">
            - Novo Gasto
          </Link>
          <Link href="/rendas/nova" className="px-5 py-2.5 bg-green-50 text-green-600 rounded-xl font-bold hover:bg-green-100 transition-all border border-green-100">
            + Nova Renda
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-2xl border border-gray-200 w-fit">
        {['todas', 'entradas', 'saidas', 'importar'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize ${
              activeTab === tab 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'importar' ? (
        <ImportadorCSV onImportComplete={() => setActiveTab('todas')} />
      ) : (
        <>
          {/* Filtros */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Conta</label>
              <select name="accountId" value={filters.accountId} onChange={handleFilterChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none">
                <option value="">Todas</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Início</label>
              <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Fim</label>
              <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
            </div>
            <div className="lg:col-span-2 flex gap-2">
               <button 
                 onClick={() => setFilters({ categoria: '', accountId: '', startDate: '', endDate: '' })}
                 className="px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 transition-all"
               >
                 Limpar Filtros
               </button>
            </div>
          </div>

          {/* Listagem */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descrição</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Categoria</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conta</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Valor</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transacoes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-20 text-center">
                      <p className="text-gray-400 font-medium">Nenhuma transação encontrada.</p>
                    </td>
                  </tr>
                ) : (
                  transacoes.map((t) => (
                    <tr key={`${t.tipo}-${t.id}`} className="group hover:bg-gray-50/50 transition-all">
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(t.data).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${t.tipo === 'entrada' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                             {t.tipo === 'entrada' ? '↗' : '↘'}
                          </div>
                          <span className="text-sm font-bold text-gray-900">{t.descricao || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider">
                          {t.categoria || 'Outros'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-medium">{t.contaNome || '-'}</td>
                      <td className={`px-6 py-4 text-sm font-black text-right ${t.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.tipo === 'entrada' ? '+' : '-'} R$ {parseFloat(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link 
                            href={t.tipo === 'saida' ? `/gastos/editar/${t.id}` : `/rendas/editar?id=${t.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            ✏️
                          </Link>
                          <button 
                            onClick={() => handleDelete(t)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
