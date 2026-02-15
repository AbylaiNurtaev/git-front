import { useState, useEffect } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import type { Prize } from '@/types';
import './PrizeModal.css';

interface PrizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    type: string;
    value?: number;
    dropChance: number;
    slotIndex: number;
    totalQuantity: number;
    image?: File | null;
  }) => Promise<void>;
  prize?: Prize | null;
  /** Занятые индексы слотов другими призами (при создании — не допускаются) */
  existingSlotIndices?: number[];
}

export default function PrizeModal({ isOpen, onClose, onSave, prize, existingSlotIndices = [] }: PrizeModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('points');
  const [value, setValue] = useState<number>(0);
  const [dropChance, setDropChance] = useState<number>(0);
  const [slotIndex, setSlotIndex] = useState<number>(0);
  const [totalQuantity, setTotalQuantity] = useState<number>(100);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    setValidationErrors([]);
    if (prize) {
      setName(prize.name || '');
      setType(prize.type || 'points');
      setValue(prize.value || 0);
      setDropChance((prize.probability || 0) * 100);
      setSlotIndex(prize.slotIndex ?? 0);
      setTotalQuantity(100);
      setImage(null);
      setImagePreview(prize.image || null);
    } else {
      setName('');
      setType('points');
      setValue(0);
      setDropChance(0);
      setSlotIndex(0);
      setTotalQuantity(100);
      setImage(null);
      setImagePreview(null);
    }
  }, [prize, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    if (!name?.trim()) errors.push('Введите название приза.');
    if (dropChance <= 0) errors.push('Вероятность выпадения должна быть больше 0%.');
    if (dropChance > 100) errors.push('Вероятность не должна превышать 100%.');

    if (!prize) {
      if (!image && !imagePreview) {
        errors.push('Загрузите изображение приза — без фото создание невозможно.');
      }
      const occupied = existingSlotIndices.filter((i) => i !== (prize?.slotIndex ?? -1));
      if (occupied.includes(slotIndex)) {
        errors.push(`Индекс слота ${slotIndex} уже занят другим призом. Выберите другой (0–24).`);
      }
      if (slotIndex < 0 || slotIndex > 24) {
        errors.push('Индекс слота должен быть от 0 до 24.');
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);

    setIsLoading(true);
    try {
      await onSave({
        name: name.trim(),
        type,
        value: type === 'points' || type === 'club_time' ? value : undefined,
        dropChance,
        slotIndex,
        totalQuantity,
        image,
      });
      onClose();
    } catch (error: any) {
      console.error('Error saving prize:', error);
      setValidationErrors([error?.message || 'Ошибка сохранения. Проверьте данные и попробуйте снова.']);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={prize ? 'Редактировать приз' : 'Создать приз'}
      size="medium"
    >
      <form onSubmit={handleSubmit}>
        <FormField
          label="Название приза"
          name="name"
          type="text"
          value={name}
          onChange={(value) => setName(String(value))}
          placeholder="Введите название приза"
          required
        />
        <FormField
          label="Тип приза"
          name="type"
          type="select"
          value={type}
          onChange={(value) => setType(String(value))}
          required
          options={[
            { value: 'points', label: 'Баллы' },
            { value: 'physical', label: 'Физический приз' },
            { value: 'club_time', label: 'Время в Infinity' },
            { value: 'other', label: 'Другое' },
          ]}
        />
        {(type === 'points' || type === 'club_time') && (
          <FormField
            label={type === 'points' ? 'Количество баллов' : 'Минуты'}
            name="value"
            type="number"
            value={value}
            onChange={(value) => setValue(typeof value === 'number' ? value : Number(value))}
            placeholder="0"
            min={0}
            required
          />
        )}
        <FormField
          label="Вероятность выпадения (%)"
          name="dropChance"
          type="number"
          value={dropChance}
          onChange={(value) => setDropChance(typeof value === 'number' ? value : Number(value))}
          placeholder="0-100"
          min={0}
          max={100}
          step={0.1}
          required
        />
        {!prize && (
          <>
            <div className="form-field">
              <FormField
                label="Индекс слота (0–24)"
                name="slotIndex"
                type="number"
                value={slotIndex}
                onChange={(value) => setSlotIndex(typeof value === 'number' ? value : Number(value))}
                placeholder="0-24"
                min={0}
                max={24}
                required
              />
              <p className="form-hint">Уникальный номер, не должен совпадать с другими призами. Занятые: {existingSlotIndices.length ? existingSlotIndices.sort((a, b) => a - b).join(', ') : 'нет'}.</p>
            </div>
            <FormField
              label="Общее количество"
              name="totalQuantity"
              type="number"
              value={totalQuantity}
              onChange={(value) => setTotalQuantity(typeof value === 'number' ? value : Number(value))}
              placeholder="100"
              min={1}
              required
            />
          </>
        )}
        {validationErrors.length > 0 && (
          <div className="prize-modal-errors" role="alert">
            {validationErrors.map((msg, i) => (
              <p key={i} className="prize-modal-error-item">⚠️ {msg}</p>
            ))}
          </div>
        )}
        <div className="form-field">
          <label htmlFor="prize-image" className="form-label">
            Изображение приза
            {!prize && <span className="required">*</span>}
          </label>
          {!prize && (
            <p className="form-hint">Без фото приз создать нельзя.</p>
          )}
          <div className="image-upload-container">
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                  className="remove-image-button"
                >
                  ×
                </button>
              </div>
            )}
            <label htmlFor="prize-image" className="image-upload-button">
              {imagePreview ? 'Изменить изображение' : 'Выбрать изображение'}
              <input
                id="prize-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onClose} className="cancel-button">
            Отмена
          </button>
          <button type="submit" className="save-button" disabled={isLoading}>
            {isLoading ? 'Сохранение...' : prize ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
