import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import type { Club } from '@/types';
import ClubOverviewSkeleton from './ClubOverviewSkeleton';
import './ClubPages.css';

export default function ClubOverview() {
  const { currentUser, players, fetchClubData, fetchClubPlayers, fetchClubPrizeClaims, isLoading } = useStore();
  const [prizeClaims, setPrizeClaims] = useState<any[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const club = currentUser?.role === 'club' ? (currentUser as Club) : null;
  const stats = club?.statistics;
  const totalSpins = Number(stats?.totalSpins) || 0;
  const totalPlayers = Number(stats?.totalPlayers) ?? players.length;
  const [totalPrizesCount, setTotalPrizesCount] = useState(0);
  const totalPrizes = totalPrizesCount || prizeClaims.length;
  const pendingCount = prizeClaims.filter((p: any) => p.status === 'pending').length;
  const issuedCount = prizeClaims.filter(
    (p: any) => p.status === 'issued' || p.status === 'confirmed' || p.status === 'completed'
  ).length;

  useEffect(() => {
    setInitialLoad(true);
    Promise.all([
      fetchClubData(),
      fetchClubPlayers(),
      fetchClubPrizeClaims(1, 20).then((res) => {
        setPrizeClaims(res.items);
        setTotalPrizesCount(res.pagination?.total ?? res.items.length);
      }),
    ]).finally(() => setInitialLoad(false));
  }, [fetchClubData, fetchClubPlayers, fetchClubPrizeClaims]);

  if (initialLoad || isLoading) {
    return <ClubOverviewSkeleton />;
  }

  return (
    <div className="club-page">
      <div className="overview-tab">
        <h2>Обзор</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Всего спинов</h3>
            <div className="stat-value">{totalSpins}</div>
          </div>
          <div className="stat-card">
            <h3>Всего игроков</h3>
            <div className="stat-value">{totalPlayers}</div>
          </div>
          <div className="stat-card">
            <h3>Всего призов</h3>
            <div className="stat-value">{totalPrizes}</div>
          </div>
          <div className="stat-card">
            <h3>Ожидают подтверждения</h3>
            <div className="stat-value">{pendingCount}</div>
          </div>
          <div className="stat-card">
            <h3>Выдано призов</h3>
            <div className="stat-value">{issuedCount}</div>
          </div>
        </div>

        {issuedCount > 0 && (
          <div className="overview-issued-section">
            <h3>Выданные призы</h3>
            <ul className="issued-claims-list">
              {prizeClaims
                .filter((p: any) => p.status === 'issued' || p.status === 'confirmed' || p.status === 'completed')
                .slice(0, 10)
                .map((claim: any) => (
                  <li key={claim._id || claim.id}>
                    <span className="issued-prize-name">{claim.prizeId?.name ?? claim.prizeId ?? 'Приз'}</span>
                    <span className="issued-prize-player">{claim.userId?.phone ?? '—'}</span>
                    <span className="issued-prize-date">
                      {claim.confirmedAt
                        ? new Date(claim.confirmedAt).toLocaleDateString('ru-RU')
                        : claim.createdAt
                          ? new Date(claim.createdAt).toLocaleDateString('ru-RU')
                          : '—'}
                    </span>
                  </li>
                ))}
            </ul>
            {issuedCount > 10 && (
              <p className="issued-more">и ещё {issuedCount - 10} выданных</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
