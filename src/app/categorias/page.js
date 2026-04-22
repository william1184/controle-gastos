"use client";
import { addCategoria, deleteCategoria, getCategorias, updateCategoria } from '@/lib/categoriaDb';
import { useEffect, useState } from 'react';

export default function CategoriasPage() {
  const [activeTab, setActiveTab] = useState('saida'); // saida, entrada
  const [categorias, setCategorias] = useState([]);
  const [novoNome, setNovoNome] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const loadData = async () => {
    const cats = await getCategorias(activeTab);
    setCategorias(cats);
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleAdd = async () => {
    if (!novoNome) return;
    await addCategoria({ nome: novoNome, tipo: activeTab });
    setNovoNome('');
    loadData();
  };

  const handleRemove = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    await deleteCategoria(id);
    loadData();
  };

  const handleStartEdit = (id, value) => {
    setEditingId(id);
    setEditValue(value);
  };

  const handleSaveEdit = async (id) => {
    if (!editValue) return;
    await updateCategoria(id, editValue);
    setEditingId(null);
    loadData();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div className="px-4 md:px-0">
        <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight">Categorias</h1>
        <p className="text-[var(--muted)] font-medium">Gerencie como você organiza suas transações (Entradas e Saídas).</p>
      </div>

      <div className="flex gap-2 bg-[var(--card)] p-1.5 rounded-2xl border border-[var(--border)] w-fit mx-4 md:mx-0">
        <button
          onClick={() => setActiveTab('saida')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'saida' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-[var(--muted)] hover:bg-[var(--background)]'}`}
        >
          Saídas
        </button>
        <button
          onClick={() => setActiveTab('entrada')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'entrada' ? 'bg-green-600 text-white shadow-lg shadow-green-500/30' : 'text-[var(--muted)] hover:bg-[var(--background)]'}`}
        >
          Entradas
        </button>
      </div>

      <div className="bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)] overflow-hidden mx-4 md:mx-0">
        <div className="p-6 border-b border-[var(--border)] bg-[var(--background)]/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder={`Nova categoria de ${activeTab === 'saida' ? 'saída' : 'entrada'}...`}
              className="flex-grow p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm text-[var(--foreground)]"
            />
            <button
              onClick={handleAdd}
              disabled={!novoNome}
              className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs text-white transition-all ${activeTab === 'saida' ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20' : 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20'} disabled:opacity-50`}
            >
              Adicionar
            </button>
          </div>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {categorias.length === 0 ? (
            <div className="p-12 text-center text-[var(--muted)] font-medium italic">Nenhuma categoria cadastrada.</div>
          ) : (
            categorias.map((cat) => (
              <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-[var(--background)]/50 transition-all group px-6">
                {editingId === cat.id ? (
                  <div className="flex-grow flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(cat.id)}
                      className="flex-grow p-2.5 bg-[var(--background)] border border-blue-500 rounded-xl outline-none text-[var(--foreground)] font-bold text-sm"
                    />
                    <button onClick={() => handleSaveEdit(cat.id)} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px]">Salvar</button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-[var(--background)] text-[var(--muted)] border border-[var(--border)] rounded-xl font-black uppercase tracking-widest text-[10px]">Cancelar</button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${activeTab === 'saida' ? 'bg-blue-400 dark:bg-blue-600' : 'bg-green-400 dark:bg-green-600'} shadow-sm`}></div>
                      <span className="text-[var(--foreground)] font-bold truncate max-w-[250px]" title={cat.nome}>{cat.nome}</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEdit(cat.id, cat.nome)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                        title="Renomear"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleRemove(cat.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
