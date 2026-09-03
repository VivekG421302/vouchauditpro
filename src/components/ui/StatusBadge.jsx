import { STATUS_BADGE_MAP, STATUS_LABEL_MAP } from '../../lib/format.js';

export default function StatusBadge({ status }) {
  const classes = STATUS_BADGE_MAP[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  const label = STATUS_LABEL_MAP[status] || status;
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${classes}`}>
      {label}
    </span>
  );
}
