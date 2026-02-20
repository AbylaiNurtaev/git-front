import { useState, useEffect, Fragment } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
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
    deletePrize,
    reorderPrizes,
    isLoading,
  } = useStore();
  const [prizeModalOpen, setPrizeModalOpen] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [rouletteCheck, setRouletteCheck] = useState<RouletteCheckResult | null>(null);
  /** Черновик: какие призы в рулетке. null = без изменений, иначе только изменённые id -> isActive */
  const [draftRoulette, setDraftRoulette] = useState<Record<string, boolean> | null>(null);
  /** Перетаскивание: индекс перетаскиваемого элемента и индекс, над которым наведён курсор */
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  /** Черновик порядка призов (id[]). Если задан — показываем его, сохраняем по кнопке «Сохранить». */
  const [draftOrder, setDraftOrder] = useState<string[] | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  useEffect(() => {
    fetchPrizes();
  }, [fetchPrizes]);

  const isInRoulette = (prize: Prize) =>
    draftRoulette && prize.id in draftRoulette ? draftRoulette[prize.id] : prize.isActive !== false;

  /** Базовый порядок с сервера (по slotIndex) */
  const serverOrderedIds = [...prizes]
    .sort((a, b) => {
      const sa = a.slotIndex ?? 999;
      const sb = b.slotIndex ?? 999;
      if (sa !== sb) return sa - sb;
      return String(a.id).localeCompare(String(b.id));
    })
    .map((p) => p.id);

  /** Призы в порядке для отображения: черновик или с сервера */
  const orderedPrizes: Prize[] = draftOrder
    ? draftOrder
        .map((id) => prizes.find((p) => p.id === id))
        .filter((p): p is Prize => p != null)
    : [...prizes].sort((a, b) => {
        const sa = a.slotIndex ?? 999;
        const sb = b.slotIndex ?? 999;
        if (sa !== sb) return sa - sb;
        return String(a.id).localeCompare(String(b.id));
      });

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
        errors.push(`Дублирующиеся индексы слотов: ${duplicates.join(', ')}. У каждого приза в рулетке должен быть уникальный индекс (0–34).`);
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

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', orderedPrizes[index].id);
    e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (dropIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(null);
    const from = dragIndex;
    if (from == null || from === dropIndex) {
      setDragIndex(null);
      return;
    }
    setDragIndex(null);
    const currentOrder = orderedPrizes.map((p) => p.id);
    const newOrder = [...currentOrder];
    const [movedId] = newOrder.splice(from, 1);
    newOrder.splice(dropIndex, 0, movedId);
    setDraftOrder(newOrder);
  };

  const hasOrderChanges =
    draftOrder !== null &&
    (draftOrder.length !== serverOrderedIds.length ||
      draftOrder.some((id, i) => serverOrderedIds[i] !== id));

  const handleSaveOrder = async () => {
    if (!draftOrder || draftOrder.length === 0) return;
    const orderIds = orderedPrizes.map((p) => p.id);
    if (orderIds.length === 0) return;
    setIsSavingOrder(true);
    const ok = await reorderPrizes(orderIds);
    setIsSavingOrder(false);
    if (ok) {
      setDraftOrder(null);
    } else {
      setRouletteCheck({ errors: ['Не удалось сохранить порядок призов'], warnings: [] });
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDeletePrize = async (prize: Prize) => {
    if (!window.confirm(`Удалить приз «${prize.name}»?`)) return;
    const ok = await deletePrize(prize.id);
    if (ok) {
      await fetchPrizes();
      if (selectedPrize?.id === prize.id) {
        setSelectedPrize(null);
        setPrizeModalOpen(false);
      }
    }
  };

  if (isLoading && rouletteConfig.slots.length === 0) {
    return <Skeleton />;
  }

  return (
    <div className="admin-page">
      <div className="tab-header">
        <h2>Настройка рулетки</h2>
        <button
          type="button"
          className="add-button"
          onClick={() => {
            setSelectedPrize(null);
            setPrizeModalOpen(true);
          }}
        >
          + Создать приз
        </button>
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
        {prizes.length > 0 && (
          <p className="info-text roulette-drag-hint">Перетащите приз за иконку ⋮⋮, чтобы изменить порядок (слоты).</p>
        )}
        {prizes.length === 0 ? (
          <div className="empty-state">
            <p>Нет призов. Создайте первый приз кнопкой «+ Создать приз» выше.</p>
          </div>
        ) : (
          <div className={`prize-roulette-list ${dragIndex != null ? 'has-dragging' : ''}`}>
            {orderedPrizes.map((prize: Prize, index: number) => {
              const inRoulette = isInRoulette(prize);
              const isDragging = dragIndex === index;
              const showInsertBefore = dragOverIndex === index;
              return (
                <Fragment key={prize.id}>
                  {showInsertBefore && (
                    <div className="prize-roulette-insertion-line" aria-hidden />
                  )}
                  <div
                    className={`prize-roulette-row ${inRoulette ? 'in-roulette' : ''} ${isDragging ? 'is-dragging' : ''}`}
                    draggable={!isSavingOrder}
                    onDragStart={handleDragStart(index)}
                    onDragOver={handleDragOver(index)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop(index)}
                    onDragEnd={handleDragEnd}
                  >
                  <span
                    className="prize-roulette-drag-handle"
                    title="Перетащите, чтобы изменить порядок (слот)"
                    aria-label="Изменить порядок"
                  >
                    <GripVertical size={20} />
                  </span>
                  <div className="prize-roulette-info">
                    {prize.image && (
                      <img src={prize.image} alt="" className="prize-roulette-thumb" />
                    )}
                    <div>
                      <strong>{prize.name}</strong>
                      <span className="prize-roulette-meta">
                        {(prize.probability * 100).toFixed(2)}% · {prize.type}
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
                  <button
                    type="button"
                    className="roulette-prize-delete-icon"
                    onClick={() => handleDeletePrize(prize)}
                    title="Удалить приз"
                    aria-label="Удалить приз"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                </Fragment>
              );
            })}
          </div>
        )}

        {hasOrderChanges && (
          <div className="roulette-order-save-block">
            <button
              type="button"
              className="ready-button roulette-order-save-btn"
              onClick={handleSaveOrder}
              disabled={isSavingOrder}
            >
              <span className="ready-button-icon">✓</span>
              <span className="ready-button-text">{isSavingOrder ? 'Сохранение…' : 'Сохранить порядок'}</span>
            </button>
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
                      <p><strong>Вероятность:</strong> {(slot.probability * 100).toFixed(2)}%</p>
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
                      {prize && (
                        <button
                          type="button"
                          className="roulette-prize-delete-icon"
                          onClick={() => handleDeletePrize(prize)}
                          title="Удалить приз"
                          aria-label="Удалить приз"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="total-probability">
              <p><strong>Сумма вероятностей (в рулетке):</strong> {(displayTotalProb * 100).toFixed(2)}%</p>
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
            const ok = await updatePrize(selectedPrize.id, {
              name: data.name,
              type: data.type,
              value: data.value,
              dropChance: data.dropChance,
              slotIndex: data.slotIndex,
              totalQuantity: data.totalQuantity,
              image: data.image || undefined,
              backgroundImage: data.backgroundImage || undefined,
              removeBackgroundImage: data.removeBackgroundImage,
            });
            if (ok) {
              const updated = useStore.getState().prizes.find((p) => p.id === selectedPrize.id);
              if (updated) setSelectedPrize(updated);
            }
            // Не вызываем fetchPrizes — приз в сторе уже обновлён ответом API
          } else {
            await createPrize({
              ...data,
              backgroundImage: data.backgroundImage || undefined,
            });
            await fetchPrizes();
          }
        }}
        prize={selectedPrize}
        existingSlotIndices={occupiedSlotIndices}
      />
    </div>
  );
}
