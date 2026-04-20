"use client";
import { useEffect, useState } from 'react';
import { getTags, addTag, updateTag, deleteTag } from '@/lib/tagDb';

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [novoNome, setNovoNome] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const data = await getTags();
    setTags(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async () => {
    if (!novoNome) return;
    await addTag(novoNome);
    setNovoNome('');
    loadData();
  };

  const handleSaveEdit = async (id) => {
    if (!editValue) return;
    await updateTag(id, editValue);
    setEditingId(null);
    loadData();
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir esta tag?')) return;
    await deleteTag(id);
    loadData();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tags</h1>
        <p className="text-gray-500">Etiquetas personalizadas para organizar suas transações.</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Nova tag..."
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <button
            onClick={handleAdd}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            Adicionar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Carregando...</div>
        ) : tags.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Nenhuma tag cadastrada.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tags.map((tag) => (
              <li key={tag.id} className="p-4 flex items-center justify-between group hover:bg-gray-50 transition-all">
                {editingId === tag.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 p-2 bg-white border border-gray-200 rounded-xl outline-none"
                    />
                    <button onClick={() => handleSaveEdit(tag.id)} className="text-green-600 font-bold p-2 hover:bg-green-50 rounded-lg">✅</button>
                    <button onClick={() => setEditingId(null)} className="text-red-600 font-bold p-2 hover:bg-red-50 rounded-lg">❌</button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="text-gray-900 font-bold">{tag.nome}</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => { setEditingId(tag.id); setEditValue(tag.nome); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(tag.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
