import { Link } from 'react-router-dom';
import { Icon } from '../ui/Icon.jsx';

export default function MasterDetail({ title, subtitle, backHref, backLabel, left, right }) {
  return (
    <div>
      <div className="mb-5">
        {backHref && (
          <Link
            to={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-ink-950 mb-3 transition"
          >
            <Icon name="arrow-left" className="w-3.5 h-3.5" />
            {backLabel || 'Back'}
          </Link>
        )}
        <h1 className="font-display text-2xl font-bold text-ink-950">{title}</h1>
        {subtitle && <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4 min-w-0">{left}</div>
        <div className="space-y-4 min-w-0">{right}</div>
      </div>
    </div>
  );
}
