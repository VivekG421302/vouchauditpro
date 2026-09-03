import { Link } from 'react-router-dom';
import { Icon } from '../ui/Icon.jsx';
import { formatMoney } from '../../lib/format.js';
import { vouchDaysUntil, vouchFormatDate } from '../../lib/db.js';

function locationHref(loc) {
  switch (loc.status) {
    case 'fulfillment_pending':
    case 'fulfillment_completed':
      return `/ca/fulfillment-detail?id=${loc.id}`;
    case 'monitoring':
      return `/ca/monitor-detail?id=${loc.id}`;
    case 'payment':
    case 'history':
      return `/ca/payment-detail?id=${loc.id}`;
    default:
      return `/ca/monitor-detail?id=${loc.id}`;
  }
}

function LocationChips({ loc }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {loc.onHold && (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
          On Hold
        </span>
      )}
      {loc.extended && (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-brand-50 text-brand-700 border-brand-100">
          Extended
        </span>
      )}
      {loc.urgent && (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-200">
          Urgent Requested
        </span>
      )}
    </div>
  );
}

export default function CaLocationCard({ loc, priority }) {
  const href = locationHref(loc);
  let dropshadow = 'shadow-card hover:shadow-md';
  let rightBlock = null;

  if (priority === 'fulfillment-pending') {
    const daysToStart = vouchDaysUntil(loc.startDate);
    const urgent = daysToStart !== null && daysToStart < 3;
    if (urgent) dropshadow = 'shadow-[0_8px_28px_-8px_rgba(220,38,38,0.45)] border-red-200';
    rightBlock = (
      <div className="text-right shrink-0">
        <p className="font-display font-bold text-ink-950 text-lg leading-none">{loc.applicants.length}</p>
        <p className="text-[10px] text-slate-500 mt-1">Applicant{loc.applicants.length === 1 ? '' : 's'}</p>
        {daysToStart !== null && (
          <p className={`text-[10px] font-mono mt-1 ${urgent ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
            {daysToStart >= 0 ? `${daysToStart}d to start` : 'Start date passed'}
          </p>
        )}
      </div>
    );
  } else if (priority === 'fulfillment-completed') {
    const daysToStart = vouchDaysUntil(loc.startDate);
    dropshadow = 'shadow-[0_8px_28px_-8px_rgba(16,185,129,0.4)] border-emerald-200';
    rightBlock = (
      <div className="text-right shrink-0">
        <p className="font-display font-bold text-emerald-600 text-lg leading-none">
          {daysToStart !== null ? Math.max(daysToStart, 0) : '—'}
        </p>
        <p className="text-[10px] text-slate-500 mt-1">Days pending to start</p>
      </div>
    );
  } else if (priority === 'monitor') {
    rightBlock = (
      <div className="text-right shrink-0">
        <p className={`font-display font-bold ${loc.onHold ? 'text-amber-600' : 'text-brand-700'} text-lg leading-none`}>
          {loc.progress || 0}%
        </p>
        <p className="text-[10px] text-slate-500 mt-1">{vouchFormatDate(loc.expectedEnd || loc.endDate)}</p>
      </div>
    );
  } else if (priority === 'payment') {
    const pending = loc.payment.total - loc.payment.paid;
    const daysToDue = vouchDaysUntil(loc.payment.dueDate);
    const overdue = daysToDue !== null && daysToDue < 0;
    if (overdue) dropshadow = 'shadow-[0_8px_28px_-8px_rgba(220,38,38,0.45)] border-red-200';
    rightBlock = (
      <div className="text-right shrink-0">
        <p className="font-display font-bold text-ink-950 text-lg leading-none">{formatMoney(pending)}</p>
        <p className={`text-[10px] mt-1 ${overdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
          Due {vouchFormatDate(loc.payment.dueDate)}
        </p>
      </div>
    );
  } else if (priority === 'history') {
    rightBlock = (
      <div className="text-right shrink-0">
        <p className="font-display font-bold text-emerald-600 text-lg leading-none">{formatMoney(loc.payment.paid)}</p>
        <p className="text-[10px] text-slate-500 mt-1">Paid in full</p>
      </div>
    );
  }

  const hasChips = loc.onHold || loc.extended || loc.urgent;

  return (
    <Link
      to={href}
      className={`block bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 transition cursor-pointer ${dropshadow}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-ink-950 flex items-center justify-center shrink-0">
            <Icon name="map-pin" className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-ink-950 truncate">{loc.name}</p>
            <p className="text-xs text-slate-500 truncate">
              {loc.auditType} · {loc.address}
            </p>
            {hasChips && <LocationChips loc={loc} />}
          </div>
        </div>
        {rightBlock}
      </div>
    </Link>
  );
}
