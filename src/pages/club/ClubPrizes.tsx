import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import Skeleton from '@/components/Skeleton';
import type { PrizeClaimsPagination } from '@/types';
import './ClubPages.css';

const DEFAULT_LIMIT = 20;

function getPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

export default function ClubPrizes() {
  const { fetchClubPrizeClaims, confirmPrizeClaim, updateClubTime, isLoading } = useStore();
  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PrizeClaimsPagination>({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [loadingClaims, setLoadingClaims] = useState(true);

  const loadPage = (p: number) => {
    setLoadingClaims(true);
    fetchClubPrizeClaims(p, DEFAULT_LIMIT).then((res) => {
      setItems(res.items);
      setPagination(res.pagination);
      setLoadingClaims(false);
    });
  };

  useEffect(() => {
    loadPage(page);
  }, [page, fetchClubPrizeClaims]);

  const handleConfirmPrize = async (claimId: string) => {
    const success = await confirmPrizeClaim(claimId);
    if (success) loadPage(page);
  };

  const handleIssuePrize = async (claimId: string) => {
    const success = await updateClubTime(claimId, 'activate');
    if (success) loadPage(page);
  };

  if (isLoading) {
    return <Skeleton />;
  }

  return (
    <div className="club-page">
      <div className="prizes-tab">
        <h2>Призы для выдачи</h2>
        {loadingClaims && items.length === 0 ? (
          <div className="empty-state">Загрузка...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <p>Нет призов для выдачи</p>
          </div>
        ) : (
          <>
            <div className="prizes-list">
              {items.map((claim: any) => {
              const prize = claim.prizeId || {};
              const player = claim.userId || {};
              return (
                <div key={claim._id || claim.id} className="prize-card">
                  <div className="prize-info">
                    <h3>{prize.name || 'Неизвестный приз'}</h3>
                    <p>{prize.description || ''}</p>
                    <p className="player-info-text">Игрок: {player.phone || 'Неизвестно'}</p>
                    <span className={`prize-status status-${claim.status}`}>
                      {claim.status === 'pending' && 'Ожидает подтверждения'}
                      {claim.status === 'confirmed' && 'Подтвержден'}
                      {claim.status === 'issued' && 'Выдан'}
                    </span>
                  </div>
                  <div className="prize-actions">
                    {claim.status === 'pending' && (
                      <button
                        onClick={() => handleConfirmPrize(claim._id || claim.id)}
                        className="confirm-button"
                      >
                        Подтвердить
                      </button>
                    )}
                    {claim.status === 'confirmed' && prize.type === 'club_time' && (
                      <button
                        onClick={() => handleIssuePrize(claim._id || claim.id)}
                        className="issue-button"
                      >
                        Активировать время
                      </button>
                    )}
                    {claim.status === 'issued' && (
                      <span className="issued-badge">Выдан</span>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={pagination.page <= 1 || loadingClaims}
                  onClick={() => setPage((prev) => prev - 1)}
                >
                  ← Назад
                </button>
                <div className="pagination-numbers">
                  {getPageNumbers(pagination.page, pagination.totalPages).map((n, i) =>
                    n === '…' ? (
                      <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        className={`pagination-num ${pagination.page === n ? 'active' : ''}`}
                        disabled={loadingClaims}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    )
                  )}
                </div>
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={pagination.page >= pagination.totalPages || loadingClaims}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Вперёд →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
