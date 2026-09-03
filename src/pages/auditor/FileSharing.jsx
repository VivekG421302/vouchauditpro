import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell.jsx';
import CollabRemoteShare from '../../components/collab/CollabRemoteShare.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';

export default function AuditorFileSharing() {
  const api = useVouchStore((s) => s.api);
  const session = useAuthStore((s) => s.session);
  const auditorId = session?.auditorId;
  const [searchParams] = useSearchParams();

  const [active, setActive] = useState(null);
  const [locationId, setLocationId] = useState(searchParams.get('id'));

  useEffect(() => {
    if (!auditorId) return;
    api.getAssignmentsForAuditor(auditorId).then((assignments) => {
      const activeLocs = assignments.filter((l) => ['monitoring', 'fulfillment_completed'].includes(l.status));
      setActive(activeLocs);
      setLocationId((current) => current || (activeLocs.length ? activeLocs[0].id : null));
    });
  }, [api, auditorId]);

  return (
    <AppShell role="auditor" title="File Sharing">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold text-ink-950">File Sharing</h1>
        <p className="text-slate-500 text-sm mt-0.5">Share files remotely with your CA for the current audit.</p>
      </div>

      {active && active.length > 1 && (
        <div className="mb-4 max-w-xs">
          <label className="text-xs font-medium text-slate-600">Location</label>
          <select
            value={locationId || ''}
            onChange={(e) => setLocationId(e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
          >
            {active.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {active && active.length === 0 && (
        <p className="text-xs text-slate-400 bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center">
          No active assignment to attach files to — join one from the Marketplace first.
        </p>
      )}

      {active && active.length > 0 && locationId && (
        <CollabRemoteShare locationId={locationId} viewer={{ name: session.name, role: 'Auditor' }} />
      )}
    </AppShell>
  );
}
