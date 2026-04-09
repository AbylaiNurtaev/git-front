/** Типы приза (модель Prize на бэкенде) */
export const PRIZE_TYPES = ['balance', 'points', 'product', 'other'] as const;
export type PrizeTypeId = (typeof PRIZE_TYPES)[number];

/** Подписи в админке */
export const PRIZE_TYPE_LABELS: Record<PrizeTypeId, string> = {
  balance: 'Баланс',
  points: 'Баллы',
  product: 'Товар',
  other: 'Другое',
};

export const PRIZE_TYPE_OPTIONS = PRIZE_TYPES.map((value) => ({
  value,
  label: PRIZE_TYPE_LABELS[value],
}));

/** Устаревшие типы — остаются в форме при редактировании старых записей */
export const LEGACY_PRIZE_TYPES = ['club_time', 'time', 'none'] as const;
export type LegacyPrizeType = (typeof LEGACY_PRIZE_TYPES)[number];

/** Значение поля «тип» в форме: 4 актуальных + устаревшие из БД; physical → product */
export function prizeTypeFromPrize(type: string | undefined): string {
  if (!type) return 'points';
  if (type === 'physical') return 'product';
  if (
    type === 'balance' ||
    type === 'points' ||
    type === 'product' ||
    type === 'other' ||
    type === 'club_time' ||
    type === 'time' ||
    type === 'none'
  ) {
    return type;
  }
  return 'other';
}

export function prizeTypeLabel(type: string | undefined): string {
  if (!type) return '—';
  if ((PRIZE_TYPES as readonly string[]).includes(type)) return PRIZE_TYPE_LABELS[type as PrizeTypeId];
  const legacy: Record<string, string> = {
    physical: 'Товар (устар.)',
    club_time: 'Время в Infinity (устар.)',
    time: 'Время (устар.)',
    none: '— (устар.)',
  };
  return legacy[type] ?? type;
}

/** Опции селекта: 4 типа + устаревший тип текущего приза (если редактирование) */
export function prizeModalTypeOptions(editingPrize: { type: string } | null | undefined): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [...PRIZE_TYPE_OPTIONS];
  if (
    editingPrize &&
    (LEGACY_PRIZE_TYPES as readonly string[]).includes(editingPrize.type as LegacyPrizeType)
  ) {
    opts.push({ value: editingPrize.type, label: prizeTypeLabel(editingPrize.type) });
  }
  return opts;
}
