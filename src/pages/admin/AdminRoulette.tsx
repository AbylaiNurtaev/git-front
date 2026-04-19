import { useState, useEffect } from 'react';
import { Dices, GripVertical, Layers3, Sparkles, Target, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/store/useStore';
import PrizeModal from '@/components/PrizeModal';
import Skeleton from '@/components/Skeleton';
import type { Prize } from '@/types';
import { prizeTypeLabel } from '@/constants/prizeTypes';
import './AdminPages.css';

export default function AdminRoulette() {
  const {
    prizes,
    rouletteConfig,
    fetchPrizes,
    createPrize,
    updatePrize,
    deletePrize,
    reorderPrizes,
    updatePrizeFund,
    isLoading,
  } = useStore();
  const [prizeModalOpen, setPrizeModalOpen] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  /** Перетаскивание: индекс перетаскиваемого элемента и индекс, над которым наведён курсор */
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  /** Черновик порядка призов (id[]). Если задан — показываем его, сохраняем по кнопке «Сохранить». */
  const [draftOrder, setDraftOrder] = useState<string[] | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  useEffect(() => {
    fetchPrizes();
  }, [fetchPrizes]);

  const activePrizes = prizes.filter((p) => p.isActive !== false);

  /** Активные призы в порядке для отображения: черновик или порядок с сервера */
  const orderedActivePrizes: Prize[] = draftOrder
    ? draftOrder
        .map((id) => activePrizes.find((p) => p.id === id))
        .filter((p): p is Prize => p != null)
    : [...activePrizes].sort((a, b) => {
        const sa = a.slotIndex ?? 999;
        const sb = b.slotIndex ?? 999;
        if (sa !== sb) return sa - sb;
        return String(a.id).localeCompare(String(b.id));
      });

  const occupiedSlotIndices = prizes
    .filter((p) => p.id !== selectedPrize?.id)
    .map((p) => p.slotIndex)
    .filter((n): n is number => n != null);

  /** «Сейчас в рулетке» — только сохранённое состояние (меняется только после «Рулетка готова») */
  const displaySlots = rouletteConfig.slots;
  const displayTotalProb = rouletteConfig.totalProbability;

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', orderedActivePrizes[index].id);
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
    const currentOrder = orderedActivePrizes.map((p) => p.id);
    const newOrder = [...currentOrder];
    const [movedId] = newOrder.splice(from, 1);
    newOrder.splice(dropIndex, 0, movedId);
    setDraftOrder(newOrder);
    void saveOrder(newOrder);
  };

  const saveOrder = async (orderIds: string[]) => {
    if (orderIds.length === 0) return;
    setIsSavingOrder(true);
    const ok = await reorderPrizes(orderIds);
    setIsSavingOrder(false);
    if (ok) {
      toast.success('Порядок успешно изменен');
      setDraftOrder(null);
    } else {
      toast.error('Не удалось изменить порядок');
      setDraftOrder(null);
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
    <div className="admin-page admin-roulette-page">
      <div className="tab-header">
        <div className="dashboard-title-group">
          <span className="dashboard-title-group__icon">
            <Dices size={18} />
          </span>
          <h2>Настройка рулетки</h2>
        </div>
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
      </div>

      <div className="roulette-hero">
        <div className="roulette-hero__copy">
          <span className="roulette-hero__eyebrow">Управление механикой</span>
          <p className="roulette-hero__title">Соберите понятную, аккуратную и предсказуемую логику выпадения призов.</p>
          <div className="roulette-info roulette-info--hero">
            <div className="roulette-info__item">
              <Sparkles size={16} />
              <p className="info-text">В рулетке участвуют только активные призы, которые уже настроены для механики.</p>
            </div>
            <div className="roulette-info__item">
              <Target size={16} />
              <p className="info-text"><strong>Вероятности</strong> считаются только по активным призам и работают пропорционально.</p>
            </div>
          </div>
        </div>
        <div className="roulette-hero__stats">
          <div className="roulette-hero__chip">
            <span>Всего призов</span>
            <strong>{prizes.length}</strong>
          </div>
          <div className="roulette-hero__chip">
            <span>Активно в рулетке</span>
            <strong>{activePrizes.length}</strong>
          </div>
          <div className="roulette-hero__chip">
            <span>Текущих слотов</span>
            <strong>{displaySlots.length}</strong>
          </div>
        </div>
      </div>

      <div className="roulette-config">
        <div className="roulette-section-heading">
          <span className="roulette-section-heading__icon">
            <Layers3 size={16} />
          </span>
          <div className="roulette-section-heading__content">
            <h3>Сейчас в рулетке ({orderedActivePrizes.length})</h3>
            <div className="roulette-section-heading__meta">
              <span className="roulette-section-heading__pill">
                {(displayTotalProb * 100).toFixed(2)}%
              </span>
              {displayTotalProb > 1 && (
                <span className="roulette-section-heading__warning">Сумма вероятностей выше 100%</span>
              )}
            </div>
          </div>
        </div>
        {orderedActivePrizes.length > 0 && (
          <p className="info-text roulette-drag-hint">Перетаскивайте карточки, чтобы менять порядок выпадения и слотов.</p>
        )}
        {orderedActivePrizes.length === 0 ? (
          <div className="empty-state">
            <p>Сейчас в рулетке нет активных призов</p>
            <p className="hint">Создайте и настройте активные призы, и они появятся здесь автоматически.</p>
          </div>
        ) : (
          <>
            <div className={`slots-list ${dragIndex != null ? 'has-dragging' : ''}`}>
              {orderedActivePrizes.map((prize: Prize, index: number) => {
                const isDragging = dragIndex === index;
                const isDropTarget = dragOverIndex === index && dragIndex !== index;
                return (
                  <div
                    key={prize.id}
                    className={`slot-card slot-card--sortable ${isDragging ? 'is-dragging' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}
                    draggable={!isSavingOrder}
                    onClick={() => {
                      setSelectedPrize(prize);
                      setPrizeModalOpen(true);
                    }}
                    onDragStart={handleDragStart(index)}
                    onDragOver={handleDragOver(index)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop(index)}
                    onDragEnd={handleDragEnd}
                  >
                    <button
                      type="button"
                      className="roulette-prize-delete-icon"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeletePrize(prize);
                      }}
                      title="Удалить приз"
                      aria-label="Удалить приз"
                    >
                      <Trash2 size={18} />
                    </button>

                    <div className="slot-card__top">
                      <span
                        className="prize-roulette-drag-handle slot-card__drag-handle"
                        title="Перетащите, чтобы изменить порядок"
                        aria-label="Изменить порядок"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <GripVertical size={20} />
                      </span>

                      <div className="slot-card__header">
                        <span className="slot-card__badge">Слот {index + 1}</span>
                        <span className="slot-card__probability">{((prize.probability ?? 0) * 100).toFixed(2)}%</span>
                      </div>
                    </div>

                    <div className="slot-card__main">
                      {prize.image && (
                        <div className="slot-prize-image slot-card__media">
                          <img src={prize.image} alt={prize.name} />
                        </div>
                      )}
                      <div className="slot-card__content">
                        <div className="slot-info">
                          <h4>{prize.name}</h4>
                          <p><strong>Тип:</strong> {prizeTypeLabel(prize.type)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
              productEntityId: data.productEntityId,
              dropChance: data.dropChance,
              slotIndex: data.slotIndex,
              totalQuantity: data.totalQuantity,
              image: data.image || undefined,
              backgroundImage: data.backgroundImage || undefined,
              removeBackgroundImage: data.removeBackgroundImage,
            });
            if (ok && data.remainingQuantity !== undefined) {
              await updatePrizeFund({
                prizeId: selectedPrize.id,
                totalQuantity: data.totalQuantity,
                remainingQuantity: data.remainingQuantity,
              });
              await fetchPrizes();
            }
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
        quantityMode="roulette"
      />
    </div>
  );
}
