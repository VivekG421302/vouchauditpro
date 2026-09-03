import { useEffect, useRef, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { Icon } from '../ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { toast } from '../../store/useToastStore.js';

export default function StatusPhotosPanel({ locationId, viewerName }) {
  const api = useVouchStore((s) => s.api);
  const [loc, setLoc] = useState(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({ totalQty: '', completedQty: '', damageQty: '', note: '' });
  const [photoType, setPhotoType] = useState('Progress');
  const [photoRemark, setPhotoRemark] = useState('');
  const fileInputRef = useRef(null);

  function load() {
    api.getLocation(locationId).then(setLoc);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, api]);

  function handleStatusSubmit(e) {
    e.preventDefault();
    api
      .addStatusUpdate(locationId, {
        totalQty: parseInt(statusForm.totalQty, 10),
        completedQty: parseInt(statusForm.completedQty, 10),
        damageQty: parseInt(statusForm.damageQty, 10),
        note: statusForm.note,
      })
      .then(() => {
        setStatusOpen(false);
        setStatusForm({ totalQty: '', completedQty: '', damageQty: '', note: '' });
        toast('Status update saved', 'clipboard-check', 'emerald');
        load();
      });
  }

  function handlePhotoSubmit(e) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || !file.size) {
      toast('Choose a photo first', 'alert-triangle', 'amber');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      api.addPhoto(locationId, { url: reader.result, type: photoType, remark: photoRemark, by: viewerName }).then(() => {
        setPhotoOpen(false);
        setPhotoRemark('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        toast('Photo added with watermark note', 'camera', 'emerald');
        load();
      });
    };
    reader.readAsDataURL(file);
  }

  if (!loc) return <p className="text-xs text-slate-400">Loading…</p>;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink-950">Status Updates</h3>
          <button onClick={() => setStatusOpen(true)} className="text-[11px] font-medium text-brand-600 inline-flex items-center gap-1">
            <Icon name="plus" className="w-3 h-3" />
            Add update
          </button>
        </div>
        <div className="space-y-2.5">
          {loc.statusLog.length ? (
            loc.statusLog.map((s, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-ink-950">{s.date}</p>
                  <span className="text-[10px] text-slate-400">
                    {s.completedQty}/{s.totalQty} done · {s.damageQty} damaged
                  </span>
                </div>
                {s.note && <p className="text-[11px] text-slate-500 mt-1">{s.note}</p>}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">No status updates logged yet.</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink-950">Photo Proofs</h3>
          <button onClick={() => setPhotoOpen(true)} className="text-[11px] font-medium text-brand-600 inline-flex items-center gap-1">
            <Icon name="camera" className="w-3 h-3" />
            Add photo
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {loc.photos.length ? (
            loc.photos.map((p, i) => (
              <div key={i} className="relative rounded-lg overflow-hidden aspect-square bg-slate-100">
                <img src={p.url} className="w-full h-full object-cover" alt={p.type} />
                <span className="absolute bottom-1 left-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-black/60 text-white">{p.type}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 col-span-3">No photos added yet.</p>
          )}
        </div>
      </div>

      <Modal open={statusOpen} onClose={() => setStatusOpen(false)} title="Add Status Update" maxWidth="max-w-sm">
        <form className="space-y-3" onSubmit={handleStatusSubmit}>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-slate-500">Total</label>
              <input
                required
                type="number"
                value={statusForm.totalQty}
                onChange={(e) => setStatusForm((f) => ({ ...f, totalQty: e.target.value }))}
                className="mt-1 w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Completed</label>
              <input
                required
                type="number"
                value={statusForm.completedQty}
                onChange={(e) => setStatusForm((f) => ({ ...f, completedQty: e.target.value }))}
                className="mt-1 w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Damaged</label>
              <input
                required
                type="number"
                value={statusForm.damageQty}
                onChange={(e) => setStatusForm((f) => ({ ...f, damageQty: e.target.value }))}
                className="mt-1 w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-500">Note</label>
            <textarea
              rows={2}
              value={statusForm.note}
              onChange={(e) => setStatusForm((f) => ({ ...f, note: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white resize-none"
            />
          </div>
          <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700">Save Update</button>
        </form>
      </Modal>

      <Modal open={photoOpen} onClose={() => setPhotoOpen(false)} title="Add Photo" maxWidth="max-w-sm">
        <form className="space-y-3" onSubmit={handlePhotoSubmit}>
          <div>
            <label className="text-[11px] text-slate-500">Photo</label>
            <input required type="file" accept="image/*" ref={fileInputRef} className="mt-1 w-full text-xs" />
          </div>
          <div>
            <label className="text-[11px] text-slate-500">Type</label>
            <select
              value={photoType}
              onChange={(e) => setPhotoType(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
            >
              <option>Progress</option>
              <option>Damage</option>
              <option>Completion</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-500">Remark</label>
            <input
              value={photoRemark}
              onChange={(e) => setPhotoRemark(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
            />
          </div>
          <button className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700">Add Photo</button>
        </form>
      </Modal>
    </div>
  );
}
