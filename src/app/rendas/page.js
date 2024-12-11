"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Rendas() {
  const [rendas, setRendas] = useState([]);

  useEffect(() => {
    const storedRendas = JSON.parse(localStorage.getItem('rendas')) || [];
    setRendas(storedRendas);
  }, []);

  const handleDelete = (index) => {
    const updatedRendas = [...rendas];
    updatedRendas.splice(index, 1);
    setRendas(updatedRendas);
    localStorage.setItem('rendas', JSON.stringify(updatedRendas));
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-green-600">Lista de Rendas</h1>
      <div className="flex flex-wrap gap-4 mb-4">
        <Link
          href="/rendas/nova"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Adicionar Renda
        </Link>
      </div>
      <table className="w-full border-collapse border border-gray-300 bg-white shadow-sm">
        <thead>
          <tr className="bg-gray-200 text-gray-700">
            <th className="border border-gray-300 p-2">Data</th>
            <th className="border border-gray-300 p-2">Descrição</th>
            <th className="border border-gray-300 p-2">Categoria</th>
            <th className="border border-gray-300 p-2">Valor (R$)</th>
            <th className="border border-gray-300 p-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rendas.map((renda, index) => (
            <tr key={index}>
              <td className="border border-gray-300 p-2 text-center">{renda.data}</td>
              <td className="border border-gray-300 p-2">{renda.descricao || '-'}</td>
              <td className="border border-gray-300 p-2 text-center">{renda.categoria || '-'}</td>
              <td className="border border-gray-300 p-2 text-center text-green-700 font-bold">R$ {parseFloat(renda.valor).toFixed(2)}</td>
              <td className="border border-gray-300 p-2 text-center">
                <div className="flex justify-center gap-2">
                  <Link
                    href={`/rendas/editar/${index}`}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(index)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {rendas.length === 0 && (
            <tr>
              <td colSpan="5" className="border border-gray-300 p-4 text-center text-gray-500">
                Nenhuma renda cadastrada até o momento.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}