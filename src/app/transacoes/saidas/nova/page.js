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
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up pb-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-4 md:px-0">
        <div>
          <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight">Nova Saída</h1>
          <p className="text-[var(--muted)] font-medium">Registre seus gastos de forma simples ou detalhada.</p>
        </div>
        <div className="flex bg-[var(--card)]/50 backdrop-blur-sm rounded-2xl p-1.5 shadow-sm border border-[var(--border)] w-full md:w-auto">
          <button
            onClick={() => setMode('quick')}
            className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${mode === 'quick' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
          >
            Rápido
          </button>
          <button
            onClick={() => setMode('full')}
            className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${mode === 'full' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
          >
            Completo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 md:px-0">
        <div className="lg:col-span-2 space-y-8">
          <div className="card-premium p-8">
            <h2 className="text-sm font-black text-[var(--foreground)] uppercase tracking-widest mb-8 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
              Informações Básicas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Descrição / Apelido *</label>
                <input
                  type="text"
                  value={apelido}
                  onChange={(e) => setApelido(e.target.value)}
                  placeholder="Ex: Almoço, Supermercado..."
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm outline-none focus:border-blue-500 transition-all text-[var(--foreground)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Data *</label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm outline-none focus:border-blue-500 transition-all text-[var(--foreground)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Categoria</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm outline-none focus:border-blue-500 transition-all cursor-pointer text-[var(--foreground)]"
                >
                  {categorias.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Tipo de Custo</label>
                <select
                  value={tipoCusto}
                  onChange={(e) => setTipoCusto(e.target.value)}
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm outline-none focus:border-blue-500 transition-all cursor-pointer text-[var(--foreground)]"
                >
                  <option value="Variável">Variável</option>
                  <option value="Fixo">Fixo</option>
                </select>
              </div>
            </div>
            
            {mode === 'quick' && (
              <div className="mt-8 space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Valor Total</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={total}
                    onChange={(e) => setTotal(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full p-4 pl-12 bg-[var(--background)] border border-[var(--border)] rounded-3xl font-black text-2xl outline-none focus:border-blue-500 transition-all text-[var(--foreground)]"
                  />
                </div>
              </div>
            )}
          </div>

          {mode === 'full' && (
            <div className="card-premium p-8 animate-fade-in">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-sm font-black text-[var(--foreground)] uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-blue-600 rounded-full"></span>
                  Itens / Produtos
                </h2>
                <button
                  onClick={handleAddProduto}
                  className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition font-black text-[10px] uppercase tracking-widest border border-blue-100 dark:border-blue-900/50"
                >
                  ➕ Novo Item
                </button>
              </div>

              <div className="space-y-4">
                {produtos.length === 0 ? (
                  <div className="py-12 text-center bg-[var(--background)] rounded-[2rem] border-2 border-dashed border-[var(--border)]">
                    <p className="text-[var(--muted)] font-medium italic">Nenhum item adicionado.</p>
                  </div>
                ) : (
                  produtos.map((produto, index) => (
                    <div key={index} className="flex flex-col md:flex-row gap-4 p-6 bg-[var(--background)] rounded-3xl border border-[var(--border)] group transition-all hover:border-blue-500/50">
                      <div className="flex-grow space-y-1">
                        <label className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Nome do Item</label>
                        <input
                          type="text"
                          placeholder="Ex: Arroz 5kg"
                          value={produto.nome}
                          onChange={(e) => handleProdutoChange(index, 'nome', e.target.value)}
                          className="w-full p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl font-bold text-sm outline-none focus:border-blue-500 transition-all text-[var(--foreground)]"
                        />
                      </div>
                      <div className="w-full md:w-24 space-y-1">
                        <label className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Qtd</label>
                        <input
                          type="number"
                          value={produto.quantidade}
                          onChange={(e) => handleProdutoChange(index, 'quantidade', parseFloat(e.target.value) || 0)}
                          className="w-full p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl font-bold text-sm outline-none focus:border-blue-500 transition-all text-center text-[var(--foreground)]"
                        />
                      </div>
                      <div className="w-full md:w-32 space-y-1">
                        <label className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Preço Un.</label>
                        <input
                          type="number"
                          step="0.01"
                          value={produto.preco_unitario}
                          onChange={(e) => handleProdutoChange(index, 'preco_unitario', parseFloat(e.target.value) || 0)}
                          className="w-full p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl font-bold text-sm outline-none focus:border-blue-500 transition-all text-[var(--foreground)]"
                        />
                      </div>
                      <div className="w-full md:w-32 space-y-1">
                        <label className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest ml-1 text-right block pr-1">Total Item</label>
                        <div className="p-2.5 font-black text-[var(--foreground)] text-right bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50">
                          R$ {produto.preco_total.toFixed(2)}
                        </div>
                      </div>
                      <button 
                        onClick={() => setProdutos(produtos.filter((_, i) => i !== index))}
                        className="md:mt-6 p-2 text-rose-400 hover:text-rose-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-[var(--border)] flex justify-between items-center">
                <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Valor Total Acumulado</span>
                <span className="text-4xl font-black text-[var(--foreground)] tracking-tighter">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8 px-4 md:px-0">
          <div className="card-premium p-8 bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-none shadow-indigo-500/20">
             <ImportadorInteligente 
               onResultReady={handleAiResultReady} 
               categorias={categorias}
             />
          </div>

          <div className="card-premium p-8 space-y-6">
            <h3 className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-3 bg-blue-600 rounded-full"></span>
              Fluxo de Caixa
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Conta de Origem</label>
                <select
                  value={contaId}
                  onChange={(e) => setContaId(e.target.value)}
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm outline-none focus:border-blue-500 transition-all cursor-pointer text-[var(--foreground)]"
                >
                  {contas.map(acc => <option key={acc.id} value={acc.id}>{acc.nome}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Responsável</label>
                <select
                  value={usuarioId}
                  onChange={(e) => setUsuarioId(e.target.value)}
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm outline-none focus:border-blue-500 transition-all cursor-pointer text-[var(--foreground)]"
                >
                  {usuarios.map(usr => <option key={usr.id} value={usr.id}>{usr.nome}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="card-premium p-8">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={isRecorrente}
                onChange={(e) => setIsRecorrente(e.target.checked)}
                className="w-5 h-5 accent-blue-600 cursor-pointer rounded-lg"
              />
              <span className="text-sm font-black text-[var(--foreground)] group-hover:text-blue-600 transition-colors uppercase tracking-widest">Recorrência</span>
            </label>

            {isRecorrente && (
              <div className="mt-6 pt-6 border-t border-[var(--border)] animate-fade-in">
                <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1 mb-2 block">Frequência</label>
                <select
                  value={frequencia}
                  onChange={(e) => setFrequencia(e.target.value)}
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-black text-sm outline-none focus:border-blue-500 transition-all cursor-pointer text-[var(--foreground)]"
                >
                  <option value="semanal">Semanal</option>
                  <option value="mensal">Mensal</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleSave}
              className="btn-primary w-full py-5 text-lg shadow-blue-500/30"
            >
              Salvar Lançamento
            </button>
            <button
              onClick={() => router.push('/transacoes?tipo=saida')}
              className="w-full py-4 text-sm font-black text-[var(--muted)] hover:text-[var(--foreground)] transition-colors uppercase tracking-widest"
            >
              Cancelar
            </button>
          </div>
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