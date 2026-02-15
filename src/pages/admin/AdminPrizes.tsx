import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import PrizeModal from '@/components/PrizeModal';
import Skeleton from '@/components/Skeleton';
import type { Prize } from '@/types';
import './AdminPages.css';

export default function AdminPrizes() {
  const {
    prizes,
    fetchPrizes,
    createPrize,
    updatePrize,
    deletePrize,
    isLoading,
  } = useStore();
  const [prizeModalOpen, setPrizeModalOpen] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);

  useEffect(() => {
    fetchPrizes();
  }, [fetchPrizes]);

  if (isLoading && prizes.length === 0) {
    return <Skeleton />;
  }

  return (
    <div className="admin-page">
      <div className="tab-header">
        <h2>Управление призами</h2>
        <button className="add-button" onClick={() => {
          setSelectedPrize(null);
          setPrizeModalOpen(true);
        }}>+ Добавить приз</button>
      </div>
      <div className="prizes-list">
        {prizes.map((prize: Prize) => (
          <div key={prize.id} className="prize-card">
            {prize.image && (
              <div className="prize-image">
                <img src={prize.image} alt={prize.name} />
              </div>
            )}
            <div className="prize-info">
              <h3>{prize.name}{prize.slotIndex != null && <span className="slot-index-badge">слот {prize.slotIndex}</span>}</h3>
              <p>{prize.description}</p>
              <p>Тип: {prize.type}</p>
              {prize.value && <p>Значение: {prize.value}</p>}
              <p>Вероятность: {(prize.probability * 100).toFixed(1)}%</p>
            </div>
            <div className="prize-actions">
              <button className="edit-button" onClick={() => {
                setSelectedPrize(prize);
                setPrizeModalOpen(true);
              }}>Редактировать</button>
              <button className="delete-button" onClick={async () => {
                if (window.confirm('Удалить приз?')) {
                  await deletePrize(prize.id);
                  await fetchPrizes();
                }
              }}>Удалить</button>
            </div>
          </div>
        ))}
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
        existingSlotIndices={prizes
          .filter((p) => p.id !== selectedPrize?.id)
          .map((p) => p.slotIndex)
          .filter((n): n is number => n != null)}
      />
    </div>
  );
}
