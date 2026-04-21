"use client";
import { useEffect, useState } from 'react';
import { getTransactions } from '@/lib/transactionDb';
import { getCategorias } from '@/lib/categoriaDb';
import { getContas } from '@/lib/contaDb';
import Pagination from '@/components/Pagination';
import Link from 'next/link';

export default function ConsultaTransacoesPage() {
  const [data, setData] = useState({ data: [], total: 0, page: 1, pageSize: 15 });
  const [filters, setFilters] = useState({
    tipo: '',
    descricao: '',
    categoriaId: '',
    contaId: '',
    startDate: '',
    endDate: '',
    valorMin: '',
    valorMax: ''
  });
  const [categorias, setCategorias] = useState([]);
  const [contas, setContas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async (page = 1) => {
    setIsLoading(true);
    const result = await getTransactions({ ...filters, page, pageSize: data.pageSize });
    setData(result);
    setIsLoading(false);
  };

  useEffect(() => {
    const loadFilters = async () => {
      const [catsE, catsS, accs] = await Promise.all([
        getCategorias('entrada'),
        getCategorias('saida'),
        getContas()
      ]);
      setCategorias([...catsE, ...catsS]);
      setContas(accs);
    };
    loadFilters();
    loadData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData(1);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Consulta de Transações</h1>
        <p className="text-gray-500">Busca avançada e filtros detalhados.</p>
      </div>

      {/* Filtros Avançados */}
      <form onSubmit={handleSearch} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 mb-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Descrição</label>
            <input
              type="text"
              name="descricao"
              value={filters.descricao}
              onChange={handleFilterChange}
              placeholder="Ex: Supermercado..."
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tipo</label>
            <select name="tipo" value={filters.tipo} onChange={handleFilterChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none">
              <option value="">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Categoria</label>
            <select name="categoriaId" value={filters.categoriaId} onChange={handleFilterChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none">
              <option value="">Todas</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Conta</label>
            <select name="contaId" value={filters.contaId} onChange={handleFilterChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none">
              <option value="">Todas</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Data Inicial</label>
            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Data Final</label>
            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Valor Mínimo</label>
            <input type="number" name="valorMin" value={filters.valorMin} onChange={handleFilterChange} placeholder="0.00" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Valor Máximo</label>
            <input type="number" name="valorMax" value={filters.valorMax} onChange={handleFilterChange} placeholder="9999.99" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setFilters({ tipo: '', descricao: '', categoriaId: '', contaId: '', startDate: '', endDate: '', valorMin: '', valorMax: '' })}
            className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 transition-all"
          >
            Limpar Filtros
          </button>
          <button
            type="submit"
            className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <span>🔍</span> Pesquisar
          </button>
        </div>
      </form>

      {/* Resultados */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descrição</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Categoria</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conta</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-400">Carregando...</td></tr>
            ) : data.data.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-20 text-center text-gray-400">Nenhuma transação encontrada.</td></tr>
            ) : (
              data.data.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-all">
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(t.data).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 max-w-[200px] md:max-w-[300px]">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-gray-900 truncate" title={t.descricao || '-'}>{t.descricao || '-'}</span>
                      <span className={`text-[10px] font-bold uppercase ${t.tipo === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>
                        {t.tipo}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold uppercase truncate max-w-[120px] inline-block" title={t.categoria || 'Outros'}>
                      {t.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[150px]" title={t.contaNome}>{t.contaNome}</td>
                  <td className={`px-6 py-4 text-sm font-black text-right ${t.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.tipo === 'entrada' ? '+' : '-'} R$ {parseFloat(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <Pagination 
          total={data.total} 
          page={data.page} 
          pageSize={data.pageSize} 
          onPageChange={(p) => loadData(p)} 
        />
      </div>
    </div>
  );
}
