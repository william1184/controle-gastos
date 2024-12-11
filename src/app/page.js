"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

export default function Dashboard() {
  const [gastos, setGastos] = useState([]);
  const [rendas, setRendas] = useState([]);
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [mesesDisponiveis, setMesesDisponiveis] = useState([]);

  // Estados Lançamento Rápido
  const [quickTipo, setQuickTipo] = useState('gasto');
  const [quickDescricao, setQuickDescricao] = useState('');
  const [quickValor, setQuickValor] = useState('');
  const [quickCategoria, setQuickCategoria] = useState('');
  const [quickData, setQuickData] = useState('');
  const [categoriasGastos, setCategoriasGastos] = useState([]);
  const [categoriasRendas, setCategoriasRendas] = useState([]);

  // Estados de Mapeamento de Extrato CSV
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvLines, setCsvLines] = useState([]);
  const [csvMapping, setCsvMapping] = useState({ data: '', valor: '', descricao: '', tipo: '' });

  useEffect(() => {
    // Busca os dados do localStorage
    const storedGastos = JSON.parse(localStorage.getItem('gastos')) || [];
    const storedRendas = JSON.parse(localStorage.getItem('rendas')) || [];

    setGastos(storedGastos);
    setRendas(storedRendas);

    // Carrega configurações
    const config = JSON.parse(localStorage.getItem('configuracoes')) || {};
    let catGastos = config.categoriasGastos || [
      { nome: 'Moradia', tipo: 'Fixo' },
      { nome: 'Contas', tipo: 'Fixo' },
      { nome: 'Alimentação', tipo: 'Variável' },
      { nome: 'Transporte', tipo: 'Variável' },
      { nome: 'Saúde', tipo: 'Variável' },
      { nome: 'Educação', tipo: 'Fixo' },
      { nome: 'Lazer', tipo: 'Variável' },
      { nome: 'Outros', tipo: 'Variável' }
    ];
    if (catGastos.length > 0 && typeof catGastos[0] === 'string') {
      catGastos = catGastos.map(c => ({ nome: c, tipo: 'Variável' }));
    }
    setCategoriasGastos(catGastos);
    setCategoriasRendas(config.categoriasRendas || ['Salário', 'Freelance', 'Investimentos', 'Outros']);
    
    setQuickData(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (quickTipo === 'gasto') {
      setQuickCategoria(categoriasGastos.length > 0 ? categoriasGastos[0].nome : 'Outros');
    } else {
      setQuickCategoria(categoriasRendas[0] || 'Outros');
    }
  }, [quickTipo, categoriasGastos, categoriasRendas]);

  useEffect(() => {
    const meses = new Set();
    gastos.forEach(g => { if (g.data) meses.add(g.data.substring(0, 7)); });
    rendas.forEach(r => { if (r.data) meses.add(r.data.substring(0, 7)); });
    
    const mesesArr = Array.from(meses).sort().reverse();
    setMesesDisponiveis(mesesArr);
    
    if (!mesSelecionado && mesesArr.length > 0) {
      const currentMonth = new Date().toISOString().substring(0, 7);
      setMesSelecionado(mesesArr.includes(currentMonth) ? currentMonth : mesesArr[0]);
    }
  }, [gastos, rendas, mesSelecionado]);

  const gastosFiltrados = mesSelecionado ? gastos.filter(g => g.data && g.data.substring(0, 7) === mesSelecionado) : gastos;
  const rendasFiltradas = mesSelecionado ? rendas.filter(r => r.data && r.data.substring(0, 7) === mesSelecionado) : rendas;

  const totalGastos = gastosFiltrados.reduce((acc, gasto) => acc + (Number(gasto.total) || 0), 0);
  const totalRendas = rendasFiltradas.reduce((acc, renda) => acc + (Number(renda.valor) || 0), 0);

  const gastosPorCategoria = gastosFiltrados.reduce((acc, g) => {
    const cat = g.categoria || 'Sem Categoria';
    acc[cat] = (acc[cat] || 0) + (Number(g.total) || 0);
    return acc;
  }, {});

  const rendasPorCategoria = rendasFiltradas.reduce((acc, r) => {
    const cat = r.categoria || 'Sem Categoria';
    acc[cat] = (acc[cat] || 0) + (Number(r.valor) || 0);
    return acc;
  }, {});

  const despesasFixas = gastosFiltrados.reduce((acc, g) => {
    const catObj = categoriasGastos.find(c => c.nome === g.categoria);
    const tipo = catObj ? catObj.tipo : 'Variável';
    if (tipo === 'Fixo') return acc + (Number(g.total) || 0);
    return acc;
  }, 0);

  const despesasVariaveis = gastosFiltrados.reduce((acc, g) => {
    const catObj = categoriasGastos.find(c => c.nome === g.categoria);
    const tipo = catObj ? catObj.tipo : 'Variável';
    if (tipo === 'Variável') return acc + (Number(g.total) || 0);
    return acc;
  }, 0);

  const formatMonth = (yyyyMM) => {
    if (!yyyyMM) return '';
    const [year, month] = yyyyMM.split('-');
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${monthNames[parseInt(month, 10) - 1]}/${year}`;
  };

  const handleQuickSave = (e) => {
    e.preventDefault();
    if (!quickData || !quickCategoria || !quickValor || parseFloat(quickValor) <= 0) {
      alert('Por favor, preencha a data, a categoria e um valor maior que zero.');
      return;
    }

    if (quickTipo === 'gasto') {
      const novoGasto = {
        data: quickData,
        apelido: quickDescricao,
        categoria: quickCategoria,
        total: parseFloat(quickValor),
        produtos: []
      };
      const updatedGastos = [...gastos, novoGasto];
      setGastos(updatedGastos);
      localStorage.setItem('gastos', JSON.stringify(updatedGastos));
    } else {
      const novaRenda = {
        data: quickData,
        descricao: quickDescricao,
        categoria: quickCategoria,
        valor: parseFloat(quickValor)
      };
      const updatedRendas = [...rendas, novaRenda];
      setRendas(updatedRendas);
      localStorage.setItem('rendas', JSON.stringify(updatedRendas));
    }

    setQuickDescricao('');
    setQuickValor('');
    alert('Lançamento registrado com sucesso!');
  };

  const handleExportExcel = () => {
    if (gastos.length === 0 && rendas.length === 0) {
      return alert('Nenhum dado para exportar.');
    }

    const wb = XLSX.utils.book_new();

    // --- Aba de Gastos ---
    const gastosData = [
      ["ID Gasto", "Data", "Apelido", "Categoria", "Total Gasto", "Nome do Produto", "Codigo do Produto", "Quantidade", "Unidade", "Preco Unitario", "Preco Total"]
    ];

    gastos.forEach((gasto, index) => {
      if (!gasto.produtos || gasto.produtos.length === 0) {
        gastosData.push([index, gasto.data, gasto.apelido || '', gasto.categoria || '', gasto.total, '', '', '', '', '', '']);
      } else {
        gasto.produtos.forEach(produto => {
          gastosData.push([
            index,
            gasto.data,
            gasto.apelido || '',
            gasto.categoria || '',
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
      wsRendas = XLSX.utils.aoa_to_sheet([["valor", "data", "descricao"]]); // Cabeçalhos padrão
    }
    XLSX.utils.book_append_sheet(wb, wsRendas, "Rendas");

    // Salvar o arquivo
    XLSX.writeFile(wb, "meu_orcamento.xlsx");
  };

  const handleImportExcel = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!window.confirm('A importação irá substituir a base de gastos e rendas atual. Deseja continuar?')) {
      event.target.value = ''; 
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      // --- Importar Gastos ---
      const wsGastos = workbook.Sheets["Gastos"];
      if (wsGastos) {
        const gastosRows = XLSX.utils.sheet_to_json(wsGastos, { header: 1 });
        const importedGastos = [];
        let currentGastoId = null;
        let currentGasto = null;

        for (let i = 1; i < gastosRows.length; i++) {
          const cols = gastosRows[i];
          if (cols.length === 0) continue;

          let id = cols[0];
          
          let data, apelido, categoria, totalStr, pNome, pCodigo, pQtdStr, pUnidade, pPrecoUniStr, pPrecoTotStr;
          // Verifica se a tabela exportada era a versão antiga (sem categoria) ou nova
          if (gastosRows[0].length === 10) {
             data = cols[1]; apelido = cols[2]; categoria = ''; totalStr = cols[3]; 
             pNome = cols[4]; pCodigo = cols[5]; pQtdStr = cols[6]; pUnidade = cols[7]; 
             pPrecoUniStr = cols[8]; pPrecoTotStr = cols[9];
          } else {
             data = cols[1]; apelido = cols[2]; categoria = cols[3]; totalStr = cols[4]; 
             pNome = cols[5]; pCodigo = cols[6]; pQtdStr = cols[7]; pUnidade = cols[8]; 
             pPrecoUniStr = cols[9]; pPrecoTotStr = cols[10];
          }

          if (id !== undefined && id !== "" && id !== currentGastoId) {
            currentGastoId = id;
            currentGasto = {
              data: data,
              apelido: apelido,
              categoria: categoria,
              total: parseFloat(totalStr) || 0,
              produtos: []
            };
            importedGastos.push(currentGasto);
          }

          if (currentGasto && (pNome || pCodigo)) { // pNome ou pCodigo
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
        setGastos(importedGastos);
        localStorage.setItem('gastos', JSON.stringify(importedGastos));
      }

      // --- Importar Rendas ---
      const wsRendas = workbook.Sheets["Rendas"];
      if (wsRendas) {
        const importedRendas = XLSX.utils.sheet_to_json(wsRendas);
        setRendas(importedRendas);
        localStorage.setItem('rendas', JSON.stringify(importedRendas));
      }

      alert('Base importada com sucesso!');
      event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportExtratoCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) return;

      // Detectar separador
      const separator = text.indexOf(';') > -1 ? ';' : ',';

      // Função auxiliar para ignorar aspas duplas no CSV
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

      // Extrair e processar cabeçalhos
      const headersRaw = parseLine(lines[0]);
      const headers = headersRaw.map(h => h.trim());
      const headersLower = headers.map(h => h.toLowerCase());

      // Prever melhores escolhas de colunas
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
      setIsCsvModalOpen(true);
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleConfirmMapping = () => {
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
      // Limpa qualquer letra (como D, C, R$) e espaços em branco da string para interpretar só o número
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
        
        // Verifica a coluna específica de Tipo (D/C), se o usuário tiver mapeado
        if (tipoIdx !== -1) {
          const t = (cols[tipoIdx] || '').trim().toUpperCase();
          if (t === 'D' || t === 'DEB' || t.startsWith('DÉB') || t === 'SAÍDA' || t === 'SAIDA' || t === '-') isDebito = true;
          else if (t === 'C' || t === 'CRED' || t.startsWith('CRÉ') || t === 'ENTRADA' || t === '+') isDebito = false;
        } else {
          // Caso contrário, tenta descobrir se tem um 'D' ou 'C' na própria célula do valor (ex: 100,00 D)
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
            categoria: categoriasGastos.length > 0 ? categoriasGastos[0].nome : 'Outros',
            total: Math.abs(valorFinal),
            produtos: []
          });
        } else {
          novasRendas.push({
            data,
            descricao: descricao || 'Renda do Extrato',
            categoria: categoriasRendas.length > 0 ? categoriasRendas[0] : 'Outros',
            valor: valorFinal
          });
        }
      }
    }

    if (novosGastos.length > 0 || novasRendas.length > 0) {
      const updatedGastos = [...gastos, ...novosGastos];
      const updatedRendas = [...rendas, ...novasRendas];
      setGastos(updatedGastos);
      setRendas(updatedRendas);
      localStorage.setItem('gastos', JSON.stringify(updatedGastos));
      localStorage.setItem('rendas', JSON.stringify(updatedRendas));
      alert(`Extrato importado com sucesso!\n\n${novosGastos.length} gastos adicionados.\n${novasRendas.length} rendas adicionadas.`);
    } else {
      alert('Nenhum registro válido encontrado. Verifique se o mapeamento das colunas está correto e as linhas contêm dados.');
    }

    setIsCsvModalOpen(false);
    setCsvHeaders([]);
    setCsvLines([]);
  };

  const saldo = totalRendas - totalGastos;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Meu Orçamento - Dashboard</h1>
      
      {/* Filtro de Mês */}
      <div className="mb-6 flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200 w-fit">
        <label className="font-semibold text-gray-700">Mês de Referência:</label>
        <select 
          value={mesSelecionado} 
          onChange={(e) => setMesSelecionado(e.target.value)}
          className="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer outline-none"
        >
          <option value="">Todos os Meses (Geral)</option>
          {mesesDisponiveis.map(mes => (
            <option key={mes} value={mes}>{formatMonth(mes)}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card Rendas */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <h2 className="text-lg font-semibold text-gray-600 mb-2">Total de Rendas</h2>
          <p className="text-3xl font-bold text-green-600">R$ {totalRendas.toFixed(2)}</p>
        </div>

        {/* Card Gastos */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-600 mb-2">Total de Despesas</h2>
            <p className="text-3xl font-bold text-red-600">R$ {totalGastos.toFixed(2)}</p>
          </div>
          <div className="mt-4 text-sm text-gray-600 flex justify-between">
            <span>Fixas: <strong className="text-red-500">R$ {despesasFixas.toFixed(2)}</strong></span>
            <span>Variáveis: <strong className="text-red-500">R$ {despesasVariaveis.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Card Saldo */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <h2 className="text-lg font-semibold text-gray-600 mb-2">Saldo Atual</h2>
          <p className={`text-3xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            R$ {saldo.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Lançamento Rápido */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
        <h2 className="text-xl font-bold mb-4 text-gray-800">⚡ Lançamento Rápido</h2>
        <form onSubmit={handleQuickSave} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={quickTipo}
              onChange={(e) => setQuickTipo(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="gasto">Despesa</option>
              <option value="renda">Renda</option>
            </select>
          </div>
          <div className="w-full md:w-1/6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input
              type="date"
              value={quickData}
              onChange={(e) => setQuickData(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="w-full md:w-2/6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (Opcional)</label>
            <input
              type="text"
              value={quickDescricao}
              onChange={(e) => setQuickDescricao(e.target.value)}
              placeholder="Ex: Padaria, Salário..."
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="w-full md:w-1/6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={quickCategoria}
              onChange={(e) => setQuickCategoria(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              {quickTipo === 'gasto' 
                ? categoriasGastos.map(cat => <option key={cat.nome} value={cat.nome}>{cat.nome}</option>)
                : categoriasRendas.map(cat => <option key={cat} value={cat}>{cat}</option>)
              }
            </select>
          </div>
          <div className="w-full md:w-1/6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={quickValor}
              onChange={(e) => setQuickValor(e.target.value)}
              placeholder="0.00"
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="w-full md:w-auto">
            <button type="submit" className="w-full bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition font-medium h-[42px]">
              Salvar
            </button>
          </div>
        </form>
      </div>

      {/* Gráficos / Categorias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-red-500">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Despesas por Categoria</h3>
          {Object.keys(gastosPorCategoria).length > 0 ? (
            <ul className="space-y-3">
              {Object.entries(gastosPorCategoria).sort((a,b) => b[1]-a[1]).map(([cat, val]) => (
                <li key={cat} className="flex justify-between items-center text-gray-600 border-b border-gray-100 pb-2">
                  <span className="font-medium">{cat}</span>
                  <span className="font-semibold text-red-600">R$ {val.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Nenhuma despesa neste período.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-green-500">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Rendas por Categoria</h3>
          {Object.keys(rendasPorCategoria).length > 0 ? (
            <ul className="space-y-3">
              {Object.entries(rendasPorCategoria).sort((a,b) => b[1]-a[1]).map(([cat, val]) => (
                <li key={cat} className="flex justify-between items-center text-gray-600 border-b border-gray-100 pb-2">
                  <span className="font-medium">{cat}</span>
                  <span className="font-semibold text-green-600">R$ {val.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Nenhuma renda neste período.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link href="/gastos" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium">Gerenciar Gastos</Link>
        <Link href="/rendas" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium">Gerenciar Rendas</Link>
        <button onClick={handleExportExcel} className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition font-medium">
          Exportar Excel (Dados)
        </button>
        <label className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition font-medium cursor-pointer">
          Importar Excel (Dados)
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleImportExcel}
            className="hidden"
          />
        </label>
        <label className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-medium cursor-pointer">
          Importar Extrato (CSV)
          <input
            type="file"
            accept=".csv"
            onChange={handleImportExtratoCSV}
            className="hidden"
          />
        </label>
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