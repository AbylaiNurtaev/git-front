import { useState, useEffect } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import type { Prize } from '@/types';
import { getApiBaseUrl } from '@/config/api';
import './PrizeModal.css';

/** Допустимые форматы изображений для приза и фона */
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ACCEPT_IMAGE = 'image/jpeg,image/png,image/gif,image/webp';
const ALLOWED_IMAGE_HINT = 'Допустимые форматы: JPG, PNG, GIF, WebP';

/** Лимит размера файла фона приза — 5 МБ */
const BACKGROUND_IMAGE_MAX_SIZE_MB = 5;
const BACKGROUND_IMAGE_MAX_SIZE_BYTES = BACKGROUND_IMAGE_MAX_SIZE_MB * 1024 * 1024;
const BACKGROUND_IMAGE_SIZE_HINT = `Максимум ${BACKGROUND_IMAGE_MAX_SIZE_MB} МБ`;

/** Если URL относительный (начинается с /), подставляем базовый URL API для загрузки */
function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${getApiBaseUrl().replace(/\/api\/?$/, '')}${url}`;
  return url;
}

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
    backgroundImage?: File | null;
    removeBackgroundImage?: boolean;
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
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(null);
  const [removeBackgroundImage, setRemoveBackgroundImage] = useState(false);
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
      setBackgroundImage(null);
      setBackgroundImagePreview(resolveImageUrl(prize.backgroundImage) || null);
      setRemoveBackgroundImage(false);
    } else {
      setName('');
      setType('points');
      setValue(0);
      setDropChance(0);
      setSlotIndex(0);
      setTotalQuantity(100);
      setImage(null);
      setImagePreview(null);
      setBackgroundImage(null);
      setBackgroundImagePreview(null);
      setRemoveBackgroundImage(false);
    }
  }, [prize, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setValidationErrors((prev) => [
        ...prev.filter((s) => !s.includes('формат')),
        `Недопустимый формат файла. ${ALLOWED_IMAGE_HINT}`,
      ]);
      e.target.value = '';
      return;
    }
    setValidationErrors((prev) => prev.filter((s) => !s.includes('формат')));
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBackgroundImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setValidationErrors((prev) => [
        ...prev.filter((s) => !s.includes('формат фона') && !s.includes('слишком большой')),
        `Недопустимый формат фона. ${ALLOWED_IMAGE_HINT}`,
      ]);
      e.target.value = '';
      return;
    }
    if (file.size > BACKGROUND_IMAGE_MAX_SIZE_BYTES) {
      setValidationErrors((prev) => [
        ...prev.filter((s) => !s.includes('формат фона') && !s.includes('слишком большой')),
        `Файл фона слишком большой. ${BACKGROUND_IMAGE_SIZE_HINT}.`,
      ]);
      e.target.value = '';
      return;
    }
    setValidationErrors((prev) =>
      prev.filter((s) => !s.includes('формат фона') && !s.includes('слишком большой'))
    );
    setBackgroundImage(file);
    setRemoveBackgroundImage(false);
    const reader = new FileReader();
    reader.onloadend = () => {
      setBackgroundImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
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
      const occupied = existingSlotIndices;
      if (occupied.includes(slotIndex)) {
        errors.push(`Индекс слота ${slotIndex} уже занят другим призом. Выберите другой (0–34).`);
      }
      if (slotIndex < 0 || slotIndex > 34) {
        errors.push('Индекс слота должен быть от 0 до 34.');
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
        backgroundImage: removeBackgroundImage ? null : backgroundImage,
        removeBackgroundImage: prize ? removeBackgroundImage : undefined,
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
            label={type === 'points' ? 'Количество баллов' : 'Тенге'}
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
                label="Индекс слота (0–34)"
                name="slotIndex"
                type="number"
                value={slotIndex}
                onChange={(value) => setSlotIndex(typeof value === 'number' ? value : Number(value))}
                placeholder="0-34"
                min={0}
                max={34}
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
            <p className="form-hint" style={{ marginTop: 4 }}>{ALLOWED_IMAGE_HINT}</p>
            <label htmlFor="prize-image" className="image-upload-button">
              {imagePreview ? 'Изменить изображение' : 'Выбрать изображение'}
              <input
                id="prize-image"
                type="file"
                accept={ACCEPT_IMAGE}
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="prize-background-image" className="form-label">
            Фон приза (картинка)
          </label>
          <p className="form-hint">Отображается за модальным окном выигрыша у игрока. Необязательно. {ALLOWED_IMAGE_HINT}. {BACKGROUND_IMAGE_SIZE_HINT}.</p>
          <div className="image-upload-container">
            {(backgroundImagePreview || (prize?.backgroundImage && !removeBackgroundImage)) && (
              <div className="image-preview">
                <img src={backgroundImagePreview || resolveImageUrl(prize?.backgroundImage) || ''} alt="Фон" />
                <button
                  type="button"
                  onClick={() => {
                    setBackgroundImage(null);
                    setBackgroundImagePreview(null);
                    if (prize?.backgroundImage) setRemoveBackgroundImage(true);
                  }}
                  className="remove-image-button"
                >
                  ×
                </button>
              </div>
            )}
            {prize && (prize.backgroundImage || backgroundImagePreview) && !removeBackgroundImage && (
              <label className="form-checkbox-label" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={removeBackgroundImage}
                  onChange={(e) => {
                    setRemoveBackgroundImage(e.target.checked);
                    if (e.target.checked) {
                      setBackgroundImage(null);
                      setBackgroundImagePreview(null);
                    } else {
                      setBackgroundImagePreview(resolveImageUrl(prize?.backgroundImage) || null);
                    }
                  }}
                />
                <span>Удалить фон с сервера</span>
              </label>
            )}
            <label htmlFor="prize-background-image" className="image-upload-button">
              {(backgroundImagePreview || (prize?.backgroundImage && !removeBackgroundImage)) ? 'Изменить фон' : 'Выбрать фон'}
              <input
                id="prize-background-image"
                type="file"
                accept={ACCEPT_IMAGE}
                onChange={handleBackgroundImageChange}
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
