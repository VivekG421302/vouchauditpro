import { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { toast } from '../../store/useToastStore.js';

const STATUS_CLASS = {
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  received: 'bg-brand-50 text-brand-700 border-brand-100',
  pending: 'bg-slate-100 text-slate-500 border-slate-200',
};

// perms: { canRequest, canFulfill, canVerify } — which actions this viewer can take
export default function CollabDocuments({ locationId, viewer, perms }) {
  const api = useVouchStore((s) => s.api);
  const [docs, setDocs] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');

  function load() {
    api.getLocation(locationId).then((loc) => setDocs(loc?.documentRequests || []));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, api]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    api.addDocumentRequest(locationId, { name, requestedBy: viewer.role }).then(() => {
      toast('Document request sent', 'file-text', 'brand');
      setName('');
      setFormOpen(false);
      load();
    });
  }

  function handleStatusChange(docId, status) {
    api.updateDocumentRequestStatus(locationId, docId, status).then(() => {
      toast(`Document marked ${status}`, 'check-check', 'emerald');
      load();
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-ink-950">Document Requests</h3>
        {perms.canRequest && (
          <button onClick={() => setFormOpen((v) => !v)} className="text-[11px] font-medium text-brand-600 inline-flex items-center gap-1">
            <Icon name="plus" className="w-3 h-3" />
            Request document
          </button>
        )}
      </div>
      <div className="space-y-2">
        {!docs && <p className="text-xs text-slate-400">Loading…</p>}
        {docs && docs.length === 0 && <p className="text-xs text-slate-400">No document requests yet.</p>}
        {docs &&
          docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-950 truncate">{d.name}</p>
                <p className="text-[10px] text-slate-400">Requested by {d.requestedBy}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_CLASS[d.status] || STATUS_CLASS.pending}`}>
                  {d.status}
                </span>
                {d.status === 'pending' && perms.canFulfill && (
                  <button onClick={() => handleStatusChange(d.id, 'received')} className="text-[10px] font-medium text-brand-600">
                    Mark Fulfilled
                  </button>
                )}
                {d.status === 'received' && perms.canVerify && (
                  <button onClick={() => handleStatusChange(d.id, 'verified')} className="text-[10px] font-medium text-emerald-600">
                    Verify
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
      {perms.canRequest && formOpen && (
        <form className="flex gap-2 mt-3 pt-3 border-t border-slate-100" onSubmit={handleSubmit}>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. GST filing copy"
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
          />
          <button className="bg-brand-600 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-brand-700">Send</button>
        </form>
      )}
    </div>
  );
}
