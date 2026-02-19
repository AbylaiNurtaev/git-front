import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useStore } from '@/store/useStore';
import Skeleton from '@/components/Skeleton';
import type { AnalyticsByCityResponse } from '@/types';
import './AdminPages.css';

const CHART_COLORS = ['#EF3F54', '#ff6b7a', '#d63648', '#ff8f9a', '#bd2d3d'];

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

export default function AdminOverview() {
  const navigate = useNavigate();
  const {
    clubs,
    players,
    prizes,
    rouletteConfig,
    fetchAdminData,
    fetchAnalytics,
    fetchAnalyticsByCity,
    isLoading,
  } = useStore();

  const [analytics, setAnalytics] = useState<{
    totalPlayers?: number;
    totalSpins?: number;
    totalPrizes?: number;
    totalClubs?: number;
    clubStats?: { _id?: string; clubName?: string; count?: number; playerCount?: number }[];
  } | null>(null);
  const [byCity, setByCity] = useState<AnalyticsByCityResponse | null>(null);
  const [byCityLoading, setByCityLoading] = useState(false);
  const [startDate, setStartDate] = useState(DEFAULT_DATES.startDate);
  const [endDate, setEndDate] = useState(DEFAULT_DATES.endDate);

  useEffect(() => {
    const load = async () => {
      await fetchAdminData();
      const data = await fetchAnalytics();
      setAnalytics(data ?? null);
    };
    load();
  }, [fetchAdminData, fetchAnalytics]);

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

  const chartDataByCity =
    byCity?.byCity?.map((item) => ({
      name: item.city || 'Без города',
      clubs: item.clubCount,
      players: item.totalPlayers,
      spins: item.totalSpins,
    })) ?? [];

  const pieData = [
    { name: 'Клубы', value: clubs.length, color: CHART_COLORS[0] },
    { name: 'Игроки', value: players.length, color: CHART_COLORS[1] },
    { name: 'Призы', value: prizes.length, color: CHART_COLORS[2] },
    { name: 'Слоты рулетки', value: rouletteConfig.slots.length, color: CHART_COLORS[3] },
  ].filter((d) => d.value > 0);

  if (isLoading) {
    return <Skeleton />;
  }

  return (
    <div className="admin-page admin-overview-page">
      <div className="tab-header">
        <h2>Обзор</h2>
      </div>

      {/* Карточки сводки */}
      <section className="analytics-section overview-stats">
        <h3>Сводка</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <h4>Клубов</h4>
            <div className="stat-value">
              {analytics?.totalClubs ?? clubs.length}
            </div>
          </div>
          <div className="stat-card">
            <h4>Игроков</h4>
            <div className="stat-value">
              {analytics?.totalPlayers ?? players.length}
            </div>
          </div>
          <div className="stat-card">
            <h4>Призов</h4>
            <div className="stat-value">
              {analytics?.totalPrizes ?? prizes.length}
            </div>
          </div>
          <div className="stat-card">
            <h4>Слотов в рулетке</h4>
            <div className="stat-value">{rouletteConfig.slots.length}</div>
          </div>
          {analytics && (
            <div className="stat-card">
              <h4>Прокруток</h4>
              <div className="stat-value">{analytics.totalSpins ?? 0}</div>
            </div>
          )}
        </div>
      </section>

      {/* Графики */}
      <section className="analytics-section overview-charts">
        <h3>Графики</h3>
        <div className="overview-charts-grid">
          {pieData.length > 0 && (
            <div className="chart-card chart-pie">
              <h4>Состав системы</h4>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(26, 26, 46, 0.95)',
                      border: '1px solid rgba(239, 63, 84, 0.3)',
                      borderRadius: '10px',
                      color: '#fff',
                    }}
                    formatter={(value: number | undefined) => [value ?? 0, '']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {chartDataByCity.length > 0 && (
            <div className="chart-card chart-bars">
              <h4>Клубы по городам</h4>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={chartDataByCity.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 80, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(239, 63, 84, 0.15)"
                  />
                  <XAxis type="number" stroke="rgba(255,255,255,0.6)" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="rgba(255,255,255,0.6)"
                    fontSize={12}
                    width={76}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(26, 26, 46, 0.95)',
                      border: '1px solid rgba(239, 63, 84, 0.3)',
                      borderRadius: '10px',
                      color: '#fff',
                    }}
                    formatter={(value: number | undefined) => [value ?? 0, '']}
                    labelStyle={{ color: 'var(--theme-primary)' }}
                  />
                  <Bar
                    dataKey="clubs"
                    name="Клубов"
                    fill="#EF3F54"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {chartDataByCity.length > 0 && (
            <div className="chart-card chart-bars chart-bars-wide">
              <h4>Активность по городам (игроки / прокрутки)</h4>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={chartDataByCity.slice(0, 8)}
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(239, 63, 84, 0.15)"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="rgba(255,255,255,0.6)"
                    fontSize={11}
                    tick={{ fill: 'rgba(255,255,255,0.8)' }}
                  />
                  <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(26, 26, 46, 0.95)',
                      border: '1px solid rgba(239, 63, 84, 0.3)',
                      borderRadius: '10px',
                      color: '#fff',
                    }}
                    labelStyle={{ color: 'var(--theme-primary)' }}
                  />
                  <Bar
                    dataKey="players"
                    name="Игроки"
                    fill="#ff6b7a"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="spins"
                    name="Прокрутки"
                    fill="#EF3F54"
                    radius={[6, 6, 0, 0]}
                  />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Статистика клубов (из GET /admin/analytics — clubStats) */}
      {analytics?.clubStats && analytics.clubStats.length > 0 && (
        <section className="analytics-section">
          <h3>Статистика клубов</h3>
          <div className="analytics-card-list">
            {analytics.clubStats.map((stat: { _id?: string; clubName?: string; count?: number; playerCount?: number; player_count?: number }, index: number) => (
              <div key={stat._id ?? index} className="analytics-card analytics-club-stat">
                <strong>{stat.clubName ?? 'Без названия'}</strong>
                <p>Прокруток: {stat.count ?? 0}</p>
                <p>Игроков: {stat.playerCount ?? (stat as { player_count?: number }).player_count ?? 0}</p>
              </div>
            ))}
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
          <button
            type="button"
            className="add-button"
            onClick={handleApplyDateFilter}
            disabled={byCityLoading}
          >
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
                <div className="stat-value">
                  {byCity.summary?.cityCount ?? 0}
                </div>
              </div>
              <div className="stat-card">
                <h4>Всего клубов</h4>
                <div className="stat-value">
                  {byCity.summary?.totalClubs ?? 0}
                </div>
              </div>
            </div>

            <div className="by-city-list">
              {(byCity.byCity || []).map((item) => (
                <div
                  key={item.city || 'Без города'}
                  className="by-city-card"
                >
                  <h4 className="by-city-name">
                    {item.city || 'Без города'}
                  </h4>
                  <div className="by-city-totals">
                    <span>
                      Клубов: <strong>{item.clubCount}</strong>
                    </span>
                    <span>
                      Игроков: <strong>
                        {item.totalPlayers ||
                          (item.clubs ?? []).reduce(
                            (sum, club) =>
                              sum + (getClubPlayerCount(club) || getPlayerCountFromClubStats(club, analytics?.clubStats)),
                            0
                          )}
                      </strong>
                    </span>
                    <span>
                      Прокруток: <strong>{item.totalSpins}</strong>
                    </span>
                    <span>
                      Списано: <strong>{item.totalSpent}</strong> баллов
                    </span>
                  </div>
                  <div className="by-city-clubs">
                    {(item.clubs || []).map(
                      (club: {
                        id?: string;
                        _id?: string;
                        name?: string;
                        address?: string;
                        manager?: string;
                        playerCount?: number;
                        spinsCount?: number;
                        totalSpent?: number;
                        prizeClaimsCount?: number;
                      }) => {
                        const clubId = club.id || (club as { _id?: string })._id;
                        return (
                          <div
                            key={clubId}
                            className="by-city-club-row"
                            onClick={() =>
                              clubId && navigate(`/admin/clubs/${clubId}`)
                            }
                            onKeyDown={(e) =>
                              clubId &&
                              (e.key === 'Enter' || e.key === ' ') &&
                              navigate(`/admin/clubs/${clubId}`)
                            }
                            role="button"
                            tabIndex={0}
                          >
                            <div className="by-city-club-main">
                              <span className="by-city-club-name">
                                {club.name}
                              </span>
                              {club.address && (
                                <span className="by-city-club-address">
                                  {club.address}
                                </span>
                              )}
                              {club.manager && (
                                <span className="by-city-club-manager">
                                  Менеджер: {club.manager}
                                </span>
                              )}
                            </div>
                            <div className="by-city-club-stats">
                              <span>Игроки: {getClubPlayerCount(club) || getPlayerCountFromClubStats(club, analytics?.clubStats)}</span>
                              <span>Спины: {club.spinsCount ?? 0}</span>
                              <span>Списано: {club.totalSpent ?? 0}</span>
                              <span>
                                Призов: {club.prizeClaimsCount ?? 0}
                              </span>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>
              Нет данных по городам или бэкенд не поддерживает эндпоинт
              /admin/analytics/by-city
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
