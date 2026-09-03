import { useToastStore } from '../../store/useToastStore.js';
import { Icon } from './Icon.jsx';

const TONE_CLASSES = {
  ink: 'bg-ink-950 text-white',
  emerald: 'bg-emerald-600 text-white',
  amber: 'bg-amber-500 text-white',
  red: 'bg-red-600 text-white',
  brand: 'bg-brand-600 text-white',
};

export default function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] space-y-2 w-[92vw] max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${TONE_CLASSES[t.tone] || TONE_CLASSES.ink} rounded-xl shadow-2xl px-4 py-3 flex items-center gap-2.5 text-sm font-medium`}
        >
          <Icon name={t.icon} className="w-4 h-4 shrink-0" />
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
