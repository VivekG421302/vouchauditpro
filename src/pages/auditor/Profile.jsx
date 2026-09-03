import { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell.jsx';
import AuditorProfileCard from '../../components/shared/AuditorProfileCard.jsx';
import { Icon } from '../../components/ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { vouchFormatDate } from '../../lib/db.js';
import { toast } from '../../store/useToastStore.js';

export default function AuditorProfile() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const auditorId = session?.auditorId;

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [assignments, setAssignments] = useState(null);
  const [attendance, setAttendance] = useState(null);

  useEffect(() => {
    if (!auditorId) return;
    Promise.all([
      api.getAuditorProfile(auditorId),
      api.getAuditorStats(auditorId),
      api.getAssignmentsForAuditor(auditorId),
      api.getAttendanceForAuditor(auditorId),
    ]).then(([p, s, a, att]) => {
      setProfile(p);
      setStats(s);
      setAssignments(a);
      setAttendance(att);
    });
  }, [api, auditorId]);

  const loaded = profile && stats && assignments && attendance;
  const completed = loaded ? assignments.filter((l) => l.status === 'payment' || l.status === 'history') : [];

  return (
    <AppShell role="auditor" title="Profile">
      {!loaded ? (
        <p className="text-sm text-slate-400 py-16 text-center">Loading…</p>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-xl font-semibold font-mono shrink-0">
                  {session.initials}
                </div>
                <div className="min-w-0">
                  <p className="font-display font-semibold text-lg text-ink-950 truncate">{session.name}</p>
                  <p className="text-xs text-slate-400 font-mono">Auditor ID · {auditorId}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Icon
                        key={i}
                        name="star"
                        className={`w-4 h-4 ${i < Math.round(profile.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                      />
                    ))}
                    <span className="text-xs font-mono text-slate-500 ml-1">{profile.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Specialization</span>
                  <span className="font-medium text-ink-950">{profile.specialization}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Base City</span>
                  <span className="font-medium text-ink-950">{profile.baseCity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">KYC</span>
                  <span className="font-medium text-ink-950">{profile.kyc}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank</span>
                  <span className="font-medium text-ink-950">{profile.bankLinked}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3">Vouch auditor since {profile.joinDate}</p>
            </div>

            {profile.flags && profile.flags.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <p className="text-xs font-semibold text-amber-800 mb-2">Rating Flags</p>
                <div className="space-y-2">
                  {profile.flags.map((f, i) => (
                    <div key={i} className="text-xs">
                      <p className="text-amber-700">{f.note}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {f.date} · rating {f.delta > 0 ? '+' : ''}
                        {f.delta}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
              <h3 className="font-display font-semibold text-ink-950 mb-3">Experience</h3>
              <div className="space-y-2">
                {completed.length ? (
                  completed.map((l) => (
                    <div key={l.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-ink-950 truncate">{l.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {l.auditType} · {vouchFormatDate(l.startDate)} – {vouchFormatDate(l.endDate)}
                        </p>
                      </div>
                      <button
                        onClick={() => toast(`Experience certificate ready for "${l.name}"`, 'award', 'brand')}
                        className="text-[11px] font-medium text-brand-600 shrink-0 inline-flex items-center gap-1"
                      >
                        <Icon name="award" className="w-3 h-3" />
                        Certificate
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Completed audits will show up here as verified experience.</p>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
              <h3 className="font-display font-semibold text-ink-950 mb-3">Check-In History</h3>
              <div className="space-y-2.5">
                {attendance.length ? (
                  attendance.map((a, i) => {
                    const flagged = a.status.includes('Flagged');
                    const late = a.status === 'Late';
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              flagged ? 'bg-red-50 text-red-600' : late ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            <Icon name={flagged ? 'alert-triangle' : late ? 'clock' : 'check'} className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-ink-950">{a.branch}</p>
                            <p className="text-[10px] text-slate-400">
                              {a.date} · {a.time}
                              {a.distance !== undefined ? ` · ${a.distance}m` : ''}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono ${flagged ? 'text-red-600' : late ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {a.status}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400">No check-ins recorded yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
            <AuditorProfileCard auditor={profile} stats={stats} showHeader={false} />
          </div>
        </div>
      )}
    </AppShell>
  );
}
