"use client";
import { getCategorias } from '@/lib/categoriaDb';
import { getContas } from '@/lib/contaDb';
import { getActiveEntidade } from '@/lib/entidadeDb';
import { addEntrada } from '@/lib/entradasDb';
import { getTags } from '@/lib/tagDb';
import { getUsuarios } from '@/lib/usuarioDb';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NovaEntrada() {
  const [data, setData] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [contaId, setContaId] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [categoriasSalvas, setCategoriasSalvas] = useState([]);
  const [contas, setContas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);

  // Recorrência
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [frequencia, setFrequencia] = useState('mensal');

  const router = useRouter();

  useEffect(() => {
    const hoje = new Date().toISOString().split('T')[0];
    setData(hoje);

    const loadData = async () => {
      const [cats, tags, loadedContas] = await Promise.all([
        getCategorias('entrada'),
        getTags(),
        getContas()
      ]);
      setCategoriasSalvas(cats);
      if (cats.length > 0) {
        setCategoria(cats[0].nome);
      }
      setAvailableTags(tags);
      setContas(loadedContas);
      if (loadedContas.length > 0) {
        setContaId(loadedContas[0].id);
      }

      const ent = await getActiveEntidade();
      if (ent) {
        const usrs = await getUsuarios(ent.id);
        setUsuarios(usrs);
        if (usrs.length > 0) setUsuarioId(usrs[0].id);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    if (!data || !categoria || !valor || parseFloat(valor) <= 0 || !contaId || !usuarioId) {
      alert('Por favor, preencha a data, a categoria, a conta, o usuário e um valor maior que zero.');
      return;
    }

    const entradaData = {
      data,
      descricao,
      categoria,
      valor: parseFloat(valor),
      contaId: Number(contaId),
      usuarioId: Number(usuarioId),
      tagIds: selectedTagIds
    };

    if (isRecorrente) {
      entradaData.recorrencia = { frequencia };
    }

    await addEntrada(entradaData);
    router.push('/transacoes?tipo=entrada');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up pb-12">
      <div className="px-4 md:px-0">
        <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight">Nova Entrada</h1>
        <p className="text-[var(--muted)] font-medium">Registre seus ganhos e rendas no sistema.</p>
      </div>

      <div className="card-premium p-8">
        <h2 className="text-sm font-black text-[var(--foreground)] uppercase tracking-widest mb-8 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-emerald-600 rounded-full"></span>
          Detalhes do Recebimento
        </h2>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Descrição (Opcional)</label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Salário, Freelance, Pix do Amigo..."
              className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 transition-all text-[var(--foreground)]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 transition-all cursor-pointer text-[var(--foreground)]"
              >
                {categoriasSalvas.map((cat) => (
                  <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Data</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 transition-all text-[var(--foreground)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Conta de Destino</label>
              <select
                value={contaId}
                onChange={(e) => setContaId(e.target.value)}
                className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 transition-all cursor-pointer text-[var(--foreground)]"
              >
                {contas.map((conta) => (
                  <option key={conta.id} value={conta.id}>{conta.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Responsável</label>
              <select
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
                className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 transition-all cursor-pointer text-[var(--foreground)]"
              >
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1">Valor Recebido</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className="w-full p-4 pl-12 bg-[var(--background)] border border-[var(--border)] rounded-3xl font-black text-2xl outline-none focus:border-emerald-500 transition-all text-emerald-600 dark:text-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card-premium p-8">
        <h2 className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-6 ml-1">Tags (Opcional)</h2>
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
              className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border transition-all ${selectedTagIds.includes(tag.id)
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/20'
                : 'bg-[var(--background)] text-[var(--muted)] border-[var(--border)] hover:border-emerald-500/50 hover:text-[var(--foreground)]'
                }`}
            >
              {tag.nome}
            </button>
          ))}
          {availableTags.length === 0 && (
            <p className="text-[10px] text-[var(--muted)] font-bold italic uppercase tracking-widest">Nenhuma tag cadastrada.</p>
          )}
        </div>
      </div>

      <div className="card-premium p-8">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={isRecorrente}
            onChange={(e) => setIsRecorrente(e.target.checked)}
            className="w-5 h-5 accent-emerald-600 cursor-pointer rounded-lg"
          />
          <span className="text-sm font-black text-[var(--foreground)] group-hover:text-emerald-600 transition-colors uppercase tracking-widest">Entrada Recorrente</span>
        </label>

        {isRecorrente && (
          <div className="mt-6 pt-6 border-t border-[var(--border)] animate-fade-in">
            <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest ml-1 mb-2 block">Frequência</label>
            <select
              value={frequencia}
              onChange={(e) => setFrequencia(e.target.value)}
              className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-2xl font-black text-sm outline-none focus:border-emerald-500 transition-all cursor-pointer text-[var(--foreground)]"
            >
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
              <option value="anual">Anual</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 px-4 md:px-0">
        <button
          onClick={handleSave}
          className="btn-primary flex-1 py-5 text-xl bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
        >
          Salvar Entrada
        </button>
        <button
          onClick={() => router.back()}
          className="flex-1 md:flex-none px-8 py-5 bg-[var(--card)] text-[var(--muted)] rounded-2xl hover:bg-[var(--background)] transition border border-[var(--border)] font-bold uppercase tracking-widest text-sm"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
