import { Icon } from '../ui/Icon.jsx';
import { vouchFormatDate } from '../../lib/db.js';

const TONE = {
  reminder: { bg: 'bg-brand-50', text: 'text-brand-600', icon: 'bell' },
  extension: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'calendar-clock' },
  reduced: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'user-minus' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-600', icon: 'x-circle' },
  urgent: { bg: 'bg-red-50', text: 'text-red-600', icon: 'siren' },
  rating: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'star' },
  request: { bg: 'bg-brand-50', text: 'text-brand-600', icon: 'inbox' },
};

export default function NotificationsPanel({ open, onClose, notifications, onAction }) {
  return (
    <div
      className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[380px] bg-white border-l border-slate-200 shadow-2xl flex flex-col transition-transform duration-200 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
        <p className="font-display font-semibold text-ink-950">Notifications</p>
        <button className="p-1.5 rounded-lg hover:bg-slate-100" onClick={onClose}>
          <Icon name="x" className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {(!notifications || notifications.length === 0) && (
          <p className="text-sm text-slate-400 text-center py-10">No notifications yet.</p>
        )}
        {(notifications || []).map((n) => {
          const tone = TONE[n.type] || TONE.reminder;
          return (
            <div key={n.id} className={`px-5 py-4 border-b border-slate-100 ${n.read ? '' : 'bg-brand-50/30'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${tone.bg} ${tone.text} flex items-center justify-center shrink-0`}>
                  <Icon name={tone.icon} className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-950">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{n.createdAt ? vouchFormatDate(n.createdAt) : ''}</p>
                  {n.requiresAction && (
                    <div className="flex gap-2 mt-2">
                      <button
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-brand-600 text-white hover:bg-brand-700"
                        onClick={() => onAction?.(n, 'continue')}
                      >
                        Continue
                      </button>
                      <button
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                        onClick={() => onAction?.(n, 'leave')}
                      >
                        Leave
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
