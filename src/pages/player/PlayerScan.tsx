import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import type { Player } from '@/types';
import './PlayerPages.css';
import './PlayerScan.css';

const VIEWFINDER_SIZE = 260;

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
  const [cameraLoading, setCameraLoading] = useState(true);
  const handlingRef = useRef(false);
  const scannerRef = useRef<any>(null);

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

  useEffect(() => {
    if (!player || player.role !== 'player') return;
    let cancelled = false;
    setCameraLoading(true);
    setError(null);
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const html5Qr = new Html5Qrcode('player-qr-reader');
      scannerRef.current = html5Qr;
      html5Qr
        .start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: VIEWFINDER_SIZE, height: VIEWFINDER_SIZE },
            aspectRatio: 1,
          },
          (decodedText: string) => {
            if (!cancelled) handleScanned(decodedText);
          },
          () => {}
        )
        .then(() => {
          if (!cancelled) setCameraLoading(false);
        })
        .catch(() => {
          if (!cancelled) {
            setError('Не удалось открыть камеру');
            setCameraLoading(false);
          }
        });
    }).catch(() => {
      if (!cancelled) {
        setError('Сканер недоступен');
        setCameraLoading(false);
      }
    });
    return () => {
      cancelled = true;
      const instance = scannerRef.current;
      if (instance && typeof instance.stop === 'function') {
        instance.stop().catch(() => {}).finally(() => {
          scannerRef.current = null;
        });
      } else {
        scannerRef.current = null;
      }
    };
  }, [player?.role, handleScanned]);

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

      {/* Камера — html5-qrcode */}
      <div className="player-scan-camera-wrap">
        <div id="player-qr-reader" className="player-scan-camera" />
        {!error && (
          <div className="player-scan-viewfinder" aria-hidden="true">
            <div className="player-scan-corners">
              <span className="player-scan-corner player-scan-corner-tl" />
              <span className="player-scan-corner player-scan-corner-tr" />
              <span className="player-scan-corner player-scan-corner-bl" />
              <span className="player-scan-corner player-scan-corner-br" />
            </div>
          </div>
        )}
        {cameraLoading && !error && (
          <div className="player-scan-loading">
            <span>Открываем камеру…</span>
          </div>
        )}
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
