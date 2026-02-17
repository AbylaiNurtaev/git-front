import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useClubTheme } from '@/hooks/useClubTheme';
import type { Club } from '@/types';
import logoUrl from '@/assets/logo.png';
import './ClubLayout.css';

export default function ClubLayout() {
  const { currentUser, logout } = useStore();
  const club = currentUser as Club | null;
  useClubTheme(club);
  const location = useLocation();
  const isQrPage = location.pathname === '/club/qr';

  if (!club || club.role !== 'club') {
    return null;
  }

  return (
    <div className="club-dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-left">
            <img src={logoUrl} alt="Infinity" className="header-logo" />
            <h1>Личный кабинет Infinity</h1>
          </div>
          <div className="header-actions">
            <span className="club-name">{club.clubName}</span>
            <button onClick={logout} className="logout-button">
              Выйти
            </button>
          </div>
        </header>

        <nav className="dashboard-tabs">
          <NavLink
            to="/club"
            end
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Обзор
          </NavLink>
          <NavLink
            to="/club/players"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Игроки
          </NavLink>
          <NavLink
            to="/club/qr"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            QR-код
          </NavLink>
          <NavLink
            to="/club/settings"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Настройки
          </NavLink>
        </nav>

        <div className={`dashboard-content ${isQrPage ? 'dashboard-content-no-scroll' : ''}`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
