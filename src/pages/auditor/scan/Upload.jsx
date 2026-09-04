import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../../components/ui/Icon.jsx';
import { scanDb, setScanContext } from '../../../lib/scanDb.js';
import { generateScanId } from '../../../lib/scanUtils.js';
import { toast } from '../../../store/useToastStore.js';

const FIELDS = [
  { key: 'location', label: 'Location / Bin Code', req: true },
  { key: 'description', label: 'Product Description', req: true },
  { key: 'barcode', label: 'Product Identifier / Barcode', req: true },
  { key: 'qty', label: 'Quantity', req: true },
  { key: 'expiry', label: 'Expiry Date', req: false },
  { key: 'mfg', label: 'MFG Date', req: false },
  { key: 'brand', label: 'Brand', req: false },
  { key: 'unit', label: 'Unit of Quantity', req: false },
];

function detectColumn(headers, label) {
  const low = label.split(' ')[0].toLowerCase();
  return headers.find((h) => {
    const n = h.name.toLowerCase();
    return n.includes(low) || low.includes(n);
  })?.index ?? '';
}

export default function ScanUpload({ locationId }) {
  const [headers, setHeaders] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [sheetId, setSheetId] = useState(() => generateScanId('sheet'));
  const [mapping, setMapping] = useState({});
  const [imported, setImported] = useState(null); // { count, locations }
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setScanContext(locationId);
  }, [locationId]);

  useEffect(() => {
    if (!headers.length) return;
    const initial = {};
    FIELDS.forEach((f) => {
      const det = detectColumn(headers, f.label);
      if (det !== '') initial[f.key] = det;
    });
    setMapping(initial);
  }, [headers]);

  async function handleFile(file) {
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array', raw: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
      if (json.length < 2) {
        toast('File must contain headers and at least one data row.', 'alert-triangle', 'red');
        return;
      }
      const hdrs = json[0].map((h, i) => ({ index: i, name: String(h).trim() || `Column ${i + 1}` }));
      const rows = json.slice(1).filter((r) => r.some((c) => c !== ''));
      setHeaders(hdrs);
      setRawData(rows);
      setSheetId(generateScanId('sheet'));
      setImported(null);
      toast(`Parsed ${rows.length} rows.`, 'file-spreadsheet', 'emerald');
    } catch (err) {
      toast('Failed to parse file.', 'alert-triangle', 'red');
    }
  }

  function handleReset() {
    setHeaders([]);
    setRawData([]);
    setMapping({});
    setSheetId(generateScanId('sheet'));
    setImported(null);
  }

  async function handleSaveMapping() {
    const required = ['location', 'description', 'barcode', 'qty'];
    for (const r of required) {
      if (mapping[r] === undefined || mapping[r] === '') {
        toast(`Please map the required field: ${r}`, 'alert-triangle', 'red');
        return;
      }
    }
    const structured = rawData
      .map((row, idx) => ({
        rowIndex: idx,
        location: String(row[mapping.location] ?? '').trim(),
        description: String(row[mapping.description] ?? '').trim(),
        barcode: String(row[mapping.barcode] ?? '').trim(),
        qty: parseFloat(row[mapping.qty]) || 0,
        expiry: mapping.expiry !== undefined && row[mapping.expiry] ? String(row[mapping.expiry]) : null,
        mfg: mapping.mfg !== undefined && row[mapping.mfg] ? String(row[mapping.mfg]) : null,
        brand: mapping.brand !== undefined ? String(row[mapping.brand] ?? '') : null,
        unit: mapping.unit !== undefined ? String(row[mapping.unit] ?? '') : null,
      }))
      .filter((r) => r.location && r.barcode);

    if (!structured.length) {
      toast('No valid rows after mapping.', 'alert-triangle', 'red');
      return;
    }

    try {
      await scanDb.saveInventoryBatch(structured, sheetId, mapping);
      const locations = [...new Set(structured.map((r) => r.location))];
      for (const loc of locations) {
        await scanDb.upsertLocation(loc, { status: 'WAIT', itemCount: structured.filter((r) => r.location === loc).length });
      }
      toast(`Imported ${structured.length} items across ${locations.length} locations.`, 'check-circle', 'emerald');
      setImported({ count: structured.length, locations: locations.length });
    } catch (err) {
      toast('Failed to save inventory.', 'alert-triangle', 'red');
    }
  }

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-ink-950">Upload Inventory Sheet</h2>
      <p className="text-sm text-slate-500 mb-4">Upload an Excel or CSV file. Row 1 will be treated as headers.</p>

      {imported ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Icon name="check-circle" className="w-8 h-8" />
          </div>
          <h3 className="font-display font-semibold text-lg text-ink-950 mb-1.5">Import Successful</h3>
          <p className="text-sm text-slate-500 mb-5">
            {imported.count} items · {imported.locations} locations
          </p>
          <button onClick={handleReset} className="border border-slate-200 text-ink-950 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-slate-50">
            Upload Another
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
          }}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition ${dragOver ? 'border-brand-400 bg-brand-50/40' : 'border-slate-300 bg-white'}`}
        >
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
          <Icon name="file-spreadsheet" className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <h3 className="text-sm font-semibold text-ink-950 mb-1">Drop your file here</h3>
          <p className="text-xs text-slate-500 mb-4">or click to browse (.xlsx, .xls, .csv)</p>
          <span className="inline-block bg-ink-950 text-white text-xs font-medium px-4 py-2 rounded-lg">Select File</span>
        </div>
      )}

      {!imported && headers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5 mt-6">
          <h3 className="text-sm font-semibold text-ink-950 mb-1">Map Columns</h3>
          <p className="text-xs text-slate-500 mb-4">Match each platform field to a column from your file.</p>
          <div className="grid sm:grid-cols-2 gap-3.5">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-xs font-medium text-slate-600">
                  {f.label} {f.req && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={mapping[f.key] ?? ''}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value === '' ? undefined : parseInt(e.target.value, 10) }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h.index} value={h.index}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end mt-5">
            <button onClick={handleReset} className="border border-slate-200 text-ink-950 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-50">
              Reset
            </button>
            <button onClick={handleSaveMapping} className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700 inline-flex items-center gap-1.5">
              <Icon name="save" className="w-4 h-4" />
              Save &amp; Import
            </button>
          </div>
        </div>
      )}

      {!imported && rawData.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-ink-950 mb-3">Preview</h3>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  {headers.slice(0, 6).map((h) => (
                    <th key={h.index} className="px-3 py-2 font-medium whitespace-nowrap">
                      {h.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawData.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    {headers.slice(0, 6).map((h) => (
                      <td key={h.index} className="px-3 py-2 text-slate-600 whitespace-nowrap">
                        {String(row[h.index] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
