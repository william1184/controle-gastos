"use client";
import { addGasto, getGastos } from '@/lib/gastosDb';
import { addRenda, getRendas } from '@/lib/rendasDb';
import { getActiveUsuario } from '@/lib/usuarioDb';
import { getContas } from '@/lib/contaDb';
import { getActiveEntidade } from '@/lib/entidadeDb';
import { getConfiguracoes } from '@/lib/storeDb';
import { useEffect, useState } from 'react';

export default function ImportExport() {
  const [gastos, setGastos] = useState([]);
  const [rendas, setRendas] = useState([]);
  const [categoriasGastos, setCategoriasGastos] = useState([]);
  const [categoriasRendas, setCategoriasRendas] = useState([]);
  const [perfis, setPerfis] = useState([]);

  // Estados de Mapeamento de Extrato CSV
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvLines, setCsvLines] = useState([]);
  const [csvMapping, setCsvMapping] = useState({ data: '', valor: '', descricao: '' });
  const [activeUsuario, setActiveUsuario] = useState(null);
  const [contas, setContas] = useState([]);
  const [selectedContaId, setSelectedContaId] = useState('');

  useEffect(() => {
    async function loadData() {
      const storedGastos = await getGastos();
      const storedRendas = await getRendas();
      setGastos(storedGastos);
      setRendas(storedRendas);

      const config = await getConfiguracoes();
      let catGastos = config.categoriasGastos || ['Moradia', 'Contas', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Investimentos', 'Outros'];
      if (catGastos.length > 0 && typeof catGastos[0] === 'object') {
        catGastos = catGastos.map(c => c.nome);
      }
      setCategoriasGastos(catGastos);
      setCategoriasRendas(config.categoriasRendas || ['Salário', 'Freelance', 'Investimentos', 'Rendimentos', 'Outros']);

      let loadedPerfis = config.perfis || [];
      if (loadedPerfis.length === 0) {
        loadedPerfis = [{ id: 0, nome: 'Perfil Padrão', renda: 1200, dataNascimento: '1992-04-27' }];
      }
      setPerfis(loadedPerfis);

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

        // Guessing logic
        let dateIdx = headersLower.findIndex(h => h.includes('data') || h.includes('date'));
        let valIdx = headersLower.findIndex(h => h === 'valor' || h === 'amount' || h.includes('deb_cred') || h.includes('deb') || h.includes('cred') || h.includes('valor'));
        let descIdx = headersLower.findIndex(h => h.includes('descri') || h.includes('hist') || h.includes('detalhe') || h.includes('lançamento') || h.includes('estabelecimento'));

        // If not found by header, try by content
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

        // Descrição fallback: longest non-date/non-value column
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
        console.error('[ImportExport] Erro ao parsear CSV:', error);
        alert('Ocorreu um erro ao processar o extrato. Verifique a formatação do arquivo.');
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
        if (lastComma > lastDot) {
          s = s.replace(/\./g, '').replace(',', '.');
        } else {
          s = s.replace(/,/g, '');
        }
      } else if (s.includes(',')) {
        s = s.replace(',', '.');
      }
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
      for (const g of novosGastos) {
        await addGasto(g);
      }
      for (const r of novasRendas) {
        await addRenda(r);
      }

      const updatedGastos = await getGastos();
      const updatedRendas = await getRendas();
      setGastos(updatedGastos);
      setRendas(updatedRendas);
      alert(`Extrato importado com sucesso!\n\n${novosGastos.length} gastos adicionados.\n${novasRendas.length} rendas adicionadas.`);
    } else {
      alert('Nenhum registro válido encontrado. Verifique o mapeamento das colunas.');
    }

    setIsCsvModalOpen(false);
    setCsvHeaders([]);
    setCsvLines([]);
  };

  const handleImportOfx = (event) => {
    // Placeholder para a futura implementação do OFX
    alert('A importação de arquivos .OFX será implementada em breve!');
    event.target.value = '';
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Importação e Exportação</h1>
      <p className="text-gray-600 mb-8">Faça o backup dos seus dados ou importe transações do seu banco.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">



        {/* Card Importação Bancária */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-indigo-600">Importar Extrato Bancário</h2>
          <p className="text-sm text-gray-600 mb-6">Importe as transações do seu banco (Itaú, Nubank, Mercado Livre, etc) para categorizar automaticamente. Esses dados serão adicionados aos seus registros atuais.</p>

          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-medium flex justify-center items-center gap-2 cursor-pointer">
              <span>📄</span> Importar Extrato (.csv, .txt)
              <input type="file" accept=".csv,.txt" onChange={handleImportExtratoCSV} className="hidden" />
            </label>

            <label className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium flex justify-center items-center gap-2 cursor-pointer">
              <span>🏦</span> Importar Extrato (.ofx)
              <input type="file" accept=".ofx" onChange={handleImportOfx} className="hidden" />
            </label>
          </div>
        </div>

      </div>

      {/* Modal Mapeamento CSV */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Mapear Colunas do Extrato</h2>
            <p className="text-sm text-gray-600 mb-4">Selecione quais colunas do seu arquivo correspondem aos campos essenciais do sistema.</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Data (Ex: DATA_MOVIMENTACAO) *</label>
              <select value={csvMapping.data} onChange={e => setCsvMapping({ ...csvMapping, data: e.target.value })} className="w-full p-2 border border-gray-300 rounded bg-white">
                <option value="">-- Selecione --</option>
                {csvHeaders.map(h => <option key={`data-${h}`} value={h}>{h}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (Ex: DEB_CRED / VALOR) *</label>
              <select value={csvMapping.valor} onChange={e => setCsvMapping({ ...csvMapping, valor: e.target.value })} className="w-full p-2 border border-gray-300 rounded bg-white">
                <option value="">-- Selecione --</option>
                {csvHeaders.map(h => <option key={`valor-${h}`} value={h}>{h}</option>)}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (Opcional)</label>
              <select value={csvMapping.descricao} onChange={e => setCsvMapping({ ...csvMapping, descricao: e.target.value })} className="w-full p-2 border border-gray-300 rounded bg-white">
                <option value="">-- Ignorar ou Selecionar --</option>
                {csvHeaders.map(h => <option key={`desc-${h}`} value={h}>{h}</option>)}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Conta de Destino *</label>
              <select 
                value={selectedContaId} 
                onChange={e => setSelectedContaId(e.target.value)} 
                className="w-full p-2 border border-gray-300 rounded bg-white"
                required
              >
                <option value="">-- Selecione uma Conta --</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>)}
              </select>
              {contas.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Você precisa cadastrar uma conta primeiro!</p>
              )}
            </div>

            <div className="flex gap-4">
              <button onClick={handleConfirmMapping} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition w-full font-medium">Importar</button>
              <button onClick={() => { setIsCsvModalOpen(false); setCsvHeaders([]); setCsvLines([]); }} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition w-full font-medium">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}