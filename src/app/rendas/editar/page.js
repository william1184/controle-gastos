"use client";
import { getRendaById, updateRenda } from '@/lib/rendasDb';
import { getConfiguracoes } from '@/lib/storeDb';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function FormEditarRenda() {
  const [data, setData] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categoriasSalvas, setCategoriasSalvas] = useState([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  useEffect(() => {
    async function loadData() {
      const config = await getConfiguracoes();
      const categorias = config.categoriasRendas || ['Salário', 'Freelance', 'Investimentos', 'Rendimentos', 'Outros'];
      setCategoriasSalvas(categorias);

      if (id !== null) {
        const renda = await getRendaById(Number(id));
        if (renda) {
          setData(renda.data);
          setDescricao(renda.descricao);
          setCategoria(renda.categoria || categorias[0] || 'Outros');
          setValor(renda.valor);
        }
      }
    }
    loadData();
  }, [id]);

  const handleSave = async () => {
    if (!data || !categoria || !valor || parseFloat(valor) <= 0) {
      alert('Por favor, preencha a data, a categoria e um valor maior que zero.');
      return;
    }

    if (id === null) return;

    const renda = await getRendaById(Number(id));
    if (renda) {
      const updatedRenda = { ...renda, data, descricao, categoria, valor: parseFloat(valor) };
      await updateRenda(Number(id), updatedRenda);
    }
    
    router.push('/rendas');
  };

  const handleBack = () => {
    router.push('/rendas');
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-green-600">Editar Renda</h1>
      
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
          <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition w-full">Salvar Alterações</button>
          <button onClick={handleBack} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition w-full">Voltar</button>
        </div>
      </div>
    </div>
  );
}

export default function EditarRenda() {
  return (
    <Suspense fallback={<div className="p-6 bg-gray-100 min-h-screen text-gray-600">Carregando...</div>}>
      <FormEditarRenda />
    </Suspense>
  );
}