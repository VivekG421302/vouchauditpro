import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../ui/Icon.jsx';
import { useAuthStore } from '../../store/useAuthStore.js';

export default function Topbar({ title, collapsed, onToggleCollapse, onOpenMobile, onToggleNotifications, unreadCount }) {
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-40 h-[65px] bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 transition-[left] duration-200 ${
        collapsed ? 'lg:left-[76px]' : 'lg:left-64'
      }`}
    >
      <div className="flex items-center gap-3">
        <button className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-50" onClick={onOpenMobile}>
          <Icon name="menu" className="w-5 h-5" />
        </button>
        <button className="hidden lg:flex p-2 rounded-lg hover:bg-slate-50" onClick={onToggleCollapse}>
          <Icon name="panel-left" className="w-4 h-4 text-slate-500" />
        </button>
        {title && <h1 className="font-display font-semibold text-ink-950 text-sm sm:text-base">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        <button
          id="vouchNotifBell"
          className="relative p-2 rounded-lg hover:bg-slate-50"
          onClick={onToggleNotifications}
        >
          <Icon name="bell" className="w-[18px] h-[18px] text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-50"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <div className="w-8 h-8 rounded-full bg-ink-950 text-white text-xs font-semibold flex items-center justify-center">
              {session?.initials || '?'}
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-soft py-1.5 fade-in">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-sm font-medium text-ink-950 truncate">{session?.name}</p>
                <p className="text-xs text-slate-400 truncate">{session?.label}</p>
              </div>
              <button
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                onClick={handleLogout}
              >
                <Icon name="log-out" className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
