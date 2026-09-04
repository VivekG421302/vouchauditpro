export function formatScanDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatScanDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatScanNumber(n) {
  return n === null || n === undefined ? '—' : Number(n).toLocaleString();
}

export function isValidBarcode(str) {
  if (!str) return false;
  const s = String(str).trim();
  return s.length >= 6 && /^[A-Z0-9-]+$/i.test(s);
}

export function generateScanId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}
export function generateSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
}

export function scanStatusColor(status) {
  const map = { PASS: 'green', WAIT: 'yellow', RECO: 'yellow', FAIL: 'red' };
  return map[status] || 'blue';
}

export function scanStatusLabel(status) {
  const map = { PASS: 'Pass', WAIT: 'Pending', RECO: 'Reconcile', FAIL: 'Fail' };
  return map[status] || status;
}

export function exportCSV(rows, filename = 'export.csv') {
  if (!rows.length) return;
  const escapeCell = (val) => {
    const s = String(val ?? '').replace(/"/g, '""');
    return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s;
  };
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function exportXLSX(rows, filename = 'export.xlsx', sheetName = 'Data') {
  if (!rows.length) return;
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}
