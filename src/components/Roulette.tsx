import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Prize } from '@/types';
import './Roulette.css';

interface RouletteProps {
  isSpinning?: boolean;
  selectedPrizeIndex?: number;
  /** Передать призы снаружи (например для страницы спина игрока), иначе берутся из store */
  prizesOverride?: Prize[];
}

export default function Roulette({ isSpinning = false, selectedPrizeIndex, prizesOverride }: RouletteProps) {
  const { prizes: storePrizes } = useStore();
  const prizes = (prizesOverride && prizesOverride.length > 0) ? prizesOverride : storePrizes;
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (prizes.length === 0) return;
    if (isSpinning && selectedPrizeIndex !== undefined) {
      const prizeAngle = (360 / prizes.length) * selectedPrizeIndex;
      const finalRotation = 360 * 5 + (360 - prizeAngle);
      setRotation(finalRotation);
    } else {
      setRotation(0);
    }
  }, [isSpinning, selectedPrizeIndex, prizes.length]);

  const prizeColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#6C5CE7',
  ];

  const slots = prizes.map((prize, index) => ({
    ...prize,
    color: prizeColors[index % prizeColors.length],
    angle: (360 / prizes.length) * index,
  }));

  if (slots.length === 0) {
    return (
      <div className="roulette-wrapper roulette-empty">
        <p>Нет призов для рулетки</p>
      </div>
    );
  }

  return (
    <div className="roulette-wrapper">
      <div
        className="roulette-wheel"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: rotation > 0 ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
        }}
      >
        {slots.map((slot, index) => {
          const angle = (360 / slots.length) * index;
          const sliceAngle = 360 / slots.length;
          const radius = 150;
          const x = Math.cos((angle - 90) * (Math.PI / 180)) * radius;
          const y = Math.sin((angle - 90) * (Math.PI / 180)) * radius;

          return (
            <div
              key={slot.id}
              className="roulette-slice"
              style={{
                transform: `rotate(${angle}deg)`,
                backgroundColor: slot.color,
                clipPath: `polygon(50% 50%, ${50 + x}% ${50 + y}%, ${50 + Math.cos((angle + sliceAngle - 90) * (Math.PI / 180)) * radius}% ${50 + Math.sin((angle + sliceAngle - 90) * (Math.PI / 180)) * radius}%)`,
              }}
            >
              <div
                className="slice-text"
                style={{
                  transform: `rotate(${-angle + sliceAngle / 2}deg)`,
                }}
              >
                {slot.name}
              </div>
            </div>
          );
        })}
      </div>
      <div className="roulette-pointer" />
    </div>
  );
}
