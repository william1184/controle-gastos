"use client";
import { getActiveEntidade } from '@/lib/entidadeDb';
import { addUsuario, deleteUsuario, getUsuarios, updateUsuario } from '@/lib/usuarioDb';
import { useEffect, useState } from 'react';

export default function UsuariosPage() {
  const [entidade, setEntidade] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoNome, setNovoNome] = useState('');
  const [novaEntrada, setNovaEntrada] = useState('');
  const [novaDataNascimento, setNovaDataNascimento] = useState('');
  const [editingUsuario, setEditingUsuario] = useState(null);

  useEffect(() => {
    async function load() {
      const ent = await getActiveEntidade();
      if (ent) {
        setEntidade(ent);
        const data = await getUsuarios(ent.id);
        setUsuarios(data);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!novoNome || !entidade) return;

    await addUsuario({
      nome: novoNome,
      entrada: parseFloat(novaEntrada) || 0,
      dataNascimento: novaDataNascimento || null,
      entidade_id: entidade.id
    });
    const data = await getUsuarios(entidade.id);
    setUsuarios(data);
    setNovoNome('');
    setNovaEntrada('');
    setNovaDataNascimento('');
    window.dispatchEvent(new Event('app:usuarios-updated'));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!novoNome || !editingUsuario) return;

    await updateUsuario(editingUsuario.id, {
      nome: novoNome,
      entrada: parseFloat(novaEntrada) || 0,
      dataNascimento: novaDataNascimento || null
    });
    const data = await getUsuarios(entidade.id);
    setUsuarios(data);
    setEditingUsuario(null);
    setNovoNome('');
    setNovaEntrada('');
    setNovaDataNascimento('');
    window.dispatchEvent(new Event('app:usuarios-updated'));
  };

  const handleDelete = async (id) => {
    if (usuarios.length <= 1) {
      alert('É necessário ter pelo menos um usuário.');
      return;
    }
    if (confirm('Deseja realmente remover este usuário?')) {
      await deleteUsuario(id);
      const data = await getUsuarios(entidade.id);
      setUsuarios(data);
      window.dispatchEvent(new Event('app:usuarios-updated'));
    }
  };

  const startEdit = (usuario) => {
    setEditingUsuario(usuario);
    setNovoNome(usuario.nome);
    setNovaEntrada(usuario.entrada || '');
    setNovaDataNascimento(usuario.dataNascimento || '');
  };

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  if (!entidade) {
    return <div className="p-8 text-center">Nenhuma entidade selecionada.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-fade-in-up pb-12">
      <div className="flex items-center justify-between px-4 md:px-0">
        <div>
          <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight">Gerenciar Pessoas</h1>
          <p className="text-[var(--muted)] font-medium">Membros da entidade: <span className="font-bold text-blue-600 dark:text-blue-400">{entidade.nome}</span></p>
        </div>
      </div>

      <div className="bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)] overflow-hidden mx-4 md:mx-0">
        <div className="p-8 border-b border-[var(--border)] bg-[var(--background)]/50">
          <h2 className="text-sm font-black text-[var(--foreground)] uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
            {editingUsuario ? 'Editar Pessoa' : 'Adicionar Nova Pessoa'}
          </h2>
          <form onSubmit={editingUsuario ? handleUpdate : handleAdd} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Nome</label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Nome da pessoa"
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm text-[var(--foreground)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Entrada Mensal (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={novaEntrada}
                  onChange={(e) => setNovaEntrada(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm text-[var(--foreground)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Data de Nascimento</label>
                <input
                  type="date"
                  value={novaDataNascimento}
                  onChange={(e) => setNovaDataNascimento(e.target.value)}
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm text-[var(--foreground)]"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              {editingUsuario && (
                <button
                  type="button"
                  onClick={() => { setEditingUsuario(null); setNovoNome(''); setNovaEntrada(''); setNovaDataNascimento(''); }}
                  className="px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition-all border border-[var(--border)]"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={!novoNome}
                className={`px-10 py-3 rounded-2xl font-black uppercase tracking-widest text-xs text-white transition-all shadow-lg ${editingUsuario ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'} disabled:opacity-50`}
              >
                {editingUsuario ? 'Salvar Alterações' : 'Adicionar Pessoa'}
              </button>
            </div>
          </form>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {usuarios.map((user) => (
            <div key={user.id} className="p-6 flex items-center justify-between hover:bg-[var(--background)]/50 transition-colors group">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-black text-2xl border border-blue-600/20 shadow-sm">
                  {user.nome.charAt(0)}
                </div>
                <div>
                  <p className="font-black text-[var(--foreground)] text-lg leading-tight">{user.nome}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">ID: {user.id}</span>
                    {user.entrada > 0 && <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Saldo: R$ {parseFloat(user.entrada).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                    {user.dataNascimento && <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Nasc: {new Intl.DateTimeFormat('pt-BR').format(new Date(user.dataNascimento + 'T12:00:00'))}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <button
                  onClick={() => startEdit(user)}
                  className="p-3 text-[var(--muted)] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all border border-transparent hover:border-[var(--border)]"
                  title="Editar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2.5 2.5 0 113.536 3.536L12 14.5H8v-4l9.293-9.293z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="p-3 text-[var(--muted)] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all border border-transparent hover:border-[var(--border)]"
                  title="Remover"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
