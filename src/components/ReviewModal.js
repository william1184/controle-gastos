"use client";
import React, { useState, useEffect } from 'react';

export default function ReviewModal({ isOpen, onClose, data, onSave }) {
  const [editedData, setEditedData] = useState(null);

  useEffect(() => {
    if (data) {
      setEditedData({ ...data });
    }
  }, [data]);

  if (!isOpen || !editedData) return null;

  const handleChange = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...editedData.produtos];
    updatedProducts[index][field] = value;
    
    if (field === 'quantidade' || field === 'preco_unitario') {
      updatedProducts[index].preco_total = updatedProducts[index].quantidade * updatedProducts[index].preco_unitario;
    }
    
    const newTotal = updatedProducts.reduce((sum, p) => sum + p.preco_total, 0);
    setEditedData(prev => ({ ...prev, produtos: updatedProducts, total: newTotal }));
  };

  const handleAddProduct = () => {
    setEditedData(prev => ({
      ...prev,
      produtos: [...prev.produtos, { nome: '', quantidade: 1, unidade: 'un', preco_unitario: 0, preco_total: 0 }]
    }));
  };

  const handleRemoveProduct = (index) => {
    const updatedProducts = editedData.produtos.filter((_, i) => i !== index);
    const newTotal = updatedProducts.reduce((sum, p) => sum + p.preco_total, 0);
    setEditedData(prev => ({ ...prev, produtos: updatedProducts, total: newTotal }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fadeIn">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-black text-gray-800">Revisar Extração IA</h2>
            <p className="text-sm text-gray-500">Confira os dados antes de salvar no sistema.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">Descrição / Estabelecimento</label>
              <input
                type="text"
                value={editedData.apelido}
                onChange={(e) => handleChange('apelido', e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">Data</label>
              <input
                type="date"
                value={editedData.data}
                onChange={(e) => handleChange('data', e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">Categoria Sugerida</label>
              <input
                type="text"
                value={editedData.categoria}
                onChange={(e) => handleChange('categoria', e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2">Total Geral (R$)</label>
              <input
                type="number"
                step="0.01"
                value={editedData.total}
                onChange={(e) => handleChange('total', parseFloat(e.target.value) || 0)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-blue-600 bg-blue-50/30"
              />
            </div>
          </div>

          <div className="mb-6 flex justify-between items-center">
            <h3 className="text-lg font-black text-gray-800">Itens / Lançamentos</h3>
            <button 
              onClick={handleAddProduct}
              className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200 transition"
            >
              + Adicionar Item
            </button>
          </div>

          <div className="space-y-3">
            {editedData.produtos.map((p, idx) => (
              <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 group relative">
                <div className="flex-grow">
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Nome do Item</label>
                  <input
                    type="text"
                    value={p.nome}
                    onChange={(e) => handleProductChange(idx, 'nome', e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Qtd</label>
                  <input
                    type="number"
                    value={p.quantidade}
                    onChange={(e) => handleProductChange(idx, 'quantidade', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-center"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Preço Unit.</label>
                  <input
                    type="number"
                    step="0.01"
                    value={p.preco_unitario}
                    onChange={(e) => handleProductChange(idx, 'preco_unitario', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div className="w-32 text-right">
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Total</label>
                  <div className="p-2 text-sm font-black text-gray-700">R$ {p.preco_total.toFixed(2)}</div>
                </div>
                <button 
                  onClick={() => handleRemoveProduct(idx)}
                  className="absolute -right-2 -top-2 bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 border-t border-gray-100 flex gap-4 bg-gray-50/50">
          <button
            onClick={() => onSave(editedData)}
            className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition"
          >
            Confirmar e Salvar
          </button>
          <button
            onClick={onClose}
            className="px-8 py-4 bg-white text-gray-500 rounded-2xl font-bold border border-gray-200 hover:bg-gray-50 transition"
          >
            Descartar
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
