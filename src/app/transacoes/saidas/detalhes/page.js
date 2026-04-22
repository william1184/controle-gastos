"use client";
import { getSaidaById } from '@/lib/saidasDb';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function ConsultaSaidaContent() {
  const [produtos, setProdutos] = useState([]);
  const [data, setData] = useState('');
  const [apelido, setApelido] = useState('');
  const [total, setTotal] = useState(0);
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      if (id) {
        const saida = await getSaidaById(Number(id));
        if (saida) {
          setProdutos(saida.produtos || []);
          setData(saida.data);
          setApelido(saida.apelido || '');
          setTotal(saida.total);
        }
      }
    };
    loadData();
  }, [id]);

  const handleBack = () => {
    router.push('/transacoes?tipo=saida');
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Consulta de Saida</h1>
      <div className="mb-4">
        <label className="block text-sm font-medium">Apelido</label>
        <p className="w-full p-2 border rounded bg-gray-200">{apelido}</p>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Data</label>
        <p className="w-full p-2 border rounded bg-gray-200">{data}</p>
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
              <td className="border border-gray-300 p-2">{produto.nome}</td>
              <td className="border border-gray-300 p-2">{produto.codigo}</td>
              <td className="border border-gray-300 p-2">{produto.quantidade}</td>
              <td className="border border-gray-300 p-2">R$ {produto.preco_unitario.toFixed(2)}</td>
              <td className="border border-gray-300 p-2">R$ {produto.preco_total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4">
        <p className="text-lg font-bold">
          <strong>Total da Saida:</strong> R$ {total.toFixed(2)}
        </p>
      </div>
      <div className="mt-4">
        <button
          onClick={handleBack}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}

export default function ConsultaSaida() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ConsultaSaidaContent />
    </Suspense>
  );
}
