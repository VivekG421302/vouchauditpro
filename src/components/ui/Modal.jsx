import { Icon } from './Icon.jsx';

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-md' }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop bg-black/40"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} p-6 fade-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-lg text-ink-950">{title}</h3>
          <button className="p-1.5 rounded-lg hover:bg-slate-100" onClick={onClose}>
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
