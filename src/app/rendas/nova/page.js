"use client";
import { addRenda } from '@/lib/rendasDb';
import { getContas } from '@/lib/contaDb';
import { getConfiguracoes } from '@/lib/storeDb';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NovaRenda() {
  const [data, setData] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [contaId, setContaId] = useState('');
  const [categoriasSalvas, setCategoriasSalvas] = useState([]);
  const [contas, setContas] = useState([]);
  
  // Recorrência
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [frequencia, setFrequencia] = useState('mensal');

  const router = useRouter();

  useEffect(() => {
    const hoje = new Date().toISOString().split('T')[0];
    setData(hoje);

    const loadData = async () => {
      const config = await getConfiguracoes();
      const categorias = config.categoriasRendas || ['Salário', 'Freelance', 'Investimentos', 'Rendimentos', 'Outros'];
      setCategoriasSalvas(categorias);
      setCategoria(categorias[0] || 'Outros');

      const loadedContas = await getContas();
      setContas(loadedContas);
      if (loadedContas.length > 0) {
        setContaId(loadedContas[0].id);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    if (!data || !categoria || !valor || parseFloat(valor) <= 0 || !contaId) {
      alert('Por favor, preencha a data, a categoria, a conta e um valor maior que zero.');
      return;
    }

    const rendaData = { 
      data, 
      descricao, 
      categoria, 
      valor: parseFloat(valor), 
      contaId: Number(contaId) 
    };

    if (isRecorrente) {
      rendaData.recorrencia = { frequencia };
    }

    await addRenda(rendaData);
    router.push('/rendas');
  };

  const handleBack = () => {
    router.push('/rendas');
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-green-600">Nova Renda</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md max-w-lg border border-gray-200">
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição (Opcional)</label>
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Salário, Freelance, Pix do Amigo..."
            className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 bg-white transition"
            >
              {categoriasSalvas.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Conta de Destino</label>
            <select
              value={contaId}
              onChange={(e) => setContaId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 bg-white transition"
            >
              {contas.map((conta) => (
                <option key={conta.id} value={conta.id}>{conta.nome}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Data</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Valor Recebido (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0.00"
              className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 font-bold text-green-700 transition"
            />
          </div>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={isRecorrente}
              onChange={(e) => setIsRecorrente(e.target.checked)}
              className="w-5 h-5 accent-green-600 cursor-pointer"
            />
            <span className="text-sm font-semibold text-gray-700 group-hover:text-green-600 transition">Esta é uma renda recorrente</span>
          </label>
          
          {isRecorrente && (
            <div className="mt-3 animate-fadeIn">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Frequência da Repetição</label>
              <select
                value={frequencia}
                onChange={(e) => setFrequencia(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 bg-white transition text-sm"
              >
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
              </select>
              <p className="text-[10px] text-gray-500 mt-2 italic">A próxima ocorrência será gerada automaticamente com base nesta frequência.</p>
            </div>
          )}
        </div>
        
        <div className="flex gap-4">
          <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition w-full font-bold shadow-md">Salvar Renda</button>
          <button onClick={handleBack} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition w-full font-bold shadow-md">Voltar</button>
        </div>
      </div>
    </div>
  );
}