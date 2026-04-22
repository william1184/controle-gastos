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
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight">Minhas Contas</h1>
          <p className="text-[var(--muted)] font-medium">Gerencie seus bancos, carteiras e cartões.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2 font-bold uppercase tracking-widest text-xs"
        >
          <span className="text-xl">+</span> Nova Conta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contas.length === 0 ? (
          <div className="col-span-full bg-[var(--card)] border-2 border-dashed border-[var(--border)] rounded-3xl p-12 text-center">
            <div className="text-4xl mb-4">🏦</div>
            <h3 className="text-lg font-black text-[var(--foreground)] uppercase tracking-tight">Nenhuma conta cadastrada</h3>
            <p className="text-[var(--muted)] mb-6 font-medium">Comece adicionando sua primeira conta bancária ou carteira.</p>
            <button
              onClick={() => handleOpenModal()}
              className="text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest text-xs hover:underline"
            >
              Adicionar agora
            </button>
          </div>
        ) : (
          contas.map(conta => (
            <div key={conta.id} className="bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)] p-8 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button 
                  onClick={() => handleOpenModal(conta)}
                  className="p-2 bg-[var(--background)] hover:bg-blue-50 dark:hover:bg-blue-900/30 text-[var(--muted)] hover:text-blue-600 transition-colors rounded-xl border border-[var(--border)]"
                  title="Editar"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => handleDelete(conta.id)}
                  className="p-2 bg-[var(--background)] hover:bg-red-50 dark:hover:bg-red-900/30 text-[var(--muted)] hover:text-red-600 transition-colors rounded-xl border border-[var(--border)]"
                  title="Excluir"
                >
                  🗑️
                </button>
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-[var(--background)] rounded-2xl flex items-center justify-center text-3xl border border-[var(--border)] shadow-inner">
                  {getTipoIcon(conta.tipo)}
                </div>
                <div>
                  <h3 className="font-black text-[var(--foreground)] leading-tight text-lg">{conta.nome}</h3>
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest font-black">{getTipoLabel(conta.tipo)}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-[var(--border)]">
                <p className="text-[10px] text-[var(--muted)] font-black uppercase tracking-widest mb-1">Saldo Inicial</p>
                <p className="text-2xl font-black text-[var(--foreground)] tracking-tight">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.saldo_inicial)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-[var(--card)] rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-[var(--border)]">
            <div className="px-8 py-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--background)]/50">
              <h2 className="text-xl font-black text-[var(--foreground)]">
                {editingConta ? 'Editar Conta' : 'Nova Conta'}
              </h2>
              <button onClick={handleCloseModal} className="text-[var(--muted)] hover:text-[var(--foreground)] text-2xl leading-none transition-colors">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-2 ml-1">Nome da Conta</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold text-sm text-[var(--foreground)]"
                    placeholder="Ex: Nubank, Carteira, Itaú..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-2 ml-1">Tipo de Conta</label>
                  <select
                    value={formData.tipo}
                    onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all outline-none appearance-none font-bold text-sm text-[var(--foreground)] cursor-pointer"
                  >
                    <option value="banco">🏦 Instituição Financeira (Banco)</option>
                    <option value="carteira">💵 Dinheiro em Espécie (Carteira)</option>
                    <option value="credito">💳 Cartão de Crédito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-2 ml-1">Saldo Inicial</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] font-black text-sm">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.saldo_inicial}
                      onChange={e => setFormData({ ...formData, saldo_inicial: parseFloat(e.target.value) })}
                      className="w-full pl-11 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all outline-none font-bold text-sm text-[var(--foreground)]"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-3 text-[var(--muted)] font-black uppercase tracking-widest text-xs hover:text-[var(--foreground)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30"
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
