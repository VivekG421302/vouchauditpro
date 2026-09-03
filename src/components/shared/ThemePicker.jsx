import { Icon } from '../ui/Icon.jsx';
import { useVouchStore } from '../../store/useVouchStore.js';
import { toast } from '../../store/useToastStore.js';

// NOTE: theme swatches are ported as-is, but the dark/indigo CSS variable
// sets themselves haven't been ported to the Tailwind v4 tokens yet — this
// picker calls the API and sets the attribute correctly, it just won't
// repaint the app until that CSS pass happens in a later session.
const THEMES = [
  { id: 'light', label: 'Light', desc: 'Default — clean & minimal', swatch: ['#FFFFFF', '#F8FAFC', '#635BFF'] },
  { id: 'dark', label: 'Dark', desc: 'Low-glare, for long shifts', swatch: ['#0A0E16', '#12172A', '#635BFF'] },
  { id: 'indigo', label: 'Futuristic Indigo', desc: 'High-contrast indigo glow', swatch: ['#0B0A1F', '#171335', '#8B8FF7'] },
];

export default function ThemePicker({ activeTheme, onChange }) {
  const api = useVouchStore((s) => s.api);

  function setTheme(themeId) {
    api.setTheme(themeId).then(() => {
      document.documentElement.setAttribute('data-vouch-theme', themeId);
      onChange(themeId);
      toast(`Theme set to ${THEMES.find((t) => t.id === themeId).label}`, 'palette', 'emerald');
    });
  }

  return (
    <div id="themeOptions" className="grid sm:grid-cols-3 gap-3">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`text-left border rounded-xl p-3 transition ${
            t.id === activeTheme ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex gap-1.5 mb-2.5">
            {t.swatch.map((c) => (
              <span key={c} className="w-5 h-5 rounded-full border border-black/10" style={{ background: c }} />
            ))}
          </div>
          <p className="text-xs font-semibold text-ink-950 flex items-center gap-1.5">
            {t.label}
            {t.id === activeTheme && <Icon name="check-circle-2" className="w-3.5 h-3.5 text-brand-600" />}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t.desc}</p>
        </button>
      ))}
    </div>
  );
}
