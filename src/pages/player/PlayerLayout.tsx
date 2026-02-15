import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Gift, QrCode, LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Player } from '@/types';
import './PlayerLayout.css';

export default function PlayerLayout() {
  const { currentUser, logout } = useStore();
  const navigate = useNavigate();
  const player = currentUser as Player | null;
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!player || player.role !== 'player') {
    return null;
  }

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="player-app">
      <main className="player-app-content">
        <Outlet />
      </main>

      {showLogoutConfirm && (
        <div
          className="player-logout-overlay"
          onClick={() => setShowLogoutConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
        >
          <div
            className="player-logout-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="logout-dialog-title" className="player-logout-title">
              Выйти из аккаунта?
            </h2>
            <p className="player-logout-text">
              Вы уверены, что хотите выйти? Придётся снова войти по номеру телефона.
            </p>
            <div className="player-logout-actions">
              <button
                type="button"
                className="player-logout-cancel"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="player-logout-confirm"
                onClick={handleLogout}
              >
                Да, выйти
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="player-bottom-nav">
        <NavLink
          to="/player"
          end
          className={({ isActive }) => `player-nav-item ${isActive ? 'active' : ''}`}
        >
          <Home className="player-nav-icon" size={22} strokeWidth={2} />
          <span className="player-nav-label">Главная</span>
        </NavLink>
        <NavLink
          to="/player/prizes"
          className={({ isActive }) => `player-nav-item ${isActive ? 'active' : ''}`}
        >
          <Gift className="player-nav-icon" size={22} strokeWidth={2} />
          <span className="player-nav-label">История</span>
        </NavLink>
        <NavLink
          to="/player/scan"
          className={({ isActive }) => `player-nav-item ${isActive ? 'active' : ''}`}
        >
          <QrCode className="player-nav-icon" size={22} strokeWidth={2} />
          <span className="player-nav-label">Сканер QR</span>
        </NavLink>
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="player-nav-item player-nav-logout"
          aria-label="Выход из аккаунта"
        >
          <LogOut className="player-nav-icon" size={22} strokeWidth={2} />
          <span className="player-nav-label">Выход</span>
        </button>
      </nav>
    </div>
  );
}
