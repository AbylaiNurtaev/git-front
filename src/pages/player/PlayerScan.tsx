import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import type { Player } from '@/types';
import './PlayerPages.css';
import './PlayerScan.css';

const VIEWFINDER_SIZE = 260;

export default function PlayerScan() {
  const navigate = useNavigate();
  const { currentUser, getClubByQR } = useStore();
  const player = currentUser as Player | null;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scannerInstanceRef = useRef<any>(null);

  const handleScanned = useCallback(async (qrToken: string) => {
    setError(null);
    try {
      const club = await getClubByQR(qrToken.trim());
      if (club) {
        navigate(`/spin?club=${club.token || club.clubId}`, { replace: true });
      } else {
        setError('Клуб не найден');
      }
    } catch {
      setError('Ошибка. Попробуйте снова.');
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
