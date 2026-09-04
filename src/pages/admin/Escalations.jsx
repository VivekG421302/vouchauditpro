import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/layout/AppShell.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { toast } from '../../store/useToastStore.js';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'urgent', label: 'Urgent Staffing' },
  { id: 'billing_dispute', label: 'Billing Disputes' },
];
const TONE_MAP = { red: 'bg-red-50 text-red-600 border-red-200', amber: 'bg-amber-50 text-amber-700 border-amber-200', emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

export default function AdminEscalations() {
  const api = useVouchStore((s) => s.api);
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState('all');

  function load() {
    Promise.all([api.getUrgentLocations(), api.getAllCompanyRequests()]).then(([urgentLocs, requests]) => {
      const urgentItems = urgentLocs.map((l) => ({
        kind: 'urgent',
        id: l.id,
        icon: 'siren',
        tone: 'red',
        title: 'Urgent Staffing Request',
        subtitle: l.name,
        message: l.urgentNote || 'CA needs additional auditors fast.',
        createdAt: l.startDate || '',
      }));
      const disputeItems = requests
        .filter((r) => r.type === 'billing_dispute')
        .map((r) => ({
          kind: 'billing_dispute',
          id: r.id,
          icon: 'life-buoy',
          tone: r.status === 'open' ? 'amber' : 'emerald',
          title: 'Billing Dispute',
          subtitle: `${r.companyName}${r.locationName ? ' · ' + r.locationName : ''}`,
          message: r.message,
          createdAt: r.createdAt,
          resolved: r.status === 'resolved',
        }));
      setItems([...urgentItems, ...disputeItems].sort((a, b) => (a.resolved ? 1 : 0) - (b.resolved ? 1 : 0)));
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const filtered = useMemo(() => (items ? (filter === 'all' ? items : items.filter((i) => i.kind === filter)) : null), [items, filter]);

  function handleResolve(kind, id) {
    const action = kind === 'urgent' ? api.resolveUrgentRequest(id) : api.resolveCompanyRequest(id);
    action.then(() => {
      toast('Marked as handled', 'check-check', 'emerald');
      load();
    });
  }

  return (
    <AppShell role="admin" title="Escalations">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950">Escalations</h1>
        <p className="text-slate-500 text-sm mt-0.5">Urgent staffing requests and billing disputes that need attention.</p>
      </div>

      <div className="inline-flex bg-slate-100 rounded-xl p-1 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${filter === f.id ? 'bg-white shadow-card text-ink-950' : 'text-slate-500'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div id="escalationsList" className="space-y-2.5">
        {filtered && filtered.length === 0 && (
          <EmptyState icon="shield-check" title="Nothing needs attention" message="Urgent staffing requests and billing disputes will show up here as they come in." />
        )}
        {filtered &&
          filtered.map((i) => (
            <div key={`${i.kind}:${i.id}`} className={`flex items-start justify-between gap-3 bg-white border border-slate-200 rounded-2xl shadow-card p-4 ${i.resolved ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg ${TONE_MAP[i.tone]} flex items-center justify-center shrink-0 border`}>
                  <Icon name={i.icon} className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-ink-950">{i.title}</p>
                    <span className="text-[10px] text-slate-400">{i.subtitle}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{i.message}</p>
                  {i.createdAt && <p className="text-[10px] text-slate-400 mt-1">{i.createdAt}</p>}
                </div>
              </div>
              {i.resolved ? (
                <span className="shrink-0 text-[10px] font-medium text-emerald-600 whitespace-nowrap inline-flex items-center gap-1">
                  <Icon name="check" className="w-3 h-3" />
                  Handled
                </span>
              ) : (
                <button onClick={() => handleResolve(i.kind, i.id)} className="shrink-0 text-[11px] font-medium text-brand-600 whitespace-nowrap">
                  Mark Handled
                </button>
              )}
            </div>
          ))}
      </div>
    </AppShell>
  );
}
