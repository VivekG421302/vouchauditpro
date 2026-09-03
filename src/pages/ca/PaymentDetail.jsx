import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import MasterDetail from '../../components/ui/MasterDetail.jsx';
import Modal from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { vouchFormatDate, vouchDaysUntil } from '../../lib/db.js';
import { formatMoney } from '../../lib/format.js';
import { toast } from '../../store/useToastStore.js';

function initialsOf(name) {
  return name.split(' ').map((s) => s[0]).slice(0, 2).join('');
}

export default function CaPaymentDetail() {
  const api = useVouchStore((s) => s.api);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('id');

  const [loc, setLoc] = useState(undefined);
  const [partialOpen, setPartialOpen] = useState(false);
  const [amount, setAmount] = useState('');

  function load() {
    api.getLocation(locationId).then((l) => setLoc(l || null));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, api]);

  if (loc === undefined) {
    return (
      <AppShell role="ca" title="Payment">
        <p className="text-sm text-slate-400 py-16 text-center">Loading…</p>
      </AppShell>
    );
  }

  if (loc === null) {
    return (
      <AppShell role="ca" title="Payment">
        <p className="text-sm text-slate-400 py-16 text-center">
          Location not found.{' '}
          <button className="text-brand-600 font-medium" onClick={() => navigate('/ca/payments')}>
            Back to Payments
          </button>
        </p>
      </AppShell>
    );
  }

  const pending = loc.payment.total - loc.payment.paid;
  const daysToDue = vouchDaysUntil(loc.payment.dueDate);
  const overdue = daysToDue !== null && daysToDue < 0;

  function handlePayAll() {
    api.recordLocationPayment(loc.id, pending).then(() => {
      toast('Payment complete — location moved to History', 'check-check', 'emerald');
      navigate('/ca/history');
    });
  }

  function handlePartialSubmit(e) {
    e.preventDefault();
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) return;
    api.recordLocationPayment(loc.id, Math.min(amt, pending)).then((updated) => {
      setPartialOpen(false);
      setAmount('');
      if (updated.status === 'history') {
        toast('Final installment paid — moved to History', 'check-check', 'emerald');
        navigate('/ca/history');
      } else {
        toast('Partial payment recorded', 'banknote', 'brand');
        load();
      }
    });
  }

  const left = (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
        <h3 className="font-display font-semibold text-ink-950 mb-4">Bill Breakdown</h3>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">
              Base auditor allowance ({loc.assignedAuditors.length} × {formatMoney(loc.requirement.allowance)})
            </span>
            <span className="font-medium text-ink-950">
              {formatMoney(loc.requirement.allowance * loc.assignedAuditors.length)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Reimbursements</span>
            <span className="font-medium text-ink-950">{formatMoney(loc.payment.reimbursement || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Overtime cost</span>
            <span className="font-medium text-ink-950">{formatMoney(loc.payment.overtime || 0)}</span>
          </div>
          <div className="border-t border-slate-100 pt-2.5 flex justify-between">
            <span className="font-semibold text-ink-950">Total Bill</span>
            <span className="font-semibold text-ink-950">{formatMoney(loc.payment.total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Already paid</span>
            <span className="font-medium text-emerald-600">{formatMoney(loc.payment.paid)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-ink-950">Pending</span>
            <span className={`font-semibold ${pending > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatMoney(pending)}</span>
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mt-4">
          <div
            className="h-full bg-brand-500 rounded-full"
            style={{ width: `${loc.payment.total ? (loc.payment.paid / loc.payment.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
        <h3 className="font-display font-semibold text-ink-950 mb-4">Auditors Paid Through This Bill</h3>
        <div className="space-y-2">
          {loc.assignedAuditors.length ? (
            loc.assignedAuditors.map((a) => (
              <div key={a.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-ink-950 text-white text-xs font-semibold flex items-center justify-center">
                    {initialsOf(a.name)}
                  </div>
                  <p className="text-xs font-medium text-ink-950">{a.name}</p>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">{a.overtimeHours || 0}h OT</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">No auditors on record for this location.</p>
          )}
        </div>
      </div>
    </>
  );

  const right = (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl bg-ink-950 text-white flex items-center justify-center">
          <Icon name="wallet" className="w-5 h-5" />
        </div>
        {pending <= 0 ? (
          <StatusBadge status="paid" />
        ) : (
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
              overdue ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {overdue ? 'Overdue' : 'Pending'}
          </span>
        )}
      </div>
      <p className="font-display font-semibold text-ink-950 text-2xl">{formatMoney(pending)}</p>
      <p className="text-xs text-slate-500 mt-0.5">
        Due {vouchFormatDate(loc.payment.dueDate)}
        {daysToDue !== null && ` · ${daysToDue >= 0 ? `${daysToDue} days left` : `${Math.abs(daysToDue)} days overdue`}`}
      </p>
      {pending > 0 ? (
        <>
          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={handlePayAll}
              className="w-full bg-ink-950 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-ink-900 inline-flex items-center justify-center gap-1.5"
            >
              <Icon name="banknote" className="w-4 h-4" />
              Pay Full Amount
            </button>
            <button
              onClick={() => setPartialOpen(true)}
              className="w-full border border-slate-200 text-ink-950 text-sm font-medium py-2.5 rounded-lg hover:bg-slate-50 inline-flex items-center justify-center gap-1.5"
            >
              <Icon name="split" className="w-4 h-4" />
              Pay in Pieces
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">Vouch disburses to auditors once your payment clears.</p>
        </>
      ) : (
        <p className="text-xs text-emerald-700 font-medium mt-4 inline-flex items-center gap-1.5">
          <Icon name="check-check" className="w-4 h-4" />
          Fully settled — moved to History.
        </p>
      )}
    </div>
  );

  return (
    <AppShell role="ca" title="Payment">
      <MasterDetail
        title={loc.name}
        subtitle={`${loc.auditType} · ${loc.address}`}
        backHref="/ca/payments"
        backLabel="Payments"
        left={left}
        right={right}
      />

      <Modal open={partialOpen} onClose={() => setPartialOpen(false)} title="Pay in Pieces" maxWidth="max-w-sm">
        <form className="space-y-3" onSubmit={handlePartialSubmit}>
          <div>
            <label className="text-xs font-medium text-slate-600">Amount (₹)</label>
            <input
              required
              type="number"
              min="1"
              max={pending}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              placeholder={`Up to ${pending}`}
            />
          </div>
          <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700">
            Record Payment
          </button>
        </form>
      </Modal>
    </AppShell>
  );
}
