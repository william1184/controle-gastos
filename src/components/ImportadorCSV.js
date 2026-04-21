"use client";
import { getCategorias } from '@/lib/categoriaDb';
import { getContas } from '@/lib/contaDb';
import { getActiveEntidade } from '@/lib/entidadeDb';
import { addEntrada } from '@/lib/entradasDb';
import { addSaida } from '@/lib/saidasDb';
import { getActiveUsuario } from '@/lib/usuarioDb';
import { parseCsvLine, parseCsvDate, parseCsvCurrency, detectCsvColumns } from '@/lib/csvUtils';
import { useEffect, useState } from 'react';

export default function ImportadorCSV({ onImportComplete }) {
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvLines, setCsvLines] = useState([]);
  const [csvMapping, setCsvMapping] = useState({ data: '', valor: '', descricao: '' });
  const [activeUsuario, setActiveUsuario] = useState(null);
  const [contas, setContas] = useState([]);
  const [selectedContaId, setSelectedContaId] = useState('');
  const [categoriasSaidas, setCategoriasSaidas] = useState([]);
  const [categoriasEntradas, setCategoriasEntradas] = useState([]);

  useEffect(() => {
    async function loadData() {
      const [catG, catR] = await Promise.all([
        getCategorias('saida'),
        getCategorias('entrada')
      ]);
      setCategoriasSaidas(catG.map(c => c.nome));
      setCategoriasEntradas(catR.map(c => c.nome));

      const activeUser = await getActiveUsuario();
      setActiveUsuario(activeUser);

      const ent = await getActiveEntidade();
      if (ent) {
        const availableContas = await getContas(ent.id);
        setContas(availableContas);
        if (availableContas.length > 0) {
          setSelectedContaId(availableContas[0].id.toString());
        }
      }
    }
    loadData();
  }, []);

  const handleImportExtratoCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target.result;
        
        // Try decoding as UTF-8 first
        let decoder = new TextDecoder('utf-8');
        let text = decoder.decode(arrayBuffer);
        
        // Check if there are "replacement characters" () which indicate decoding issues
        if (text.includes('\ufffd')) {
          // If UTF-8 failed, try ISO-8859-1 (Latin1)
          decoder = new TextDecoder('iso-8859-1');
          text = decoder.decode(arrayBuffer);
        }

        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) return;

        const separator = text.indexOf(';') > -1 ? ';' : ',';

        const headersRaw = parseCsvLine(lines[0], separator);
        const headers = headersRaw.map(h => h.trim());
        const dataRows = lines.slice(1).map(l => parseCsvLine(l, separator));

        const { dateIdx, valIdx, descIdx } = detectCsvColumns(headers, dataRows);

        setCsvHeaders(headers);
        setCsvLines(dataRows);
        setCsvMapping({
          data: dateIdx !== -1 ? headers[dateIdx] : '',
          valor: valIdx !== -1 ? headers[valIdx] : '',
          descricao: descIdx !== -1 ? headers[descIdx] : ''
        });
        setIsCsvModalOpen(true);
        event.target.value = '';
      } catch (error) {
        console.error('Erro ao parsear CSV:', error);
        alert('Ocorreu um erro ao processar o extrato.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmMapping = async () => {
    if (!csvMapping.data || !csvMapping.valor) {
      alert("Por favor, mapeie pelo menos as colunas de Data e Valor.");
      return;
    }

    const dateIdx = csvHeaders.indexOf(csvMapping.data);
    const valIdx = csvHeaders.indexOf(csvMapping.valor);
    const descIdx = csvHeaders.indexOf(csvMapping.descricao);
    const usuarioId = activeUsuario?.id || 0;

    let novosSaidas = [];
    let novasEntradas = [];

    for (let i = 0; i < csvLines.length; i++) {
      const cols = csvLines[i];
      if (cols.length < 2) continue;

      let data = parseCsvDate(cols[dateIdx] || '');
      let rawValor = (cols[valIdx] || '').trim().toUpperCase();
      let valorParsed = parseCsvCurrency(rawValor);
      let descricao = descIdx !== -1 ? (cols[descIdx] || '').trim() : '';

      if (data && valorParsed !== null && valorParsed !== 0) {
        let isDebito = null;
        if (rawValor.endsWith('D') || rawValor.endsWith('DEB') || rawValor.endsWith('-') || rawValor.startsWith('-')) isDebito = true;
        else if (rawValor.endsWith('C') || rawValor.endsWith('CRED') || rawValor.endsWith('+') || rawValor.startsWith('+')) isDebito = false;

        let valorFinal = valorParsed;
        if (isDebito === true) valorFinal = -Math.abs(valorParsed);
        else if (isDebito === false) valorFinal = Math.abs(valorParsed);

        if (valorFinal < 0) {
          novosSaidas.push({
            data,
            apelido: descricao || 'Saida do Extrato',
            categoria: categoriasSaidas.length > 0 ? categoriasSaidas[0] : 'Outros',
            tipoCusto: 'Variável',
            total: Math.abs(valorFinal),
            usuarioId: usuarioId,
            contaId: selectedContaId ? parseInt(selectedContaId) : undefined,
            produtos: []
          });
        } else {
          novasEntradas.push({
            data,
            descricao: descricao || 'Entrada do Extrato',
            categoria: categoriasEntradas.length > 0 ? categoriasEntradas[0] : 'Outros',
            valor: valorFinal,
            usuarioId: usuarioId,
            contaId: selectedContaId ? parseInt(selectedContaId) : undefined
          });
        }
      }
    }

    if (novosSaidas.length > 0 || novasEntradas.length > 0) {
      for (const g of novosSaidas) await addSaida(g);
      for (const r of novasEntradas) await addEntrada(r);
      alert(`Importado com sucesso!\n${novosSaidas.length} saidas, ${novasEntradas.length} entradas.`);
      if (onImportComplete) onImportComplete();
    } else {
      alert('Nenhum registro válido encontrado.');
    }

    setIsCsvModalOpen(false);
    setCsvHeaders([]);
    setCsvLines([]);
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-200">
      <div className="max-w-xl mx-auto text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Importar Extrato Bancário</h2>
        <p className="text-gray-500 mb-8">Arraste seu arquivo CSV ou TXT para categorizar suas transações automaticamente.</p>

        <label className="block w-full border-2 border-dashed border-gray-200 rounded-3xl p-12 hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer group">
          <span className="text-gray-400 group-hover:text-blue-600 font-bold">Clique para selecionar arquivo</span>
          <input type="file" accept=".csv,.txt" onChange={handleImportExtratoCSV} className="hidden" />
        </label>
      </div>

      {isCsvModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100">
            <h2 className="text-xl font-bold mb-2 text-gray-900">Mapear Colunas</h2>
            <p className="text-sm text-gray-500 mb-6">Identifique as colunas de data, valor e descrição.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Data *</label>
                <select value={csvMapping.data} onChange={e => setCsvMapping({ ...csvMapping, data: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">-- Selecione --</option>
                  {csvHeaders.map(h => <option key={`data-${h}`} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Valor *</label>
                <select value={csvMapping.valor} onChange={e => setCsvMapping({ ...csvMapping, valor: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">-- Selecione --</option>
                  {csvHeaders.map(h => <option key={`valor-${h}`} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Descrição</label>
                <select value={csvMapping.descricao} onChange={e => setCsvMapping({ ...csvMapping, descricao: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">-- Ignorar ou Selecionar --</option>
                  {csvHeaders.map(h => <option key={`desc-${h}`} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Conta de Destino *</label>
                <select
                  value={selectedContaId}
                  onChange={e => setSelectedContaId(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">-- Selecione --</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => { setIsCsvModalOpen(false); setCsvHeaders([]); setCsvLines([]); }} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all">Cancelar</button>
              <button onClick={handleConfirmMapping} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">Importar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
