import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import type { Club } from '@/types';
import { useQRPageTheme } from '@/hooks/useQRPageTheme';
import { qrThemeToCssVars } from '@/constants/qrTheme';
import { QR_PAGE_THEME_LABELS } from '@/constants/qrThemeLabels';
import { apiService } from '@/services/api';
import logoUrl from '@/assets/logo.png';
import './ClubSettings.css';

const QR_BACKGROUND_MAX_SIZE_MB = 10;
const QR_BACKGROUND_MAX_SIZE = QR_BACKGROUND_MAX_SIZE_MB * 1024 * 1024;
const QR_BACKGROUND_ACCEPT = 'image/png,image/gif,video/mp4,video/webm';

export default function ClubSettings() {
  const { currentUser, updateClubMe, setError, companyLogoUrl } = useStore();
  const club = currentUser as Club | null;
  const { theme: qrTheme, setTheme: setQRTheme, updateColor: updateQRColor, resetToDefault: resetQRToDefault } = useQRPageTheme();
  const [qrDirty, setQrDirty] = useState(false);
  const [qrSaving, setQrSaving] = useState(false);
  const [bgUrl, setBgUrl] = useState('');
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [bgDirty, setBgDirty] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const [bgSaving, setBgSaving] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);

  /** При загрузке клуба подставляем тему QR с бэкенда (если есть) */
  useEffect(() => {
    if (club?.qrPageTheme) {
      setQRTheme(club.qrPageTheme);
      setQrDirty(false);
    }
  }, [club?.id, club?.qrPageTheme, setQRTheme]);

  /** Синхронизируем фон с данными клуба (только когда не dirty) */
  useEffect(() => {
    if (!club) return;
    const url = club.qrPageBackground?.url ?? '';
    const opacity = club.qrPageBackground?.opacity ?? 0.5;
    if (!bgDirty) {
      setBgUrl(url);
      setBgOpacity(opacity);
    }
  }, [club?.id, club?.qrPageBackground?.url, club?.qrPageBackground?.opacity, bgDirty]);

  const handleBgFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !club) return;
    if (file.size > QR_BACKGROUND_MAX_SIZE) {
      setError(`Файл не более ${QR_BACKGROUND_MAX_SIZE_MB} МБ`);
      return;
    }
    setBgUploading(true);
    setError(null);
    try {
      const { url } = await apiService.uploadClubQRBackground(file);
      setBgUrl(url);
      setBgDirty(true);
      if (bgInputRef.current) bgInputRef.current.value = '';
    } finally {
      setBgUploading(false);
    }
  };

  const handleBgOpacityChange = (value: number) => {
    setBgOpacity(value);
    setBgDirty(true);
  };

  const handleSaveBg = async () => {
    if (!club) return;
    setBgSaving(true);
    setError(null);
    try {
      const ok = await updateClubMe({ qrPageBackground: { url: bgUrl, opacity: bgOpacity } });
      if (ok) setBgDirty(false);
    } finally {
      setBgSaving(false);
    }
  };

  const handleRemoveBg = () => {
    setBgUrl('');
    setBgOpacity(0.5);
    setBgDirty(true);
  };

  if (!club) return null;

  return (
    <div className="club-settings-page">
      <section className="club-settings-qr-section">
        <h2 className="club-settings-title">Оформление страницы QR</h2>
        <p className="club-settings-desc">
          Превью и цвета каждого элемента страницы рулетки (QR). Тема сохраняется на сервере и отображается на странице /club/qr.
        </p>

        <div
          className="club-settings-qr-preview-wrap"
          style={qrThemeToCssVars(qrTheme) as React.CSSProperties}
        >
          <div className="club-settings-qr-preview">
            <div className="club-settings-qr-preview-result">
              <span className="club-settings-qr-preview-result-caption">Результат выигрыша</span>
              <div className="club-settings-qr-preview-result-overlay">
                <div className="club-settings-qr-preview-result-content">
                  <h2 className="club-settings-qr-preview-result-title">Выигрыш!</h2>
                  <div className="club-settings-qr-preview-result-prize">Приз 3</div>
                </div>
              </div>
            </div>
            <div className="club-settings-qr-preview-page">
              <button type="button" className="club-settings-qr-preview-fullscreen">
                Полный экран
              </button>
              <div className="club-settings-qr-preview-topbar">
                <img src={companyLogoUrl || logoUrl} alt="" className="club-settings-qr-preview-logo" />
                <div className="club-settings-qr-preview-spinner">
                  <span className="club-settings-qr-preview-spinner-label">Сейчас крутит:</span>
                  <span className="club-settings-qr-preview-spinner-value">Иван</span>
                </div>
              </div>
              <div className="club-settings-qr-preview-track">
                <div className="club-settings-qr-preview-pointer" />
                <div className="club-settings-qr-preview-cards">
                  <div className="club-settings-qr-preview-card">
                    <div className="club-settings-qr-preview-card-placeholder">A</div>
                    <span className="club-settings-qr-preview-card-name">Приз 1</span>
                  </div>
                  <div className="club-settings-qr-preview-card">
                    <div className="club-settings-qr-preview-card-placeholder">B</div>
                    <span className="club-settings-qr-preview-card-name">Приз 2</span>
                  </div>
                  <div className="club-settings-qr-preview-card selected">
                    <div className="club-settings-qr-preview-card-placeholder">C</div>
                    <span className="club-settings-qr-preview-card-name">Приз 3</span>
                  </div>
                </div>
              </div>
              <div className="club-settings-qr-preview-wins">
                <div className="club-settings-qr-preview-wins-line">Иван выиграл Приз</div>
              </div>
            </div>
          </div>
        </div>

        <div className="club-settings-qr-palette-head">
          <h3 className="club-settings-qr-palette-title">Палитра — выберите цвет для каждого элемента</h3>
          <div className="club-settings-qr-palette-actions">
            {qrDirty && (
              <button
                type="button"
                className="club-settings-save club-settings-qr-save"
                onClick={async () => {
                  if (!club) return;
                  setQrSaving(true);
                  setError(null);
                  const ok = await updateClubMe({ qrPageTheme: qrTheme });
                  if (ok) {
                    setQrDirty(false);
                  }
                  setQrSaving(false);
                }}
                disabled={qrSaving}
              >
                {qrSaving ? 'Сохранение…' : 'Сохранить'}
              </button>
            )}
            <button type="button" className="club-settings-reset" onClick={() => { resetQRToDefault(); setQrDirty(true); }}>
              Сброс до заводских (QR)
            </button>
          </div>
        </div>
        <div className="club-settings-qr-fields">
          {(Object.keys(QR_PAGE_THEME_LABELS) as (keyof typeof QR_PAGE_THEME_LABELS)[]).map((key) => (
            <label key={key} className="theme-field club-settings-qr-field">
              <span>{QR_PAGE_THEME_LABELS[key]}</span>
              <div className="theme-input-wrap">
                <input
                  type="color"
                  value={typeof qrTheme[key] === 'string' && /^#[0-9A-Fa-f]{6}$/.test(qrTheme[key] as string) ? (qrTheme[key] as string) : '#ffffff'}
                  onChange={(e) => { updateQRColor(key, e.target.value); setQrDirty(true); }}
                  className="theme-color-input"
                />
                <input
                  type="text"
                  value={qrTheme[key] as string}
                  onChange={(e) => { updateQRColor(key, e.target.value); setQrDirty(true); }}
                  className="theme-text-input"
                  placeholder="#ffffff"
                />
              </div>
            </label>
          ))}
        </div>

        <div className="club-settings-qr-background-section">
          <h3 className="club-settings-qr-palette-title">Фон страницы QR</h3>
          <p className="club-settings-qr-background-requirements">
            Форматы: PNG, GIF, видео (MP4, WebM). Объём — не более {QR_BACKGROUND_MAX_SIZE_MB} МБ. Рекомендуемый размер — 1920×1080 px. Фон отображается внутри блока рулетки.
          </p>
          <div className="club-settings-qr-background-controls">
            <input
              ref={bgInputRef}
              type="file"
              accept={QR_BACKGROUND_ACCEPT}
              onChange={handleBgFileChange}
              disabled={bgUploading}
              className="club-settings-qr-background-input"
              aria-label="Выбрать файл фона"
            />
            <button
              type="button"
              className="club-settings-save"
              onClick={() => bgInputRef.current?.click()}
              disabled={bgUploading}
            >
              {bgUploading ? 'Загрузка…' : 'Выбрать файл'}
            </button>
            {bgUrl ? (
              <>
                <label className="club-settings-qr-background-opacity-label">
                  <span>Непрозрачность фона: {Math.round(bgOpacity * 100)}%</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={bgOpacity * 100}
                    onChange={(e) => handleBgOpacityChange(Number(e.target.value) / 100)}
                    className="club-settings-qr-background-opacity"
                  />
                </label>
                <button type="button" className="club-settings-reset" onClick={handleRemoveBg}>
                  Удалить фон
                </button>
              </>
            ) : null}
            {bgDirty && (
              <button type="button" className="club-settings-save" onClick={handleSaveBg} disabled={bgSaving}>
                {bgSaving ? 'Сохранение…' : 'Сохранить'}
              </button>
            )}
          </div>
          {bgUrl && (
            <div className="club-settings-qr-background-preview-wrap">
              {/\.(mp4|webm)$/i.test(bgUrl) ? (
                <video src={bgUrl} className="club-settings-qr-background-preview" muted loop playsInline autoPlay />
              ) : (
                <img src={bgUrl} alt="" className="club-settings-qr-background-preview" />
              )}
              <div className="club-settings-qr-background-preview-mask" style={{ opacity: 1 - bgOpacity }} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
