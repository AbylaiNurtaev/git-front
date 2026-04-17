import { useState, useEffect, useMemo } from 'react';
import { CircleDot, Gift, Search, Trophy, Users } from 'lucide-react';
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
  const { currentUser, players, fetchClubData, fetchClubPrizeClaims } = useStore();
  const [prizeClaims, setPrizeClaims] = useState<any[]>([]);
  const [prizeTypesCount, setPrizeTypesCount] = useState<number | null>(null);
  const [spinsToday, setSpinsToday] = useState<number | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [issuedSearch, setIssuedSearch] = useState('');
  const [issuedPage, setIssuedPage] = useState(1);
  const club = currentUser?.role === 'club' ? (currentUser as Club) : null;
  const stats = club?.statistics;
  const totalSpins = Number(stats?.totalSpins) || 0;
  const totalPlayers = Number(stats?.totalPlayers) || players.length;
  const totalPrizeTypes = prizeTypesCount ?? 0;
  const issuedAll = useMemo(
    () => prizeClaims.filter(isIssued),
    [prizeClaims]
  );
  const issuedCount = issuedAll.length;

  useEffect(() => {
    let isMounted = true;
    setInitialLoad(true);
    setClaimsLoading(true);

    const loadPrizeTypes = async () => {
      try {
        const prizes = await apiService.getRoulettePrizes();
        if (isMounted) setPrizeTypesCount(Array.isArray(prizes) ? prizes.length : 0);
      } catch {
        if (isMounted) setPrizeTypesCount(0);
      }
    };

    const loadSpinsToday = async () => {
      try {
        const data = await apiService.getClubSpinsToday();
        const value = typeof data?.spinsToday === 'number' ? data.spinsToday : 0;
        if (isMounted) setSpinsToday(value);
      } catch {
        if (isMounted) setSpinsToday(0);
      }
    };

    const loadClaims = async () => {
      try {
        const firstPage = await fetchClubPrizeClaims(1, CLAIMS_FETCH_LIMIT);
        if (!isMounted) return;

        let items = [...(firstPage.items ?? [])];
        setPrizeClaims(items);
        setClaimsLoading(false);

        const total = firstPage.pagination?.total ?? items.length;
        const totalPages =
          firstPage.pagination?.totalPages ?? Math.max(1, Math.ceil(total / CLAIMS_FETCH_LIMIT));

        if (totalPages > 1) {
          const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
              fetchClubPrizeClaims(index + 2, CLAIMS_FETCH_LIMIT)
            )
          );
          if (!isMounted) return;
          items = items.concat(rest.flatMap((page) => page.items ?? []));
          setPrizeClaims(items);
        }
      } catch {
        if (isMounted) {
          setPrizeClaims([]);
          setClaimsLoading(false);
        }
      }
    };

    Promise.allSettled([fetchClubData(), loadPrizeTypes(), loadSpinsToday()]).finally(() => {
      if (isMounted) setInitialLoad(false);
    });

    void loadClaims();

    return () => {
      isMounted = false;
    };
  }, [fetchClubData, fetchClubPrizeClaims]);

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

  if (initialLoad) {
    return <ClubOverviewSkeleton />;
  }

  return (
    <div className="club-page">
      <div className="overview-tab">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card__icon">
              <CircleDot size={18} />
            </div>
            <h3>Всего спинов</h3>
            <div className="stat-value">{totalSpins}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon">
              <Users size={18} />
            </div>
            <h3>Всего игроков</h3>
            <div className="stat-value">{totalPlayers}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon">
              <Gift size={18} />
            </div>
            <h3>Всего призов</h3>
            <div className="stat-value">{totalPrizeTypes}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__icon">
              <Trophy size={18} />
            </div>
            <h3>Спинов сегодня</h3>
            <div className="stat-value">{spinsToday ?? 0}</div>
          </div>
        </div>

        {(claimsLoading || issuedCount > 0) && (
          <div className="overview-issued-section">
            <div className="club-subsection-heading">
              <span className="club-subsection-heading__icon">
                <Gift size={16} />
              </span>
              <h3>Выданные призы</h3>
            </div>
            {claimsLoading ? (
              <div className="overview-issued-loading" aria-live="polite">
                <div className="overview-issued-loading__pulse" />
                <p>Подгружаем историю выданных призов…</p>
              </div>
            ) : (
              <>
                <div className="issued-search-wrap">
                  <div className="club-search-input-wrap">
                    <Search size={16} className="club-search-input-wrap__icon" />
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
                  </div>
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
