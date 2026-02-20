import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Settings,
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useClubTheme } from '@/hooks/useClubTheme';
import type { Club } from '@/types';
import logoUrl from '@/assets/logo.png';
import '../admin/AdminLayout.css';
import './ClubLayout.css';

const navItems = [
  { to: '/club', end: true, label: 'Обзор', icon: LayoutDashboard },
  { to: '/club/players', end: false, label: 'Игроки', icon: Users },
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

  useEffect(() => {
    document.body.classList.add(BODY_CLASS);
    return () => document.body.classList.remove(BODY_CLASS);
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'club') {
      fetchCompanyLogoPublic();
    }
  }, [currentUser, fetchCompanyLogoPublic]);

  if (!club || club.role !== 'club') {
    return null;
  }

  const displayName = club.clubName || 'Клуб';

  if (isQrPage) {
    return (
      <div className="admin-dashboard club-dashboard--qr">
        <div className="admin-content club-content--full">
          <Outlet />
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-dashboard ${!sidebarCollapsed ? 'admin-dashboard--sidebar-open' : ''}`}>
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'admin-sidebar--collapsed' : ''}`}>
        <div className="admin-sidebar__top">
          <div className="admin-sidebar__user">
            <div className="admin-sidebar__avatar-wrap">
              <img src={companyLogoUrl || logoUrl} alt="" className="admin-sidebar__avatar" />
            </div>
            {!sidebarCollapsed && (
              <>
                <span className="admin-sidebar__name">{displayName}</span>
                <span className="admin-sidebar__role">Клуб</span>
              </>
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
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__locations">
            <span className="admin-topbar__location admin-topbar__location--plain">
              Личный кабинет
            </span>
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
