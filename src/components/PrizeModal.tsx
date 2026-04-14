import { useState, useEffect } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import type { Prize, SmartshellGood } from '@/types';
import { getApiBaseUrl } from '@/config/api';
import { prizeModalTypeOptions, prizeTypeFromPrize } from '@/constants/prizeTypes';
import { apiService } from '@/services/api';

/** Верхняя граница «количества в рулетке»: для товара — остаток SmartShell, иначе — фонд (total). */
function getRouletteQuantityMax(prize: Prize, goodAmountOverride?: number): number | undefined {
  const formType = prizeTypeFromPrize(prize.type);
  const isProduct = formType === 'product' || prize.type === 'physical';
  if (isProduct && typeof goodAmountOverride === 'number' && Number.isFinite(goodAmountOverride)) {
    return goodAmountOverride;
  }
  if (isProduct && typeof prize.smartshellGood?.amount === 'number' && Number.isFinite(prize.smartshellGood.amount)) {
    return prize.smartshellGood.amount;
  }
  if (typeof prize.totalQuantity === 'number') return prize.totalQuantity;
  return undefined;
}

type SmartshellGoodResponse = {
  data?: {
    good?: SmartshellGood | null;
  };
};
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
    /** При обновлении: пустая строка сбрасывает productEntityId на бэкенде */
    productEntityId?: string;
    dropChance: number;
    slotIndex: number;
    totalQuantity: number;
    remainingQuantity?: number;
    image?: File | null;
    backgroundImage?: File | null;
    removeBackgroundImage?: boolean;
  }) => Promise<void>;
  prize?: Prize | null;
  /** Занятые индексы слотов другими призами (при создании — не допускаются) */
  existingSlotIndices?: number[];
  /** Режим страницы «Рулетка»: при редактировании — одно поле «количество в рулетке», без «общего количества». */
  quantityMode?: 'default' | 'roulette';
}

function getNextAvailableSlotIndex(existingSlotIndices: number[]): number {
  const occupied = new Set(existingSlotIndices.filter((idx) => Number.isInteger(idx) && idx >= 0 && idx <= 34));
  for (let idx = 0; idx <= 34; idx += 1) {
    if (!occupied.has(idx)) return idx;
  }
  return -1;
}

