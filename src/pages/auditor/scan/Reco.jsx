import { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import { Icon } from '../../../components/ui/Icon.jsx';
import { scanDb, STORES } from '../../../lib/scanDb.js';
import { exportXLSX, scanStatusLabel } from '../../../lib/scanUtils.js';
import { toast } from '../../../store/useToastStore.js';

const STATUS_TONE = {
  PASS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  WAIT: 'bg-slate-100 text-slate-500 border-slate-200',
  RECO: 'bg-amber-50 text-amber-700 border-amber-200',
  FAIL: 'bg-red-50 text-red-600 border-red-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RECOUNT: 'bg-amber-50 text-amber-700 border-amber-200',
};

const STAT_CARDS = [
  { key: 'pass', label: 'Pass', icon: 'check-circle', tone: 'text-emerald-600 bg-emerald-50' },
  { key: 'wait', label: 'Pending', icon: 'clock', tone: 'text-slate-500 bg-slate-100' },
  { key: 'reco', label: 'Reconcile', icon: 'alert-circle', tone: 'text-amber-600 bg-amber-50' },
  { key: 'fail', label: 'Fail', icon: 'x-circle', tone: 'text-red-600 bg-red-50' },
];

export default function ScanReco() {
  const [locations, setLocations] = useState(null);
  const [reco, setReco] = useState(null);
  const [filter, setFilter] = useState('all');
  const [resolveId, setResolveId] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [flagId, setFlagId] = useState(null);
  const [exporting, setExporting] = useState(false);

  function load() {
    Promise.all([scanDb.getAll(STORES.LOCATIONS), scanDb.getAll(STORES.RECO)]).then(([locs, recoRows]) => {
      setLocations(locs);
      setReco(recoRows);
    });
  }

  useEffect(() => {
    load();
  }, []);

  const stats = locations
    ? {
        pass: locations.filter((l) => l.status === 'PASS').length,
        wait: locations.filter((l) => l.status === 'WAIT').length,
        reco: locations.filter((l) => l.status === 'RECO').length,
        fail: locations.filter((l) => l.status === 'FAIL').length,
      }
    : null;

  const filteredReco = reco ? (filter === 'all' ? reco : reco.filter((r) => r.status === filter)) : null;

  async function handleResolveSubmit(e) {
    e.preventDefault();
    await scanDb.resolveReco(resolveId, resolveNotes);
    setResolveId(null);
    setResolveNotes('');
    toast('Discrepancy resolved.', 'check-circle', 'emerald');
    load();
  }

  async function handleFlagConfirm() {
    const entry = await scanDb.get(STORES.RECO, flagId);
    if (entry) {
      await scanDb.upsertLocation(entry.location, { status: 'WAIT', completedAt: null });
      await scanDb.put(STORES.RECO, { ...entry, status: 'RECOUNT', updatedAt: Date.now() });
      toast(`Location ${entry.location} flagged for recount.`, 'rotate-ccw', 'amber');
    }
    setFlagId(null);
    load();
  }

  async function handleExportFinal() {
    setExporting(true);
    const { inventory, audits, reco: allReco, locations: allLocs } = await scanDb.exportAll();
    const finalRows = inventory.map((inv) => {
      const loc = allLocs.find((l) => l.code === inv.location);
      const auditsForItem = audits.filter((a) => a.barcode === inv.barcode && a.location === inv.location);
      const totalAudit = auditsForItem.reduce((s, a) => s + a.qty, 0);
      const recoEntries = allReco.filter((r) => r.barcode === inv.barcode && r.location === inv.location);
      return {
        Location: inv.location,
        Barcode: inv.barcode,
        Description: inv.description,
        Brand: inv.brand || '',
        Unit: inv.unit || '',
        System_Qty: inv.qty,
        Audit_Qty: totalAudit || 0,
        Variance: (totalAudit || 0) - inv.qty,
        Expiry: inv.expiry || '',
        MFG: inv.mfg || '',
        Location_Status: loc?.status || 'WAIT',
        Remarks: recoEntries.map((r) => r.remarks).filter(Boolean).join('; ') || '',
      };
    });
    for (const nf of allReco.filter((r) => r.type === 'not_found')) {
      finalRows.push({ Location: nf.location, Barcode: nf.barcode, Description: nf.description, Brand: '', Unit: '', System_Qty: 0, Audit_Qty: nf.auditQty, Variance: nf.auditQty, Expiry: '', MFG: '', Location_Status: 'RECO', Remarks: nf.remarks || '' });
    }
    await exportXLSX(finalRows, `Audit_Final_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Final Audit');
    toast(`Exported ${finalRows.length} rows.`, 'download', 'emerald');
    setExporting(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-lg font-bold text-ink-950">Reconciliation Dashboard</h2>
          <p className="text-sm text-slate-500">Live status tracker and discrepancy management.</p>
        </div>
        <button
          disabled={exporting}
          onClick={handleExportFinal}
          className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700 inline-flex items-center gap-1.5 disabled:opacity-60"
        >
          <Icon name="download" className="w-4 h-4" />
          Export Final Sheet
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {STAT_CARDS.map((s) => (
            <div key={s.key} className="bg-white border border-slate-200 rounded-2xl shadow-card p-4">
              <div className={`w-8 h-8 rounded-lg ${s.tone} flex items-center justify-center mb-2`}>
                <Icon name={s.icon} className="w-4 h-4" />
              </div>
              <p className="font-display text-xl font-bold text-ink-950">{stats[s.key]}</p>
              <p className="text-[11px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5 mb-5">
        <h3 className="text-sm font-semibold text-ink-950 mb-3">Location Status</h3>
        {locations === null && <p className="text-xs text-slate-400">Loading…</p>}
        {locations && locations.length === 0 && <p className="text-xs text-slate-400">No locations yet.</p>}
        {locations && locations.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {locations.map((loc) => (
              <div key={loc.code} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-ink-950">{loc.code}</p>
                  <p className="text-[11px] text-slate-500">{loc.itemCount || 0} items</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_TONE[loc.status] || STATUS_TONE.WAIT}`}>{scanStatusLabel(loc.status)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ink-950">Reconciliation Sheet</h3>
          <div className="flex gap-1.5">
            {['all', 'WAIT', 'RESOLVED'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-medium px-2.5 py-1.5 rounded-lg ${filter === f ? 'bg-ink-950 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {f === 'all' ? 'All' : f === 'WAIT' ? 'Pending' : 'Resolved'}
              </button>
            ))}
          </div>
        </div>

        {filteredReco === null && <p className="text-xs text-slate-400">Loading…</p>}
        {filteredReco && filteredReco.length === 0 && (
          <div className="text-center py-10">
            <Icon name="clipboard-check" className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm font-medium text-ink-950">All clear</p>
            <p className="text-xs text-slate-500 mt-1">No discrepancies logged yet.</p>
          </div>
        )}
        {filteredReco && filteredReco.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Location</th>
                  <th className="px-2 py-2 font-medium">Barcode</th>
                  <th className="px-2 py-2 font-medium">Description</th>
                  <th className="px-2 py-2 font-medium text-right">System</th>
                  <th className="px-2 py-2 font-medium text-right">Audit</th>
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filteredReco.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-2 py-2.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${STATUS_TONE[r.status] || STATUS_TONE.WAIT}`}>{r.status}</span>
                    </td>
                    <td className="px-2 py-2.5">
                      <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">{r.location}</code>
                    </td>
                    <td className="px-2 py-2.5 font-mono text-[11px]">{r.barcode}</td>
                    <td className="px-2 py-2.5 max-w-[180px] truncate">{r.description || '—'}</td>
                    <td className="px-2 py-2.5 text-right">{r.systemQty}</td>
                    <td className={`px-2 py-2.5 text-right font-semibold ${r.auditQty > r.systemQty ? 'text-emerald-600' : r.auditQty < r.systemQty ? 'text-red-600' : 'text-amber-600'}`}>{r.auditQty}</td>
                    <td className="px-2 py-2.5">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${r.type === 'not_found' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {r.type === 'not_found' ? 'Not Found' : 'Mismatch'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right whitespace-nowrap">
                      {r.status === 'WAIT' && (
                        <div className="inline-flex gap-1.5">
                          <button onClick={() => setResolveId(r.id)} className="text-[11px] font-medium text-white bg-brand-600 px-2.5 py-1 rounded-lg hover:bg-brand-700">
                            Resolve
                          </button>
                          <button onClick={() => setFlagId(r.id)} className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg hover:bg-slate-200">
                            Recount
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!resolveId} onClose={() => setResolveId(null)} title="Resolve Discrepancy" maxWidth="max-w-sm">
        <form className="space-y-3" onSubmit={handleResolveSubmit}>
          <p className="text-sm text-slate-500">Marking resolved. Add notes:</p>
          <textarea
            rows={3}
            value={resolveNotes}
            onChange={(e) => setResolveNotes(e.target.value)}
            placeholder="e.g., Counting error corrected…"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white resize-none"
          />
          <button className="w-full bg-emerald-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-emerald-700">Resolve</button>
        </form>
      </Modal>

      <Modal open={!!flagId} onClose={() => setFlagId(null)} title="Flag for Recount" maxWidth="max-w-sm">
        <p className="text-sm text-slate-500 mb-4">This will reset the location to Pending and require a new audit.</p>
        <button onClick={handleFlagConfirm} className="w-full bg-red-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-red-700">
          Flag for Recount
        </button>
      </Modal>
    </div>
  );
}
