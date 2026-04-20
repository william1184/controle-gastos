"use client";
import { getGastoById, updateGasto } from '@/lib/gastosDb';
import { getConfiguracoes } from '@/lib/storeDb';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditarGasto() {
  const [produtos, setProdutos] = useState([]);
  const [data, setData] = useState('');
  const [apelido, setApelido] = useState(''); // Estado para o apelido
  const [categoria, setCategoria] = useState(''); // Estado para a categoria
  const [tipoCusto, setTipoCusto] = useState('Variável'); // Estado para tipo de custo
  const [perfilId, setPerfilId] = useState(''); // Estado para o perfil
  const [categoriasSalvas, setCategoriasSalvas] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [total, setTotal] = useState(0);
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

  const handleCategoriaChange = (e) => {
    const newCat = e.target.value;
    setCategoria(newCat);
  };

  const handleSave = async () => {
    if (!data || !categoria || total < 0 || perfilId === '') {
      alert('Por favor, preencha todos os campos obrigatórios (data, categoria, perfil).');
      return;
    }

    await updateGasto(Number(id), { data, apelido, categoria, tipoCusto, total, perfilId, produtos });
    router.push('/gastos');
  };

  const handleBack = () => {
    router.push('/gastos'); // Redireciona para a página /gastos
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Editar Gasto</h1>
      <div className="mb-4">
        <label className="block text-sm font-medium">Apelido (Opcional)</label>
        <input
          type="text"
          value={apelido}
          onChange={(e) => setApelido(e.target.value)}
          placeholder="Digite um apelido para a gasto"
          className="w-full p-2 border rounded"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Perfil</label>
        <select
          value={perfilId}
          onChange={(e) => setPerfilId(Number(e.target.value))}
          className="w-full p-2 border rounded bg-white focus:ring-blue-500 focus:border-blue-500"
        >
          {perfis.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Categoria</label>
        <select
          value={categoria}
          onChange={handleCategoriaChange}
          className="w-full p-2 border rounded bg-white focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Selecione uma categoria...</option>
          {categoriasSalvas.map((cat, idx) => (
            <option key={idx} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Tipo de Custo</label>
        <select
          value={tipoCusto}
          onChange={(e) => setTipoCusto(e.target.value)}
          className="w-full p-2 border rounded bg-white focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="Fixo">Fixo</option>
          <option value="Variável">Variável</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Data</label>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <div className="mb-4">
        <button onClick={handleAddProduto} className="bg-green-500 text-white px-4 py-2 rounded">
          Adicionar Produto
        </button>
      </div>
      <table className="w-full border-collapse border border-gray-300 bg-white">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 p-2">Nome</th>
            <th className="border border-gray-300 p-2">Código</th>
            <th className="border border-gray-300 p-2">Quantidade</th>
            <th className="border border-gray-300 p-2">Preço Unitário</th>
            <th className="border border-gray-300 p-2">Preço Total</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((produto, index) => (
            <tr key={index}>
              <td className="border border-gray-300 p-2">
                <input
                  type="text"
                  placeholder="Nome"
                  value={produto.nome}
                  onChange={(e) => handleProdutoChange(index, 'nome', e.target.value)}
                  className="w-full p-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
              </td>
              <td className="border border-gray-300 p-2">
                <input
                  type="text"
                  placeholder="Código"
                  value={produto.codigo}
                  onChange={(e) => handleProdutoChange(index, 'codigo', e.target.value)}
                  className="w-full p-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
              </td>
              <td className="border border-gray-300 p-2">
                <input
                  type="number"
                  placeholder="Quantidade"
                  value={produto.quantidade}
                  onChange={(e) => handleProdutoChange(index, 'quantidade', parseFloat(e.target.value))}
                  className="w-full p-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
              </td>
              <td className="border border-gray-300 p-2">
                <input
                  type="number"
                  placeholder="Preço Unitário"
                  value={produto.preco_unitario}
                  onChange={(e) => handleProdutoChange(index, 'preco_unitario', parseFloat(e.target.value))}
                  className="w-full p-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
              </td>
              <td className="border border-gray-300 p-2 text-gray-700">
                R$ {produto.preco_total.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4">
        <p className="text-lg font-bold">Total: R$ {total.toFixed(2)}</p>
      </div>
      <div className="mt-4 flex gap-4">
        <button onClick={handleSave} className="bg-blue-500 text-white px-4 py-2 rounded">
          Salvar Alterações
        </button>
        <button onClick={handleBack} className="bg-gray-500 text-white px-4 py-2 rounded">
          Voltar
        </button>
      </div>
    </div>
  );
}