import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import Skeleton from '@/components/Skeleton';
import './AdminPages.css';

export default function AdminOverview() {
  const { clubs, players, prizes, rouletteConfig, fetchAdminData, isLoading } = useStore();

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  if (isLoading) {
    return <Skeleton />;
  }

  return (
    <div className="admin-page">
      <div className="tab-header">
        <h2>Обзор</h2>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Всего клубов</h3>
          <div className="stat-value">{clubs.length}</div>
        </div>
        <div className="stat-card">
          <h3>Всего игроков</h3>
          <div className="stat-value">{players.length}</div>
        </div>
        <div className="stat-card">
          <h3>Всего призов</h3>
          <div className="stat-value">{prizes.length}</div>
        </div>
        <div className="stat-card">
          <h3>Слотов в рулетке</h3>
          <div className="stat-value">{rouletteConfig.slots.length}</div>
        </div>
      </div>
    </div>
  );
}
