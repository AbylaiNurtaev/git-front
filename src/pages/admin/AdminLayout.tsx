import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  CircleDot,
  Users,
  ChevronLeft,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import BrandLogo from '@/components/BrandLogo';
import './AdminLayout.css';

export default function AdminLayout() {
  const { currentUser, logout } = useStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('adminTheme');
    return stored === 'dark' ? 'dark' : 'light';
  });
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('adminTheme', theme);
  }, [theme]);

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  const navItems = [
    { to: '/admin', end: true, label: 'Главная', icon: LayoutDashboard },
    { to: '/admin/clubs', end: false, label: 'Клубы', icon: Building2 },
    { to: '/admin/roulette', end: false, label: 'Рулетка', icon: CircleDot },
    { to: '/admin/users', end: false, label: 'Игроки', icon: Users },
  ] as const;

  const currentPageTitle =
    navItems.find(({ to, end }) =>
      end ? location.pathname === to : location.pathname.startsWith(to)
    )?.label ?? 'Админ панель';

  return (
    <div className={`admin-dashboard ${theme === 'dark' ? 'admin-dashboard--dark' : ''}`}>
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'admin-sidebar--collapsed' : ''}`}>
        <div className="admin-sidebar__top">
          <div className="admin-sidebar__user">
            <BrandLogo alt="SpinClub" className="admin-sidebar__brand-logo" />
          </div>
          <button
            type="button"
            className="admin-sidebar__collapse"
            onClick={() => setSidebarCollapsed((c) => !c)}
            title={sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
            aria-label={sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        <nav className="admin-sidebar__nav">
          {navItems.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
              }
            >
              <Icon size={20} className="admin-sidebar__link-icon" />
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-theme-switch" role="group" aria-label="Переключатель темы">
            <button
              type="button"
              className={`admin-theme-switch__btn ${theme === 'light' ? 'is-active' : ''}`}
              onClick={() => setTheme('light')}
              title="Светлая тема"
              aria-label="Светлая тема"
            >
              <Sun size={16} />
              {!sidebarCollapsed && <span>Light</span>}
            </button>
            <button
              type="button"
              className={`admin-theme-switch__btn ${theme === 'dark' ? 'is-active' : ''}`}
              onClick={() => setTheme('dark')}
              title="Тёмная тема"
              aria-label="Тёмная тема"
            >
              <Moon size={16} />
              {!sidebarCollapsed && <span>Dark</span>}
            </button>
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__locations">
            <span className="admin-topbar__title">{currentPageTitle}</span>
          </div>
          <div className="admin-topbar__actions">
            <span className="admin-topbar__user-name">{currentUser.name || 'Администратор'}</span>
            <button
              type="button"
              className="admin-topbar__icon-btn admin-topbar__icon-btn--logout"
              onClick={logout}
              title="Выйти"
              aria-label="Выйти"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
