/**
 * Utility functions for CSV parsing and processing.
 */

export const parseCsvLine = (line, separator) => {
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

export const parseCsvDate = (str) => {
  const s = str.trim();
  if (/^(\d{2})\/(\d{2})\/(\d{4})$/.test(s)) {
    const parts = s.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  } else if (/^(\d{4})-(\d{2})-(\d{2})$/.test(s)) {
    const parts = s.split('-');
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return s;
  }
  return null;
};

export const parseCsvCurrency = (str) => {
  let s = str.trim().replace(/[a-zA-Z\sR$]/g, '');
  if (s === '') return null;
  if (s.includes('.') && s.includes(',')) {
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const num = parseFloat(s);
  return isNaN(num) ? null : num;
};

export const detectCsvColumns = (headers, dataRows) => {
  const headersLower = headers.map(h => h.toLowerCase());
  
  let dateIdx = headersLower.findIndex(h => h.includes('data') || h.includes('date'));
  let valIdx = headersLower.findIndex(h => h === 'valor' || h === 'amount' || h.includes('deb_cred') || h.includes('deb') || h.includes('cred') || (h.includes('valor') && !h.includes('unitário')));
  let descIdx = headersLower.findIndex((h, idx) => 
    idx !== dateIdx && idx !== valIdx && 
    (h.includes('descri') || h.includes('hist') || h.includes('detalhe') || h.includes('lançamento') || h.includes('estabelecimento'))
  );

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

  return { dateIdx, valIdx, descIdx };
};
