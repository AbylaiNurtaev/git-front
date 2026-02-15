import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import PrizeModal from '@/components/PrizeModal';
import Skeleton from '@/components/Skeleton';
import type { Prize, RouletteSlot } from '@/types';
import './AdminPages.css';

type RouletteCheckResult = { errors: string[]; warnings: string[] };

export default function AdminRoulette() {
  const {
    prizes,
    rouletteConfig,
    fetchPrizes,
    createPrize,
    updatePrize,
    isLoading,
  } = useStore();
  const [prizeModalOpen, setPrizeModalOpen] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [rouletteCheck, setRouletteCheck] = useState<RouletteCheckResult | null>(null);
  /** Черновик: какие призы в рулетке. null = без изменений, иначе только изменённые id -> isActive */
  const [draftRoulette, setDraftRoulette] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    fetchPrizes();
  }, [fetchPrizes]);

  const isInRoulette = (prize: Prize) =>
    draftRoulette && prize.id in draftRoulette ? draftRoulette[prize.id] : prize.isActive !== false;

  const activePrizes = prizes.filter((p) => isInRoulette(p));
  const occupiedSlotIndices = prizes
    .filter((p) => p.id !== selectedPrize?.id)
    .map((p) => p.slotIndex)
    .filter((n): n is number => n != null);

  const hasChanges = draftRoulette !== null && Object.keys(draftRoulette).length > 0;

  /** «Сейчас в рулетке» — только сохранённое состояние (меняется только после «Рулетка готова») */
  const displaySlots = rouletteConfig.slots;
  const displayTotalProb = rouletteConfig.totalProbability;

  const handleToggleRoulette = (prize: Prize) => {
    const next = !isInRoulette(prize);
    setDraftRoulette((prev) => ({ ...prev, [prize.id]: next }));
    setRouletteCheck(null);
  };

  const handleRouletteReady = async () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (activePrizes.length === 0) {
      errors.push('В рулетке нет ни одного приза. Включите переключатель «В рулетке» у призов.');
    } else {
      const totalProb = activePrizes.reduce((sum, p) => sum + (p.probability || 0), 0);
      if (totalProb > 1) {
        warnings.push(`Сумма вероятностей ${(totalProb * 100).toFixed(1)}% больше 100%. Итоги считаются пропорционально, но лучше привести к 100%.`);
      }
      const slotIndices = activePrizes.map((p) => p.slotIndex).filter((n): n is number => n != null);
      const seen = new Map<number, number>();
      slotIndices.forEach((idx) => seen.set(idx, (seen.get(idx) ?? 0) + 1));
      const duplicates = [...seen.entries()].filter(([, count]) => count > 1).map(([idx]) => idx);
      if (duplicates.length > 0) {
        errors.push(`Дублирующиеся индексы слотов: ${duplicates.join(', ')}. У каждого приза в рулетке должен быть уникальный индекс (0–24).`);
      }
    }

    setRouletteCheck({ errors, warnings });
    if (errors.length === 0 && warnings.length === 0 && draftRoulette) {
      for (const [prizeId, isActive] of Object.entries(draftRoulette)) {
        await updatePrize(prizeId, { isActive });
      }
      await fetchPrizes();
      setDraftRoulette(null);
    }
  };

  const handleCancelRoulette = () => {
    setDraftRoulette(null);
    setRouletteCheck(null);
  };

  if (isLoading && rouletteConfig.slots.length === 0) {
    return <Skeleton />;
  }

  return (
    <div className="admin-page">
      <div className="tab-header">
        <h2>Настройка рулетки</h2>
        <div className="roulette-info">
          <p className="info-text">
            Выберите, какие призы участвуют в рулетке. Только призы с включённым «В рулетке» выпадают при прокрутке.
          </p>
          <p className="info-text">
            <strong>Вероятности:</strong> считаются только по выбранным призам. Сумма может быть меньше 100% — тогда выбор пропорционален вероятностям.
          </p>
        </div>
      </div>

      {/* Секция: выбор призов для рулетки */}
      <div className="roulette-prize-selection">
        <h3>Все призы — участие в рулетке</h3>
        {prizes.length === 0 ? (
          <div className="empty-state">
            <p>Нет призов. Создайте призы в разделе «Призы».</p>
          </div>
        ) : (
          <div className="prize-roulette-list">
            {prizes.map((prize: Prize) => {
              const inRoulette = isInRoulette(prize);
              return (
                <div key={prize.id} className={`prize-roulette-row ${inRoulette ? 'in-roulette' : ''}`}>
                  <div className="prize-roulette-info">
                    {prize.image && (
                      <img src={prize.image} alt="" className="prize-roulette-thumb" />
                    )}
                    <div>
                      <strong>{prize.name}</strong>
                      <span className="prize-roulette-meta">
                        {(prize.probability * 100).toFixed(1)}% · {prize.type}
                        {prize.slotIndex != null && (
                          <span className="prize-slot-index"> · слот {prize.slotIndex}</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <label className="roulette-toggle">
                    <input
                      type="checkbox"
                      checked={inRoulette}
                      onChange={() => handleToggleRoulette(prize)}
                    />
                    <span className="roulette-toggle-label">В рулетке</span>
                  </label>
                  <button
                    type="button"
                    className="edit-button small"
                    onClick={() => {
                      setSelectedPrize(prize);
                      setPrizeModalOpen(true);
                    }}
                  >
                    Изменить
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {hasChanges && (
          <div className="roulette-ready-block">
            <div className="roulette-ready-actions">
              <button type="button" className="ready-button" onClick={handleRouletteReady}>
                <span className="ready-button-icon">✓</span>
                <span className="ready-button-text">Рулетка готова</span>
              </button>
              <button type="button" className="cancel-ready-button" onClick={handleCancelRoulette}>
                Отменить
              </button>
            </div>
            <p className="roulette-ready-hint">Сохранить изменения или отменить</p>
            {rouletteCheck && (
              <div className={`roulette-check-result ${rouletteCheck.errors.length > 0 ? 'has-errors' : ''}`}>
                {rouletteCheck.errors.length > 0 && (
                  <div className="roulette-check-errors">
                    <strong>Ошибки:</strong>
                    {rouletteCheck.errors.map((msg, i) => (
                      <p key={i}>⚠️ {msg}</p>
                    ))}
                  </div>
                )}
                {rouletteCheck.warnings.length > 0 && (
                  <div className="roulette-check-warnings">
                    <strong>Предупреждения:</strong>
                    {rouletteCheck.warnings.map((msg, i) => (
                      <p key={i}>⚠️ {msg}</p>
                    ))}
                  </div>
                )}
                {rouletteCheck.errors.length === 0 && rouletteCheck.warnings.length === 0 && activePrizes.length > 0 && (
                  <p className="roulette-check-ok">Рулетка настроена корректно.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="roulette-config">
        <h3>Сейчас в рулетке ({displaySlots.length})</h3>
        {displaySlots.length === 0 ? (
          <div className="empty-state">
            <p>Нет призов в рулетке</p>
            <p className="hint">Включите переключатель «В рулетке» у нужных призов выше</p>
          </div>
        ) : (
          <>
            <div className="slots-list">
              {displaySlots.map((slot: RouletteSlot, index: number) => {
                const prize = prizes.find((p: Prize) => p.id === slot.prizeId);
                return (
                  <div key={slot.id} className="slot-card">
                    <div className="slot-info">
                      <h4>Слот {index + 1}{prize?.slotIndex != null && <span className="slot-index-badge">{prize.slotIndex}</span>}</h4>
                      <p><strong>Приз:</strong> {prize?.name || 'Неизвестно'}</p>
                      {prize?.image && (
                        <div className="slot-prize-image">
                          <img src={prize.image} alt={prize.name} />
                        </div>
                      )}
                      <p><strong>Вероятность:</strong> {(slot.probability * 100).toFixed(1)}%</p>
                      {prize?.type && <p><strong>Тип:</strong> {prize.type}</p>}
                    </div>
                    <div className="slot-actions">
                      <button 
                        className="edit-button" 
                        onClick={() => {
                          setSelectedPrize(prize || null);
                          setPrizeModalOpen(true);
                        }}
                      >
                        Редактировать приз
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="total-probability">
              <p><strong>Сумма вероятностей (в рулетке):</strong> {(displayTotalProb * 100).toFixed(1)}%</p>
              {displayTotalProb > 1 && (
                <p className="warning">⚠️ Сумма вероятностей больше 100%</p>
              )}
            </div>
          </>
        )}
      </div>

      <PrizeModal
        isOpen={prizeModalOpen}
        onClose={() => {
          setPrizeModalOpen(false);
          setSelectedPrize(null);
        }}
        onSave={async (data) => {
          if (selectedPrize) {
            await updatePrize(selectedPrize.id, { 
              dropChance: data.dropChance,
              image: data.image || undefined
            });
          } else {
            await createPrize(data);
          }
          await fetchPrizes();
        }}
        prize={selectedPrize}
        existingSlotIndices={occupiedSlotIndices}
      />
    </div>
  );
}
