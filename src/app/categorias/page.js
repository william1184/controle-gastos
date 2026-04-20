"use client";
import { getCategoriasGastos, setCategoriasGastos, getCategoriasRendas, setCategoriasRendas } from '@/lib/storeDb';
import { useEffect, useState } from 'react';

export default function CategoriasPage() {
  const [activeTab, setActiveTab] = useState('gastos'); // gastos, rendas
  const [categoriasGastos, setCategoriasGastosState] = useState([]);
  const [categoriasRendas, setCategoriasRendasState] = useState([]);
  const [novoNome, setNovoNome] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    async function load() {
      const catG = await getCategoriasGastos();
      const catR = await getCategoriasRendas();
      setCategoriasGastosState(catG);
      setCategoriasRendasState(catR);
    }
    load();
  }, []);

  const handleAdd = async () => {
    if (!novoNome) return;
    if (activeTab === 'gastos') {
      const updated = [...categoriasGastos, novoNome];
      setCategoriasGastosState(updated);
      await setCategoriasGastos(updated);
    } else {
      const updated = [...categoriasRendas, novoNome];
      setCategoriasRendasState(updated);
      await setCategoriasRendas(updated);
    }
    setNovoNome('');
  };

  const handleRemove = async (index) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;
    if (activeTab === 'gastos') {
      const updated = categoriasGastos.filter((_, i) => i !== index);
      setCategoriasGastosState(updated);
      await setCategoriasGastos(updated);
    } else {
      const updated = categoriasRendas.filter((_, i) => i !== index);
      setCategoriasRendasState(updated);
      await setCategoriasRendas(updated);
    }
  };

  const handleStartEdit = (index, value) => {
    setEditingIndex(index);
    setEditValue(value);
  };

  const handleSaveEdit = async (index) => {
    if (!editValue) return;
    if (activeTab === 'gastos') {
      const updated = [...categoriasGastos];
      updated[index] = editValue;
      setCategoriasGastosState(updated);
      await setCategoriasGastos(updated);
    } else {
      const updated = [...categoriasRendas];
      updated[index] = editValue;
      setCategoriasRendasState(updated);
      await setCategoriasRendas(updated);
    }
    setEditingIndex(null);
  };

  const categories = activeTab === 'gastos' ? categoriasGastos : categoriasRendas;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
        <p className="text-gray-500">Gerencie como você organiza suas transações.</p>
      </div>

      <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-2xl border border-gray-200 w-fit">
        <button
          onClick={() => setActiveTab('gastos')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'gastos' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Gastos
        </button>
        <button
          onClick={() => setActiveTab('rendas')}
          className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'rendas' ? 'bg-green-600 text-white shadow-lg shadow-green-500/30' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Rendas
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex gap-3">
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder={`Nova categoria de ${activeTab === 'gastos' ? 'gasto' : 'renda'}...`}
              className="flex-grow p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <button
              onClick={handleAdd}
              disabled={!novoNome}
              className={`px-6 py-3 rounded-xl font-bold text-white transition-all ${activeTab === 'gastos' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} disabled:opacity-50`}
            >
              Adicionar
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {categories.length === 0 ? (
            <div className="p-12 text-center text-gray-400">Nenhuma categoria cadastrada.</div>
          ) : (
            categories.map((cat, index) => (
              <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-all group">
                {editingIndex === index ? (
                  <div className="flex-grow flex gap-2 mr-4">
                    <input
                      type="text"
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(index)}
                      className="flex-grow p-2 bg-white border border-blue-500 rounded-lg outline-none"
                    />
                    <button onClick={() => handleSaveEdit(index)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs">Salvar</button>
                    <button onClick={() => setEditingIndex(null)} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-bold text-xs">Cancelar</button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${activeTab === 'gastos' ? 'bg-blue-400' : 'bg-green-400'}`}></div>
                      <span className="text-gray-900 font-medium">{cat}</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEdit(index, cat)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Renomear"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleRemove(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
