import { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import ScannerSheet from '../../../components/scan/ScannerSheet.jsx';
import { Icon } from '../../../components/ui/Icon.jsx';
import { scanDb, STORES } from '../../../lib/scanDb.js';
import { generateSessionId, scanStatusLabel } from '../../../lib/scanUtils.js';
import { toast } from '../../../store/useToastStore.js';

const STATUS_TONE = {
  PASS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  WAIT: 'bg-slate-100 text-slate-500 border-slate-200',
  RECO: 'bg-amber-50 text-amber-700 border-amber-200',
  FAIL: 'bg-red-50 text-red-600 border-red-200',
};

export default function ScanAudit({ auditorName }) {
  const [bins, setBins] = useState(null);
  const [activeCode, setActiveCode] = useState(null);
  const [products, setProducts] = useState([]);
  const [auditMap, setAuditMap] = useState({});
  const [notFound, setNotFound] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [editBarcode, setEditBarcode] = useState(null);
  const [editForm, setEditForm] = useState({ description: '', brand: '', expiry: '', qty: '0' });
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeStatus, setCompleteStatus] = useState('RECO');
  const [completeRemarks, setCompleteRemarks] = useState('');

  function loadBins() {
    scanDb.getAll(STORES.LOCATIONS).then(setBins);
  }

  useEffect(() => {
    loadBins();
  }, []);

  async function openLocation(code) {
    code = String(code).trim().toUpperCase();
    if (!code) return;
    const loc = await scanDb.get(STORES.LOCATIONS, code);
    if (!loc) {
      toast(`Location "${code}" not found.`, 'alert-triangle', 'red');
      return;
    }
    if (loc.status === 'PASS' || loc.status === 'FAIL') {
      toast(`Location ${code} is ${loc.status}. Unlock in Reconciliation to re-audit.`, 'alert-triangle', 'amber');
      return;
    }
    const newSessionId = generateSessionId();
    const prods = await scanDb.getInventoryByLocation(code);
    const prev = await scanDb.getByIndex(STORES.AUDITS, 'location', code);
    const map = {};
    prev.forEach((a) => {
      map[a.barcode] = (map[a.barcode] || 0) + a.qty;
    });
    setActiveCode(code);
    setSessionId(newSessionId);
    setProducts(prods);
    setAuditMap(map);
    setNotFound([]);
  }

  async function handleProductScan(barcode) {
    barcode = String(barcode).trim().toUpperCase();
    if (!barcode) return;
    const product = products.find((p) => p.barcode === barcode);
    if (product) {
      const cur = (auditMap[barcode] || 0) + 1;
      setAuditMap((m) => ({ ...m, [barcode]: cur }));
      await scanDb.saveAuditEntry({ sessionId, location: activeCode, barcode, qty: 1, type: 'scan', productId: product.id });
      toast(`${product.description.substring(0, 30)}… +1 (total: ${cur})`, 'check', 'emerald');
    } else {
      await scanDb.addRecoEntry({ location: activeCode, barcode, description: 'Unknown product (scanned but not in system)', systemQty: 0, auditQty: 1, type: 'not_found', status: 'WAIT', sessionId });
      toast(`Product not found in ${activeCode}. Logged to Reconciliation.`, 'alert-triangle', 'amber');
      setNotFound((nf) => [...nf, { barcode }]);
    }
  }

  async function addQty(barcode, delta) {
    const cur = (auditMap[barcode] || 0) + delta;
    if (cur < 0) return;
    setAuditMap((m) => ({ ...m, [barcode]: cur }));
    const product = products.find((p) => p.barcode === barcode);
    await scanDb.saveAuditEntry({ sessionId, location: activeCode, barcode, qty: delta, type: 'manual', productId: product?.id || null });
  }

  function openEdit(barcode) {
    const product = products.find((p) => p.barcode === barcode);
    if (!product) return;
    setEditBarcode(barcode);
    setEditForm({ description: product.description || '', brand: product.brand || '', expiry: product.expiry || '', qty: String(auditMap[barcode] || 0) });
  }

  async function handleEditSave(e) {
    e.preventDefault();
    const product = products.find((p) => p.barcode === editBarcode);
    const updated = { ...product, description: editForm.description, brand: editForm.brand, expiry: editForm.expiry };
    await scanDb.put(STORES.INVENTORY, updated);
    const qty = parseInt(editForm.qty, 10);
    if (!isNaN(qty)) {
      const prev = auditMap[editBarcode] || 0;
      setAuditMap((m) => ({ ...m, [editBarcode]: qty }));
      await scanDb.saveAuditEntry({ sessionId, location: activeCode, barcode: editBarcode, qty: qty - prev, type: 'override', productId: product.id });
    }
    setProducts((prods) => prods.map((p) => (p.barcode === editBarcode ? updated : p)));
    setEditBarcode(null);
    toast('Product updated.', 'check', 'emerald');
  }

  function openComplete() {
    const discrepancies = products.filter((p) => (auditMap[p.barcode] || 0) !== p.qty);
    setCompleteStatus(notFound.length > 0 || discrepancies.length > 0 ? 'RECO' : 'PASS');
    setCompleteRemarks('');
    setCompleteOpen(true);
  }

  async function handleCompleteSubmit(e) {
    e.preventDefault();
    const discrepancies = products.filter((p) => (auditMap[p.barcode] || 0) !== p.qty);
    for (const p of discrepancies) {
      const aq = auditMap[p.barcode] || 0;
      await scanDb.addRecoEntry({ location: activeCode, barcode: p.barcode, description: p.description, systemQty: p.qty, auditQty: aq, type: 'mismatch', status: 'WAIT', sessionId, remarks: completeRemarks });
    }
    await scanDb.upsertLocation(activeCode, { status: completeStatus, completedAt: Date.now(), assignedTo: auditorName || 'Unknown', progress: 100, remarks: completeRemarks });
    setCompleteOpen(false);
    toast(`Location ${activeCode} marked ${completeStatus}.`, 'check-circle', 'emerald');
    setActiveCode(null);
    loadBins();
  }

  if (!activeCode) {
    return (
      <div>
        <h2 className="font-display text-lg font-bold text-ink-950">Select Location</h2>
        <p className="text-sm text-slate-500 mb-4">Scan or choose a location/bin to begin auditing.</p>

        <div className="max-w-md mb-6">
          <div className="flex gap-2">
            <input
              placeholder="Scan location code…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') openLocation(e.currentTarget.value);
              }}
              className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
            />
            <button onClick={() => setScannerOpen(true)} className="bg-ink-950 text-white px-4 rounded-lg">
              <Icon name="scan-line" className="w-4 h-4" />
            </button>
          </div>
        </div>

        {bins === null && <p className="text-xs text-slate-400">Loading…</p>}
        {bins && bins.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
            <Icon name="map-pin" className="w-8 h-8 mx-auto mb-3 text-slate-400" />
            <p className="text-sm font-semibold text-ink-950">No locations</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">Upload inventory data first.</p>
          </div>
        )}
        {bins && bins.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-3">
            {bins.map((loc) => (
              <button key={loc.code} onClick={() => openLocation(loc.code)} className="text-left bg-white border border-slate-200 rounded-2xl shadow-card p-4 hover:border-brand-300 transition">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-display font-semibold text-ink-950">{loc.code}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_TONE[loc.status] || STATUS_TONE.WAIT}`}>{scanStatusLabel(loc.status)}</span>
                </div>
                <p className="text-xs text-slate-500">{loc.itemCount || 0} items</p>
              </button>
            ))}
          </div>
        )}

        <ScannerSheet open={scannerOpen} onClose={() => setScannerOpen(false)} onDetect={(code) => openLocation(code)} title="Scan Location" />
      </div>
    );
  }

  const total = products.length;
  const audited = products.filter((p) => (auditMap[p.barcode] || 0) > 0).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-ink-950">Auditing: {activeCode}</h2>
          <p className="text-sm text-slate-500">
            {total} items expected · {audited} scanned
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-40">
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full" style={{ width: `${total ? (audited / total) * 100 : 0}%` }} />
            </div>
          </div>
          <button onClick={openComplete} className="bg-emerald-600 text-white text-xs font-medium px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5">
            <Icon name="check-circle" className="w-3.5 h-3.5" />
            Complete
          </button>
        </div>
      </div>

      <div className="max-w-lg mb-5">
        <div className="flex gap-2">
          <input
            placeholder="Scan product barcode…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleProductScan(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
            className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
          />
          <button onClick={() => setScannerOpen(true)} className="bg-ink-950 text-white px-4 rounded-lg">
            <Icon name="scan-line" className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {products.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
            <Icon name="package-x" className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm text-slate-500">This location has no assigned items.</p>
          </div>
        )}
        {products.map((p) => {
          const aq = auditMap[p.barcode] || 0;
          const mismatch = aq !== p.qty;
          return (
            <div key={p.barcode} className={`flex items-center justify-between gap-3 bg-white border rounded-xl px-4 py-3 ${mismatch ? 'border-amber-200' : 'border-slate-200'}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-950 truncate">{p.description}</p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {p.barcode} {p.brand ? `· ${p.brand}` : ''} {p.expiry ? `· exp ${p.expiry}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-slate-400">Sys: {p.qty}</span>
                <button onClick={() => addQty(p.barcode, -1)} className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 flex items-center justify-center">
                  <Icon name="minus" className="w-3.5 h-3.5" />
                </button>
                <span className={`w-8 text-center text-sm font-mono font-semibold ${mismatch ? 'text-amber-600' : 'text-ink-950'}`}>{aq}</span>
                <button onClick={() => addQty(p.barcode, 1)} className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 flex items-center justify-center">
                  <Icon name="plus" className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => openEdit(p.barcode)} className="w-7 h-7 rounded-lg text-slate-400 flex items-center justify-center hover:bg-slate-50">
                  <Icon name="pencil" className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {notFound.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-red-600 mb-2">Not Found Items</h3>
          <div className="space-y-2">
            {notFound.map((nf, i) => (
              <div key={i} className="bg-white border-l-4 border-red-500 rounded-xl px-4 py-3 flex items-center justify-between">
                <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{nf.barcode}</code>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Not Found</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ScannerSheet open={scannerOpen} onClose={() => setScannerOpen(false)} onDetect={(code) => handleProductScan(code)} title="Scan Product" />

      <Modal open={!!editBarcode} onClose={() => setEditBarcode(null)} title="Edit Product Details" maxWidth="max-w-sm">
        <form className="space-y-3" onSubmit={handleEditSave}>
          <div>
            <label className="text-xs font-medium text-slate-600">Description</label>
            <input value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Brand</label>
            <input value={editForm.brand} onChange={(e) => setEditForm((f) => ({ ...f, brand: e.target.value }))} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Expiry Date</label>
            <input type="date" value={editForm.expiry} onChange={(e) => setEditForm((f) => ({ ...f, expiry: e.target.value }))} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Quantity Override</label>
            <input type="number" value={editForm.qty} onChange={(e) => setEditForm((f) => ({ ...f, qty: e.target.value }))} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white" />
          </div>
          <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700">Save</button>
        </form>
      </Modal>

      <Modal open={completeOpen} onClose={() => setCompleteOpen(false)} title="Complete Location Audit" maxWidth="max-w-sm">
        <form className="space-y-3.5" onSubmit={handleCompleteSubmit}>
          <p className="text-sm text-slate-500">
            Review results for <strong className="text-ink-950">{activeCode}</strong>:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-emerald-600">{products.length - products.filter((p) => (auditMap[p.barcode] || 0) !== p.qty).length}</p>
              <p className="text-[11px] text-slate-500">Matched</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-amber-600">{products.filter((p) => (auditMap[p.barcode] || 0) !== p.qty).length}</p>
              <p className="text-[11px] text-slate-500">Discrepancies</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Final Status</label>
            <select value={completeStatus} onChange={(e) => setCompleteStatus(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white">
              <option value="PASS">PASS — Zero issues</option>
              <option value="RECO">RECO — Discrepancies found</option>
              <option value="FAIL">FAIL — Errors persist</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Remarks</label>
            <textarea rows={2} value={completeRemarks} onChange={(e) => setCompleteRemarks(e.target.value)} placeholder="Notes…" className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white resize-none" />
          </div>
          <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700">Mark Complete</button>
        </form>
      </Modal>
    </div>
  );
}
