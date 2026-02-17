import { Outlet, NavLink } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import logoUrl from '@/assets/logo.png';
import './AdminLayout.css';

export default function AdminLayout() {
  const { currentUser, logout } = useStore();

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-left">
            <img src={logoUrl} alt="Infinity" className="header-logo" />
            <h1>Панель администратора</h1>
          </div>
          <div className="header-actions">
            <span className="admin-name">{currentUser.name || 'Администратор'}</span>
            <button onClick={logout} className="logout-button">
              Выйти
            </button>
          </div>
        </header>

        <nav className="dashboard-tabs">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Обзор
          </NavLink>
          <NavLink
            to="/admin/clubs"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Клубы
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Пользователи
          </NavLink>
          <NavLink
            to="/admin/prizes"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Призы
          </NavLink>
          <NavLink
            to="/admin/roulette"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Рулетка
          </NavLink>
          <NavLink
            to="/admin/analytics"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Аналитика
          </NavLink>
        </nav>

        <div className="dashboard-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
