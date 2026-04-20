"use client";
import { getGastoById, updateGasto } from '@/lib/gastosDb';
import { getContas } from '@/lib/contaDb';
import { getConfiguracoes } from '@/lib/storeDb';
import { getRecorrenciaById } from '@/lib/recorrenciaDb';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditarGasto() {
  const [produtos, setProdutos] = useState([]);
  const [data, setData] = useState('');
  const [apelido, setApelido] = useState('');
  const [categoria, setCategoria] = useState('');
  const [tipoCusto, setTipoCusto] = useState('Variável');
  const [perfilId, setPerfilId] = useState('');
  const [contaId, setContaId] = useState('');
  const [categoriasSalvas, setCategoriasSalvas] = useState([]);
  const [contas, setContas] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [total, setTotal] = useState(0);

  // Recorrência
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [frequencia, setFrequencia] = useState('mensal');

  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    const loadData = async () => {
      const config = await getConfiguracoes();
      
      let categorias = config.categoriasGastos || ['Moradia', 'Contas', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Investimentos', 'Outros'];
      if (categorias.length > 0 && typeof categorias[0] === 'object') {
        categorias = categorias.map(c => c.nome);
      }
      setCategoriasSalvas(categorias);

      const loadedContas = await getContas();
      setContas(loadedContas);

      let loadedPerfis = config.perfis || [];
      if (loadedPerfis.length === 0) {
        loadedPerfis = [{ id: 0, nome: 'Perfil Padrão', renda: 1200, dataNascimento: '1992-04-27' }];
      }
      setPerfis(loadedPerfis);

      if (id) {
        const gasto = await getGastoById(Number(id));
        if (gasto) {
          setProdutos(gasto.produtos || []);
          setData(gasto.data);
          setApelido(gasto.apelido || '');
          setCategoria(gasto.categoria || categorias[0] || 'Outros');
          setPerfilId(gasto.perfilId !== undefined && gasto.perfilId !== null ? gasto.perfilId : loadedPerfis[0].id);
          setTipoCusto(gasto.tipoCusto || 'Variável');
          setTotal(gasto.total);
          setContaId(gasto.contaId || (loadedContas.length > 0 ? loadedContas[0].id : ''));

          if (gasto.recorrenciaId) {
            const recorrencia = await getRecorrenciaById(gasto.recorrenciaId);
            if (recorrencia) {
              setIsRecorrente(true);
              setFrequencia(recorrencia.frequencia);
            }
          }
        }
      }
    };
    loadData();
  }, [id]);

  const handleAddProduto = () => {
    setProdutos([...produtos, { nome: '', codigo: '', quantidade: 1, unidade: '', preco_unitario: 0, preco_total: 0 }]);
  };

  const handleProdutoChange = (index, field, value) => {
    const updatedProdutos = [...produtos];
    updatedProdutos[index][field] = value;

    if (field === 'quantidade' || field === 'preco_unitario') {
      updatedProdutos[index].preco_total =
        updatedProdutos[index].quantidade * updatedProdutos[index].preco_unitario;
    }

    setProdutos(updatedProdutos);
    setTotal(updatedProdutos.reduce((sum, p) => sum + p.preco_total, 0));
  };

  const handleSave = async () => {
    if (!data || !categoria || total < 0 || perfilId === '' || !contaId) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const gastoData = { 
      data, 
      apelido, 
      categoria, 
      tipoCusto, 
      total, 
      perfilId, 
      contaId: Number(contaId),
      produtos 
    };

    if (isRecorrente) {
      gastoData.recorrencia = { frequencia };
    }

    await updateGasto(Number(id), gastoData);
    router.push('/gastos');
  };

  const handleBack = () => {
    router.push('/gastos');
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Editar Gasto</h1>
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Apelido (Opcional)</label>
              <input
                type="text"
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
                placeholder="Ex: Almoço, Supermercado..."
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                {categoriasSalvas.map((cat, idx) => (
                  <option key={idx} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Conta</label>
              <select
                value={contaId}
                onChange={(e) => setContaId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                {contas.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Perfil</label>
              <select
                value={perfilId}
                onChange={(e) => setPerfilId(Number(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                {perfis.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Custo</label>
              <select
                value={tipoCusto}
                onChange={(e) => setTipoCusto(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="Variável">Variável</option>
                <option value="Fixo">Fixo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Data</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-200">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={isRecorrente}
                onChange={(e) => setIsRecorrente(e.target.checked)}
                className="w-6 h-6 accent-blue-600 cursor-pointer"
              />
              <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">Esta é uma despesa recorrente</span>
            </label>
            
            {isRecorrente && (
              <div className="mt-4 animate-fadeIn">
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Frequência do Gasto</label>
                <select
                  value={frequencia}
                  onChange={(e) => setFrequencia(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all text-sm font-bold"
                >
                  <option value="semanal">Semanal</option>
                  <option value="mensal">Mensal</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Produtos / Itens</h2>
            <button onClick={handleAddProduto} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition font-bold">
              + Adicionar Item
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-4 font-bold text-gray-600">Produto</th>
                  <th className="pb-4 font-bold text-gray-600 w-24 text-center">Qtd</th>
                  <th className="pb-4 font-bold text-gray-600 w-32">Unitário</th>
                  <th className="pb-4 font-bold text-gray-600 w-32 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {produtos.map((produto, index) => (
                  <tr key={index}>
                    <td className="py-3 pr-4">
                      <input
                        type="text"
                        placeholder="Nome"
                        value={produto.nome}
                        onChange={(e) => handleProdutoChange(index, 'nome', e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        value={produto.quantidade}
                        onChange={(e) => handleProdutoChange(index, 'quantidade', parseFloat(e.target.value))}
                        className="w-full p-2 border border-gray-200 rounded-lg text-center outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        step="0.01"
                        value={produto.preco_unitario}
                        onChange={(e) => handleProdutoChange(index, 'preco_unitario', parseFloat(e.target.value))}
                        className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 text-right font-bold text-gray-700">
                      R$ {produto.preco_total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
            <span className="text-gray-500 font-bold">Total Calculado:</span>
            <span className="text-3xl font-black text-gray-800">R$ {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={handleSave} className="flex-1 bg-blue-600 text-white px-8 py-4 rounded-2xl hover:bg-blue-700 transition shadow-lg font-black text-lg">
            Salvar Alterações
          </button>
          <button onClick={handleBack} className="px-8 py-4 bg-white text-gray-600 rounded-2xl hover:bg-gray-50 transition border border-gray-200 font-bold">
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}