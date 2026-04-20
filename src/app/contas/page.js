"use client";
import { useEffect, useState } from 'react';
import { getContas, addConta, updateConta, deleteConta } from '@/lib/contaDb';
import { getActiveEntidade } from '@/lib/entidadeDb';

export default function ContasPage() {
  const [contas, setContas] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConta, setEditingConta] = useState(null);
  const [entidade, setEntidade] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'banco',
    saldo_inicial: 0
  });

  useEffect(() => {
    async function loadData() {
      const ent = await getActiveEntidade();
      setEntidade(ent);
      if (ent) {
        const data = await getContas(ent.id);
        setContas(data);
      }
    }
    loadData();
  }, []);

  const handleOpenModal = (conta = null) => {
    if (conta) {
      setEditingConta(conta);
      setFormData({
        nome: conta.nome,
        tipo: conta.tipo,
        saldo_inicial: conta.saldo_inicial
      });
    } else {
      setEditingConta(null);
      setFormData({
        nome: '',
        tipo: 'banco',
        saldo_inicial: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingConta(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!entidade) return;

    if (editingConta) {
      await updateConta(editingConta.id, formData);
    } else {
      await addConta({ ...formData, entidade_id: entidade.id });
    }

    const data = await getContas(entidade.id);
    setContas(data);
    handleCloseModal();
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja excluir esta conta?')) {
      await deleteConta(id);
      const data = await getContas(entidade?.id);
      setContas(data);
    }
  };

  const getTipoLabel = (tipo) => {
    switch (tipo) {
      case 'banco': return 'Instituição Financeira';
      case 'carteira': return 'Dinheiro em Espécie';
      case 'credito': return 'Cartão de Crédito';
      default: return tipo;
    }
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'banco': return '🏦';
      case 'carteira': return '💵';
      case 'credito': return '💳';
      default: return '💰';
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Minhas Contas</h1>
          <p className="text-gray-500">Gerencie seus bancos, carteiras e cartões.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center gap-2 font-semibold"
        >
          <span className="text-xl">+</span> Nova Conta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contas.length === 0 ? (
          <div className="col-span-full bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-4">🏦</div>
            <h3 className="text-lg font-semibold text-gray-900">Nenhuma conta cadastrada</h3>
            <p className="text-gray-500 mb-6">Comece adicionando sua primeira conta bancária ou carteira.</p>
            <button
              onClick={() => handleOpenModal()}
              className="text-blue-600 font-bold hover:underline"
            >
              Adicionar agora
            </button>
          </div>
        ) : (
          contas.map(conta => (
            <div key={conta.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button 
                  onClick={() => handleOpenModal(conta)}
                  className="p-2 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                  title="Editar"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => handleDelete(conta.id)}
                  className="p-2 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                  title="Excluir"
                >
                  🗑️
                </button>
              </div>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl">
                  {getTipoIcon(conta.tipo)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 leading-tight">{conta.nome}</h3>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{getTipoLabel(conta.tipo)}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-50">
                <p className="text-xs text-gray-400 font-medium mb-1">Saldo Inicial</p>
                <p className="text-xl font-bold text-gray-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.saldo_inicial)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingConta ? 'Editar Conta' : 'Nova Conta'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nome da Conta</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                    placeholder="Ex: Nubank, Carteira, Itaú..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Conta</label>
                  <select
                    value={formData.tipo}
                    onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none appearance-none"
                  >
                    <option value="banco">🏦 Instituição Financeira (Banco)</option>
                    <option value="carteira">💵 Dinheiro em Espécie (Carteira)</option>
                    <option value="credito">💳 Cartão de Crédito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Saldo Inicial</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.saldo_inicial}
                      onChange={e => setFormData({ ...formData, saldo_inicial: parseFloat(e.target.value) })}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-10 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                  {editingConta ? 'Salvar Alterações' : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
