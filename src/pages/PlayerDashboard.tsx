import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import type { Player } from '@/types';
import './PlayerDashboard.css';

export default function PlayerDashboard() {
  const navigate = useNavigate();
  const { currentUser, logout, fetchPlayerData } = useStore();
  const player = currentUser as Player | null;
  const [clubIdInput, setClubIdInput] = useState('');

  useEffect(() => {
    if (player) {
      fetchPlayerData();
    }
  }, [player, fetchPlayerData]);

  if (!player || player.role !== 'player') {
    return null;
  }

  return (
    <div className="player-dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>Личный кабинет игрока</h1>
          <div className="header-actions">
            <span className="user-phone">{player.phone}</span>
            <button onClick={logout} className="logout-button">
              Выйти
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="balance-card">
            <h2>Баланс</h2>
            <div className="balance-amount">{player.balance} баллов</div>
            <button
              onClick={() => navigate('/spin')}
              className="spin-button"
              disabled={player.balance < 20}
            >
              Прокрутить рулетку
            </button>
            {player.balance < 20 && (
              <p className="insufficient-balance">
                Недостаточно баллов для прокрутки (нужно 20)
              </p>
            )}
          </div>

          <div className="club-spin-card">
            <h2>Рулетка клуба по ID</h2>
            <p className="club-spin-hint">Вставьте ID клуба, чтобы крутить его рулетку</p>
            <div className="club-spin-row">
              <input
                type="text"
                className="club-id-input"
                placeholder="ID клуба"
                value={clubIdInput}
                onChange={(e) => setClubIdInput(e.target.value.trim())}
              />
              <button
                type="button"
                className="spin-button club-spin-go"
                disabled={!clubIdInput || player.balance < 20}
                onClick={() => {
                  if (clubIdInput) navigate(`/spin?club=${encodeURIComponent(clubIdInput)}`);
                }}
              >
                Крутить рулетку
              </button>
            </div>
            {player.balance < 20 && (
              <p className="insufficient-balance">Нужно минимум 20 баллов для прокрутки</p>
            )}
          </div>

          <div className="prizes-section">
            <h2>Мои призы</h2>
            {player.prizes.length === 0 ? (
              <div className="empty-state">
                <p>У вас пока нет призов</p>
              </div>
            ) : (
              <div className="prizes-list">
                {player.prizes.map((prize) => (
                  <div key={prize.id} className="prize-card">
                    <div className="prize-info">
                      <h3>{prize.name}</h3>
                      <p>{prize.description}</p>
                      <span className={`prize-status status-${prize.status}`}>
                        {prize.status === 'pending' && 'Ожидает подтверждения'}
                        {prize.status === 'confirmed' && 'Подтвержден'}
                        {prize.status === 'issued' && 'Выдан'}
                      </span>
                    </div>
                    <div className="prize-date">
                      {new Date(prize.wonAt).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="history-section">
            <h2>История транзакций</h2>
            {player.history.length === 0 ? (
              <div className="empty-state">
                <p>История пуста</p>
              </div>
            ) : (
              <div className="history-list">
                {player.history.map((transaction) => (
                  <div key={transaction.id} className="history-item">
                    <div className="transaction-info">
                      <span className="transaction-type type-{transaction.type}">
                        {transaction.type === 'earned' && '➕ Начислено'}
                        {transaction.type === 'spent' && '➖ Списано'}
                        {transaction.type === 'prize' && '🎁 Приз'}
                      </span>
                      <span className="transaction-description">
                        {transaction.description}
                      </span>
                    </div>
                    <div className="transaction-amount">
                      {transaction.type === 'earned' || transaction.type === 'prize' ? '+' : '-'}
                      {Math.abs(transaction.amount)} баллов
                    </div>
                    <div className="transaction-date">
                      {new Date(transaction.date).toLocaleString('ru-RU')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
