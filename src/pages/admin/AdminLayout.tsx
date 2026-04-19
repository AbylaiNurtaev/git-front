import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  CircleDot,
  Users,
  ChevronLeft,
  LogOut,
  Palette,
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
  const isOverviewPage = location.pathname === '/admin';

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
          <div className="admin-theme-control" aria-label="Переключатель темы">
            <div className="admin-theme-control__meta">
              <span className="admin-theme-control__icon">
                <Palette size={16} />
              </span>
              {!sidebarCollapsed && (
                <div className="admin-theme-control__copy">
                  <span className="admin-theme-control__label">Тема</span>
                  <span className="admin-theme-control__value">
                    {theme === 'dark' ? 'Темная' : 'Светлая'}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              className={`admin-theme-toggle ${theme === 'dark' ? 'is-dark' : ''}`}
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              title={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
              aria-label={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
            >
              <span className="admin-theme-toggle__thumb" />
            </button>
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__locations">
            {isOverviewPage ? (
              <div className="admin-topbar__hero-copy">
                <span className="admin-topbar__eyebrow">Панель управления</span>
                <h1 className="admin-topbar__hero-title">Дашборд администратора</h1>
                <p className="admin-topbar__hero-text">
                  Быстрый обзор активности платформы, клубов и игровых механик в одном экране
                </p>
              </div>
            ) : (
              <span className="admin-topbar__title">{currentPageTitle}</span>
            )}
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
