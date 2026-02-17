import { useEffect } from 'react';
import type { Club } from '@/types';
import { getClubTheme, hexToRgb, hexToBg } from '@/constants/theme';

const VAR_PREFIX = '--theme-';
const VARS = [
  'primary',
  'primary-dark',
  'primary-rgb',
  'primary-dark-rgb',
  'accent',
  'accent-rgb',
  'bg',
] as const;

function clearThemeVars() {
  const root = document.documentElement;
  VARS.forEach((name) => root.style.removeProperty(VAR_PREFIX + name));
}

function applyTheme(theme: { primary: string; primaryDark: string; accent?: string }) {
  const root = document.documentElement;
  root.style.setProperty(VAR_PREFIX + 'primary', theme.primary);
  root.style.setProperty(VAR_PREFIX + 'primary-dark', theme.primaryDark);
  root.style.setProperty(VAR_PREFIX + 'primary-rgb', hexToRgb(theme.primary));
  root.style.setProperty(VAR_PREFIX + 'primary-dark-rgb', hexToRgb(theme.primaryDark));
  root.style.setProperty(VAR_PREFIX + 'bg', hexToBg(theme.primary));
  if (theme.accent) {
    root.style.setProperty(VAR_PREFIX + 'accent', theme.accent);
    root.style.setProperty(VAR_PREFIX + 'accent-rgb', hexToRgb(theme.accent));
  } else {
    root.style.setProperty(VAR_PREFIX + 'accent', theme.primary);
    root.style.setProperty(VAR_PREFIX + 'accent-rgb', hexToRgb(theme.primary));
  }
}

/**
 * Применяет цветовую палитру клуба к документу (CSS-переменные на :root).
 * Вызывать в layout’ах клуба и на SpinPage с resolvedClub.
 */
export function useClubTheme(club: Club | null | undefined) {
  useEffect(() => {
    const theme = club ? getClubTheme(club.theme) : null;
    if (theme) {
      applyTheme(theme);
      return () => clearThemeVars();
    }
    return undefined;
  }, [club?.id, club?.theme?.primary, club?.theme?.primaryDark, club?.theme?.accent]);
}
