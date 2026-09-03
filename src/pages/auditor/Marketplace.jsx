import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { formatMoney } from '../../lib/format.js';

export default function AuditorMarketplace() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const auditorId = session?.auditorId;

  const [list, setList] = useState(null);
  const [conflicts, setConflicts] = useState({}); // listingId -> boolean

  useEffect(() => {
    if (!auditorId) return;
    Promise.all([api.getMarketplace(), api.getAssignmentsForAuditor(auditorId)]).then(([listings, assignments]) => {
      setList(listings);
      listings.forEach((m) => {
        if (m.applied) return;
        api.getLocation(m.id).then((loc) => {
          if (!loc) return;
          const conflict = assignments.some((l) => {
            const s1 = new Date(loc.startDate);
            const e1 = new Date(loc.endDate);
            const s2 = new Date(l.startDate);
            const e2 = new Date(l.endDate);
            return s1 <= e2 && s2 <= e1;
          });
          if (conflict) setConflicts((c) => ({ ...c, [m.id]: true }));
        });
      });
    });
  }, [api, auditorId]);

  return (
    <AppShell role="auditor" title="Marketplace">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950">Marketplace</h1>
        <p className="text-slate-500 text-sm mt-0.5">{list ? `${list.length} open listings` : '…'}</p>
      </div>

      <div className="space-y-3">
        {list && list.length === 0 && (
          <p className="text-xs text-slate-400 py-10 text-center">No open listings right now — check back soon.</p>
        )}
        {list &&
          list.map((m) => {
            const clash = conflicts[m.id];
            const ctaLabel = m.applied ? 'Applied ✓' : clash ? 'Dates clash' : 'View details';
            const ctaClass = m.applied
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : clash
              ? 'bg-slate-100 text-slate-400 border border-slate-200'
              : 'bg-ink-950 text-white';
            return (
              <Link
                key={m.id}
                to={`/auditor/listing-detail?id=${m.id}`}
                className="block bg-white rounded-2xl shadow-card border border-slate-200 p-4 hover:border-brand-300 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink-950">{m.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {m.company} · {m.location}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">{m.type}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-semibold text-ink-950">{formatMoney(m.payout)}</span>
                    <span className="text-[11px] text-slate-400">
                      {m.filled}/{m.spots} filled
                    </span>
                  </div>
                  <span className={`${ctaClass} text-[11px] font-medium px-3.5 py-1.5 rounded-lg`}>{ctaLabel}</span>
                </div>
              </Link>
            );
          })}
      </div>
    </AppShell>
  );
}
