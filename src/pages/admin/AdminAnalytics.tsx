import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Skeleton from '@/components/Skeleton';
import type { AnalyticsByCityResponse } from '@/types';
import './AdminPages.css';

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const { fetchAnalytics, fetchAnalyticsByCity, clubs } = useStore();
  const [analytics, setAnalytics] = useState<any>(null);
  const [byCity, setByCity] = useState<AnalyticsByCityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [byCityLoading, setByCityLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
                    <span>Игроков: <strong>{item.totalPlayers}</strong></span>
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
                          <span>Игроки: {club.playerCount ?? 0}</span>
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
