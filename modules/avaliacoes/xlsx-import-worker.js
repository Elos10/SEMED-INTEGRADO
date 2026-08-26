import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm';

self.onmessage = ({ data }) => {
  try {
    const workbook = XLSX.read(data.buffer, { type: 'array', dense: true, cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error('A planilha não possui abas para leitura.');
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    self.postMessage({ matrix });
  } catch (error) {
    self.postMessage({ error: error?.message || 'Falha ao interpretar a planilha.' });
  }
};
