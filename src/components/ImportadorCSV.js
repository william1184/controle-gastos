"use client";
import { useEffect, useState } from 'react';
import { addGasto, getGastos } from '@/lib/gastosDb';
import { addRenda, getRendas } from '@/lib/rendasDb';
import { getActiveUsuario } from '@/lib/usuarioDb';
import { getContas } from '@/lib/contaDb';
import { getActiveEntidade } from '@/lib/entidadeDb';
import { getConfiguracoes } from '@/lib/storeDb';

export default function ImportadorCSV({ onImportComplete }) {
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvLines, setCsvLines] = useState([]);
  const [csvMapping, setCsvMapping] = useState({ data: '', valor: '', descricao: '' });
  const [activeUsuario, setActiveUsuario] = useState(null);
  const [contas, setContas] = useState([]);
  const [selectedContaId, setSelectedContaId] = useState('');
  const [categoriasGastos, setCategoriasGastos] = useState([]);
  const [categoriasRendas, setCategoriasRendas] = useState([]);

  useEffect(() => {
    async function loadData() {
      const config = await getConfiguracoes();
      let catGastos = config.categoriasGastos || ['Moradia', 'Contas', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Investimentos', 'Outros'];
      if (catGastos.length > 0 && typeof catGastos[0] === 'object') {
        catGastos = catGastos.map(c => c.nome);
      }
      setCategoriasGastos(catGastos);
      setCategoriasRendas(config.categoriasRendas || ['Salário', 'Freelance', 'Investimentos', 'Rendimentos', 'Outros']);

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
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) return;

        const separator = text.indexOf(';') > -1 ? ';' : ',';

        const parseLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && line[i + 1] === '"') {
              current += '"';
              i++;
            } else if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === separator && !inQuotes) {
              result.push(current);
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current);
          return result;
        };

        const headersRaw = parseLine(lines[0]);
        const headers = headersRaw.map(h => h.trim());
        const headersLower = headers.map(h => h.toLowerCase());
        const dataRows = lines.slice(1).map(l => parseLine(l));

        let dateIdx = headersLower.findIndex(h => h.includes('data') || h.includes('date'));
        let valIdx = headersLower.findIndex(h => h === 'valor' || h === 'amount' || h.includes('deb_cred') || h.includes('deb') || h.includes('cred') || h.includes('valor'));
        let descIdx = headersLower.findIndex(h => h.includes('descri') || h.includes('hist') || h.includes('detalhe') || h.includes('lançamento') || h.includes('estabelecimento'));

        if (dateIdx === -1 || valIdx === -1) {
          const sampleRows = dataRows.slice(0, 10);
          for (let col = 0; col < headers.length; col++) {
            let matchesDate = 0;
            let matchesValue = 0;
            sampleRows.forEach(row => {
              const val = (row[col] || '').trim();
              if (/^(\d{2})\/(\d{2})\/(\d{4})$/.test(val) || /^(\d{4})-(\d{2})-(\d{2})$/.test(val)) matchesDate++;
              if (/[0-9]/.test(val) && (val.includes(',') || val.includes('.')) && !val.includes('/')) matchesValue++;
            });
            if (dateIdx === -1 && matchesDate > sampleRows.length / 2) dateIdx = col;
            else if (valIdx === -1 && matchesValue > sampleRows.length / 2) valIdx = col;
          }
        }

        if (descIdx === -1) {
          let maxLen = -1;
          for (let col = 0; col < headers.length; col++) {
            if (col === dateIdx || col === valIdx) continue;
            let avgLen = dataRows.slice(0, 5).reduce((acc, row) => acc + (row[col]?.length || 0), 0) / 5;
            if (avgLen > maxLen) {
              maxLen = avgLen;
              descIdx = col;
            }
          }
        }

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
    reader.readAsText(file);
  };

  const handleConfirmMapping = async () => {
    if (!csvMapping.data || !csvMapping.valor) {
      alert("Por favor, mapeie pelo menos as colunas de Data e Valor.");
      return;
    }

    const dateIdx = csvHeaders.indexOf(csvMapping.data);
    const valIdx = csvHeaders.indexOf(csvMapping.valor);
    const descIdx = csvHeaders.indexOf(csvMapping.descricao);
    const profileId = activeUsuario?.id || 0;

    let novosGastos = [];
    let novasRendas = [];

    const parseDate = (str) => {
      const s = str.trim();
      if (/^(\d{2})\/(\d{2})\/(\d{4})$/.test(s)) {
        const parts = s.split('/');
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else if (/^(\d{4})-(\d{2})-(\d{2})$/.test(s)) {
        return s;
      }
      return null;
    };

    const parseCurrency = (str) => {
      let s = str.trim().replace(/[a-zA-Z\sR$]/g, '');
      if (s === '') return null;
      if (s.includes('.') && s.includes(',')) {
        const lastDot = s.lastIndexOf('.');
        const lastComma = s.lastIndexOf(',');
        if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
        else s = s.replace(/,/g, '');
      } else if (s.includes(',')) s = s.replace(',', '.');
      const num = parseFloat(s);
      return isNaN(num) ? null : num;
    };

    for (let i = 0; i < csvLines.length; i++) {
      const cols = csvLines[i];
      if (cols.length < 2) continue;

      let data = parseDate(cols[dateIdx] || '');
      let rawValor = (cols[valIdx] || '').trim().toUpperCase();
      let valorParsed = parseCurrency(rawValor);
      let descricao = descIdx !== -1 ? (cols[descIdx] || '').trim() : '';

      if (data && valorParsed !== null && valorParsed !== 0) {
        let isDebito = null;
        if (rawValor.endsWith('D') || rawValor.endsWith('DEB') || rawValor.endsWith('-') || rawValor.startsWith('-')) isDebito = true;
        else if (rawValor.endsWith('C') || rawValor.endsWith('CRED') || rawValor.endsWith('+') || rawValor.startsWith('+')) isDebito = false;

        let valorFinal = valorParsed;
        if (isDebito === true) valorFinal = -Math.abs(valorParsed);
        else if (isDebito === false) valorFinal = Math.abs(valorParsed);

        if (valorFinal < 0) {
          novosGastos.push({
            data,
            apelido: descricao || 'Gasto do Extrato',
            categoria: categoriasGastos.length > 0 ? categoriasGastos[0] : 'Outros',
            tipoCusto: 'Variável',
            total: Math.abs(valorFinal),
            perfilId: profileId,
            contaId: selectedContaId ? parseInt(selectedContaId) : undefined,
            produtos: []
          });
        } else {
          novasRendas.push({
            data,
            descricao: descricao || 'Renda do Extrato',
            categoria: categoriasRendas.length > 0 ? categoriasRendas[0] : 'Outros',
            valor: valorFinal,
            perfilId: profileId,
            contaId: selectedContaId ? parseInt(selectedContaId) : undefined
          });
        }
      }
    }

    if (novosGastos.length > 0 || novasRendas.length > 0) {
      for (const g of novosGastos) await addGasto(g);
      for (const r of novasRendas) await addRenda(r);
      alert(`Importado com sucesso!\n${novosGastos.length} gastos, ${novasRendas.length} rendas.`);
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
