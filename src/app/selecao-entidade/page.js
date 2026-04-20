"use client";
import { addEntidade, getEntidades, setActiveEntidade, updateEntidade } from '@/lib/entidadeDb';
import { setActiveUsuario } from '@/lib/usuarioDb';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SelecaoEntidade() {
  const [entidades, setEntidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntidade, setEditingEntidade] = useState(null);
  const [novoNome, setNovoNome] = useState('');
  const [isPessoal, setIsPessoal] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const data = await getEntidades();
      setEntidades(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleSelect = (id) => {
    setActiveEntidade(id);
    setActiveUsuario(null); // Clear active user for the new entity
    window.dispatchEvent(new Event('app:usuarios-updated'));
    router.push('/dashboard');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!novoNome) return;

    const id = await addEntidade({
      nome: novoNome,
      is_contexto_pessoal: isPessoal
    });

    const updated = await getEntidades();
    setEntidades(updated);
    setIsModalOpen(false);
    setNovoNome('');

    // Opcional: Selecionar automaticamente a recém criada
    handleSelect(id);
  };

  const handleEdit = (e, entidade) => {
    e.stopPropagation();
    setEditingEntidade(entidade);
    setNovoNome(entidade.nome);
    setIsPessoal(entidade.is_contexto_pessoal);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!novoNome || !editingEntidade) return;

    await updateEntidade(editingEntidade.id, {
      nome: novoNome,
      is_contexto_pessoal: isPessoal
    });

    const updated = await getEntidades();
    setEntidades(updated);
    setIsEditModalOpen(false);
    setEditingEntidade(null);
    setNovoNome('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="max-w-4xl w-full text-center mb-12">
        <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl mb-4">
          Bem-vindo ao <span className="text-blue-400">Meu Orçamento AI</span>
        </h1>
        <p className="text-xl text-gray-300">
          Selecione uma entidade para começar a gerenciar suas finanças.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl w-full">
        {entidades.map((entidade) => (
          <div
            key={entidade.id}
            onClick={() => handleSelect(entidade.id)}
            className="group relative bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:bg-opacity-20 border border-white border-opacity-10 hover:border-blue-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${entidade.is_contexto_pessoal ? 'bg-green-500' : 'bg-purple-500'} bg-opacity-20 text-white`}>
                {entidade.is_contexto_pessoal ? (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleEdit(e, entidade)}
                  className="p-2 rounded-lg bg-gray-800 bg-opacity-50 text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
                  title="Editar Entidade"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <span className={`text-xs font-bold px-2 py-1 rounded ${entidade.is_contexto_pessoal ? 'bg-green-900 text-green-300' : 'bg-purple-900 text-purple-300'}`}>
                  {entidade.is_contexto_pessoal ? 'Pessoal' : 'Empresarial'}
                </span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{entidade.nome}</h3>
            <p className="text-gray-400 text-sm">Criado em {new Date(entidade.created_at).toLocaleDateString('pt-BR')}</p>

            <div className="mt-6 flex items-center text-blue-400 font-semibold group-hover:translate-x-2 transition-transform duration-300">
              Entrar
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>
        ))}

        {/* Card Adicionar Novo */}
        <div
          onClick={() => { setNovoNome(''); setIsPessoal(true); setIsModalOpen(true); }}
          className="group relative bg-transparent border-2 border-dashed border-gray-600 rounded-2xl p-8 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:border-blue-500 flex flex-col items-center justify-center text-gray-500 hover:text-blue-400"
        >
          <div className="p-4 rounded-full bg-gray-800 bg-opacity-50 mb-4 transition-colors duration-300 group-hover:bg-blue-900 group-hover:bg-opacity-30">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-xl font-bold">Adicionar Entidade</span>
        </div>
      </div>

      {/* Modal de Criação / Edição */}
      {(isModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-950 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-middle bg-gray-900 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-800">
              <div className="px-6 pt-6 pb-4">
                <h3 className="text-2xl font-bold text-white mb-4" id="modal-title">
                  {isEditModalOpen ? 'Editar Entidade' : 'Nova Entidade'}
                </h3>
                <form onSubmit={isEditModalOpen ? handleUpdate : handleCreate}>
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm font-medium mb-2">Nome da Entidade</label>
                    <input
                      type="text"
                      autoFocus
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      placeholder="Ex: Família Silva, Minha Empresa..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-gray-400 text-sm font-medium mb-2">Tipo de Contexto</label>
                    <div className="flex p-1 bg-gray-800 rounded-xl border border-gray-700">
                      <button
                        type="button"
                        onClick={() => setIsPessoal(true)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${isPessoal ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                      >
                        Pessoal
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPessoal(false)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!isPessoal ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                      >
                        Empresarial
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button
                      type="button"
                      onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}
                      className="flex-1 px-4 py-3 bg-gray-800 text-gray-300 rounded-xl font-bold hover:bg-gray-750 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!novoNome}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                    >
                      {isEditModalOpen ? 'Salvar Alterações' : 'Criar e Entrar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
