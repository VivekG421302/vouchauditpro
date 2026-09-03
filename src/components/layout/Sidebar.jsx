import { NavLink } from 'react-router-dom';
import { Icon } from '../ui/Icon.jsx';
import { VOUCH_NAV } from '../../lib/nav.js';

export default function Sidebar({ role, collapsed, mobileOpen, onCloseMobile }) {
  const links = VOUCH_NAV[role] || [];
  const width = collapsed ? 'lg:w-[76px]' : 'lg:w-64';

  const nav = (onLinkClick) => (
    <nav className="space-y-1 flex-1">
      {links.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onLinkClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
            }`
          }
        >
          <Icon name={item.icon} className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </NavLink>
      ))}
    </nav>
  );

  const logoRow = (
    <div className="flex items-center gap-2.5 px-1 mb-5">
      <div className="relative w-8 h-8 rounded-lg bg-ink-950 flex items-center justify-center shrink-0 overflow-hidden">
        <div className="radar-ring text-brand-400" />
        <Icon name="shield-check" className="text-white relative z-10" style={{ width: 18, height: 18 }} />
      </div>
      {!collapsed && <span className="font-display font-bold text-[19px] tracking-tight text-ink-950">Vouch</span>}
    </div>
  );

  return (
    <>
      {/* desktop, permanent */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-45 border-r border-slate-200 bg-white p-4 overflow-y-auto transition-[width] duration-200 ${width}`}
      >
        {logoRow}
        {nav()}
      </aside>

      {/* mobile off-canvas drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={onCloseMobile} />
          <aside className="relative w-72 max-w-[80vw] h-full bg-white p-4 overflow-y-auto flex flex-col">
            {logoRow}
            {nav(onCloseMobile)}
          </aside>
        </div>
      )}
    </>
  );
}
