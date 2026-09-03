import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';

// viewer: { name, role } — role is a short label like 'CA', 'Auditor', 'Company'
export default function CollabChat({ locationId, viewer }) {
  const api = useVouchStore((s) => s.api);
  const [chat, setChat] = useState(null);
  const [text, setText] = useState('');
  const logRef = useRef(null);

  function load() {
    api.getLocation(locationId).then((loc) => setChat(loc?.chat || []));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, api]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [chat]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    api.addChatMessage(locationId, { author: viewer.name, role: viewer.role, text }).then(() => {
      setText('');
      load();
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-5 flex flex-col h-[60vh]">
      <h3 className="font-display font-semibold text-ink-950 mb-3">Project Chat</h3>
      <div ref={logRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {!chat && <p className="text-xs text-slate-400 text-center py-10">Loading…</p>}
        {chat && chat.length === 0 && <p className="text-xs text-slate-400 text-center py-10">No messages yet — say hello to the team.</p>}
        {chat &&
          chat.map((m, i) => {
            const mine = m.author === viewer.name;
            return (
              <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${mine ? 'bg-ink-950 text-white' : 'bg-slate-100 text-ink-950'}`}>
                  <p className="text-[10px] opacity-60 mb-0.5">
                    {m.author} · {m.role}
                  </p>
                  <p className="text-xs">{m.text}</p>
                  <p className="text-[9px] opacity-50 mt-1">{m.ts}</p>
                </div>
              </div>
            );
          })}
      </div>
      <form className="flex gap-2 mt-3 pt-3 border-t border-slate-100" onSubmit={handleSubmit}>
        <input
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message the team…"
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
        />
        <button className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700">
          <Icon name="send" className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
