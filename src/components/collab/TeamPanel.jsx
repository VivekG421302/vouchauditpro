import { Icon } from '../ui/Icon.jsx';

function initialsOf(name) {
  return name.split(' ').map((s) => s[0]).slice(0, 2).join('');
}

export default function TeamPanel({ loc, viewerId }) {
  const all = [...loc.caAuditors, ...loc.assignedAuditors.filter((a) => !loc.caAuditors.some((c) => c.id === a.id))];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
      <h3 className="font-display font-semibold text-ink-950 mb-3">Auditors On This Assignment</h3>
      <div className="space-y-2">
        {all.length ? (
          all.map((a) => (
            <div key={a.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-ink-950 text-white text-xs font-semibold flex items-center justify-center">
                  {initialsOf(a.name)}
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-950 inline-flex items-center gap-1">
                    {a.name}
                    {a.id === viewerId ? ' (You)' : ''}
                    {a.id === loc.leadAuditorId && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                        <Icon name="crown" className="w-2.5 h-2.5" />
                        Lead
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500">{a.phone || '—'}</p>
                </div>
              </div>
              {a.present !== undefined && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {a.present || 0}P / {a.absent || 0}A
                </span>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400">No team members yet.</p>
        )}
      </div>
    </div>
  );
}
