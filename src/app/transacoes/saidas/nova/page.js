"use client";
import { getCategorias } from '@/lib/categoriaDb';
import { getContas } from '@/lib/contaDb';
import { getActiveEntidade } from '@/lib/entidadeDb';
import { addSaida } from '@/lib/saidasDb';
import { getTags } from '@/lib/tagDb';
import { getUsuarios } from '@/lib/usuarioDb';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NovaSaida() {
  const [mode, setMode] = useState('quick'); // 'quick' or 'full'
  const [produtos, setProdutos] = useState([]);
  const [data, setData] = useState('');
  const [apelido, setApelido] = useState('');
  const [total, setTotal] = useState(0);
  const [categoria, setCategoria] = useState('');
  const [tipoCusto, setTipoCusto] = useState('Variável');
  const [contaId, setContaId] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  const [categorias, setCategorias] = useState([]);
  const [contas, setContas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);

  // Recorrência
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [frequencia, setFrequencia] = useState('mensal');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const hoje = new Date().toISOString().split('T')[0];
    setData(hoje);

    async function loadResources() {
      const [cats, tags] = await Promise.all([
        getCategorias('saida'),
        getTags()
      ]);
      setCategorias(cats);
      setAvailableTags(tags);
      if (cats.length > 0) setCategoria(cats[0].nome);

      const ent = await getActiveEntidade();
      if (ent) {
        const accs = await getContas(ent.id);
        setContas(accs);
        if (accs.length > 0) setContaId(accs[0].id);

        const usrs = await getUsuarios(ent.id);
        setUsuarios(usrs);
        if (usrs.length > 0) setUsuarioId(usrs[0].id);
      }
    }
    loadResources();
  }, []);

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
    const newTotal = updatedProdutos.reduce((sum, p) => sum + p.preco_total, 0);
    setTotal(newTotal);
  };

  const handleSave = async () => {
    if (!data || !apelido || (mode === 'quick' && total <= 0)) {
      alert('Por favor, preencha os campos obrigatórios.');
      return;
    }

    await addSaida({
      data,
      apelido,
      categoria,
      total,
      tipoCusto,
      contaId,
      usuarioId,
      tagIds: selectedTagIds,
      produtos: mode === 'full' ? produtos : [],
      recorrencia: isRecorrente ? { frequencia } : null
    });
    router.push('/transacoes?tipo=saida');
  };

  const handleBack = () => {
    router.push('/transacoes?tipo=saida');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    // A lógica de upload de imagem via IA seria integrada aqui se necessário, 
    // mas vamos manter o foco na correção solicitada.
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Novo Saida</h1>
          <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setMode('quick')}
              className={`px-6 py-2 rounded-lg font-bold transition-all ${mode === 'quick' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Rápido
            </button>
            <button
              onClick={() => setMode('full')}
              className={`px-6 py-2 rounded-lg font-bold transition-all ${mode === 'full' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Completo
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Descrição / Apelido *</label>
              <input
                type="text"
                value={apelido}
                onChange={(e) => setApelido(e.target.value)}
                placeholder="Ex: Almoço, Supermercado..."
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Data *</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
              >
                {categorias.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Custo</label>
              <select
                value={tipoCusto}
                onChange={(e) => setTipoCusto(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
              >
                <option value="Variável">Variável</option>
                <option value="Fixo">Fixo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Conta</label>
              <select
                value={contaId}
                onChange={(e) => setContaId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
              >
                {contas.map(acc => <option key={acc.id} value={acc.id}>{acc.nome} ({acc.tipo})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Responsável (Usuário)</label>
              <select
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
              >
                {usuarios.map(usr => <option key={usr.id} value={usr.id}>{usr.nome}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      if (selectedTagIds.includes(tag.id)) {
                        setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id));
                      } else {
                        setSelectedTagIds([...selectedTagIds, tag.id]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selectedTagIds.includes(tag.id)
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                  >
                    {tag.nome}
                  </button>
                ))}
                {availableTags.length === 0 && (
                  <p className="text-xs text-gray-400 italic">Nenhuma tag cadastrada. Vá em "Tags" no menu para criar.</p>
                )}
              </div>
            </div>
            {mode === 'quick' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">Valor Total (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={total}
                  onChange={(e) => setTotal(parseFloat(e.target.value) || 0)}
                  className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-2xl font-bold transition-all"
                />
              </div>
            )}
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
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Frequência do Saida</label>
                <select
                  value={frequencia}
                  onChange={(e) => setFrequencia(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all text-sm font-bold"
                >
                  <option value="semanal">Semanal</option>
                  <option value="mensal">Mensal</option>
                  <option value="anual">Anual</option>
                </select>
                <p className="text-[11px] text-gray-400 mt-3 italic font-medium">O sistema agendará automaticamente o próximo lançamento com base nesta frequência.</p>
              </div>
            )}
          </div>
        </div>

        {mode === 'full' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Itens / Produtos</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleAddProduto}
                  className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition font-bold flex items-center gap-2"
                >
                  <span>➕</span> Adicionar Item
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition font-bold flex items-center gap-2"
                >
                  <span>📸</span> Scan de NF
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-4 font-bold text-gray-600">Produto</th>
                    <th className="pb-4 font-bold text-gray-600 w-24">Qtd</th>
                    <th className="pb-4 font-bold text-gray-600 w-32">Preço Unit.</th>
                    <th className="pb-4 font-bold text-gray-600 w-32 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {produtos.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-gray-400 italic">Nenhum item adicionado.</td>
                    </tr>
                  ) : (
                    produtos.map((produto, index) => (
                      <tr key={index}>
                        <td className="py-3 pr-4">
                          <input
                            type="text"
                            placeholder="Nome do produto"
                            value={produto.nome}
                            onChange={(e) => handleProdutoChange(index, 'nome', e.target.value)}
                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <input
                            type="number"
                            value={produto.quantidade}
                            onChange={(e) => handleProdutoChange(index, 'quantidade', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <input
                            type="number"
                            step="0.01"
                            value={produto.preco_unitario}
                            onChange={(e) => handleProdutoChange(index, 'preco_unitario', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                        <td className="py-3 text-right font-bold text-gray-700">
                          R$ {produto.preco_total.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
              <span className="text-gray-500 font-bold">Total Calculado:</span>
              <span className="text-3xl font-black text-gray-800">R$ {total.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 text-white px-8 py-4 rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-black text-lg"
          >
            Salvar Saida
          </button>
          <button
            onClick={handleBack}
            className="px-8 py-4 bg-white text-gray-600 rounded-2xl hover:bg-gray-50 transition border border-gray-200 font-bold"
          >
            Voltar
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-black mb-2 text-gray-800">Escanear Nota Fiscal</h2>
            <p className="text-gray-500 mb-6">Tire uma foto ou carregue um arquivo para extrair os dados automaticamente.</p>
            <form onSubmit={handleUpload}>
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 mb-6 text-center hover:border-blue-400 transition-colors cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files[0])}
                  className="hidden"
                  id="nf-upload"
                />
                <label htmlFor="nf-upload" className="cursor-pointer">
                  <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📸</div>
                  <span className="text-sm font-bold text-gray-500">{image ? image.name : 'Selecionar imagem'}</span>
                </label>
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full p-4 text-white rounded-2xl font-black text-lg shadow-lg ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'
                  }`}
              >
                {loading ? 'Processando...' : 'Processar Agora'}
              </button>
            </form>
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 w-full p-3 text-gray-400 font-bold hover:text-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}