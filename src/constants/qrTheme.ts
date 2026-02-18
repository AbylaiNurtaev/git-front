import type { QRPageTheme } from '@/types';

const STORAGE_KEY = 'club-qr-page-theme';

/** Заводская тема страницы QR — только hex (фон #14141C, текст белый, акценты #EF3F54) */
export const DEFAULT_QR_PAGE_THEME: QRPageTheme = {
  pageBg: '#14141C',
  spinContainerBg: '#14141C',
  spinnerLabel: '#EF3F54',
  spinnerValue: '#ffffff',
  pointer: '#EF3F54',
  trackBg: '#151215',
  cardBg: '#161316',
  cardBorder: '#1e1719',
  cardText: '#ffffff',
  cardPlaceholderBg: '#161316',
  selectedCardBorder: '#EF3F54',
  winsChatBg: '#161316',
  winsChatText: '#ffffff',
  fullscreenBtnBg: '#2d1a1f',
  fullscreenBtnText: '#ffffff',
  fullscreenBtnBorder: '#4a2430',
  resultOverlayBg: '#0a0a0e',
  resultContentBg: '#1a1a24',
  resultTitle: '#EF3F54',
  resultPrizeText: '#ffffff',
  loadingText: '#ffffff',
  retryBtnBg: '#2d1a1f',
  retryBtnText: '#ffffff',
};

/** Читает тему из localStorage (только на клиенте) */
export function getStoredQRPageTheme(): QRPageTheme | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QRPageTheme>;
    return { ...DEFAULT_QR_PAGE_THEME, ...parsed };
  } catch {
    return null;
  }
}

/** Сохраняет тему в localStorage */
export function setStoredQRPageTheme(theme: QRPageTheme): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // ignore
  }
}

/** Преобразует тему в объект CSS-переменных для style */
export function qrThemeToCssVars(theme: QRPageTheme): Record<string, string> {
  return {
    '--qr-page-bg': theme.pageBg,
    '--qr-spin-container-bg': theme.spinContainerBg,
    '--qr-spinner-label': theme.spinnerLabel,
    '--qr-spinner-value': theme.spinnerValue,
    '--qr-pointer': theme.pointer,
    '--qr-track-bg': theme.trackBg,
    '--qr-card-bg': theme.cardBg,
    '--qr-card-border': theme.cardBorder,
    '--qr-card-text': theme.cardText,
    '--qr-card-placeholder-bg': theme.cardPlaceholderBg,
    '--qr-selected-card-border': theme.selectedCardBorder,
    '--qr-wins-chat-bg': theme.winsChatBg,
    '--qr-wins-chat-text': theme.winsChatText,
    '--qr-fullscreen-btn-bg': theme.fullscreenBtnBg,
    '--qr-fullscreen-btn-text': theme.fullscreenBtnText,
    '--qr-fullscreen-btn-border': theme.fullscreenBtnBorder,
    '--qr-result-overlay-bg': theme.resultOverlayBg,
    '--qr-result-content-bg': theme.resultContentBg,
    '--qr-result-title': theme.resultTitle,
    '--qr-result-prize-text': theme.resultPrizeText,
    '--qr-loading-text': theme.loadingText,
    '--qr-retry-btn-bg': theme.retryBtnBg,
    '--qr-retry-btn-text': theme.retryBtnText,
  };
}
