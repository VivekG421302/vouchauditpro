import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { formatMoney } from '../../lib/format.js';

export default function CompanyBilling() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const [locs, setLocs] = useState(null);

  useEffect(() => {
    api.getBillableLocationsForCompany(session.name).then(setLocs);
  }, [api, session.name]);

  return (
    <AppShell role="company" title="Billing">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950">Billing</h1>
        <p className="text-slate-500 text-sm mt-0.5">Bills for completed audits across your branches.</p>
      </div>

      <div className="space-y-3" id="billingList">
        {locs && locs.length === 0 && (
          <EmptyState icon="wallet" title="No bills yet" message="Bills appear here once an audit at one of your branches is marked complete by the CA." />
        )}
        {locs &&
          locs.map((l) => {
            const pending = l.payment.total - l.payment.paid;
            const settled = pending <= 0;
            return (
              <Link key={l.id} to={`/company/billing-detail?id=${l.id}`} className="block bg-white border border-slate-200 rounded-2xl shadow-card p-4 hover:border-brand-300 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-ink-950 truncate">{l.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {l.auditType} · {l.address}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 border ${
                      settled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {settled ? 'Settled' : 'Payment Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">Bill total {formatMoney(l.payment.total)}</span>
                  <span className={`text-[11px] font-mono ${settled ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {settled ? 'Paid in full' : `${formatMoney(pending)} due`}
                  </span>
                </div>
              </Link>
            );
          })}
      </div>
    </AppShell>
  );
}
