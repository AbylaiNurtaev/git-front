import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import type { Club, ClubTheme } from '@/types';
import { DEFAULT_CLUB_THEME } from '@/constants/theme';
import './ClubSettings.css';

export default function ClubSettings() {
  const { currentUser, updateClubMe, setError } = useStore();
  const club = currentUser as Club | null;
  const [primary, setPrimary] = useState(DEFAULT_CLUB_THEME.primary);
  const [primaryDark, setPrimaryDark] = useState(DEFAULT_CLUB_THEME.primaryDark);
  const [accent, setAccent] = useState(DEFAULT_CLUB_THEME.accent ?? DEFAULT_CLUB_THEME.primary);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (club?.theme) {
      setPrimary(club.theme.primary);
      setPrimaryDark(club.theme.primaryDark);
      setAccent(club.theme.accent ?? club.theme.primary);
    } else {
      setPrimary(DEFAULT_CLUB_THEME.primary);
      setPrimaryDark(DEFAULT_CLUB_THEME.primaryDark);
      setAccent(DEFAULT_CLUB_THEME.accent ?? DEFAULT_CLUB_THEME.primary);
    }
  }, [club?.theme?.primary, club?.theme?.primaryDark, club?.theme?.accent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!club) return;
    const theme: ClubTheme = { primary, primaryDark, accent: accent || undefined };
    setSaving(true);
    setError(null);
    try {
      const ok = await updateClubMe({ theme });
      if (ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!club) return null;

  return (
    <div className="club-settings-page">
      <h2 className="club-settings-title">Цветовая палитра клуба</h2>
      <p className="club-settings-desc">
        Эти цвета будут использоваться в интерфейсе для гостей при входе по вашему QR-коду и в вашем кабинете.
      </p>
      <form onSubmit={handleSubmit} className="club-settings-form">
        <div className="theme-fields">
          <label className="theme-field">
            <span>Основной цвет</span>
            <div className="theme-input-wrap">
              <input
                type="color"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="theme-color-input"
              />
              <input
                type="text"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="theme-text-input"
                placeholder="#8B5CF6"
              />
            </div>
          </label>
          <label className="theme-field">
            <span>Тёмный оттенок (градиенты)</span>
            <div className="theme-input-wrap">
              <input
                type="color"
                value={primaryDark}
                onChange={(e) => setPrimaryDark(e.target.value)}
                className="theme-color-input"
              />
              <input
                type="text"
                value={primaryDark}
                onChange={(e) => setPrimaryDark(e.target.value)}
                className="theme-text-input"
                placeholder="#7C3AED"
              />
            </div>
          </label>
          <label className="theme-field">
            <span>Цвет текста</span>
            <div className="theme-input-wrap">
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="theme-color-input"
              />
              <input
                type="text"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="theme-text-input"
                placeholder="#A78BFA"
              />
            </div>
          </label>
        </div>
        <div className="club-settings-actions">
          <button type="submit" className="club-settings-save" disabled={saving}>
            {saving ? 'Сохранение...' : saved ? 'Сохранено' : 'Сохранить палитру'}
          </button>
        </div>
      </form>
    </div>
  );
}
