"use client";
import { addGasto, clearGastos, getGastos } from '@/lib/gastosDb';
import { addRenda, clearRendas, getRendas } from '@/lib/rendasDb';
import { getConfiguracoes } from '@/lib/storeDb';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

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
  const [csvMapping, setCsvMapping] = useState({ data: '', valor: '', descricao: '', tipo: '' });
  const [csvProfileId, setCsvProfileId] = useState(0);

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
    }
    loadData();
  }, []);

  const handleExportExcel = () => {
    if (gastos.length === 0 && rendas.length === 0) {
      return alert('Nenhum dado para exportar.');
    }

    const wb = XLSX.utils.book_new();

    // --- Aba de Gastos ---
    const gastosData = [
      ["ID Gasto", "ID Perfil", "Data", "Apelido", "Categoria", "Tipo Custo", "Total Gasto", "Nome do Produto", "Codigo do Produto", "Quantidade", "Unidade", "Preco Unitario", "Preco Total"]
    ];

    gastos.forEach((gasto, index) => {
      if (!gasto.produtos || gasto.produtos.length === 0) {
        gastosData.push([index, gasto.perfilId !== undefined ? gasto.perfilId : 0, gasto.data, gasto.apelido || '', gasto.categoria || '', gasto.tipoCusto || '', gasto.total, '', '', '', '', '', '']);
      } else {
        gasto.produtos.forEach(produto => {
          gastosData.push([
            index,
            gasto.perfilId !== undefined ? gasto.perfilId : 0,
            gasto.data,
            gasto.apelido || '',
            gasto.categoria || '',
            gasto.tipoCusto || '',
            gasto.total,
            produto.nome || '',
            produto.codigo || '',
            produto.quantidade || 0,
            produto.unidade || '',
            produto.preco_unitario || 0,
            produto.preco_total || 0
          ]);
        });
      }
    });

    const wsGastos = XLSX.utils.aoa_to_sheet(gastosData);
    XLSX.utils.book_append_sheet(wb, wsGastos, "Gastos");

    // --- Aba de Rendas ---
    let wsRendas;
    if (rendas.length > 0) {
      wsRendas = XLSX.utils.json_to_sheet(rendas);
    } else {
      wsRendas = XLSX.utils.aoa_to_sheet([["valor", "data", "descricao"]]);
    }
    XLSX.utils.book_append_sheet(wb, wsRendas, "Rendas");

    XLSX.writeFile(wb, "meu_orcamento_backup.xlsx");
  };

  const handleImportExcel = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!window.confirm('A importação irá substituir a base de gastos e rendas atual. Deseja continuar?')) {
      event.target.value = ''; 
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // --- Importar Gastos ---
        const wsGastos = workbook.Sheets["Gastos"];
        let importedGastos = [...gastos];
        if (wsGastos) {
          const gastosRows = XLSX.utils.sheet_to_json(wsGastos, { header: 1 });
          importedGastos = [];
          let currentGastoId = null;
          let currentGasto = null;

          for (let i = 1; i < gastosRows.length; i++) {
            const cols = gastosRows[i];
            if (cols.length === 0) continue;

            let id = cols[0];
            let perfilId = 0, data, apelido, categoria, tipoCusto = '', totalStr, pNome, pCodigo, pQtdStr, pUnidade, pPrecoUniStr, pPrecoTotStr;
            
            if (gastosRows[0].length === 10) {
               data = cols[1]; apelido = cols[2]; categoria = ''; totalStr = cols[3]; 
               pNome = cols[4]; pCodigo = cols[5]; pQtdStr = cols[6]; pUnidade = cols[7]; 
               pPrecoUniStr = cols[8]; pPrecoTotStr = cols[9];
            } else if (gastosRows[0].length === 11) {
               data = cols[1]; apelido = cols[2]; categoria = cols[3]; totalStr = cols[4]; 
               pNome = cols[5]; pCodigo = cols[6]; pQtdStr = cols[7]; pUnidade = cols[8]; 
               pPrecoUniStr = cols[9]; pPrecoTotStr = cols[10];
            } else {
               if (gastosRows[0].length >= 13 && gastosRows[0][5] === "Tipo Custo") {
                 perfilId = cols[1]; data = cols[2]; apelido = cols[3]; categoria = cols[4]; tipoCusto = cols[5]; totalStr = cols[6]; 
                 pNome = cols[7]; pCodigo = cols[8]; pQtdStr = cols[9]; pUnidade = cols[10]; pPrecoUniStr = cols[11]; pPrecoTotStr = cols[12];
               } else {
                 perfilId = cols[1]; data = cols[2]; apelido = cols[3]; categoria = cols[4]; totalStr = cols[5]; 
                 pNome = cols[6]; pCodigo = cols[7]; pQtdStr = cols[8]; pUnidade = cols[9]; pPrecoUniStr = cols[10]; pPrecoTotStr = cols[11];
               }
            }

            if (id !== undefined && id !== "" && id !== currentGastoId) {
              currentGastoId = id;
              currentGasto = {
                perfilId: parseInt(perfilId) || 0,
                data: data,
                apelido: apelido,
                categoria: categoria,
                tipoCusto: tipoCusto || 'Variável',
                total: parseFloat(totalStr) || 0,
                produtos: []
              };
              importedGastos.push(currentGasto);
            }

            if (currentGasto && (pNome || pCodigo)) {
              currentGasto.produtos.push({
                nome: pNome || '',
                codigo: pCodigo || '',
                quantidade: parseFloat(pQtdStr) || 0,
                unidade: pUnidade || '',
                preco_unitario: parseFloat(pPrecoUniStr) || 0,
                preco_total: parseFloat(pPrecoTotStr) || 0
              });
            }
          }
          await clearGastos();
          for (const g of importedGastos) {
            await addGasto(g);
          }
          const loadedGastos = await getGastos();
          setGastos(loadedGastos);
        }

        const wsRendas = workbook.Sheets["Rendas"];
        if (wsRendas) {
          const importedRendas = XLSX.utils.sheet_to_json(wsRendas);
          await clearRendas();
          for (const r of importedRendas) {
            await addRenda(r);
          }
          const loadedRendas = await getRendas();
          setRendas(loadedRendas);
        }

        alert('Base importada com sucesso!');
        event.target.value = '';
      } catch (error) {
        console.error('[ImportExport] Erro ao ler Excel:', error);
        alert('Ocorreu um erro ao importar. Verifique o formato do arquivo.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

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

        let dateIdx = headersLower.findIndex(h => h.includes('data') || h.includes('date'));
        let valIdx = headersLower.findIndex(h => h === 'valor' || h === 'amount' || h.includes('deb_cred') || h.includes('deb') || h.includes('cred'));
        if (valIdx === -1) valIdx = headersLower.findIndex(h => h.includes('valor'));
        let descIdx = headersLower.findIndex(h => h.includes('descri') || h.includes('hist') || h.includes('detalhe') || h.includes('lançamento'));
        let tipoIdx = headersLower.findIndex(h => h === 'tipo' || h.includes('operação') || h.includes('natureza') || h === 't');

        setCsvHeaders(headers);
        setCsvLines(lines.slice(1).map(l => parseLine(l)));
        setCsvMapping({
          data: dateIdx !== -1 ? headers[dateIdx] : '',
          valor: valIdx !== -1 ? headers[valIdx] : '',
          descricao: descIdx !== -1 ? headers[descIdx] : '',
          tipo: tipoIdx !== -1 ? headers[tipoIdx] : ''
        });
        setCsvProfileId(perfis.length > 0 ? perfis[0].id : 0);
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
    const tipoIdx = csvHeaders.indexOf(csvMapping.tipo);

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
        if (tipoIdx !== -1) {
          const t = (cols[tipoIdx] || '').trim().toUpperCase();
          if (t === 'D' || t === 'DEB' || t.startsWith('DÉB') || t === 'SAÍDA' || t === 'SAIDA' || t === '-') isDebito = true;
          else if (t === 'C' || t === 'CRED' || t.startsWith('CRÉ') || t === 'ENTRADA' || t === '+') isDebito = false;
        } else {
          if (rawValor.endsWith('D') || rawValor.endsWith('DEB') || rawValor.endsWith('-')) isDebito = true;
          else if (rawValor.endsWith('C') || rawValor.endsWith('CRED') || rawValor.endsWith('+')) isDebito = false;
        }

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
            perfilId: csvProfileId,
            produtos: []
          });
        } else {
          novasRendas.push({
            data,
            descricao: descricao || 'Renda do Extrato',
            categoria: categoriasRendas.length > 0 ? categoriasRendas[0] : 'Outros',
            valor: valorFinal,
            perfilId: csvProfileId
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
        
        {/* Card Exportação */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-blue-600">Exportar Meus Dados (Backup)</h2>
          <p className="text-sm text-gray-600 mb-6">Baixe todas as suas rendas e despesas cadastradas para o seu computador em formato Excel.</p>
          
          <button onClick={handleExportExcel} className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium flex justify-center items-center gap-2">
            <span>📥</span> Baixar Planilha (.xlsx)
          </button>
        </div>

        {/* Card Importação Base */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-yellow-600">Restaurar Backup (Excel)</h2>
          <p className="text-sm text-gray-600 mb-6">Restaure seus dados a partir de um arquivo Excel previamente exportado por este sistema. <strong>Atenção: Isso substituirá os dados atuais!</strong></p>
          
          <label className="w-full bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition font-medium flex justify-center items-center gap-2 cursor-pointer">
            <span>📤</span> Restaurar Planilha (.xlsx)
            <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
          </label>
        </div>

        {/* Card Importação Bancária */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 md:col-span-2">
          <h2 className="text-xl font-bold mb-4 text-indigo-600">Importar Extrato Bancário</h2>
          <p className="text-sm text-gray-600 mb-6">Importe as transações do seu banco (Itaú, Nubank, Mercado Livre, etc) para categorizar automaticamente. Esses dados serão adicionados aos seus registros atuais.</p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-medium flex justify-center items-center gap-2 cursor-pointer">
              <span>📄</span> Importar Extrato (.csv)
              <input type="file" accept=".csv" onChange={handleImportExtratoCSV} className="hidden" />
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
              <select value={csvMapping.data} onChange={e => setCsvMapping({...csvMapping, data: e.target.value})} className="w-full p-2 border border-gray-300 rounded bg-white">
                <option value="">-- Selecione --</option>
                {csvHeaders.map(h => <option key={`data-${h}`} value={h}>{h}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Perfil de Destino *</label>
              <select value={csvProfileId} onChange={e => setCsvProfileId(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded bg-white">
                {perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (Ex: DEB_CRED / VALOR) *</label>
              <select value={csvMapping.valor} onChange={e => setCsvMapping({...csvMapping, valor: e.target.value})} className="w-full p-2 border border-gray-300 rounded bg-white">
                <option value="">-- Selecione --</option>
                {csvHeaders.map(h => <option key={`valor-${h}`} value={h}>{h}</option>)}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (Opcional)</label>
              <select value={csvMapping.descricao} onChange={e => setCsvMapping({...csvMapping, descricao: e.target.value})} className="w-full p-2 border border-gray-300 rounded bg-white">
                <option value="">-- Ignorar ou Selecionar --</option>
                {csvHeaders.map(h => <option key={`desc-${h}`} value={h}>{h}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo (Opcional: D/C, Débito/Crédito)</label>
              <select value={csvMapping.tipo} onChange={e => setCsvMapping({...csvMapping, tipo: e.target.value})} className="w-full p-2 border border-gray-300 rounded bg-white">
                <option value="">-- Automático ou Ignorar --</option>
                {csvHeaders.map(h => <option key={`tipo-${h}`} value={h}>{h}</option>)}
              </select>
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