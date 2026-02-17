import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import type { Club } from '@/types';
import { apiService } from '@/services/api';
import ClubOverviewSkeleton from './ClubOverviewSkeleton';
import './ClubPages.css';

const ISSUED_PAGE_SIZE = 10;
const CLAIMS_FETCH_LIMIT = 50;

function isIssued(claim: any): boolean {
  return claim.status === 'issued' || claim.status === 'confirmed' || claim.status === 'completed';
}

function getPlayerName(claim: any): string {
  const u = claim.userId;
  return (u?.name ?? u?.playerName ?? u?.fio ?? '').trim() || '—';
}

function getPlayerPhone(claim: any): string {
  return claim.userId?.phone ?? '—';
}

function getPrizeName(claim: any): string {
  return claim.prizeId?.name ?? (typeof claim.prizeId === 'string' ? claim.prizeId : '') ?? 'Приз';
}

export default function ClubOverview() {
  const { currentUser, players, fetchClubData, fetchClubPlayers, fetchClubPrizeClaims, isLoading } = useStore();
  const [prizeClaims, setPrizeClaims] = useState<any[]>([]);
  const [prizeTypesCount, setPrizeTypesCount] = useState<number | null>(null);
  const [spinsToday, setSpinsToday] = useState<number | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [issuedSearch, setIssuedSearch] = useState('');
  const [issuedPage, setIssuedPage] = useState(1);
  const club = currentUser?.role === 'club' ? (currentUser as Club) : null;
  const stats = club?.statistics;
  const totalSpins = Number(stats?.totalSpins) || 0;
  const totalPlayers = Number(stats?.totalPlayers) ?? players.length;
  const totalPrizeTypes = prizeTypesCount ?? 0;
  const issuedAll = useMemo(
    () => prizeClaims.filter(isIssued),
    [prizeClaims]
  );
  const issuedCount = issuedAll.length;

  useEffect(() => {
    setInitialLoad(true);
    const loadClaims = async () => {
      const res = await fetchClubPrizeClaims(1, CLAIMS_FETCH_LIMIT);
      const total = res.pagination?.total ?? res.items.length;
      let items = [...(res.items ?? [])];
      const totalPages = res.pagination?.totalPages ?? Math.max(1, Math.ceil(total / CLAIMS_FETCH_LIMIT));
      for (let p = 2; p <= totalPages; p++) {
        const next = await fetchClubPrizeClaims(p, CLAIMS_FETCH_LIMIT);
        items = items.concat(next.items ?? []);
      }
      setPrizeClaims(items);
    };
    const loadPrizeTypes = async () => {
      try {
        const prizes = await apiService.getRoulettePrizes();
        setPrizeTypesCount(Array.isArray(prizes) ? prizes.length : 0);
      } catch {
        setPrizeTypesCount(0);
      }
    };
    const loadSpinsToday = async () => {
      try {
        const data = await apiService.getClubSpinsToday();
        const value = typeof data?.spinsToday === 'number' ? data.spinsToday : 0;
        setSpinsToday(value);
      } catch {
        setSpinsToday(0);
      }
    };
    Promise.all([
      fetchClubData(),
      fetchClubPlayers(),
      loadClaims(),
      loadPrizeTypes(),
      loadSpinsToday(),
    ]).finally(() => setInitialLoad(false));
  }, [fetchClubData, fetchClubPlayers, fetchClubPrizeClaims]);

  const issuedFiltered = useMemo(() => {
    const q = issuedSearch.trim().toLowerCase();
    if (!q) return issuedAll;
    return issuedAll.filter((claim: any) => {
      const name = getPlayerName(claim).toLowerCase();
      const phone = (getPlayerPhone(claim) ?? '').toLowerCase();
      const prize = getPrizeName(claim).toLowerCase();
      return name.includes(q) || phone.includes(q) || prize.includes(q);
    });
  }, [issuedAll, issuedSearch]);

  const issuedTotalPages = Math.max(1, Math.ceil(issuedFiltered.length / ISSUED_PAGE_SIZE));
  const issuedPageSafe = Math.min(Math.max(1, issuedPage), issuedTotalPages);
  const issuedOnPage = useMemo(() => {
    const start = (issuedPageSafe - 1) * ISSUED_PAGE_SIZE;
    return issuedFiltered.slice(start, start + ISSUED_PAGE_SIZE);
  }, [issuedFiltered, issuedPageSafe]);

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
            <div className="stat-value">{totalPrizeTypes}</div>
          </div>
          <div className="stat-card">
            <h3>Спинов сегодня</h3>
            <div className="stat-value">{spinsToday ?? 0}</div>
          </div>
        </div>

        {issuedCount > 0 && (
          <div className="overview-issued-section">
            <h3>Выданные призы</h3>
            <div className="issued-search-wrap">
              <input
                type="search"
                placeholder="Поиск по имени, телефону, призу..."
                value={issuedSearch}
                onChange={(e) => {
                  setIssuedSearch(e.target.value);
                  setIssuedPage(1);
                }}
                className="issued-search-input"
                aria-label="Поиск по выданным призам"
              />
              <span className="issued-search-hint">
                {issuedFiltered.length} из {issuedCount}
              </span>
            </div>
            <ul className="issued-claims-list issued-claims-list-with-name">
              <li className="issued-claims-header">
                <span className="issued-prize-name">Приз</span>
                <span className="issued-prize-player">Имя</span>
                <span className="issued-prize-phone">Телефон</span>
                <span className="issued-prize-date">Дата</span>
              </li>
              {issuedOnPage.map((claim: any) => (
                <li key={claim._id || claim.id}>
                  <span className="issued-prize-name">{getPrizeName(claim)}</span>
                  <span className="issued-prize-player">{getPlayerName(claim)}</span>
                  <span className="issued-prize-phone">{getPlayerPhone(claim)}</span>
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
            {issuedTotalPages > 1 && (
              <nav className="issued-pagination" aria-label="Страницы выданных призов">
                <button
                  type="button"
                  className="issued-pagination-btn"
                  disabled={issuedPageSafe <= 1}
                  onClick={() => setIssuedPage((p) => Math.max(1, p - 1))}
                >
                  ←
                </button>
                <div className="issued-pagination-pages">
                  {Array.from({ length: issuedTotalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`issued-pagination-btn ${p === issuedPageSafe ? 'active' : ''}`}
                      onClick={() => setIssuedPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="issued-pagination-btn"
                  disabled={issuedPageSafe >= issuedTotalPages}
                  onClick={() => setIssuedPage((p) => Math.min(issuedTotalPages, p + 1))}
                >
                  →
                </button>
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
