import type { ClubTheme } from '@/types';

/** Заводская палитра: фон #14141C, текст белый, кнопки/акценты #EF3F54 */
export const DEFAULT_CLUB_THEME: ClubTheme = {
  primary: '#EF3F54',
  primaryDark: '#14141C',
  accent: '#ffffff',
};

/** Преобразует hex в "r, g, b" для использования в rgba(var(--theme-primary-rgb), 0.5) */
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '239, 63, 84';
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ].join(', ');
}

/** Тёмный оттенок для фона (основа + основной цвет, ~12% яркости) */
export function hexToBg(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '#14141C';
  const r = Math.round(parseInt(result[1], 16) * 0.12 + 8);
  const g = Math.round(parseInt(result[2], 16) * 0.12 + 8);
  const b = Math.round(parseInt(result[3], 16) * 0.18 + 12);
  return `rgb(${r},${g},${b})`;
}

/** Возвращает тему клуба или дефолтную */
export function getClubTheme(theme?: ClubTheme | null): ClubTheme {
  if (theme?.primary && theme?.primaryDark) return theme;
  return DEFAULT_CLUB_THEME;
}
