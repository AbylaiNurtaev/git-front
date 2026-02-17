import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import type { Player } from '@/types';
import { Sparkles } from 'lucide-react';
import logoUrl from '@/assets/logo.png';
import './PlayerPages.css';

export default function PlayerHome() {
  const navigate = useNavigate();
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

  const canSpin = player.balance >= 20;

  return (
    <div className="player-home">
      <header className="player-page-header">
        <img src={logoUrl} alt="Infinity" className="header-logo" />
        <h1>Главная</h1>
        <span className="player-phone-badge">{player.phone}</span>
      </header>

      <div className="player-home-content">
        <div className="player-balance-card">
          <div className="player-balance-label">Баланс</div>
          <div className="player-balance-value">
            <span className="player-balance-number">{player.balance}</span>
            <span className="player-balance-unit">баллов</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/player/scan')}
            className="player-cta-button"
            disabled={!canSpin}
          >
            <Sparkles size={20} strokeWidth={2} />
            Прокрутить рулетку
          </button>
          {!canSpin && (
            <p className="player-balance-hint">Нужно 20 баллов для одного спина</p>
          )}
        </div>
      </div>
    </div>
  );
}
