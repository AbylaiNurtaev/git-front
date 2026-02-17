import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import type { Player } from '@/types';
import logoUrl from '@/assets/logo.png';
import './PlayerPages.css';

export default function PlayerPrizes() {
  const { currentUser, fetchPlayerData } = useStore();
  const player = currentUser as Player | null;

  useEffect(() => {
    if (player) {
      fetchPlayerData();
    }
  }, [player, fetchPlayerData]);

  if (!player || player.role !== 'player') {
    return null;
  }

  return (
    <div className="player-prizes">
      <header className="player-page-header">
        <img src={logoUrl} alt="Infinity" className="header-logo" />
        <h1>История</h1>
      </header>

      <div className="player-prizes-content">
        <section className="player-section">
          <h2 className="player-section-title">Мои призы</h2>
          {player.prizes.length === 0 ? (
            <div className="player-empty-state">У вас пока нет призов</div>
          ) : (
            <div className="player-prizes-list">
              {player.prizes.map((prize) => (
                <div key={prize.id} className="player-prize-card">
                  <div className="player-prize-info">
                    <h3>{prize.name}</h3>
                    <p>{prize.description}</p>
                    <span className={`player-prize-status ${prize.status}`}>
                      {prize.status === 'pending' && 'Ожидает подтверждения'}
                      {prize.status === 'confirmed' && 'Подтвержден'}
                      {prize.status === 'issued' && 'Выдан'}
                    </span>
                  </div>
                  <span className="player-prize-date">
                    {new Date(prize.wonAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="player-section">
          <h2 className="player-section-title">Транзакции</h2>
          {player.history.length === 0 ? (
            <div className="player-empty-state">История пуста</div>
          ) : (
            <div className="player-history-list">
              {player.history.map((transaction) => {
                const isPositive = transaction.type === 'earned' || transaction.type === 'prize';
                return (
                  <div key={transaction.id} className="player-history-item">
                    <span className="player-history-type">
                      {transaction.type === 'earned' && 'Начислено'}
                      {transaction.type === 'spent' && 'Списано'}
                      {transaction.type === 'prize' && 'Приз'}
                    </span>
                    <span className={`player-history-amount ${isPositive ? '' : 'negative'}`}>
                      {isPositive ? '+' : '−'}
                      {Math.abs(transaction.amount)} б.
                    </span>
                    <span className="player-history-desc">{transaction.description}</span>
                    <span className="player-history-date">
                      {new Date(transaction.date).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
