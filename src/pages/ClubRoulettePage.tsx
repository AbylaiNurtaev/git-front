import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { QRCodeSVG } from 'qrcode.react';
import { apiService } from '@/services/api';
import { PUBLIC_SITE_URL } from '@/config/api';
import { transformPrize } from '@/utils/transformers';
import type { Club, Prize } from '@/types';
import './ClubRoulettePage.css';

/** Маскирует телефон: +7 701***1 */
function maskPhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 5) return phone || '—';
  return `+7 ${digits.slice(1, 4)}***${digits.slice(-1)}`;
}

export default function ClubRoulettePage() {
  const { currentUser, fetchClubReports } = useStore();
  const club = currentUser as Club | null;
  const [roulettePrizes, setRoulettePrizes] = useState<Prize[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [spinningIndex, setSpinningIndex] = useState(0);
  const [historySpins, setHistorySpins] = useState<any[]>([]);
  const [lastSpinId, setLastSpinId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Призы рулетки
  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiService.getRoulettePrizes();
        setRoulettePrizes((data || []).map(transformPrize));
      } catch {
        setRoulettePrizes([]);
      }
    };
    load();
  }, []);

  // История спинов (отчёты за сегодня)
  const loadHistory = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const reports = await fetchClubReports(today, today);
      const spins = (reports?.spins || []).slice(0, 30);
      spins.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setHistorySpins(spins);
    } catch {
      setHistorySpins([]);
    }
  };

  useEffect(() => {
    loadHistory();
    const t = setInterval(loadHistory, 5000);
    return () => clearInterval(t);
  }, [fetchClubReports]);

  // Polling нового спина
  useEffect(() => {
    if (!club || roulettePrizes.length === 0) return;

    const check = async () => {
      try {
        const latest = await apiService.getClubLatestSpin();
        if (!latest || latest._id === lastSpinId) return;
        setLastSpinId(latest._id);
        const prize = roulettePrizes.find(
          (p) => p.id === latest.prize?._id || (latest.prize?.slotIndex !== undefined && p.slotIndex === latest.prize.slotIndex)
        );
        const toSpin: Prize =
          prize ||
          ({
            id: latest.prize?._id || '',
            name: latest.prize?.name || 'Приз',
            type: (latest.prize?.type as any) || 'points',
            value: latest.prize?.value,
            image: latest.prize?.image,
            probability: 0,
            slotIndex: latest.prize?.slotIndex ?? 0,
            description: latest.prize?.description || '',
            status: 'pending',
            wonAt: new Date().toISOString(),
          } as Prize);
        startSpin(toSpin);
        setTimeout(loadHistory, 1000);
      } catch {}
    };

    pollingRef.current = setInterval(check, 2000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [club, lastSpinId, roulettePrizes]);

  const startSpin = (prize: Prize) => {
    if (isSpinning) return;
    const display = roulettePrizes.length >= 4 ? roulettePrizes.slice(0, 4) : roulettePrizes;
    if (display.length === 0) return;

    setIsSpinning(true);
    setSelectedPrize(null);

    const finalIndex = display.findIndex((p) => p.id === prize.id || (prize.slotIndex !== undefined && p.slotIndex === prize.slotIndex));
    const stopIndex = finalIndex >= 0 ? finalIndex : 0;
    const total = display.length;

    const spinDuration = 4000;
    const stepMs = 35;
    const steps = Math.max(1, Math.floor(spinDuration / stepMs));
    let step = 0;
    let currentIndex = 0;

    intervalRef.current = setInterval(() => {
      step++;
      currentIndex = (currentIndex + 1) % total;
      setSpinningIndex(currentIndex);

      if (step >= steps) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setSpinningIndex(stopIndex);
        setSelectedPrize(prize);
        setIsSpinning(false);
        setTimeout(() => setSelectedPrize(null), 5000);
      }
    }, stepMs);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const displayPrizes = roulettePrizes.length >= 4 ? roulettePrizes.slice(0, 4) : roulettePrizes;

  return (
    <div className="club-roulette-page">
      <div className="roulette-layout">
        {/* Верх: рулетка (4 карточки), постоянно в лёгком движении */}
        <section className="roulette-top">
          <div className={`roulette-cards ${isSpinning ? 'roulette-spinning' : 'roulette-idle'}`}>
            {displayPrizes.length > 0 ? (
              displayPrizes.map((prize, index) => {
                const isHighlighted = isSpinning && spinningIndex % displayPrizes.length === index;
                const isSelected = !isSpinning && selectedPrize?.id === prize.id;
                return (
                  <div
                    key={prize.id}
                    className={`roulette-card ${isHighlighted ? 'highlighted' : ''} ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="roulette-card-inner">
                      {prize.image ? (
                        <img src={prize.image} alt={prize.name} className="roulette-card-img" />
                      ) : (
                        <div className="roulette-card-placeholder">{prize.name.charAt(0)}</div>
                      )}
                      <div className="roulette-card-name">{prize.name}</div>
                      {prize.value != null && <div className="roulette-card-value">{prize.value}</div>}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="roulette-empty-msg">Загрузка призов...</div>
            )}
          </div>
        </section>

        {/* Низ: слева история, справа QR */}
        <section className="roulette-bottom">
          <div className="roulette-history-wrap">
            <h2 className="roulette-history-heading">История</h2>
            <ul className="roulette-history-list">
              {historySpins.length === 0 ? (
                <li className="roulette-history-empty">Пока никого не крутило</li>
              ) : (
                historySpins.map((spin: any) => (
                  <li key={spin._id || spin.id || spin.createdAt} className="roulette-history-item">
                    <span className="roulette-history-phone">{maskPhone(spin.playerPhone || spin.playerId?.phone || '')}</span>
                    <span className="roulette-history-prize">Выиграл {spin.prize?.name || spin.prizeName || 'приз'}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="roulette-qr-wrap">
            <div className="roulette-qr-card">
              <p className="roulette-qr-label">Отсканируйте</p>
              {club ? (
                <QRCodeSVG
                  value={club.token ? `${PUBLIC_SITE_URL || window.location.origin}/spin?club=${club.token}` : `${PUBLIC_SITE_URL || window.location.origin}/spin`}
                  size={140}
                  level="H"
                  className="roulette-qr-code"
                />
              ) : (
                <div className="roulette-qr-placeholder">QR</div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Оверлей выигрыша */}
      {selectedPrize && !isSpinning && (
        <div className="roulette-result-overlay">
          <div className="roulette-result-content">
            <h2 className="roulette-result-title">Выигрыш!</h2>
            <div className="roulette-result-prize">
              <div className="roulette-result-name">{selectedPrize.name}</div>
              {selectedPrize.description && <div className="roulette-result-desc">{selectedPrize.description}</div>}
            </div>
          </div>
        </div>
      )}

      {import.meta.env.MODE === 'development' && roulettePrizes.length > 0 && (
        <button
          type="button"
          className="roulette-test-btn"
          onClick={() => startSpin(roulettePrizes[Math.floor(Math.random() * roulettePrizes.length)])}
          disabled={isSpinning}
        >
          Тест спин
        </button>
      )}
    </div>
  );
}
