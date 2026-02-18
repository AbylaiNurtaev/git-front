import { useState, useEffect, useCallback } from 'react';
import type { QRPageTheme } from '@/types';
import {
  DEFAULT_QR_PAGE_THEME,
  getStoredQRPageTheme,
  setStoredQRPageTheme,
} from '@/constants/qrTheme';

export function useQRPageTheme(): {
  theme: QRPageTheme;
  setTheme: (theme: QRPageTheme) => void;
  updateColor: <K extends keyof QRPageTheme>(key: K, value: QRPageTheme[K]) => void;
  resetToDefault: () => void;
} {
  const [theme, setThemeState] = useState<QRPageTheme>(() => {
    const stored = getStoredQRPageTheme();
    return stored ?? DEFAULT_QR_PAGE_THEME;
  });

  useEffect(() => {
    const stored = getStoredQRPageTheme();
    if (stored) setThemeState(stored);
  }, []);

  const setTheme = useCallback((next: QRPageTheme) => {
    setThemeState(next);
    setStoredQRPageTheme(next);
  }, []);

  const updateColor = useCallback(<K extends keyof QRPageTheme>(key: K, value: QRPageTheme[K]) => {
    setThemeState((prev) => {
      const next = { ...prev, [key]: value };
      setStoredQRPageTheme(next);
      return next;
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setThemeState(DEFAULT_QR_PAGE_THEME);
    setStoredQRPageTheme(DEFAULT_QR_PAGE_THEME);
  }, []);

  return { theme, setTheme, updateColor, resetToDefault };
}
