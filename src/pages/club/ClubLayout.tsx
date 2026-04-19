import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CircleDot,
  Settings,
  ChevronLeft,
  LogOut,
  Palette,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useClubTheme } from '@/hooks/useClubTheme';
import type { Club } from '@/types';
import BrandLogo from '@/components/BrandLogo';
import '../admin/AdminLayout.css';
import './ClubLayout.css';

const navItems = [
  { to: '/club', end: true, label: 'Обзор', icon: LayoutDashboard },
  { to: '/club/players', end: false, label: 'Игроки', icon: Users },
  { to: '/club/qr', end: false, label: 'QR экран', icon: CircleDot },
  { to: '/club/settings', end: false, label: 'Настройки', icon: Settings },
] as const;

const BODY_CLASS = 'club-layout-active';

export default function ClubLayout() {
  const { currentUser, logout, companyLogoUrl, fetchCompanyLogoPublic } = useStore();
  const club = currentUser as Club | null;
  useClubTheme(club);
  const location = useLocation();
  const isQrPage = location.pathname === '/club/qr';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('adminTheme');
    return stored === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.body.classList.add(BODY_CLASS);
    document.documentElement.classList.add(BODY_CLASS);
    return () => {
      document.body.classList.remove(BODY_CLASS);
      document.documentElement.classList.remove(BODY_CLASS);
    };
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'club') {
      fetchCompanyLogoPublic();
    }
  }, [currentUser, fetchCompanyLogoPublic]);

  useEffect(() => {
    localStorage.setItem('adminTheme', theme);
  }, [theme]);

  if (!club || club.role !== 'club') {
    return null;
  }

  const displayName = club.clubName || 'Клуб';
  const currentPageTitle =
    navItems.find(({ to, end }) =>
      end ? location.pathname === to : location.pathname.startsWith(to)
    )?.label ?? 'Клуб';

  if (isQrPage) {
    return (
      <div className={`admin-dashboard club-dashboard club-dashboard--qr ${theme === 'dark' ? 'admin-dashboard--dark' : ''}`}>
        <div className="admin-content club-content--full">
          <Outlet />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`admin-dashboard club-dashboard ${theme === 'dark' ? 'admin-dashboard--dark' : ''} ${
        !sidebarCollapsed ? 'admin-dashboard--sidebar-open' : ''
      }`}
    >
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'admin-sidebar--collapsed' : ''}`}>
        <div className="admin-sidebar__top">
          <div className="admin-sidebar__user">
            <BrandLogo src={companyLogoUrl} alt="Spin Club" className="admin-sidebar__brand-logo club-sidebar__brand-logo" />
            {!sidebarCollapsed && (
              <div className="club-sidebar__meta">
                <span className="admin-sidebar__name">{displayName}</span>
                <span className="admin-sidebar__role">Клуб</span>
              </div>
            )}
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
                <span className="admin-theme-control__copy">
                  <span className="admin-theme-control__label">Тема</span>
                  <span className="admin-theme-control__value">
                    {theme === 'dark' ? 'Темная' : 'Светлая'}
                  </span>
                </span>
              )}
            </div>
            <button
              type="button"
              className={`admin-theme-toggle ${theme === 'dark' ? 'is-active' : ''}`}
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              title={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на темную тему'}
              aria-label={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на темную тему'}
              aria-pressed={theme === 'dark'}
            >
              <span className="admin-theme-toggle__thumb" />
            </button>
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__locations">
            <span className="club-topbar__eyebrow">Клубный кабинет</span>
            <span className="admin-topbar__title">{currentPageTitle}</span>
          </div>
          <div className="admin-topbar__actions">
            <span className="admin-topbar__user-name">{displayName}</span>
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
