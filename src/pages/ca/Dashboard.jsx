import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import CaLocationCard from '../../components/ca/CaLocationCard.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { formatMoney } from '../../lib/format.js';
import { toast } from '../../store/useToastStore.js';

const REQUEST_LABEL = { new_audit: 'New Audit Request', postponement: 'Postponement Request', dispute: 'Disputed Finding' };
const REQUEST_ICON = { new_audit: 'clipboard-plus', postponement: 'calendar-clock', dispute: 'flag' };

export default function CaDashboard() {
  const api = useVouchStore((s) => s.api);
  const [locations, setLocations] = useState(null);
  const [requests, setRequests] = useState(null);

  useEffect(() => {
    api.getLocations().then(setLocations);
  }, [api]);

  useEffect(() => {
    api.getAllCompanyRequests().then((all) => setRequests(all.filter((r) => r.type !== 'billing_dispute')));
  }, [api]);

  const stats = useMemo(() => {
    if (!locations) return null;
    const pending = locations.filter((l) => l.status === 'fulfillment_pending');
    const completed = locations.filter((l) => l.status === 'fulfillment_completed');
    const monitoring = locations.filter((l) => l.status === 'monitoring');
    const payment = locations.filter((l) => l.status === 'payment');
    const pendingPayoutTotal = payment.reduce((s, l) => s + (l.payment.total - l.payment.paid), 0);
    const urgentCount = locations.filter((l) => l.urgent).length;
    return { pending, completed, monitoring, payment, pendingPayoutTotal, urgentCount };
  }, [locations]);

  function handleResolve(id) {
    api.resolveCompanyRequest(id).then(() => {
      toast('Marked as reviewed', 'check-check', 'emerald');
      api.getAllCompanyRequests().then((all) => setRequests(all.filter((r) => r.type !== 'billing_dispute')));
    });
  }

  return (
    <AppShell role="ca" title="Dashboard">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Your audit operations at a glance.</p>
      </div>

      {stats && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          <StatCard
            icon="hourglass"
            label="Fulfillment Pending"
            value={stats.pending.length}
            note={`${stats.completed.length} fulfilled & waiting to start`}
          />
          <StatCard
            icon="radar"
            iconClass="bg-brand-50 text-brand-600"
            label="Live Audits"
            value={stats.monitoring.length}
            note={`${stats.monitoring.filter((l) => l.onHold).length} on hold · ${
              stats.monitoring.filter((l) => l.extended).length
            } extended`}
          />
          <StatCard
            icon="wallet"
            label="Payments Pending"
            value={formatMoney(stats.pendingPayoutTotal)}
            note={`Across ${stats.payment.length} location${stats.payment.length === 1 ? '' : 's'}`}
          />
          <StatCard
            icon="alert-triangle"
            iconClass={stats.urgentCount ? 'bg-red-50 text-red-600' : ''}
            valueClass={stats.urgentCount ? 'text-red-600' : ''}
            label="Urgent Requests"
            value={stats.urgentCount}
            note="Being handled by Vouch support"
          />
        </div>
      )}

      {stats && (
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-card p-5">
            <h3 className="font-display font-semibold text-ink-950 mb-4">Locations in Progress</h3>
            <div className="space-y-3">
              {stats.monitoring.length ? (
                stats.monitoring.map((l) => (
                  <div key={l.id}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-600 font-medium truncate max-w-[70%]">{l.name}</span>
                      <span className="font-mono text-slate-400">{l.progress || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${l.onHold ? 'bg-amber-500' : 'bg-brand-500'}`}
                        style={{ width: `${l.progress || 0}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No audits are live right now.</p>
              )}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
            <h3 className="font-display font-semibold text-ink-950 mb-4">Pipeline Split</h3>
            <PipelineChart stats={stats} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-bold text-ink-950">Monitor</h2>
        <Link to="/ca/fulfillment" className="text-xs font-medium text-brand-600 inline-flex items-center gap-1">
          Fulfillment queue <Icon name="arrow-right" className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {stats && stats.monitoring.length > 0 ? (
          stats.monitoring.map((l) => <CaLocationCard key={l.id} loc={l} priority="monitor" />)
        ) : stats ? (
          <div className="md:col-span-2">
            <EmptyState
              icon="radar"
              title="Nothing to monitor yet"
              message="Locations move here once their audit start date arrives and their team is fulfilled."
            />
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-bold text-ink-950">Company Requests</h2>
        {requests && (
          <span className="text-[11px] font-mono text-slate-400">
            {requests.filter((r) => r.status === 'open').length} open
          </span>
        )}
      </div>
      <div className="space-y-2.5">
        {requests && requests.length === 0 && (
          <EmptyState
            icon="inbox"
            title="Nothing from your companies yet"
            message="Requests for new audits, postponements, disputed findings, or billing issues will show up here."
          />
        )}
        {requests &&
          requests.map((r) => (
            <div
              key={r.id}
              className={`flex items-start justify-between gap-3 bg-white border border-slate-200 rounded-2xl shadow-card p-4 ${
                r.status === 'resolved' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Icon name={REQUEST_ICON[r.type] || 'inbox'} className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-ink-950">{REQUEST_LABEL[r.type] || r.type}</p>
                    <span className="text-[10px] text-slate-400">{r.companyName}</span>
                    {r.branchName && <span className="text-[10px] text-slate-400">· {r.branchName}</span>}
                    {r.locationName && <span className="text-[10px] text-slate-400">· {r.locationName}</span>}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{r.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{r.createdAt}</p>
                </div>
              </div>
              {r.status === 'open' ? (
                <button
                  onClick={() => handleResolve(r.id)}
                  className="shrink-0 text-[11px] font-medium text-brand-600 whitespace-nowrap"
                >
                  Mark Reviewed
                </button>
              ) : (
                <span className="shrink-0 text-[10px] font-medium text-emerald-600 whitespace-nowrap inline-flex items-center gap-1">
                  <Icon name="check" className="w-3 h-3" />
                  Reviewed
                </span>
              )}
            </div>
          ))}
      </div>
    </AppShell>
  );
}

function StatCard({ icon, iconClass, label, value, note, valueClass }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconClass || 'bg-slate-100 text-slate-500'}`}>
          <Icon name={icon} className="w-4 h-4" />
        </div>
      </div>
      <p className={`font-display text-2xl font-bold ${valueClass || 'text-ink-950'}`}>{value}</p>
      <p className="text-[11px] text-slate-400 mt-1">{note}</p>
    </div>
  );
}

function PipelineChart({ stats }) {
  const items = [
    { label: 'Fulfillment Pending', count: stats.pending.length, tone: 'bg-slate-400' },
    { label: 'Fulfillment Completed', count: stats.completed.length, tone: 'bg-emerald-500' },
    { label: 'Monitor', count: stats.monitoring.length, tone: 'bg-brand-500' },
    { label: 'Payments', count: stats.payment.length, tone: 'bg-amber-500' },
  ];
  const maxCount = Math.max(1, ...items.map((s) => s.count));
  return (
    <div className="space-y-3">
      {items.map((s) => (
        <div key={s.label}>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-600 font-medium">{s.label}</span>
            <span className="font-mono text-slate-400">{s.count}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full ${s.tone}`} style={{ width: `${(s.count / maxCount) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
