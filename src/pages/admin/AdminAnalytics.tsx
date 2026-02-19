import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Skeleton from '@/components/Skeleton';
import type { AnalyticsByCityResponse } from '@/types';
import './AdminPages.css';

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { startDate: fmt(start), endDate: fmt(end) };
}

const DEFAULT_DATES = getDefaultDateRange();

/** Число игроков клуба из ответа by-city (playerCount / players / player_count) */
function getClubPlayerCount(club: { playerCount?: number; players?: number; player_count?: number }): number {
  return club.playerCount ?? club.players ?? (club as { player_count?: number }).player_count ?? 0;
}

/** Число игроков клуба из GET /admin/analytics (clubStats) — по имени или _id */
function getPlayerCountFromClubStats(
  club: { id?: string; _id?: string; name?: string },
  clubStats: { _id?: string; clubName?: string; playerCount?: number }[] | null | undefined
): number {
  if (!clubStats?.length) return 0;
  const stat = clubStats.find(
    (s) =>
      s._id === club._id ||
      s._id === club.id ||
      (s.clubName != null && club.name != null && String(s.clubName).trim() === String(club.name).trim())
  );
  return stat?.playerCount ?? 0;
}

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const { fetchAnalytics, fetchAnalyticsByCity, clubs } = useStore();
  const [analytics, setAnalytics] = useState<any>(null);
  const [byCity, setByCity] = useState<AnalyticsByCityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [byCityLoading, setByCityLoading] = useState(false);
  const [startDate, setStartDate] = useState(DEFAULT_DATES.startDate);
  const [endDate, setEndDate] = useState(DEFAULT_DATES.endDate);

  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);
      const data = await fetchAnalytics();
      setAnalytics(data);
      setIsLoading(false);
    };
    loadAnalytics();
  }, [fetchAnalytics]);

  const loadByCity = async () => {
    setByCityLoading(true);
    const data = await fetchAnalyticsByCity(
      startDate || undefined,
      endDate || undefined
    );
    setByCity(data ?? null);
    setByCityLoading(false);
  };

  useEffect(() => {
    loadByCity();
  }, []);

  const handleApplyDateFilter = () => {
    loadByCity();
  };

  if (isLoading) {
    return <Skeleton />;
  }

  return (
    <div className="admin-page">
      <div className="tab-header">
        <h2>Аналитика</h2>
      </div>

      {/* Общая сводка */}
      {analytics && (
        <section className="analytics-section">
          <h3>Общая сводка</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Всего игроков</h4>
              <div className="stat-value">{analytics.totalPlayers || 0}</div>
            </div>
            <div className="stat-card">
              <h4>Всего прокруток</h4>
              <div className="stat-value">{analytics.totalSpins || 0}</div>
            </div>
            <div className="stat-card">
              <h4>Всего призов</h4>
              <div className="stat-value">{analytics.totalPrizes || 0}</div>
            </div>
            <div className="stat-card">
              <h4>Всего клубов</h4>
              <div className="stat-value">{analytics.totalClubs ?? clubs.length}</div>
            </div>
          </div>
        </section>
      )}

      {/* Аналитика по городам */}
      <section className="analytics-section analytics-by-city">
        <h3>Аналитика по городам</h3>
        <div className="analytics-by-city-filters">
          <label>
            <span>Начало периода</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="admin-search"
            />
          </label>
          <label>
            <span>Конец периода</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="admin-search"
            />
          </label>
          <button type="button" className="add-button" onClick={handleApplyDateFilter} disabled={byCityLoading}>
            {byCityLoading ? 'Загрузка...' : 'Применить'}
          </button>
        </div>

        {byCityLoading && !byCity ? (
          <div className="empty-state">Загрузка аналитики по городам...</div>
        ) : byCity ? (
          <>
            <div className="stats-grid summary-by-city">
              <div className="stat-card">
                <h4>Городов</h4>
                <div className="stat-value">{byCity.summary?.cityCount ?? 0}</div>
              </div>
              <div className="stat-card">
                <h4>Всего клубов</h4>
                <div className="stat-value">{byCity.summary?.totalClubs ?? 0}</div>
              </div>
            </div>

            <div className="by-city-list">
              {(byCity.byCity || []).map((item) => (
                <div key={item.city || 'Без города'} className="by-city-card">
                  <h4 className="by-city-name">{item.city || 'Без города'}</h4>
                  <div className="by-city-totals">
                    <span>Клубов: <strong>{item.clubCount}</strong></span>
                    <span>Игроков: <strong>
                      {item.totalPlayers ||
                        (item.clubs ?? []).reduce(
                          (sum, club) =>
                            sum + (getClubPlayerCount(club) || getPlayerCountFromClubStats(club, analytics?.clubStats)),
                          0
                        )}
                    </strong></span>
                    <span>Прокруток: <strong>{item.totalSpins}</strong></span>
                    <span>Списано: <strong>{item.totalSpent}</strong> баллов</span>
                  </div>
                  <div className="by-city-clubs">
                    {(item.clubs || []).map((club: { id?: string; _id?: string; name?: string; address?: string; manager?: string; playerCount?: number; spinsCount?: number; totalSpent?: number; prizeClaimsCount?: number }) => {
                      const clubId = club.id || (club as any)._id;
                      return (
                      <div
                        key={clubId}
                        className="by-city-club-row"
                        onClick={() => clubId && navigate(`/admin/clubs/${clubId}`)}
                      >
                        <div className="by-city-club-main">
                          <span className="by-city-club-name">{club.name}</span>
                          {club.address && <span className="by-city-club-address">{club.address}</span>}
                          {club.manager && <span className="by-city-club-manager">Менеджер: {club.manager}</span>}
                        </div>
                        <div className="by-city-club-stats">
                          <span>Игроки: {getClubPlayerCount(club) || getPlayerCountFromClubStats(club, analytics?.clubStats)}</span>
                          <span>Спины: {club.spinsCount ?? 0}</span>
                          <span>Списано: {club.totalSpent ?? 0}</span>
                          <span>Призов: {club.prizeClaimsCount ?? 0}</span>
                        </div>
                      </div>
                    );})}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>Нет данных по городам или бэкенд не поддерживает эндпоинт /admin/analytics/by-city</p>
          </div>
        )}
      </section>
    </div>
  );
}
