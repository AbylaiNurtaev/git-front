import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Gift,
  MapPinned,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useStore } from '@/store/useStore';
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

function getClubPlayerCount(club: { playerCount?: number; players?: number; player_count?: number }): number {
  return club.playerCount ?? club.players ?? (club as { player_count?: number }).player_count ?? 0;
}

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
    const data = await fetchAnalyticsByCity(startDate || undefined, endDate || undefined);
    setByCity(data ?? null);
    setByCityLoading(false);
  };

  useEffect(() => {
    loadByCity();
  }, []);

  if (isLoading) {
    return (
      <div className="admin-overview-loader" aria-live="polite">
        <div className="admin-overview-loader__pulse" />
        <div className="admin-overview-loader__header">
          <div className="admin-overview-loader__chip" />
          <div className="admin-overview-loader__title" />
          <div className="admin-overview-loader__subtitle" />
        </div>
        <div className="admin-overview-loader__cards">
          <div className="admin-overview-loader__card" />
          <div className="admin-overview-loader__card" />
          <div className="admin-overview-loader__card" />
        </div>
        <div className="admin-overview-loader__grid">
          <div className="admin-overview-loader__panel" />
          <div className="admin-overview-loader__panel" />
        </div>
      </div>
    );
  }

  const chartDataByCity =
    byCity?.byCity?.map((item) => ({
      name: item.city || 'Без города',
      clubs: item.clubCount,
      players: item.totalPlayers,
      spins: item.totalSpins,
    })) ?? [];

  const totalClubs = analytics?.totalClubs ?? clubs.length;
  const totalPlayers = analytics?.totalPlayers ?? players.length;
  const totalPrizes = analytics?.totalPrizes ?? prizes.length;
  const totalSpins = analytics?.totalSpins ?? 0;

  const topClubStats = [...(analytics?.clubStats ?? [])]
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, 6);

  const cityCards = (byCity?.byCity ?? []).slice(0, 6);
  const featuredCity = cityCards[0] ?? null;

  return (
    <div className="admin-page admin-overview-page">
      <section className="admin-overview-hero admin-overview-hero--compact">
        <div className="admin-overview-hero__stats">
          <article className="overview-metric-card overview-metric-card--wide">
            <div className="overview-metric-card__head">
              <span>Ключевая метрика</span>
              <Sparkles size={16} />
            </div>
            <strong>{totalSpins}</strong>
            <p>Всего прокруток в системе</p>
          </article>
          <article className="overview-metric-card">
            <div className="overview-metric-card__head">
              <span>Клубов</span>
              <Building2 size={16} />
            </div>
            <strong>{totalClubs}</strong>
            <p>Подключено к платформе</p>
          </article>
          <article className="overview-metric-card">
            <div className="overview-metric-card__head">
              <span>Игроков</span>
              <Users size={16} />
            </div>
            <strong>{totalPlayers}</strong>
            <p>Аккаунтов в системе</p>
          </article>
          <article className="overview-metric-card">
            <div className="overview-metric-card__head">
              <span>Призов</span>
              <Gift size={16} />
            </div>
            <strong>{totalPrizes}</strong>
            <p>Доступно в игровых механиках</p>
          </article>
        </div>
      </section>

      <section className="overview-main-grid">
        {featuredCity ? (
          <article className="overview-city-card overview-city-card--featured">
            <div className="overview-city-card__head">
              <div>
                <span className="overview-panel__eyebrow">Город</span>
                <h3>{featuredCity.city || 'Без города'}</h3>
              </div>
              <span className="overview-city-card__spins">{featuredCity.totalSpins} спинов</span>
            </div>

            <div className="overview-city-card__stats">
              <span>Клубов: <strong>{featuredCity.clubCount}</strong></span>
              <span>
                Игроков:{' '}
                <strong>
                  {featuredCity.totalPlayers ||
                    (featuredCity.clubs ?? []).reduce(
                      (sum, club) =>
                        sum + (getClubPlayerCount(club) || getPlayerCountFromClubStats(club, analytics?.clubStats)),
                      0
                    )}
                </strong>
              </span>
              <span>Списано: <strong>{featuredCity.totalSpent}</strong></span>
            </div>

            <div className="overview-city-card__clubs">
              {(featuredCity.clubs || []).slice(0, 3).map((club) => {
                const clubId = club.id || (club as { _id?: string })._id;
                return (
                  <button
                    key={clubId || club.name}
                    type="button"
                    className="overview-city-club"
                    onClick={() => clubId && navigate(`/admin/clubs/${clubId}`)}
                    disabled={!clubId}
                  >
                    <div>
                      <strong>{club.name || 'Клуб'}</strong>
                      <p>{club.address || 'Адрес не указан'}</p>
                    </div>
                    <span>{club.spinsCount ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </article>
        ) : (
          <div className="overview-empty-card">
            Нет данных по городам или бэкенд ещё не отдал `/admin/analytics/by-city`.
          </div>
        )}

        <article className="overview-panel overview-panel--chart">
          <div className="overview-panel__header">
            <div>
              <span className="overview-panel__eyebrow">Активность</span>
              <h2>Города и вовлечённость</h2>
            </div>
            <div className="overview-period-badge">
              {startDate} - {endDate}
            </div>
          </div>

          {chartDataByCity.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartDataByCity.slice(0, 8)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(148, 163, 184, 0.18)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(47, 128, 255, 0.05)' }}
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '14px',
                    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
                    color: '#111827',
                  }}
                />
                <Bar dataKey="players" name="Игроки" fill="#8b5cf6" radius={[10, 10, 0, 0]} />
                <Bar dataKey="spins" name="Прокрутки" fill="#2f80ff" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="overview-empty-card">Нет данных по городам для графика.</div>
          )}
        </article>
      </section>

      <section className="overview-secondary-grid">
        <article className="overview-panel overview-panel--clubs">
          <div className="overview-panel__header">
            <div>
              <span className="overview-panel__eyebrow">Клубы</span>
              <h2>Лидеры по активности</h2>
            </div>
          </div>

          {topClubStats.length > 0 ? (
            <div className="overview-table-list">
              {topClubStats.map((club, index) => (
                <button
                  key={club._id ?? club.clubName ?? index}
                  type="button"
                  className="overview-table-row"
                  onClick={() => club._id && navigate(`/admin/clubs/${club._id}`)}
                  disabled={!club._id}
                >
                  <div className="overview-table-row__main">
                    <span className="overview-table-row__index">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{club.clubName ?? 'Без названия'}</strong>
                      <p>Игроков: {club.playerCount ?? 0}</p>
                    </div>
                  </div>
                  <div className="overview-table-row__meta">
                    <span>{club.count ?? 0} спинов</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="overview-empty-card">Пока нет статистики клубов.</div>
          )}
        </article>

        <article className="overview-panel overview-panel--filters">
          <div className="overview-panel__header">
            <div>
              <span className="overview-panel__eyebrow">Период</span>
              <h2>Срез по городам</h2>
            </div>
            <MapPinned size={18} className="overview-panel__icon" />
          </div>

          <div className="overview-filters">
            <label className="overview-filter-field">
              <span>Начало периода</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="overview-filter-field">
              <span>Конец периода</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
            <button type="button" className="overview-filter-button" onClick={loadByCity} disabled={byCityLoading}>
              {byCityLoading ? 'Загрузка...' : 'Применить'}
            </button>
          </div>

          <div className="overview-mini-stats">
            <div className="overview-mini-stat">
              <span>Городов</span>
              <strong>{byCity?.summary?.cityCount ?? 0}</strong>
            </div>
            <div className="overview-mini-stat">
              <span>Всего клубов</span>
              <strong>{byCity?.summary?.totalClubs ?? 0}</strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
