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

  const handleBack = () => {
    router.push('/transacoes?tipo=entrada');
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-green-600">Nova Entrada</h1>

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
              {categoriasSalvas.map((cat) => (
                <option key={cat.id} value={cat.nome}>{cat.nome}</option>
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

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Responsável</label>
          <select
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 bg-white transition"
          >
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
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

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Tags</label>
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
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${selectedTagIds.includes(tag.id)
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
              >
                {tag.nome}
              </button>
            ))}
            {availableTags.length === 0 && (
              <p className="text-[10px] text-gray-400 italic">Nenhuma tag cadastrada.</p>
            )}
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
            <span className="text-sm font-semibold text-gray-700 group-hover:text-green-600 transition">Esta é uma entrada recorrente</span>
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
          <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition w-full font-bold shadow-md">Salvar Entrada</button>
          <button onClick={handleBack} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition w-full font-bold shadow-md">Voltar</button>
        </div>
      </div>
    </div>
  );
}
