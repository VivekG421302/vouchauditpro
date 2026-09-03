import { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import AuditorProfileCard from './AuditorProfileCard.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';

// Controlled by the parent page: pass `auditorId` (or null to keep closed)
// and `onClose`. Fetches the auditor + derived stats itself.
export default function AuditorProfileModal({ auditorId, onClose }) {
  const api = useVouchStore((s) => s.api);
  const [data, setData] = useState(null); // { auditor, stats } | 'not-found' | null (loading)

  useEffect(() => {
    if (!auditorId) {
      setData(null);
      return;
    }
    setData(null);
    Promise.all([api.getAuditorProfile(auditorId), api.getAuditorStats(auditorId)]).then(([auditor, stats]) => {
      setData(auditor ? { auditor, stats } : 'not-found');
    });
  }, [auditorId, api]);

  return (
    <Modal open={!!auditorId} onClose={onClose} title="Auditor Profile" maxWidth="max-w-sm">
      <div className="max-h-[70vh] overflow-y-auto">
        {!data && <p className="text-xs text-slate-400 py-8 text-center">Loading…</p>}
        {data === 'not-found' && <p className="text-xs text-slate-400 py-8 text-center">No profile found for this auditor.</p>}
        {data && data !== 'not-found' && <AuditorProfileCard auditor={data.auditor} stats={data.stats} />}
      </div>
    </Modal>
  );
}
