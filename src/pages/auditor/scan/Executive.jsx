import { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import ScannerSheet from '../../../components/scan/ScannerSheet.jsx';
import { Icon } from '../../../components/ui/Icon.jsx';
import { scanDb, STORES } from '../../../lib/scanDb.js';
import { generateSessionId } from '../../../lib/scanUtils.js';
import { toast } from '../../../store/useToastStore.js';

export default function ScanExecutive({ auditorName }) {
  const [screen, setScreen] = useState('stats'); // 'stats' | 'locationScan' | 'items' | 'product'
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [location, setLocation] = useState(null);
  const [products, setProducts] = useState([]);
  const [entries, setEntries] = useState({}); // barcode -> {good, bad}
  const [sessionId, setSessionId] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualLocCode, setManualLocCode] = useState('');
  const [activeProduct, setActiveProduct] = useState(null); // {product, good, bad}
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsForm, setDetailsForm] = useState({ description: '', brand: '', expiry: '' });
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);

  function loadStats() {
    Promise.all([scanDb.getAll(STORES.LOCATIONS), scanDb.getAll(STORES.INVENTORY), scanDb.getAll(STORES.RECO)]).then(([locations, inventory, reco]) => {
      const pending = locations.filter((l) => l.status === 'WAIT' || l.status === 'RECO');
      const done = locations.filter((l) => l.status === 'PASS' || l.status === 'FAIL');
      const skus = new Set(inventory.map((i) => i.barcode)).size;
      const others = reco.filter((r) => r.status === 'WAIT').length;
      setStats({ pendingCount: pending.length, doneCount: done.length, productCount: inventory.length, skus, others, pendingList: pending });
      setScreen('stats');
    });
  }

  useEffect(() => {
    loadStats();
  }, []);

  function beginQueue() {
    const sorted = [...stats.pendingList].sort((a, b) => (a.code > b.code ? 1 : -1));
    setQueue(sorted);
    advanceQueue(sorted);
  }

  function advanceQueue(q) {
    const [next, ...rest] = q;
    if (!next) {
      toast('All assigned locations are complete!', 'check-circle', 'emerald');
      loadStats();
      return;
    }
    setQueue(rest);
    setLocation(next);
    setManualLocCode('');
    setScreen('locationScan');
  }

  function handleLocationScanned(code) {
    code = String(code).trim().toUpperCase();
    if (code !== location.code.toUpperCase()) {
      toast(`That's not ${location.code}. Scan the correct location.`, 'alert-triangle', 'red');
      return;
    }
    loadItems();
  }

  async function loadItems() {
    const newSessionId = generateSessionId();
    const prods = await scanDb.getInventoryByLocation(location.code);
    const prevEntries = await scanDb.getByIndex(STORES.AUDITS, 'location', location.code);
    const map = {};
    prevEntries.filter((e) => e.type === 'exec_submit').forEach((e) => {
      map[e.barcode] = { good: e.goodQty || 0, bad: e.badQty || 0 };
    });
    setSessionId(newSessionId);
    setProducts(prods);
    setEntries(map);
    setScreen('items');
  }

  function handleProductScanned(barcode) {
    barcode = String(barcode).trim().toUpperCase();
    const product = products.find((p) => p.barcode.toUpperCase() === barcode);
    if (!product) {
      scanDb.addRecoEntry({ location: location.code, barcode, description: 'Unknown product (scanned but not in system)', systemQty: 0, auditQty: 0, type: 'not_found', status: 'WAIT', sessionId });
      toast('Product not found here — logged to Reconciliation.', 'alert-triangle', 'amber');
      return;
    }
    openProduct(product.barcode);
  }

  function openProduct(barcode) {
    const product = products.find((p) => p.barcode === barcode);
    if (!product) return;
    const existing = entries[barcode];
    setActiveProduct({ product, good: existing?.good ?? product.qty ?? 0, bad: existing?.bad ?? 0 });
    setScreen('product');
  }

  function step(field, delta) {
    setActiveProduct((ap) => ({ ...ap, [field]: Math.max(0, ap[field] + delta) }));
  }

  function openDetailsEdit() {
    setDetailsForm({ description: activeProduct.product.description || '', brand: activeProduct.product.brand || '', expiry: activeProduct.product.expiry || '' });
    setDetailsOpen(true);
  }

  async function handleDetailsSave(e) {
    e.preventDefault();
    const updated = { ...activeProduct.product, ...detailsForm };
    await scanDb.put(STORES.INVENTORY, updated);
    setProducts((prods) => prods.map((p) => (p.barcode === updated.barcode ? updated : p)));
    setActiveProduct((ap) => ({ ...ap, product: updated }));
    setDetailsOpen(false);
    toast('Product details updated.', 'check', 'emerald');
  }

  async function submitProduct() {
    const { product, good, bad } = activeProduct;
    const priorEntries = (await scanDb.getByIndex(STORES.AUDITS, 'location', location.code)).filter((e) => e.barcode === product.barcode && e.type === 'exec_submit');
    for (const e of priorEntries) await scanDb.delete(STORES.AUDITS, e.id);
    await scanDb.saveAuditEntry({ sessionId, location: location.code, barcode: product.barcode, goodQty: good, badQty: bad, qty: good, type: 'exec_submit', productId: product.id });
    setEntries((m) => ({ ...m, [product.barcode]: { good, bad } }));
    if (bad > 0) {
      await scanDb.addRecoEntry({ location: location.code, barcode: product.barcode, description: product.description, systemQty: product.qty, auditQty: good, type: 'damaged', status: 'WAIT', sessionId, remarks: `${bad} bad unit(s) found` });
    }
    toast(`${product.description || product.barcode} recorded.`, 'check', 'emerald');
    setScreen('items');
  }

  async function completeLocation() {
    const missing = products.filter((p) => !entries[p.barcode]);
    for (const p of missing) {
      await scanDb.addRecoEntry({ location: location.code, barcode: p.barcode, description: p.description, systemQty: p.qty, auditQty: 0, type: 'missing', status: 'WAIT', sessionId });
    }
    const hasBad = Object.values(entries).some((e) => e.bad > 0);
    const status = missing.length ? 'RECO' : hasBad ? 'RECO' : 'PASS';
    await scanDb.upsertLocation(location.code, { status, completedAt: Date.now(), assignedTo: auditorName || 'Auditor', progress: 100 });
    toast(`${location.code} marked ${status}.`, 'check-circle', 'emerald');
    advanceQueue(queue);
  }

  // ---------- STATS SCREEN ----------
  if (screen === 'stats') {
    if (!stats) return <p className="text-sm text-slate-400 py-16 text-center">Loading…</p>;
    return (
      <div className="max-w-md mx-auto">
        <p className="text-sm text-slate-500">Hi, {(auditorName || 'Auditor').split(' ')[0]}</p>
        <h1 className="font-display text-2xl font-bold text-ink-950 mb-4">Your Progress</h1>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard label="Locations Left" value={stats.pendingCount} icon="map-pin" tone="text-brand-600 bg-brand-50" />
          <StatCard label="Locations Done" value={stats.doneCount} icon="check-circle" tone="text-emerald-600 bg-emerald-50" />
          <StatCard label="Products" value={stats.productCount} icon="boxes" tone="text-brand-600 bg-brand-50" />
          <StatCard label="SKUs" value={stats.skus} icon="barcode" tone="text-brand-600 bg-brand-50" />
          <StatCard label="Others (Reco)" value={stats.others} icon="alert-circle" tone="text-amber-600 bg-amber-50" full />
        </div>
        <button
          disabled={!stats.pendingCount}
          onClick={beginQueue}
          className="w-full bg-brand-600 text-white text-sm font-semibold py-3.5 rounded-2xl inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-300"
        >
          <Icon name="scan-barcode" className="w-5 h-5" />
          {stats.pendingCount ? 'Start Audit' : 'All Locations Complete'}
        </button>
      </div>
    );
  }

  // ---------- LOCATION SCAN SCREEN ----------
  if (screen === 'locationScan') {
    return (
      <div className="max-w-md mx-auto">
        <button onClick={loadStats} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-ink-950 mb-4">
          <Icon name="chevron-left" className="w-3.5 h-3.5" />
          Progress
        </button>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-8 text-center mb-4">
          <div className="w-14 h-14 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
            <Icon name="map-pin" className="w-7 h-7" />
          </div>
          <h2 className="font-display text-xl font-bold text-ink-950">{location.code}</h2>
          <p className="text-sm text-slate-500 mt-1">{location.name || "Scan this location's barcode to begin."}</p>
        </div>
        <button
          onClick={() => setScannerOpen(true)}
          className="w-full bg-brand-600 text-white text-sm font-semibold py-3.5 rounded-2xl inline-flex items-center justify-center gap-2 mb-3"
        >
          <Icon name="scan-barcode" className="w-5 h-5" />
          Scan Location Barcode
        </button>
        <input
          value={manualLocCode}
          onChange={(e) => setManualLocCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleLocationScanned(manualLocCode);
          }}
          placeholder="Or type location code…"
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
        />
        <ScannerSheet open={scannerOpen} onClose={() => setScannerOpen(false)} onDetect={handleLocationScanned} title="Scan Location Barcode" hint={`Expecting ${location.code}`} />
      </div>
    );
  }

  // ---------- ITEM LIST SCREEN ----------
  if (screen === 'items') {
    const total = products.length;
    const done = products.filter((p) => entries[p.barcode]).length;
    const allDone = total > 0 && done === total;
    return (
      <div className="max-w-md mx-auto pb-24">
        <button onClick={loadStats} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-ink-950 mb-3">
          <Icon name="chevron-left" className="w-3.5 h-3.5" />
          Progress
        </button>
        <h2 className="font-display text-lg font-bold text-ink-950 mb-2">{location.code}</h2>
        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mb-4">
          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
        <div className="space-y-2">
          {total === 0 && (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
              <Icon name="package-x" className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm text-slate-500">No items assigned to this location.</p>
            </div>
          )}
          {products.map((p) => {
            const submitted = entries[p.barcode];
            return (
              <button
                key={p.barcode}
                onClick={() => openProduct(p.barcode)}
                className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-3 border text-left ${submitted ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${submitted ? 'bg-emerald-500 text-white' : 'bg-slate-100'}`}>
                  {submitted && <Icon name="check" className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-950 truncate">{p.description || p.barcode}</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {p.barcode}
                    {p.brand ? ` · ${p.brand}` : ''}
                  </p>
                </div>
                {submitted ? (
                  <span className="text-sm font-mono font-semibold text-ink-950 shrink-0">
                    {submitted.good}
                    {submitted.bad > 0 && <span className="text-red-500"> / -{submitted.bad}</span>}
                  </span>
                ) : (
                  <Icon name="chevron-right" className="w-4 h-4 text-slate-300 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <div className="fixed bottom-16 lg:bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4 flex items-center gap-2">
          <button
            onClick={() => (allDone ? completeLocation() : setScannerOpen(true))}
            className="flex-1 bg-brand-600 text-white text-sm font-semibold py-3.5 rounded-2xl inline-flex items-center justify-center gap-2 shadow-lg"
          >
            <Icon name="scan-barcode" className="w-5 h-5" />
            {allDone ? 'Next Location' : 'Start Scanning'}
          </button>
          {!allDone && (
            <button onClick={() => setMoreOpen(true)} className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-lg flex items-center justify-center shrink-0">
              <Icon name="more-vertical" className="w-4 h-4 text-slate-500" />
            </button>
          )}
        </div>

        <ScannerSheet open={scannerOpen} onClose={() => setScannerOpen(false)} onDetect={handleProductScanned} title="Scan Product Barcode" hint={`Items at ${location.code}`} />

        <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More Options" maxWidth="max-w-sm">
          <button
            onClick={() => {
              setMoreOpen(false);
              setConfirmCompleteOpen(true);
            }}
            className="w-full text-left flex items-start gap-2.5 p-3 rounded-xl hover:bg-amber-50 text-amber-700"
          >
            <Icon name="flag" className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-sm">Mark Location Complete (remaining items unresolved)</span>
          </button>
        </Modal>

        <Modal open={confirmCompleteOpen} onClose={() => setConfirmCompleteOpen(false)} title="Mark Location Complete?" maxWidth="max-w-sm">
          <p className="text-sm text-slate-500 mb-4">
            Items you haven't scanned at {location.code} will be logged to Reconciliation as missing. Continue?
          </p>
          <button
            onClick={() => {
              setConfirmCompleteOpen(false);
              completeLocation();
            }}
            className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700"
          >
            Mark Complete
          </button>
        </Modal>
      </div>
    );
  }

  // ---------- PRODUCT DETAIL SCREEN ----------
  if (screen === 'product' && activeProduct) {
    const { product, good, bad } = activeProduct;
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink-950">Product Details</h3>
            <button onClick={openDetailsEdit} className="w-7 h-7 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400">
              <Icon name="pencil" className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Barcode</span>
              <span className="font-mono font-medium text-ink-950">{product.barcode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Description</span>
              <span className="font-medium text-ink-950 text-right">{product.description || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Brand</span>
              <span className="font-medium text-ink-950">{product.brand || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">System Qty</span>
              <span className="font-medium text-ink-950">{product.qty ?? '—'}</span>
            </div>
          </div>
        </div>

        <QtyStepper label="Good Qty" tone="text-emerald-600" value={good} onChange={(d) => step('good', d)} onSet={(v) => setActiveProduct((ap) => ({ ...ap, good: v }))} />
        <QtyStepper label="Bad Qty" tone="text-red-600" value={bad} onChange={(d) => step('bad', d)} onSet={(v) => setActiveProduct((ap) => ({ ...ap, bad: v }))} />

        <button onClick={openDetailsEdit} className="w-full border border-slate-200 text-ink-950 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 my-4">
          Update Other Details
        </button>

        <div className="flex gap-2">
          <button onClick={() => setScreen('items')} className="flex-1 border border-slate-200 text-ink-950 text-sm font-semibold py-3 rounded-2xl">
            Back
          </button>
          <button onClick={submitProduct} className="flex-1 bg-brand-600 text-white text-sm font-semibold py-3 rounded-2xl">
            Submit
          </button>
        </div>

        <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} title="Update Other Details" maxWidth="max-w-sm">
          <form className="space-y-3" onSubmit={handleDetailsSave}>
            <div>
              <label className="text-xs font-medium text-slate-600">Description</label>
              <input value={detailsForm.description} onChange={(e) => setDetailsForm((f) => ({ ...f, description: e.target.value }))} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Brand</label>
              <input value={detailsForm.brand} onChange={(e) => setDetailsForm((f) => ({ ...f, brand: e.target.value }))} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Expiry Date</label>
              <input type="date" value={detailsForm.expiry} onChange={(e) => setDetailsForm((f) => ({ ...f, expiry: e.target.value }))} className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white" />
            </div>
            <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700">Save</button>
          </form>
        </Modal>
      </div>
    );
  }

  return null;
}

function StatCard({ label, value, icon, tone, full }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-card p-4 ${full ? 'col-span-2' : ''}`}>
      <div className={`w-8 h-8 rounded-lg ${tone} flex items-center justify-center mb-2`}>
        <Icon name={icon} className="w-4 h-4" />
      </div>
      <p className="font-display text-xl font-bold text-ink-950">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

function QtyStepper({ label, tone, value, onChange, onSet }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  return (
    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3 mb-2.5">
      <span className={`text-sm font-medium ${tone}`}>{label}</span>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(-1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 flex items-center justify-center">
          −
        </button>
        {editing ? (
          <input
            autoFocus
            type="number"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              onSet(Math.max(0, parseInt(draft, 10) || 0));
              setEditing(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="w-12 text-center text-sm font-mono font-semibold border border-slate-200 rounded-lg py-1"
          />
        ) : (
          <span
            onClick={() => {
              setDraft(String(value));
              setEditing(true);
            }}
            className="w-8 text-center text-sm font-mono font-semibold text-ink-950 cursor-pointer"
          >
            {value}
          </span>
        )}
        <button onClick={() => onChange(1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 flex items-center justify-center">
          +
        </button>
      </div>
    </div>
  );
}
