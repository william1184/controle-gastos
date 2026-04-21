"use client";
import { getCategorias } from '@/lib/categoriaDb';
import { getContas } from '@/lib/contaDb';
import { getActiveEntidade } from '@/lib/entidadeDb';
import { addSaida } from '@/lib/saidasDb';
import { getTags } from '@/lib/tagDb';
import { getUsuarios } from '@/lib/usuarioDb';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ImportadorInteligente from '@/components/ImportadorInteligente';
import ReviewModal from '@/components/ReviewModal';

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

  // AI Review
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [aiResult, setAiResult] = useState(null);

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
    setProdutos([...produtos, { nome: '', quantidade: 1, unidade: 'un', preco_unitario: 0, preco_total: 0 }]);
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

  const handleAiResultReady = (result) => {
    setAiResult(result);
    setIsReviewModalOpen(true);
  };

  const handleConfirmAiResult = (result) => {
    if (result.data) setData(result.data);
    if (result.apelido) setApelido(result.apelido);
    if (result.total) setTotal(result.total);
    if (result.categoria) {
      const foundCat = categorias.find(c => c.nome.toLowerCase() === result.categoria.toLowerCase());
      if (foundCat) setCategoria(foundCat.nome);
    }
    if (result.produtos && result.produtos.length > 0) {
      setMode('full');
      setProdutos(result.produtos.map(p => ({
        nome: p.nome || '',
        quantidade: p.quantidade || 1,
        unidade: p.unidade || 'un',
        preco_unitario: p.preco_unitario || 0,
        preco_total: p.preco_total || 0
      })));
    }
    setIsReviewModalOpen(false);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-gray-800">Nova Saída</h1>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Descrição / Apelido *</label>
                  <input
                    type="text"
                    value={apelido}
                    onChange={(e) => setApelido(e.target.value)}
                    placeholder="Ex: Almoço, Supermercado..."
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Data *</label>
                  <input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Categoria</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all font-medium"
                  >
                    {categorias.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Custo</label>
                  <select
                    value={tipoCusto}
                    onChange={(e) => setTipoCusto(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all font-medium"
                  >
                    <option value="Variável">Variável</option>
                    <option value="Fixo">Fixo</option>
                  </select>
                </div>
              </div>
            </div>

            {mode === 'full' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-gray-800">Itens / Produtos</h2>
                  <button
                    onClick={handleAddProduto}
                    className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl hover:bg-blue-100 transition font-bold flex items-center gap-2"
                  >
                    <span>➕</span> Novo Item
                  </button>
                </div>

                <div className="space-y-4">
                  {produtos.length === 0 ? (
                    <p className="py-8 text-center text-gray-400 italic">Nenhum item adicionado.</p>
                  ) : (
                    produtos.map((produto, index) => (
                      <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex-grow">
                          <input
                            type="text"
                            placeholder="Produto"
                            value={produto.nome}
                            onChange={(e) => handleProdutoChange(index, 'nome', e.target.value)}
                            className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                          />
                        </div>
                        <div className="w-20">
                          <input
                            type="number"
                            value={produto.quantidade}
                            onChange={(e) => handleProdutoChange(index, 'quantidade', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-center"
                          />
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            step="0.01"
                            value={produto.preco_unitario}
                            onChange={(e) => handleProdutoChange(index, 'preco_unitario', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          />
                        </div>
                        <div className="w-32 text-right p-2 font-black text-gray-700">
                          R$ {produto.preco_total.toFixed(2)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-gray-500 font-bold uppercase tracking-widest text-xs">Total Calculado</span>
                  <span className="text-3xl font-black text-gray-800">R$ {total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <ImportadorInteligente 
              onResultReady={handleAiResultReady} 
              categorias={categorias}
            />

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Informações de Origem</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Conta de Origem</label>
                  <select
                    value={contaId}
                    onChange={(e) => setContaId(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-sm"
                  >
                    {contas.map(acc => <option key={acc.id} value={acc.id}>{acc.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Responsável</label>
                  <select
                    value={usuarioId}
                    onChange={(e) => setUsuarioId(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-sm"
                  >
                    {usuarios.map(usr => <option key={usr.id} value={usr.id}>{usr.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isRecorrente}
                  onChange={(e) => setIsRecorrente(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 cursor-pointer"
                />
                <span className="text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">Recorrência</span>
              </label>

              {isRecorrente && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <select
                    value={frequencia}
                    onChange={(e) => setFrequencia(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-bold"
                  >
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 text-white px-8 py-5 rounded-2xl hover:bg-blue-700 transition shadow-xl shadow-blue-100 font-black text-xl"
          >
            Salvar Saída
          </button>
          <button
            onClick={() => router.push('/transacoes?tipo=saida')}
            className="px-8 py-5 bg-white text-gray-400 rounded-2xl hover:bg-gray-50 transition border border-gray-200 font-bold"
          >
            Cancelar
          </button>
        </div>
      </div>

      <ReviewModal 
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        data={aiResult}
        onSave={handleConfirmAiResult}
      />
    </div>
  );
}