import type { ClubTheme } from '@/types';

/** Палитра по умолчанию (фиолетовая, как в текущем дизайне) */
export const DEFAULT_CLUB_THEME: ClubTheme = {
  primary: '#8B5CF6',
  primaryDark: '#7C3AED',
  accent: '#A78BFA',
};

/** Преобразует hex в "r, g, b" для использования в rgba(var(--theme-primary-rgb), 0.5) */
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '139, 92, 246';
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ].join(', ');
}

/** Тёмный оттенок для фона (основа + основной цвет, ~12% яркости) */
export function hexToBg(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '#0f0e14';
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
