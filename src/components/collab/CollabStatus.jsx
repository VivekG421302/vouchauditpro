import { useEffect, useState } from 'react';
import { useVouchStore } from '../../store/useVouchStore.js';
import { vouchFormatDate } from '../../lib/db.js';

export default function CollabStatus({ locationId }) {
  const api = useVouchStore((s) => s.api);
  const [loc, setLoc] = useState(null);

  useEffect(() => {
    api.getLocation(locationId).then(setLoc);
  }, [api, locationId]);

  if (!loc) return <p className="text-xs text-slate-400">Loading…</p>;

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink-950">Audit Progress</h3>
          <span className="text-xs font-mono text-brand-700 bg-brand-50 border border-brand-100 px-2 py-1 rounded-full">{loc.progress || 0}%</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden mb-3">
          <div className={`h-full rounded-full ${loc.onHold ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${loc.progress || 0}%` }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {loc.onHold && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">On Hold</span>
          )}
          {loc.extended && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-brand-50 text-brand-700 border-brand-100">
              Extended to {vouchFormatDate(loc.expectedEnd)}
            </span>
          )}
          {loc.postponed && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-200">Postponed</span>
          )}
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5 mt-4">
        <h3 className="font-display font-semibold text-ink-950 mb-3">Status Updates from the Field</h3>
        <div className="space-y-2.5">
          {loc.statusLog.length ? (
            loc.statusLog.map((s, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-ink-950">{s.date}</p>
                  <span className="text-[10px] text-slate-400">
                    {s.completedQty}/{s.totalQty} done · {s.damageQty} damaged
                  </span>
                </div>
                {s.note && <p className="text-[11px] text-slate-500 mt-1">{s.note}</p>}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">No status updates logged yet.</p>
          )}
        </div>
      </div>
    </>
  );
}
