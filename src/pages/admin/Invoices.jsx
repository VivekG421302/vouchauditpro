import { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell.jsx';
import Modal from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { formatMoney } from '../../lib/format.js';
import { toast } from '../../store/useToastStore.js';

export default function AdminInvoices() {
  const api = useVouchStore((s) => s.api);
  const [invoices, setInvoices] = useState(null);
  const [flagId, setFlagId] = useState(null);
  const [flagNote, setFlagNote] = useState('');

  function load() {
    api.getInvoices().then(setInvoices);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  function handleApprove(id) {
    api.approveInvoice(id).then((inv) => {
      toast(`Payout email dispatched to ${inv.auditor} · ${inv.id} marked Paid`, 'mail-check', 'emerald');
      load();
    });
  }

  function handleFlagSubmit(e) {
    e.preventDefault();
    api.flagInvoice(flagId, flagNote).then((inv) => {
      setFlagId(null);
      setFlagNote('');
      toast(`${inv.id} flagged for review`, 'flag', 'red');
      load();
    });
  }

  return (
    <AppShell role="admin" title="Invoices & Payouts">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950">Invoices &amp; Payouts</h1>
        <p className="text-slate-500 text-sm mt-0.5">Review and release auditor payouts across the platform.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Auditor</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody>
            {invoices &&
              invoices.map((i) => (
                <tr key={i.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono text-xs text-ink-950">{i.id}</td>
                  <td className="px-4 py-3 text-sm text-ink-950">{i.auditor}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{i.project}</td>
                  <td className="px-4 py-3 font-mono text-sm text-ink-950">{formatMoney(i.amount)}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">{i.submitted}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={i.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {i.status === 'pending' ? (
                      <div className="inline-flex gap-1.5">
                        <button onClick={() => handleApprove(i.id)} className="text-[11px] font-medium text-white bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-700">
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setFlagId(i.id);
                            setFlagNote('');
                          }}
                          className="text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-100"
                        >
                          Flag
                        </button>
                      </div>
                    ) : i.status === 'flagged' ? (
                      <span className="text-[11px] text-slate-400" title={i.flagNote || ''}>
                        {i.flagNote ? i.flagNote.slice(0, 28) + (i.flagNote.length > 28 ? '…' : '') : 'Flagged'}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!flagId} onClose={() => setFlagId(null)} title="Flag Invoice" maxWidth="max-w-sm">
        <form className="space-y-3" onSubmit={handleFlagSubmit}>
          <textarea
            required
            rows={3}
            value={flagNote}
            onChange={(e) => setFlagNote(e.target.value)}
            placeholder="Why is this invoice being flagged?"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white resize-none"
          />
          <button className="w-full bg-red-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-red-700">Flag for Review</button>
        </form>
      </Modal>
    </AppShell>
  );
}
