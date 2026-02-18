import type { QRPageTheme } from '@/types';

/** Ключи темы QR, отображаемые в палитре настроек (без loadingText, retryBtnBg, retryBtnText) */
export type QRPageThemePaletteKey = Exclude<
  keyof QRPageTheme,
  'loadingText' | 'retryBtnBg' | 'retryBtnText'
>;

export const QR_PAGE_THEME_LABELS: Record<QRPageThemePaletteKey, string> = {
  pageBg: 'Фон страницы',
  spinContainerBg: 'Фон контейнера рулетки',
  spinnerLabel: 'Текст «Сейчас крутит»',
  spinnerValue: 'Имя крутящего',
  pointer: 'Стрелка рулетки',
  trackBg: 'Фон дорожки рулетки',
  cardBg: 'Фон карточки приза',
  cardBorder: 'Граница карточки приза',
  cardText: 'Текст названия приза',
  cardPlaceholderBg: 'Фон заглушки приза (без фото)',
  selectedCardBorder: 'Граница выбранной карточки',
  winsChatBg: 'Фон ленты выигрышей',
  winsChatText: 'Текст ленты выигрышей',
  fullscreenBtnBg: 'Фон кнопки «Полный экран»',
  fullscreenBtnText: 'Текст кнопки «Полный экран»',
  fullscreenBtnBorder: 'Граница кнопки «Полный экран»',
  resultOverlayBg: 'Фон оверлея результата',
  resultContentBg: 'Фон блока результата',
  resultTitle: 'Заголовок «Выигрыш!»',
  resultPrizeText: 'Текст приза в результате',
};
