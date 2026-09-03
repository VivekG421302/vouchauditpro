import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { vouchFormatDate } from '../../lib/db.js';

const STATUS_LABEL = {
  fulfillment_pending: 'Staffing in progress',
  fulfillment_completed: 'Team confirmed',
  monitoring: 'Audit in progress',
  payment: 'Awaiting payment',
  history: 'Completed',
};
const STATUS_TONE = {
  fulfillment_pending: 'bg-slate-100 text-slate-600',
  fulfillment_completed: 'bg-brand-50 text-brand-700',
  monitoring: 'bg-emerald-50 text-emerald-700',
  payment: 'bg-amber-50 text-amber-700',
  history: 'bg-slate-100 text-slate-500',
};

export default function CompanyAudits() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const [locs, setLocs] = useState(null);

  useEffect(() => {
    api.getLocationsForCompany(session.name).then(setLocs);
  }, [api, session.name]);

  return (
    <AppShell role="company" title="My Audits">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950">My Audits</h1>
        <p className="text-slate-500 text-sm mt-0.5">Every audit engagement across your branches.</p>
      </div>

      <div className="space-y-3">
        {locs && locs.length === 0 && (
          <EmptyState
            icon="clipboard-list"
            title="No audits yet"
            message="Once your CA submits a project for your branches and it's approved, it will show up here."
          />
        )}
        {locs &&
          locs.map((l) => (
            <Link
              key={l.id}
              to={`/company/audit-detail?id=${l.id}`}
              className="block bg-white border border-slate-200 rounded-2xl shadow-card p-4 hover:border-brand-300 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-ink-950 truncate">{l.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {l.auditType} · {l.address}
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_TONE[l.status] || 'bg-slate-100 text-slate-500'}`}>
                  {STATUS_LABEL[l.status] || l.status}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  {vouchFormatDate(l.startDate)} – {vouchFormatDate(l.endDate)}
                </span>
                <span className="text-[11px] font-mono text-ink-950">{l.progress || 0}% complete</span>
              </div>
            </Link>
          ))}
      </div>
    </AppShell>
  );
}
