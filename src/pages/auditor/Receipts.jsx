import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { vouchDaysUntil } from '../../lib/db.js';
import { formatMoney } from '../../lib/format.js';

export default function AuditorReceipts() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const auditorId = session?.auditorId;
  const [receipts, setReceipts] = useState(null);

  useEffect(() => {
    if (!auditorId) return;
    api.getReceiptsForAuditor(auditorId).then(setReceipts);
  }, [api, auditorId]);

  let summary = null;
  if (receipts) {
    const now = new Date();
    const thisMonth = receipts.filter((r) => {
      const d = r.dueDate ? new Date(r.dueDate) : null;
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    summary = {
      monthEarning: thisMonth.reduce((s, r) => s + r.amount, 0),
      pendingTotal: receipts.filter((r) => !r.paidInFull).reduce((s, r) => s + r.amount, 0),
      lifetimeTotal: receipts.filter((r) => r.paidInFull).reduce((s, r) => s + r.amount, 0),
    };
  }

  return (
    <AppShell role="auditor" title="Receipts">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950">Receipts</h1>
        <p className="text-slate-500 text-sm mt-0.5">Your earnings, organized per audit.</p>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-4">
            <p className="text-[11px] text-slate-500">This Month's Earning</p>
            <p className="font-display text-xl font-bold text-ink-950 mt-1">{formatMoney(summary.monthEarning)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-4">
            <p className="text-[11px] text-slate-500">Pending Payout</p>
            <p className="font-display text-xl font-bold text-amber-600 mt-1">{formatMoney(summary.pendingTotal)}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-4">
            <p className="text-[11px] text-slate-500">Total Received</p>
            <p className="font-display text-xl font-bold text-emerald-600 mt-1">{formatMoney(summary.lifetimeTotal)}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {receipts && receipts.length === 0 && (
          <EmptyState
            icon="receipt"
            title="No receipts yet"
            message="Receipts appear once a CA marks your audit complete and payment begins."
          />
        )}
        {receipts &&
          receipts.map((r) => {
            const daysToDue = r.dueDate ? vouchDaysUntil(r.dueDate) : null;
            return (
              <div key={r.locationId} className="bg-white border border-slate-200 rounded-2xl shadow-card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink-950 truncate">{r.name}</p>
                    {r.paidInFull ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Paid
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {r.auditType} · {r.address}
                  </p>
                  {!r.paidInFull && daysToDue !== null && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      {daysToDue >= 0 ? `${daysToDue} days pending for payment` : `${Math.abs(daysToDue)} days overdue`}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold text-ink-950">{formatMoney(r.amount)}</p>
                  <Link to={`/auditor/invoice?locationId=${r.locationId}`} className="text-[11px] font-medium text-brand-600 mt-1 inline-flex items-center gap-1">
                    <Icon name="file-text" className="w-3 h-3" />
                    Invoice
                  </Link>
                </div>
              </div>
            );
          })}
      </div>
    </AppShell>
  );
}
