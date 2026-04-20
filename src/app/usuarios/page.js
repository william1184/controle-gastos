"use client";
import { getActiveEntidade } from '@/lib/entidadeDb';
import { addUsuario, deleteUsuario, getUsuarios, updateUsuario } from '@/lib/usuarioDb';
import { useEffect, useState } from 'react';

export default function UsuariosPage() {
  const [entidade, setEntidade] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoNome, setNovoNome] = useState('');
  const [novaRenda, setNovaRenda] = useState('');
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
      renda: parseFloat(novaRenda) || 0,
      dataNascimento: novaDataNascimento || null,
      entidade_id: entidade.id
    });
    const data = await getUsuarios(entidade.id);
    setUsuarios(data);
    setNovoNome('');
    setNovaRenda('');
    setNovaDataNascimento('');
    window.dispatchEvent(new Event('app:usuarios-updated'));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!novoNome || !editingUsuario) return;

    await updateUsuario(editingUsuario.id, {
      nome: novoNome,
      renda: parseFloat(novaRenda) || 0,
      dataNascimento: novaDataNascimento || null
    });
    const data = await getUsuarios(entidade.id);
    setUsuarios(data);
    setEditingUsuario(null);
    setNovoNome('');
    setNovaRenda('');
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
    setNovaRenda(usuario.renda || '');
    setNovaDataNascimento(usuario.dataNascimento || '');
  };

  if (loading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  if (!entidade) {
    return <div className="p-8 text-center">Nenhuma entidade selecionada.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gerenciar Pessoas</h1>
          <p className="text-gray-500">Membros da entidade: <span className="font-semibold text-blue-600">{entidade.nome}</span></p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-700 mb-4">{editingUsuario ? 'Editar Pessoa' : 'Adicionar Nova Pessoa'}</h2>
          <form onSubmit={editingUsuario ? handleUpdate : handleAdd} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome</label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Nome da pessoa"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Renda (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={novaRenda}
                  onChange={(e) => setNovaRenda(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  value={novaDataNascimento}
                  onChange={(e) => setNovaDataNascimento(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              {editingUsuario && (
                <button
                  type="button"
                  onClick={() => { setEditingUsuario(null); setNovoNome(''); setNovaRenda(''); setNovaDataNascimento(''); }}
                  className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={!novoNome}
                className={`px-8 py-3 rounded-xl font-bold text-white transition-all ${editingUsuario ? 'bg-yellow-600 hover:bg-yellow-700 shadow-lg shadow-yellow-200' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'} disabled:opacity-50`}
              >
                {editingUsuario ? 'Salvar Alterações' : 'Adicionar Pessoa'}
              </button>
            </div>
          </form>
        </div>

        <div className="divide-y divide-gray-100">
          {usuarios.map((user) => (
            <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                  {user.nome.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{user.nome}</p>
                  <div className="flex gap-3 text-[10px] text-gray-400 mt-0.5">
                    <span>ID: {user.id}</span>
                    {user.renda > 0 && <span>• R$ {parseFloat(user.renda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                    {user.dataNascimento && <span>• {new Date(user.dataNascimento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(user)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  title="Editar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2.5 2.5 0 113.536 3.536L12 14.5H8v-4l9.293-9.293z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Remover"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
