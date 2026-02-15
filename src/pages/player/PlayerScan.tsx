import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import type { Player } from '@/types';
import './PlayerPages.css';
import './PlayerScan.css';

const VIEWFINDER_SIZE = 260;

/** Извлекает club id из отсканированного текста (URL или просто id) */
function extractClubIdFromScanned(text: string): string {
  const t = text.trim();
  // Если есть подстрока ?club= или &club= — достаём значение
  const match = t.match(/[?&]club=([^&\s#]+)/);
  if (match?.[1]) return decodeURIComponent(match[1]);
  try {
    const url = new URL(t.startsWith('http') ? t : `https://_/${t.replace(/^\/+/, '')}`);
    const club = url.searchParams.get('club');
    if (club) return club;
  } catch {
    /* не URL — считаем, что это сам токен/ид */
  }
  return t;
}

export default function PlayerScan() {
  const navigate = useNavigate();
  const { currentUser, getClubByQR } = useStore();
  const player = currentUser as Player | null;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scannerInstanceRef = useRef<any>(null);
  const handlingRef = useRef(false);

  const handleScanned = useCallback(async (decodedText: string) => {
    if (handlingRef.current) return;
    const clubIdOrToken = extractClubIdFromScanned(decodedText);
    if (!clubIdOrToken) return;
    handlingRef.current = true;
    setError(null);
    try {
      const club = await getClubByQR(clubIdOrToken);
      if (club) {
        navigate(`/spin?club=${club.token || club.clubId}`, { replace: true });
      } else {
        setError('Клуб не найден');
        handlingRef.current = false;
      }
    } catch {
      setError('Ошибка. Попробуйте снова.');
      handlingRef.current = false;
    }
  }, [getClubByQR, navigate]);

  useEffect(() => {
    if (!player || player.role !== 'player') return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const html5Qr = new Html5Qrcode('player-qr-reader');
      scannerInstanceRef.current = html5Qr;
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
          if (!cancelled) setLoading(false);
        })
        .catch(() => {
          if (!cancelled) {
            setError('Не удалось открыть камеру');
            setLoading(false);
          }
        });
    }).catch(() => {
      if (!cancelled) setError('Сканер недоступен');
      setLoading(false);
    });
    return () => {
      cancelled = true;
      const instance = scannerInstanceRef.current;
      if (instance && typeof instance.stop === 'function') {
        instance.stop().catch(() => {}).finally(() => {
          scannerInstanceRef.current = null;
        });
      } else {
        scannerInstanceRef.current = null;
      }
    };
  }, [player?.role, handleScanned]);

  if (!player || player.role !== 'player') {
    return null;
  }

  return (
    <div className="player-scan">
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
        {loading && !error && (
          <div className="player-scan-loading">
            <span>Открываем камеру…</span>
          </div>
        )}
      </div>
      {error && (
        <div className="player-scan-error-wrap">
          <p className="player-scan-error">{error}</p>
        </div>
      )}
    </div>
  );
}
