"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NovaRenda() {
  const [data, setData] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categoriasSalvas, setCategoriasSalvas] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const hoje = new Date().toISOString().split('T')[0];
    setData(hoje);

    const config = JSON.parse(localStorage.getItem('configuracoes')) || {};
    const categorias = config.categoriasRendas || ['Salário', 'Freelance', 'Investimentos', 'Outros'];
    setCategoriasSalvas(categorias);
    setCategoria(categorias[0] || 'Outros');
  }, []);

  const handleSave = () => {
    if (!data || !categoria || !valor || parseFloat(valor) <= 0) {
      alert('Por favor, preencha a data, a categoria e um valor maior que zero.');
      return;
    }

    const storedRendas = JSON.parse(localStorage.getItem('rendas')) || [];
    const novaRenda = { data, descricao, categoria, valor: parseFloat(valor) };
    
    localStorage.setItem('rendas', JSON.stringify([...storedRendas, novaRenda]));
    router.push('/rendas');
  };

  const handleBack = () => {
    router.push('/rendas');
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-green-600">Nova Renda</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md max-w-lg">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (Opcional)</label>
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Salário, Freelance, Pix do Amigo..."
            className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 bg-white"
          >
            {categoriasSalvas.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor Recebido (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0.00"
            className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500"
          />
        </div>
        
        <div className="flex gap-4">
          <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition w-full">Salvar Renda</button>
          <button onClick={handleBack} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition w-full">Voltar</button>
        </div>
      </div>
    </div>
  );
}