export default function PrizeModal({
  isOpen,
  onClose,
  onSave,
  prize,
  existingSlotIndices = [],
  quantityMode = 'default',
}: PrizeModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('balance');
  const [value, setValue] = useState<number>(0);
  const [productEntityId, setProductEntityId] = useState('');
  /** Строковое значение для ввода — чтобы можно было набирать "0", "0.", "1." и т.д. */
  const [dropChanceInput, setDropChanceInput] = useState<string>('0');
  const [slotIndex, setSlotIndex] = useState<number>(0);
  const [totalQuantity, setTotalQuantity] = useState<number>(100);
  const [remainingQuantity, setRemainingQuantity] = useState<number>(100);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(null);
  const [removeBackgroundImage, setRemoveBackgroundImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [smartshellGoodPreview, setSmartshellGoodPreview] = useState<SmartshellGood | null>(null);
  const [isSmartshellLoading, setIsSmartshellLoading] = useState(false);
  const [smartshellError, setSmartshellError] = useState<string | null>(null);

  useEffect(() => {
    if (type === 'product') setValue(1);
  }, [type]);

  useEffect(() => {
    setValidationErrors([]);
    setSmartshellError(null);
    if (prize) {
      setName(prize.name || '');
      const nextType = prizeTypeFromPrize(prize.type);
      setType(nextType);
      setValue(
        prize.value !== undefined && prize.value !== null
          ? Number(prize.value)
          : nextType === 'product'
            ? 1
            : 0
      );
      setProductEntityId(
        prize.productEntityId != null && String(prize.productEntityId).trim() !== ''
          ? String(prize.productEntityId).trim()
          : ''
      );
      const pct = (prize.probability || 0) * 100;
      setDropChanceInput(pct === 0 ? '0' : String(pct));
      setSlotIndex(prize.slotIndex ?? 0);
      const total = prize.totalQuantity ?? 100;
      const remRaw = prize.remainingQuantity ?? prize.totalQuantity ?? 100;
      setTotalQuantity(total);
      if (quantityMode === 'roulette') {
        const maxQ = getRouletteQuantityMax(prize);
        setRemainingQuantity(maxQ !== undefined ? Math.min(remRaw, maxQ) : remRaw);
      } else {
        setRemainingQuantity(remRaw);
      }
      setImage(null);
      setImagePreview(prize.image || null);
      setBackgroundImage(null);
      setBackgroundImagePreview(resolveImageUrl(prize.backgroundImage) || null);
      setRemoveBackgroundImage(false);
      setSmartshellGoodPreview(prize.smartshellGood ?? null);
    } else {
      setName('');
      setType('balance');
      setValue(0);
      setProductEntityId('');
      setDropChanceInput('0');
      setSlotIndex(getNextAvailableSlotIndex(existingSlotIndices));
      setTotalQuantity(100);
      setRemainingQuantity(100);
      setImage(null);
      setImagePreview(null);
      setBackgroundImage(null);
      setBackgroundImagePreview(null);
      setRemoveBackgroundImage(false);
      setSmartshellGoodPreview(null);
    }
  }, [prize, isOpen, quantityMode, existingSlotIndices]);

  useEffect(() => {
    if (type !== 'product') {
      setIsSmartshellLoading(false);
      setSmartshellError(null);
      return;
    }
    const id = productEntityId.trim();
    if (!id) {
      setIsSmartshellLoading(false);
      setSmartshellError(null);
      setSmartshellGoodPreview(prize?.smartshellGood ?? null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSmartshellLoading(true);
        setSmartshellError(null);
        const res = (await apiService.getSmartshellGoodById(id)) as SmartshellGoodResponse;
        const good = res?.data?.good;
        if (!good || typeof good !== 'object') {
          setSmartshellGoodPreview(null);
          setSmartshellError('Товар в SmartShell не найден.');
          return;
        }
        setSmartshellGoodPreview(good);
        if (quantityMode === 'roulette' && typeof good.amount === 'number' && Number.isFinite(good.amount)) {
          const safeAmount = Math.max(0, Math.floor(good.amount));
          if (prize) {
            setRemainingQuantity(safeAmount);
          } else {
            setTotalQuantity(safeAmount);
          }
        }
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          'Не удалось получить данные товара из SmartShell.';
        setSmartshellGoodPreview(null);
        setSmartshellError(message);
      } finally {
        setIsSmartshellLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [type, productEntityId, prize?.smartshellGood]);

  const currentSmartshellAmount =
    typeof smartshellGoodPreview?.amount === 'number' ? smartshellGoodPreview.amount : undefined;

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

  const handleDropChanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
    if (/\./.test(v)) {
      const parts = v.split('.');
      if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
    }
    setDropChanceInput(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    const dropChanceNum = parseFloat(dropChanceInput);

    if (!name?.trim()) errors.push('Введите название приза.');
    if (Number.isNaN(dropChanceNum) || dropChanceNum <= 0) errors.push('Вероятность выпадения должна быть больше 0% (можно 0.01, 0.1 и т.д.).');
    if (dropChanceNum > 100) errors.push('Вероятность не должна превышать 100%.');

    if (type === 'balance' || type === 'points' || type === 'club_time' || type === 'time') {
      if (!Number.isFinite(value) || value < 0) {
        const msg =
          type === 'balance'
            ? 'Сумма баланса не может быть отрицательной.'
            : type === 'points'
              ? 'Количество баллов не может быть отрицательным.'
              : 'Значение не может быть отрицательным.';
        errors.push(msg);
      }
    }
    if (type === 'product') {
      if (!productEntityId.trim()) {
        errors.push('Для типа «Товар» укажите ID товара в SmartShell (productEntityId).');
      } else if (smartshellError) {
        errors.push('Указанный ID не удалось подтвердить в SmartShell. Проверьте ID товара.');
      }
    }

    if (!prize) {
      if (!image && !imagePreview) {
        errors.push('Загрузите изображение приза — без фото создание невозможно.');
      }
      if (slotIndex < 0) {
        errors.push('Нет свободных слотов для нового приза (доступно максимум 35 слотов).');
      }
      if (quantityMode === 'roulette') {
        if (!Number.isFinite(totalQuantity) || totalQuantity < 1) {
          errors.push('Количество в рулетке должно быть не меньше 1.');
        }
        if (type === 'product' && typeof currentSmartshellAmount === 'number' && totalQuantity > currentSmartshellAmount) {
          errors.push(`Не больше остатка на складе SmartShell (${currentSmartshellAmount} шт.).`);
        }
      }
    }
    if (prize && quantityMode === 'roulette') {
      const maxQ = getRouletteQuantityMax(prize, currentSmartshellAmount);
      if (remainingQuantity < 0) {
        errors.push('Количество в рулетке не может быть меньше 0.');
      }
      if (maxQ !== undefined && remainingQuantity > maxQ) {
        const formType = prizeTypeFromPrize(prize.type);
        const isProduct = formType === 'product' || prize.type === 'physical';
        errors.push(
          isProduct && currentSmartshellAmount != null
            ? `Не больше остатка на складе SmartShell (${maxQ} шт.).`
            : `Количество в рулетке не может быть больше ${maxQ}.`
        );
      }
    } else if (prize) {
      if (remainingQuantity < 0) {
        errors.push('Остаток не может быть меньше 0.');
      }
      if (remainingQuantity > totalQuantity) {
        errors.push('Остаток не может быть больше общего количества.');
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);

    setIsLoading(true);
    try {
      const dropChanceToSave = parseFloat(dropChanceInput);

      let valueOut: number | undefined;
      if (type === 'balance' || type === 'points' || type === 'club_time' || type === 'time') {
        valueOut = value;
      } else if (type === 'product') {
        valueOut = 1;
      } else {
        valueOut = undefined;
      }

      let productEntityIdOut: string | undefined;
      if (type === 'product') {
        productEntityIdOut = productEntityId.trim();
      } else if (prize) {
        productEntityIdOut = '';
      }

      const totalOut =
        quantityMode === 'roulette' && prize
          ? prize.totalQuantity ?? remainingQuantity
          : totalQuantity;

      await onSave({
        name: name.trim(),
        type,
        value: valueOut,
        productEntityId: productEntityIdOut,
        dropChance: Number.isFinite(dropChanceToSave) ? dropChanceToSave : 0,
        slotIndex,
        totalQuantity: totalOut,
        remainingQuantity: prize ? remainingQuantity : undefined,
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
      size="large"
      className="prize-modal-shell"
      bodyClassName="prize-modal-body"
    >
      <form onSubmit={handleSubmit} className="prize-modal-form">
        <aside className="prize-modal-sidebar">
          <section className="prize-media-card">
            <p className="prize-media-label">Изображение приза {!prize && <span className="required">*</span>}</p>
            <input id="prize-image" type="file" accept={ACCEPT_IMAGE} onChange={handleImageChange} style={{ display: 'none' }} />
            <div className="prize-media-preview">
              {imagePreview ? <img src={imagePreview} alt="Preview" /> : <div className="prize-media-placeholder">Нет изображения</div>}
              <label htmlFor="prize-image" className="prize-media-edit" title="Изменить изображение" aria-label="Изменить изображение">
                ✎
              </label>
            </div>
            {!prize && <p className="form-hint">Без фото приз создать нельзя.</p>}
          </section>

          <section className="prize-media-card">
            <p className="prize-media-label">Фон выигрыша</p>
            <input id="prize-background-image" type="file" accept={ACCEPT_IMAGE} onChange={handleBackgroundImageChange} style={{ display: 'none' }} />
            <div className="prize-media-preview">
              {(backgroundImagePreview || (prize?.backgroundImage && !removeBackgroundImage))
                ? <img src={backgroundImagePreview || resolveImageUrl(prize?.backgroundImage) || ''} alt="Фон" />
                : <div className="prize-media-placeholder">Нет фона</div>}
              <label htmlFor="prize-background-image" className="prize-media-edit" title="Изменить фон" aria-label="Изменить фон">
                ✎
              </label>
            </div>
            {prize && (prize.backgroundImage || backgroundImagePreview) && !removeBackgroundImage && (
              <label className="form-checkbox-label prize-remove-bg-toggle">
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
          </section>

          {type === 'product' && (
            <section className="prize-smart-card">
              <p className="prize-media-label">SmartShell</p>
              {isSmartshellLoading && <p className="form-hint">Проверяем товар...</p>}
              {!isSmartshellLoading && smartshellError && <p className="form-hint prize-hint-error">{smartshellError}</p>}
              {!isSmartshellLoading && !smartshellError && smartshellGoodPreview && (
                <>
                  <p className="prize-smart-title">{smartshellGoodPreview.title || `ID ${smartshellGoodPreview.id ?? productEntityId}`}</p>
                  <p className="prize-smart-amount">Остаток: {smartshellGoodPreview.amount ?? '—'} шт.</p>
                </>
              )}
            </section>
          )}
        </aside>

        <section className="prize-modal-main">
          <div className="prize-main-grid">
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
              onChange={(v) => setType(String(v))}
              required
              options={prizeModalTypeOptions(prize ?? null)}
            />

            {type === 'product' && (
              <div className="prize-main-full">
                <FormField
                  label="ID товара в SmartShell"
                  name="productEntityId"
                  type="text"
                  value={productEntityId}
                  onChange={(v) => setProductEntityId(String(v))}
                  placeholder="Обязательно для выдачи товара при выигрыше"
                  required
                />
                <p className="form-hint">Для типа «Товар» количество штук фиксировано: 1.</p>
              </div>
            )}

            {(type === 'balance' || type === 'points' || type === 'club_time' || type === 'time') && (
              <FormField
                label={
                  type === 'balance'
                    ? 'Сумма (депозит в SmartShell)'
                    : type === 'points'
                      ? 'Количество баллов (бонусы)'
                      : type === 'club_time'
                        ? 'Тенге (время в Infinity)'
                        : 'Значение (устаревший тип)'
                }
                name="value"
                type="number"
                value={value}
                onChange={(v) => setValue(typeof v === 'number' ? v : Number(v))}
                placeholder="0"
                min={0}
                required
              />
            )}

            <div className="form-field">
              <label htmlFor="dropChance" className="form-label">
                Вероятность выпадения (%)<span className="required">*</span>
              </label>
              <input
                id="dropChance"
                name="dropChance"
                type="text"
                inputMode="decimal"
                className="form-input"
                value={dropChanceInput}
                onChange={handleDropChanceChange}
                placeholder="0.01–100"
                required
              />
            </div>

            {!prize && (
              <>
                {quantityMode === 'roulette' ? (
                  <div className="form-field">
                    <FormField
                      label="Количество в рулетке"
                      name="totalQuantity"
                      type="number"
                      value={totalQuantity}
                      onChange={(value) => setTotalQuantity(typeof value === 'number' ? value : Number(value))}
                      placeholder="1"
                      min={1}
                      max={type === 'product' && typeof currentSmartshellAmount === 'number' ? currentSmartshellAmount : undefined}
                      required
                    />
                  </div>
                ) : (
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
                )}
              </>
            )}

            {prize && quantityMode === 'roulette' && (
              <FormField
                label="Количество в рулетке"
                name="remainingQuantity"
                type="number"
                value={remainingQuantity}
                onChange={(value) => setRemainingQuantity(typeof value === 'number' ? value : Number(value))}
                placeholder="0"
                min={0}
                max={getRouletteQuantityMax(prize, currentSmartshellAmount)}
                required
              />
            )}

            {prize && quantityMode !== 'roulette' && (
              <>
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
                <FormField
                  label="Осталось"
                  name="remainingQuantity"
                  type="number"
                  value={remainingQuantity}
                  onChange={(value) => setRemainingQuantity(typeof value === 'number' ? value : Number(value))}
                  placeholder="0"
                  min={0}
                  max={totalQuantity}
                  required
                />
              </>
            )}

            {type === 'other' && (
              <p className="form-hint prize-main-full">
                Только отображение в рулетке: без начислений, без SmartShell и без заявок на приз.
              </p>
            )}

            {validationErrors.length > 0 && (
              <div className="prize-modal-errors prize-main-full" role="alert">
                {validationErrors.map((msg, i) => (
                  <p key={i} className="prize-modal-error-item">⚠️ {msg}</p>
                ))}
              </div>
            )}
          </div>
        </section>
        <div className="modal-actions prize-modal-full">
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
