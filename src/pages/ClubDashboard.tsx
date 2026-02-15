import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { QRCodeSVG } from 'qrcode.react';
import { getQrBaseUrl } from '@/config/api';
import type { Club, Player, PrizeClaimsPagination } from '@/types';
import './ClubDashboard.css';

const PRIZES_PAGE_LIMIT = 20;

function getPrizesPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

export default function ClubDashboard() {
  const navigate = useNavigate();
  const {
    currentUser,
    logout,
    players,
    fetchClubData,
    fetchClubPlayers,
    fetchClubPrizeClaims,
    confirmPrizeClaim,
    updateClubTime,
  } = useStore();
  const club = currentUser as Club | null;
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'prizes' | 'qr'>('overview');
  const [prizeClaims, setPrizeClaims] = useState<any[]>([]);
  const [prizesPagination, setPrizesPagination] = useState<PrizeClaimsPagination | null>(null);
  const [prizesPage, setPrizesPage] = useState(1);

  useEffect(() => {
    if (club) {
      fetchClubData();
    }
  }, [club, fetchClubData]);

  useEffect(() => {
    if (activeTab === 'players' && club) {
      fetchClubPlayers();
    }
    if (activeTab === 'overview' && club) {
      fetchClubPrizeClaims(1, PRIZES_PAGE_LIMIT).then((res) => {
        setPrizeClaims(res.items);
        setPrizesPagination(res.pagination);
      });
    }
    if (activeTab === 'prizes' && club) {
      fetchClubPrizeClaims(prizesPage, PRIZES_PAGE_LIMIT).then((res) => {
        setPrizeClaims(res.items);
        setPrizesPagination(res.pagination);
      });
    }
  }, [activeTab, club, prizesPage, fetchClubPlayers, fetchClubPrizeClaims]);

  if (!club || club.role !== 'club') {
    return null;
  }

  const reloadPrizeClaims = () => {
    const p = activeTab === 'prizes' ? prizesPage : 1;
    fetchClubPrizeClaims(p, PRIZES_PAGE_LIMIT).then((res) => {
      setPrizeClaims(res.items);
      setPrizesPagination(res.pagination);
    });
  };

  const handleConfirmPrize = async (claimId: string) => {
    const success = await confirmPrizeClaim(claimId);
    if (success) reloadPrizeClaims();
  };

  const handleIssuePrize = async (claimId: string) => {
    const success = await updateClubTime(claimId, 'activate');
    if (success) reloadPrizeClaims();
  };

  return (
    <div className="club-dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Личный кабинет Infinity</h1>
          <div className="header-actions">
            <span className="club-name">{club.clubName}</span>
            <button onClick={logout} className="logout-button">
              Выйти
            </button>
          </div>
        </header>

        <div className="dashboard-tabs">
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            Обзор
          </button>
          <button
            className={activeTab === 'players' ? 'active' : ''}
            onClick={() => setActiveTab('players')}
          >
            Игроки
          </button>
          <button
            className={activeTab === 'prizes' ? 'active' : ''}
            onClick={() => setActiveTab('prizes')}
          >
            Призы
          </button>
          <button
            className={activeTab === 'qr' ? 'active' : ''}
            onClick={() => setActiveTab('qr')}
          >
            QR-код
          </button>
        </div>

        <div className="dashboard-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Всего игроков</h3>
                  <div className="stat-value">{players.length}</div>
                </div>
                <div className="stat-card">
                  <h3>Всего призов</h3>
                  <div className="stat-value">{prizesPagination?.total ?? prizeClaims.length}</div>
                </div>
                <div className="stat-card">
                  <h3>Ожидают подтверждения</h3>
                  <div className="stat-value">
                    {prizeClaims.filter((p: any) => p.status === 'pending').length}
                  </div>
                </div>
                <div className="stat-card">
                  <h3>Выдано призов</h3>
                  <div className="stat-value">
                    {prizeClaims.filter((p: any) => p.status === 'issued').length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'players' && (
            <div className="players-tab">
              <h2>Игроки Infinity</h2>
              {players.length === 0 ? (
                <div className="empty-state">
                  <p>Нет зарегистрированных игроков</p>
                </div>
              ) : (
                <div className="players-list">
                  {players.map((player: Player) => (
                    <div key={player.id} className="player-card">
                      <div className="player-info">
                        <h3>{player.phone}</h3>
                        <p>Баланс: {player.balance} баллов</p>
                        <p>Призов: {player.prizes.filter((p: any) => p.clubId === club.clubId).length}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'prizes' && (
            <div className="prizes-tab">
              <h2>Призы для выдачи</h2>
              {prizeClaims.length === 0 ? (
                <div className="empty-state">
                  <p>Нет призов для выдачи</p>
                </div>
              ) : (
                <>
                  <div className="prizes-list">
                    {prizeClaims.map((claim: any) => {
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
                  {prizesPagination && prizesPagination.totalPages > 1 && (
                    <div className="pagination">
                      <button
                        type="button"
                        className="pagination-btn"
                        disabled={prizesPagination.page <= 1}
                        onClick={() => setPrizesPage((prev) => prev - 1)}
                      >
                        ← Назад
                      </button>
                      <div className="pagination-numbers">
                        {getPrizesPageNumbers(prizesPagination.page, prizesPagination.totalPages).map((n, i) =>
                          n === '…' ? (
                            <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
                          ) : (
                            <button
                              key={n}
                              type="button"
                              className={`pagination-num ${prizesPagination.page === n ? 'active' : ''}`}
                              onClick={() => setPrizesPage(n)}
                            >
                              {n}
                            </button>
                          )
                        )}
                      </div>
                      <button
                        type="button"
                        className="pagination-btn"
                        disabled={prizesPagination.page >= prizesPagination.totalPages}
                        onClick={() => setPrizesPage((prev) => prev + 1)}
                      >
                        Вперёд →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="qr-tab">
              <h2>QR-код Infinity</h2>
              <div className="qr-container">
                <QRCodeSVG
                  value={club.token || club.qrCode || `${getQrBaseUrl()}/spin?club=${club.clubId}`}
                  size={300}
                  level="L"
                />
                <p className="qr-info">
                  Игроки могут отсканировать этот QR-код для доступа к рулетке
                </p>
                <p className="qr-link">
                  QR токен: {club.token || club.qrCode || 'Не настроен'}
                </p>
                {club.qrCode && club.qrCode.startsWith('data:image') && (
                  <img src={club.qrCode} alt="QR Code" style={{ maxWidth: '300px', marginTop: '20px' }} />
                )}
                <button
                  onClick={() => navigate('/club/roulette')}
                  className="open-roulette-button"
                >
                  Открыть рулетку на мониторе
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
