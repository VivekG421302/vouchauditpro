import { Icon } from './Icon.jsx';

export default function EmptyState({ icon = 'inbox', title, message, actionLabel, onAction }) {
  return (
    <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
        <Icon name={icon} className="w-6 h-6 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-ink-950">{title}</p>
      <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">{message}</p>
      {actionLabel && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 bg-brand-600 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-brand-700 transition"
        >
          <Icon name="plus" className="w-3.5 h-3.5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
