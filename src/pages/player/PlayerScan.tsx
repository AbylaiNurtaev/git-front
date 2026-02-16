import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZxing } from 'react-zxing';
import { useStore } from '@/store/useStore';
import type { Player } from '@/types';
import './PlayerPages.css';
import './PlayerScan.css';

/** Извлекает club id из отсканированного текста (URL или просто код) */
function extractClubIdFromScanned(text: string): string {
  const t = text.trim();
  const match = t.match(/[?&]club=([^&\s#]+)/);
  if (match?.[1]) return decodeURIComponent(match[1]);
  try {
    const url = new URL(t.startsWith('http') ? t : `https://_/${t.replace(/^\/+/, '')}`);
    const club = url.searchParams.get('club');
    if (club) return club;
  } catch {
    /* не URL — считаем, что это код/токен */
  }
  return t;
}

export default function PlayerScan() {
  const navigate = useNavigate();
  const { currentUser, getClub } = useStore();
  const player = currentUser as Player | null;
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const handlingRef = useRef(false);

  const handleClubId = useCallback(
    async (clubIdOrToken: string) => {
      const trimmed = clubIdOrToken.trim();
      if (!trimmed || handlingRef.current) return;
      handlingRef.current = true;
      setError(null);
      try {
        const club = await getClub(trimmed);
        if (club) {
          const param = club.pinCode ?? club.token ?? club.clubId ?? trimmed;
          navigate(`/spin?club=${encodeURIComponent(param)}`, { replace: true });
        } else {
          setError('Клуб не найден');
          handlingRef.current = false;
        }
      } catch {
        setError('Ошибка. Попробуйте снова.');
        handlingRef.current = false;
      }
    },
    [getClub, navigate]
  );

  const handleScanned = useCallback(
    (decodedText: string) => {
      const clubId = extractClubIdFromScanned(decodedText);
      if (clubId) handleClubId(clubId);
    },
    [handleClubId]
  );

  const { ref: videoRef } = useZxing({
    onDecodeResult(result) {
      const text = result.getText();
      if (text) handleScanned(text);
    },
    onError() {
      setError('Не удалось открыть камеру');
    },
    constraints: {
      video: { facingMode: 'environment' },
    },
    timeBetweenDecodingAttempts: 300,
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) handleClubId(manualCode.trim());
  };

  if (!player || player.role !== 'player') {
    return null;
  }

  return (
    <div className="player-scan">
      <h1 className="player-scan-title">Добавить клуб</h1>
      <p className="player-scan-subtitle">Наведите камеру на QR-код или введите код клуба (6 цифр)</p>

      {/* Камера — react-zxing (ZXing) */}
      <div className="player-scan-camera-wrap">
        <video ref={videoRef as React.RefObject<HTMLVideoElement>} className="player-scan-video" muted playsInline />
        <div className="player-scan-viewfinder" aria-hidden="true">
          <div className="player-scan-corners">
            <span className="player-scan-corner player-scan-corner-tl" />
            <span className="player-scan-corner player-scan-corner-tr" />
            <span className="player-scan-corner player-scan-corner-bl" />
            <span className="player-scan-corner player-scan-corner-br" />
          </div>
        </div>
      </div>

      {/* Ручной ввод кода */}
      <div className="player-scan-manual">
        <p className="player-scan-manual-label">Или введите код клуба (6 цифр)</p>
        <form onSubmit={handleManualSubmit} className="player-scan-manual-form">
          <input
            type="text"
            inputMode="numeric"
            maxLength={20}
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Например: 482917"
            className="player-scan-manual-input"
          />
          <button type="submit" className="player-scan-manual-btn">
            Продолжить
          </button>
        </form>
      </div>

      {error && (
        <div className="player-scan-error-wrap">
          <p className="player-scan-error">{error}</p>
        </div>
      )}
    </div>
  );
}
