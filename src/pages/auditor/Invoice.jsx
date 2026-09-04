import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { vouchFormatDate } from '../../lib/db.js';
import { formatMoney } from '../../lib/format.js';

// Standalone page — deliberately NOT wrapped in AppShell. An invoice is a
// printable document: no sidebar/topbar/bottom-nav should ever end up on
// the printed page, and it must render the same regardless of the
// person's chosen in-app theme (dark/indigo would waste ink and look
// unprofessional) — see CLAUDE.md §21b / the original invoice.html.
export default function AuditorInvoice() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const auditorId = session?.auditorId;
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('locationId');

  const [inv, setInv] = useState(undefined);

  useEffect(() => {
    if (!auditorId || !locationId) return;
    api.getInvoiceDetail(locationId, auditorId).then((data) => setInv(data || null));
  }, [api, auditorId, locationId]);

  // Force light appearance regardless of the person's chosen theme while
  // this page is mounted, restoring it on the way out.
  useEffect(() => {
    const prev = document.documentElement.getAttribute('data-vouch-theme');
    document.documentElement.setAttribute('data-vouch-theme', 'light');
    return () => {
      if (prev) document.documentElement.setAttribute('data-vouch-theme', prev);
      else document.documentElement.removeAttribute('data-vouch-theme');
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 font-body text-slate-900 antialiased">
      <style>{`
        .invoice-sheet { width: 210mm; min-height: 297mm; margin: 0 auto; }
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .invoice-sheet { width: auto; min-height: 0; margin: 0; box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link to="/auditor/receipts" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-ink-950">
          <Icon name="arrow-left" className="w-3.5 h-3.5" />
          Back to Receipts
        </Link>
        {inv && (
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 bg-ink-950 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-ink-900"
          >
            <Icon name="printer" className="w-3.5 h-3.5" />
            Print / Save as PDF
          </button>
        )}
      </div>

      <div className="py-6 px-3 sm:px-6">
        <div className="invoice-sheet bg-white shadow-card border border-slate-200 rounded-lg sm:rounded-none p-8 sm:p-12 text-[13px] text-slate-700">
          {inv === undefined && <p className="text-sm text-slate-400 py-24 text-center">Loading…</p>}
          {inv === null && (
            <p className="text-sm text-slate-400 py-24 text-center">
              Invoice not found.{' '}
              <Link to="/auditor/receipts" className="text-brand-600 font-medium">
                Back to Receipts
              </Link>
            </p>
          )}
          {inv && (
            <>
            <div className="flex items-start justify-between border-b-2 border-ink-950 pb-6 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-ink-950 flex items-center justify-center">
                    <Icon name="shield-check" className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-display font-bold text-xl text-ink-950 tracking-tight">Vouch</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Audit Staffing & Management Platform</p>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Vouch Technologies Pvt. Ltd.
                  <br />
                  BKC, Mumbai, Maharashtra 400051
                  <br />
                  support@vouch.app · www.vouch.app
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold text-ink-950 uppercase tracking-wide">Invoice</p>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">{inv.invoiceNo}</p>
                <p className="text-[11px] text-slate-500">Issued {inv.issuedOn}</p>
                <div className="mt-2">
                  <span
                    className={`inline-block text-[11px] font-semibold px-3 py-1 rounded-full border ${
                      inv.payment.paidInFull
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {inv.payment.paidInFull ? 'PAID IN FULL' : 'PAYMENT PENDING'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Billed To</p>
                <p className="font-medium text-ink-950">{inv.company || '—'}</p>
                <p className="text-slate-500 mt-0.5">{inv.location.name}</p>
                <p className="text-slate-500">{inv.location.address}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Payable To</p>
                <p className="font-medium text-ink-950">{inv.auditor.name}</p>
                <p className="text-slate-500 mt-0.5 font-mono">{inv.auditor.id}</p>
                {inv.auditor.phone && <p className="text-slate-500">{inv.auditor.phone}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6 bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Audit Type</p>
                <p className="font-medium text-ink-950 mt-0.5">{inv.location.auditType}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Engagement Period</p>
                <p className="font-medium text-ink-950 mt-0.5">
                  {vouchFormatDate(inv.location.startDate)} – {vouchFormatDate(inv.location.endDate)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Daily Timing</p>
                <p className="font-medium text-ink-950 mt-0.5">{inv.location.timing || '—'}</p>
              </div>
            </div>

            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Attendance Summary</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="border border-slate-200 rounded-lg p-3 text-center">
                <p className="font-display text-lg font-bold text-emerald-600">{inv.attendance.present}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Days Present</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-3 text-center">
                <p className="font-display text-lg font-bold text-red-500">{inv.attendance.absent}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Days Absent</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-3 text-center">
                <p className="font-display text-lg font-bold text-amber-600">{inv.attendance.overtimeHours}h</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Overtime Logged</p>
              </div>
            </div>
            <table className="w-full text-left text-[12px] mb-6">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500">
                  <th className="py-1.5 pr-3 font-medium">Date</th>
                  <th className="py-1.5 pr-3 font-medium">Check-In</th>
                  <th className="py-1.5 pr-3 font-medium">Check-Out</th>
                  <th className="py-1.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {inv.attendance.log.length ? (
                  inv.attendance.log.map((a, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-1.5 pr-3">{a.date}</td>
                      <td className="py-1.5 pr-3">{a.checkIn || '—'}</td>
                      <td className="py-1.5 pr-3">{a.checkOut || '—'}</td>
                      <td className="py-1.5">{a.status || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-2 text-slate-400">
                      Detailed daily log not recorded for this engagement — see the summary counts above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Payment Breakdown</p>
            <table className="w-full text-left text-[13px] mb-2">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 text-[11px]">
                  <th className="py-1.5 font-medium">Description</th>
                  <th className="py-1.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2">
                    Base Allowance <span className="text-slate-400">(engagement rate)</span>
                  </td>
                  <td className="py-2 text-right font-mono">{formatMoney(inv.payment.baseAllowance)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2">
                    Overtime{' '}
                    <span className="text-slate-400">
                      ({inv.payment.overtimeHours}h × {formatMoney(inv.payment.overtimeRate)}/hr)
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono">{formatMoney(inv.payment.overtimeAmount)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2">
                    Reimbursement{' '}
                    <span className="text-slate-400">
                      (shared across {inv.payment.teamSize} auditor{inv.payment.teamSize === 1 ? '' : 's'} on this engagement — total{' '}
                      {formatMoney(inv.payment.reimbursementTotal)})
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono">{formatMoney(inv.payment.reimbursementShare)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink-950">
                  <td className="py-2.5 font-semibold text-ink-950">Total Payable</td>
                  <td className="py-2.5 text-right font-display font-bold text-ink-950 text-base">{formatMoney(inv.payment.total)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="text-[11px] text-slate-500 mb-8">
              {inv.payment.paidInFull
                ? 'This amount has been paid in full.'
                : `Due ${inv.payment.dueDate ? vouchFormatDate(inv.payment.dueDate) : 'upon audit sign-off'} — payable via the bank account on file with Vouch.`}
            </p>

            <div className="border-t border-slate-200 pt-5">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">Notes</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                This invoice is system-generated by Vouch on behalf of the auditor named above, based on verified attendance and audit
                records for the engagement listed. Reimbursement figures reflect the auditor's share of engagement-level expenses. For
                any discrepancy, please raise it through the Vouch app within 7 days of issue.
              </p>
              <p className="font-display font-semibold text-ink-950 text-sm mt-5">Thank you for your work on this audit.</p>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
