import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal.jsx';
import AppShell from '../../components/layout/AppShell.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { formatMoney } from '../../lib/format.js';
import { toast } from '../../store/useToastStore.js';

const UNDERPAY_FLOOR = 3000;

export default function AdminApprovals() {
  const api = useVouchStore((s) => s.api);
  const [pending, setPending] = useState(null);
  const [reviewing, setReviewing] = useState(null);

  function load() {
    api.getPendingProjects().then(setPending);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  function openReview(id) {
    api.getProjects().then((projects) => setReviewing(projects.find((p) => p.id === id) || null));
  }

  function handleApprove() {
    api.approveProject(reviewing.id).then((p) => {
      setReviewing(null);
      toast(`${p.name} approved & published to Marketplace`, 'check-circle-2', 'emerald');
      load();
    });
  }

  function handleReject() {
    api.rejectProject(reviewing.id).then((p) => {
      setReviewing(null);
      toast(`${p.name} rejected and returned to CA`, 'x-circle', 'red');
      load();
    });
  }

  const underpay = reviewing && reviewing.payoutPerAuditor < UNDERPAY_FLOOR;

  return (
    <AppShell role="admin" title="Project Approvals">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Project Approvals</h1>
          <p className="text-slate-500 text-sm mt-0.5">Review CA submissions before they publish to the Marketplace.</p>
        </div>
        <span className="text-xs font-mono text-slate-400">{pending ? `${pending.length} awaiting review` : ''}</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">CA</th>
              <th className="px-4 py-3 font-medium">Budget</th>
              <th className="px-4 py-3 font-medium">Auditors</th>
              <th className="px-4 py-3 font-medium">Payout / Auditor</th>
              <th className="px-4 py-3 font-medium">Window</th>
              <th className="px-4 py-3 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody>
            {pending && pending.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  Queue is clear — no pending submissions.
                </td>
              </tr>
            )}
            {pending &&
              pending.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-950">{p.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {p.company} · {p.branch}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{p.ca}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-950">{formatMoney(p.budget)}</td>
                  <td className="px-4 py-3 text-xs">{p.auditorCount}</td>
                  <td className={`px-4 py-3 font-mono text-xs ${p.payoutPerAuditor < UNDERPAY_FLOOR ? 'text-red-600' : 'text-slate-600'}`}>
                    {formatMoney(p.payoutPerAuditor)}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-400 font-mono">
                    {p.start} → {p.end}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openReview(p.id)} className="text-[11px] font-medium text-white bg-ink-950 px-3 py-1.5 rounded-lg hover:bg-ink-900">
                      Review
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!reviewing} onClose={() => setReviewing(null)} title="Review Project">
        {reviewing && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display font-semibold text-ink-950">{reviewing.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {reviewing.company} · {reviewing.branch}
                </p>
              </div>
              <StatusBadge status="pending" />
            </div>
            {underpay && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
                <Icon name="alert-triangle" className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Payout per auditor ({formatMoney(reviewing.payoutPerAuditor)}) is below the platform's fair-pay floor of {formatMoney(UNDERPAY_FLOOR)}.
                  Review before approving to prevent underpayment.
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-400">Submitted by</p>
                <p className="font-medium text-ink-950 mt-0.5">{reviewing.ca}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-400">Audit Type</p>
                <p className="font-medium text-ink-950 mt-0.5">{reviewing.auditType}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-400">Auditors Required</p>
                <p className="font-medium text-ink-950 mt-0.5">{reviewing.auditorCount}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-400">Payout / Auditor</p>
                <p className={`font-medium mt-0.5 ${underpay ? 'text-red-600' : 'text-ink-950'}`}>{formatMoney(reviewing.payoutPerAuditor)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-400">Total Budget</p>
                <p className="font-medium text-ink-950 mt-0.5">{formatMoney(reviewing.budget)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] text-slate-400">Timeline</p>
                <p className="font-medium text-ink-950 mt-0.5 text-xs">
                  {reviewing.start} → {reviewing.end}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleReject} className="flex-1 border border-red-200 text-red-600 text-sm font-medium py-2.5 rounded-lg hover:bg-red-50">
                Reject
              </button>
              <button onClick={handleApprove} className="flex-1 bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700">
                Approve &amp; Publish
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
