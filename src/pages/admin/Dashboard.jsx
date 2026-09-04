import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { formatMoney } from '../../lib/format.js';

const METRIC_TONE = { brand: 'text-brand-600 bg-brand-50', ink: 'text-ink-950 bg-slate-100', emerald: 'text-emerald-600 bg-emerald-50', amber: 'text-amber-600 bg-amber-50', red: 'text-red-600 bg-red-50' };
const ACTIVITY_TONE = { emerald: 'text-emerald-600 bg-emerald-50', brand: 'text-brand-600 bg-brand-50', amber: 'text-amber-600 bg-amber-50', ink: 'text-ink-950 bg-slate-100', red: 'text-red-600 bg-red-50' };
const STAT_TONE = { brand: 'bg-brand-500', ink: 'bg-ink-950', emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', slate: 'bg-slate-300' };

function StatRow({ label, value, sub, tone, pct }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-ink-950">{label}</span>
        <span className="text-slate-500">
          {value}
          {sub && <span className="text-slate-400"> · {sub}</span>}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${STAT_TONE[tone] || STAT_TONE.slate}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const api = useVouchStore((s) => s.api);
  const [metrics, setMetrics] = useState(null);
  const [activity, setActivity] = useState(null);
  const [recent, setRecent] = useState(null);
  const [breakdowns, setBreakdowns] = useState(null);

  useEffect(() => {
    Promise.all([api.getProjects(), api.getUsers(), api.getInvoices(), api.getUrgentLocations(), api.getAllCompanyRequests()]).then(
      ([projects, users, invoices, urgent, requests]) => {
        const activeAudits = projects.filter((p) => p.status === 'approved').length;
        const cas = users.filter((u) => u.role === 'CA').length;
        const auditors = users.filter((u) => u.role === 'Auditor' && u.status === 'Active').length;
        const pendingPayout = invoices.filter((i) => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
        const openEscalations = urgent.length + requests.filter((r) => r.type === 'billing_dispute' && r.status === 'open').length;
        setMetrics([
          { label: 'Total Active Audits', value: activeAudits, icon: 'activity', tone: 'brand' },
          { label: 'Registered CAs', value: cas, icon: 'briefcase', tone: 'ink' },
          { label: 'Verified Auditors', value: auditors, icon: 'shield-check', tone: 'emerald' },
          { label: 'Pending Payout Volume', value: formatMoney(pendingPayout), icon: 'wallet', tone: 'amber' },
          { label: 'Open Escalations', value: openEscalations, icon: 'siren', tone: openEscalations ? 'red' : 'emerald', href: '/admin/escalations' },
        ]);
      }
    );

    // Buckets real attendance check-ins into 8 weekly buckets ending this
    // week, rather than a hardcoded array — sparse on a fresh seed, fills in
    // as check-ins happen.
    api.getAttendance().then((rows) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const buckets = new Array(8).fill(0);
      rows.forEach((r) => {
        const d = new Date(r.date);
        if (isNaN(d.getTime())) return;
        const weeksAgo = Math.floor((now - d) / weekMs);
        const idx = 7 - weeksAgo;
        if (idx >= 0 && idx <= 7) buckets[idx]++;
      });
      setActivity({ buckets, count: rows.length });
    });

    api.getActivityLog().then((items) => setRecent(items.slice(0, 6)));

    Promise.all([api.getUsers(), api.getProjects(), api.getCompanies(), api.getCompanyAccounts()]).then(([users, projects, companies, accounts]) => {
      const roles = ['CA', 'Auditor'];
      const maxUsers = Math.max(1, ...roles.map((r) => users.filter((u) => u.role === r).length));
      const usersBreakdown = roles.map((r) => {
        const rows = users.filter((u) => u.role === r);
        const active = rows.filter((u) => u.status === 'Active').length;
        const pending = rows.filter((u) => u.status === 'Pending Verification').length;
        const suspended = rows.filter((u) => u.status === 'Suspended').length;
        const sub = [active && `${active} active`, pending && `${pending} pending`, suspended && `${suspended} suspended`].filter(Boolean).join(', ');
        return { label: `${r}s`, value: rows.length, sub, tone: r === 'CA' ? 'ink' : 'brand', pct: (rows.length / maxUsers) * 100 };
      });

      const statuses = [
        { key: 'pending', label: 'Pending Review', tone: 'amber' },
        { key: 'approved', label: 'Approved', tone: 'emerald' },
        { key: 'rejected', label: 'Rejected', tone: 'red' },
      ];
      const maxProj = Math.max(1, ...statuses.map((s) => projects.filter((p) => p.status === s.key).length));
      const projectsBreakdown = statuses.map((s) => {
        const count = projects.filter((p) => p.status === s.key).length;
        return { label: s.label, value: count, sub: null, tone: s.tone, pct: (count / maxProj) * 100 };
      });

      const totalBranches = companies.reduce((s, c) => s + c.branches.length, 0);
      const withPortal = companies.filter((c) => accounts.find((a) => a.name === c.name)).length;
      const withoutPortal = companies.length - withPortal;
      const maxComp = Math.max(1, companies.length);
      const companiesBreakdown = [
        { label: 'Total Companies', value: companies.length, sub: `${totalBranches} branches`, tone: 'ink', pct: 100 },
        { label: 'With Portal Login', value: withPortal, sub: null, tone: 'emerald', pct: (withPortal / maxComp) * 100 },
        { label: 'No Portal Login', value: withoutPortal, sub: null, tone: 'slate', pct: (withoutPortal / maxComp) * 100 },
      ];

      setBreakdowns({ usersBreakdown, projectsBreakdown, companiesBreakdown });
    });
  }, [api]);

  return (
    <AppShell role="admin" title="Control Center">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950">Control Center</h1>
        <p className="text-slate-500 text-sm mt-0.5">Platform-wide overview across CAs, auditors, companies, and payouts.</p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6" id="adminMetrics">
        {!metrics && <p className="text-xs text-slate-400 col-span-full">Loading…</p>}
        {metrics &&
          metrics.map((c) => {
            const inner = (
              <>
                <div className={`w-9 h-9 rounded-lg ${METRIC_TONE[c.tone]} flex items-center justify-center mb-3`}>
                  <Icon name={c.icon} className="w-[18px] h-[18px]" />
                </div>
                <p className="font-display text-xl sm:text-2xl font-bold text-ink-950">{c.value}</p>
                <p className="text-xs text-slate-500 mt-1">{c.label}</p>
              </>
            );
            return c.href ? (
              <Link key={c.label} to={c.href} className="block bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-card hover:border-brand-300 transition">
                {inner}
              </Link>
            ) : (
              <div key={c.label} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-card">
                {inner}
              </div>
            );
          })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-ink-950">Check-In Activity</h3>
            <span className="text-[11px] font-mono text-slate-400">{activity ? `n=${activity.count} check-ins` : ''}</span>
          </div>
          {!activity ? (
            <p className="text-xs text-slate-400">Loading…</p>
          ) : (
            <div className="flex items-end gap-2 h-28">
              {activity.buckets.map((v, i) => {
                const max = Math.max(1, ...activity.buckets);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <div
                      className={`w-full rounded-t-md relative transition-colors ${v ? 'bg-brand-100 group-hover:bg-brand-500' : 'bg-slate-100'}`}
                      style={{ height: `${Math.max(4, (v / max) * 100)}px` }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100">{v}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">W{i + 1}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
          <h3 className="font-display font-semibold text-ink-950 mb-3">Recent Activity</h3>
          <div className="space-y-2.5">
            {!recent && <p className="text-xs text-slate-400">Loading…</p>}
            {recent && recent.length === 0 && <p className="text-xs text-slate-400">No activity yet — approvals, payouts, and account changes will show up here.</p>}
            {recent &&
              recent.map((i, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-lg ${ACTIVITY_TONE[i.tone] || ACTIVITY_TONE.ink} flex items-center justify-center shrink-0`}>
                    <Icon name={i.icon} className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-xs text-slate-600 leading-snug pt-1">{i.text}</p>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
          <h3 className="font-display font-semibold text-ink-950 mb-3 text-sm">Users</h3>
          <div className="space-y-3">
            {breakdowns ? breakdowns.usersBreakdown.map((r) => <StatRow key={r.label} {...r} />) : <p className="text-xs text-slate-400">Loading…</p>}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
          <h3 className="font-display font-semibold text-ink-950 mb-3 text-sm">Projects</h3>
          <div className="space-y-3">
            {breakdowns ? breakdowns.projectsBreakdown.map((r) => <StatRow key={r.label} {...r} />) : <p className="text-xs text-slate-400">Loading…</p>}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
          <h3 className="font-display font-semibold text-ink-950 mb-3 text-sm">Companies</h3>
          <div className="space-y-3">
            {breakdowns ? breakdowns.companiesBreakdown.map((r) => <StatRow key={r.label} {...r} />) : <p className="text-xs text-slate-400">Loading…</p>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
