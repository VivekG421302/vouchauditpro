import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { toast } from '../../store/useToastStore.js';

export default function CollabRemoteShare({ locationId, viewer }) {
  const api = useVouchStore((s) => s.api);
  const [loc, setLoc] = useState(null);
  const [people, setPeople] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);

  function load() {
    api.getLocation(locationId).then((location) => {
      setLoc(location);
      if (!location) return;
      api.getProject(location.projectId).then((project) => {
        const list = [];
        if (project) {
          list.push({ name: project.ca, role: 'Chartered Accountant', icon: 'user-check' });
          list.push({ name: project.company, role: 'Company Contact', icon: 'building-2' });
        }
        (location.assignedAuditors || []).forEach((a) => list.push({ name: a.name, role: 'Field Auditor', icon: 'shield-check' }));
        const others = list.filter((p) => p.name && p.name !== viewer.name);
        setPeople(others);
        setRecipients(others.length ? [others[0].name] : []);
      });
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, api]);

  function toggleRecipient(name) {
    setRecipients((prev) => (prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || !file.size) {
      toast('Choose a file first', 'alert-triangle', 'amber');
      return;
    }
    if (!recipients.length) {
      toast('Pick at least one person to send to', 'alert-triangle', 'amber');
      return;
    }
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    toast('Sending over local network…', 'wifi', 'brand');
    setSending(true);
    setTimeout(() => {
      api
        .addSharedFile(locationId, {
          name: file.name,
          size: sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`,
          from: viewer.name,
          to: recipients.join(', '),
        })
        .then(() => {
          toast(`"${file.name}" delivered to ${recipients.join(', ')}`, 'check-circle-2', 'emerald');
          if (fileInputRef.current) fileInputRef.current.value = '';
          setSending(false);
          load();
        });
    }, 800);
  }

  return (
    <>
      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 mb-4 flex items-start gap-3">
        <Icon name="wifi" className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
        <p className="text-xs text-brand-700">
          Everyone on this audit is listed below by name. Select who to send to — files transfer over the same local network / hotspot,
          so it still works with limited data connectivity on-site.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-4 mb-4">
        <p className="text-sm font-semibold text-ink-950 mb-3">People on this audit</p>
        <div className="space-y-2">
          {people.length === 0 && <p className="text-xs text-slate-400">No other people on this audit yet.</p>}
          {people.map((p) => (
            <label
              key={p.name}
              className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 cursor-pointer hover:border-brand-300"
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={recipients.includes(p.name)}
                  onChange={() => toggleRecipient(p.name)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                  <Icon name={p.icon} className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-ink-950">{p.name}</p>
                  <p className="text-[10px] text-slate-500">{p.role}</p>
                </div>
              </div>
              <span className="text-[10px] text-emerald-600 font-medium inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Online
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-4">
        <p className="text-sm font-semibold text-ink-950 mb-3">Send a File</p>
        <form className="flex gap-2" onSubmit={handleSubmit}>
          <input required type="file" ref={fileInputRef} className="flex-1 text-xs" />
          <button
            disabled={sending}
            className="bg-brand-600 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-brand-700 inline-flex items-center gap-1.5 shrink-0 disabled:opacity-60"
          >
            <Icon name="send" className="w-3.5 h-3.5" />
            Send
          </button>
        </form>
        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mt-4 mb-2">Transferred Files</p>
        <div className="space-y-2">
          {loc && loc.sharedFiles.length === 0 && <p className="text-xs text-slate-400">No files shared yet on this assignment.</p>}
          {loc &&
            loc.sharedFiles.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon name="file" className="w-4 h-4 text-brand-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink-950 truncate">{f.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {f.from}
                      {f.to ? ` → ${f.to}` : ''} · {f.ts}
                      {f.size ? ` · ${f.size}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
