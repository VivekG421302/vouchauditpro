import { Icon } from '../ui/Icon.jsx';
import RadarChart from './RadarChart.jsx';
import { VouchAPI } from '../../lib/api.js';

export default function AuditorProfileCard({ auditor, stats, showHeader = true }) {
  if (!auditor || !stats) return null;
  const years = parseFloat((auditor.experience || '').match(/[\d.]+/)?.[0]) || null;
  const axes = VouchAPI.AUDIT_TYPES.map((t) => t.replace(' Audit', ''));
  const values = VouchAPI.AUDIT_TYPES.map((t) => stats.byType[t] || 0);
  const initials = auditor.name.split(' ').map((s) => s[0]).slice(0, 2).join('');

  return (
    <div>
      {showHeader && (
        <div className="flex items-center gap-3 mb-1">
          <div className="w-12 h-12 rounded-full bg-ink-950 text-white flex items-center justify-center font-display font-bold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-ink-950 truncate">{auditor.name}</p>
            <p className="text-[11px] text-slate-400 font-mono">
              {auditor.id} · {auditor.baseCity || ''}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-0.5 shrink-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <Icon
                key={i}
                name="star"
                className={`w-3.5 h-3.5 ${i < Math.round(auditor.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
              />
            ))}
            <span className="text-[11px] font-mono text-slate-500 ml-1">{auditor.rating.toFixed(1)}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 my-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <p className="font-display text-lg font-bold text-ink-950">{stats.auditsDone}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Audits Done</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <p className="font-display text-lg font-bold text-ink-950">{stats.typesDone}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Audit Types</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <p className="font-display text-lg font-bold text-ink-950">{years !== null ? `${years} yrs` : '—'}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Experience</p>
        </div>
      </div>

      <div className="flex justify-center py-2">
        <RadarChart axes={axes} values={values} size={260} />
      </div>
      <p className="text-[10px] text-slate-400 text-center -mt-1 mb-4">Affinity by audit type · completed audits per type</p>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-2">Achievements</p>
        <div className="flex flex-wrap gap-2">
          {(auditor.badges || []).length ? (
            auditor.badges.map((b) => (
              <span
                key={b}
                className="text-[11px] font-medium bg-brand-50 text-brand-700 border border-brand-100 px-2.5 py-1 rounded-full inline-flex items-center gap-1"
              >
                <Icon name="badge-check" className="w-3 h-3" />
                {b}
              </span>
            ))
          ) : (
            <p className="text-xs text-slate-400">No badges yet — complete an audit to start earning them.</p>
          )}
        </div>
      </div>
    </div>
  );
}
