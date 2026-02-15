import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '@/store/useStore';
import { QRCodeSVG } from 'qrcode.react';
import { apiService } from '@/services/api';
import { getQrBaseUrl, SOCKET_URL } from '@/config/api';
import { transformPrize } from '@/utils/transformers';
import type { Club, Prize } from '@/types';
import './ClubPages.css';
import '../ClubRoulettePage.css';
import '../SpinPage.css';

const PRIZE_WIDTH = 284;
const IDLE_SPEED_PX = 15.5;
const MAX_WINS_CHAT = 10;

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 5) return '+7 *** *** **';
  const after7 = digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits;
  const visible = after7.slice(0, 4);
  const last = after7.slice(-1);
  return `+7 ${visible}** *** *${last}`;
}

function randomMaskedPhone(): string {
  const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
  const last = Math.floor(Math.random() * 10);
  return `+7 ${digits}** *** *${last}`;
}

export default function ClubQR() {
  const { currentUser } = useStore();
  const club = currentUser as Club | null;
  const [roulettePrizes, setRoulettePrizes] = useState<Prize[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [winsChat, setWinsChat] = useState<Array<{ id: string; text: string }>>([]);
  const winsChatIdRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fakeWinsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roulettePrizesRef = useRef<Prize[]>([]);
  roulettePrizesRef.current = roulettePrizes;
  const socketRef = useRef<Socket | null>(null);
  const rouletteRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const idlePositionRef = useRef(0);
  const idleRafRef = useRef<number | null>(null);
  const isSpinningRef = useRef(false);
  isSpinningRef.current = isSpinning;

  // Загружаем призы рулетки
  useEffect(() => {
    const loadPrizes = async () => {
      try {
        const prizes = await apiService.getRoulettePrizes();
        const transformedPrizes = prizes.map(transformPrize);
        setRoulettePrizes(transformedPrizes);
      } catch (error) {
        console.error('Ошибка загрузки призов рулетки:', error);
      }
    };
    loadPrizes();
  }, []);

  // Socket.IO: подключаемся к комнате клуба и слушаем событие spin (вместо опроса)
  useEffect(() => {
    if (!club) return;

    const clubId = club.id || club.clubId || club.token;
    if (!clubId) return;

    const socket = io(SOCKET_URL, {
      query: { clubId },
      // Сначала polling — если на Railway/прокси WebSocket не настроен, соединение всё равно установится
      transports: ['polling', 'websocket'],
    });
    socketRef.current = socket;

    socket.on('spin', (payload: { spin?: { prize?: unknown }; playerPhone?: string }) => {
      const spin = payload?.spin;
      const prizeData = spin?.prize;
      if (!prizeData) return;

      const prize = transformPrize(prizeData);
      const phone = payload.playerPhone;
      const prizeName = prize.name || 'Приз';
      addWinToChat(phone ? maskPhone(phone) : randomMaskedPhone(), prizeName);
      startSpin(prize);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket.IO connect_error:', err.message);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [club?.id, club?.clubId, club?.token]);

  // Бесконечное медленное движение ленты в простое
  useEffect(() => {
    if (roulettePrizes.length === 0 || isSpinning) return;
    const oneSetWidth = roulettePrizes.length * PRIZE_WIDTH;
    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 16, 50);
      lastTime = now;
      idlePositionRef.current -= IDLE_SPEED_PX * (dt / 16);
      if (idlePositionRef.current < -oneSetWidth) {
        idlePositionRef.current += oneSetWidth;
      }
      setScrollPosition(idlePositionRef.current);
      idleRafRef.current = requestAnimationFrame(tick);
    };
    idleRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (idleRafRef.current != null) {
        cancelAnimationFrame(idleRafRef.current);
      }
    };
  }, [roulettePrizes.length, isSpinning]);

  const addWinToChat = (maskedPhone: string, prizeName: string) => {
    const id = `win-${++winsChatIdRef.current}`;
    const text = `${maskedPhone} Выиграл ${prizeName}`;
    setWinsChat(prev => [{ id, text }, ...prev.slice(0, MAX_WINS_CHAT - 1)]);
  };

  // Стартовые фейковые сообщения в чате
  useEffect(() => {
    if (roulettePrizes.length === 0) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    [0, 1200, 2500].forEach((delay) => {
      timeouts.push(setTimeout(() => {
        const prizes = roulettePrizesRef.current;
        if (prizes.length === 0) return;
        const prize = prizes[Math.floor(Math.random() * prizes.length)];
        addWinToChat(randomMaskedPhone(), prize.name);
      }, delay));
    });
    return () => timeouts.forEach(t => clearTimeout(t));
  }, [roulettePrizes.length]);

  // Имитация новых выигрышей в чате (фейковые сообщения)
  useEffect(() => {
    if (roulettePrizes.length === 0) return;
    fakeWinsRef.current = setInterval(() => {
      const prizes = roulettePrizesRef.current;
      if (prizes.length === 0) return;
      const prize = prizes[Math.floor(Math.random() * prizes.length)];
      addWinToChat(randomMaskedPhone(), prize.name);
    }, 8000 + Math.random() * 5000);
    return () => {
      if (fakeWinsRef.current) clearInterval(fakeWinsRef.current);
    };
  }, [roulettePrizes.length]);

  const handleTestSpin = () => {
    if (roulettePrizes.length > 0 && !isSpinning) {
      const randomPrize = roulettePrizes[Math.floor(Math.random() * roulettePrizes.length)];
      startSpin(randomPrize);
    }
  };

  const startSpin = (prize: Prize) => {
    if (isSpinningRef.current || !rouletteRef.current) return;
    const prizes = roulettePrizesRef.current;
    if (prizes.length === 0) return;

    setIsSpinning(true);
    setSelectedPrize(null);

    // Находим индекс приза по актуальному списку
    const targetIndex = prizes.findIndex(p =>
      p.id === prize.id ||
      (prize.slotIndex !== undefined && p.slotIndex === prize.slotIndex)
    );
    const finalIndex = targetIndex >= 0 ? targetIndex : 0;

    // Размер одного элемента приза
    const prizeWidth = 284; // ширина карточки приза (260px) + gap (24px)
    const containerWidth = rouletteRef.current.offsetWidth;
    const centerOffset = containerWidth / 2 - prizeWidth / 2;

    // Стартуем с текущей позиции (где остановился idle) — без прыжка
    const startPosition = idlePositionRef.current;
    const oneSetWidth = prizes.length * prizeWidth;
    // Целевая позиция: выигранный приз по центру, слева от старта (лента крутится вправо)
    const T = -finalIndex * prizeWidth + centerOffset;
    const k = Math.floor((startPosition - T) / oneSetWidth) - 1;
    const targetPosition = T + k * oneSetWidth;

    // Анимация с замедлением (ease-out)
    const duration = 4000; // 4 секунды
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing функция для плавного замедления
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentPosition = startPosition + (targetPosition - startPosition) * easeOut;
      setScrollPosition(currentPosition);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setScrollPosition(targetPosition);
        idlePositionRef.current = targetPosition;
        setSelectedPrize(prize);
        setIsSpinning(false);
      }
    };

    requestAnimationFrame(animate);
  };

  // Полноэкранный режим
  const toggleFullscreen = async () => {
    if (!fullscreenRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await fullscreenRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen(!!document.fullscreenElement);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Очистка интервалов при размонтировании
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (fakeWinsRef.current) clearInterval(fakeWinsRef.current);
    };
  }, []);

  if (!club) {
    return null;
  }

  return (
    <div ref={fullscreenRef} className="spin-page club-qr-page club-qr-page-wrap">
      <button
        type="button"
        className="club-qr-fullscreen-btn"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Выйти из полного экрана' : 'Полный экран'}
        aria-label={isFullscreen ? 'Выйти из полного экрана' : 'Полный экран'}
      >
        {isFullscreen ? 'Выйти' : 'Полный экран'}
      </button>
      {roulettePrizes.length > 0 ? (
        <>
          <div className="spin-container club-qr-spin-container">
            <div className="spin-roulette-section club-qr-roulette-section">
              <div className="cs-roulette-container">
                <div className="cs-roulette-pointer" />
                <div ref={rouletteRef} className="cs-roulette-track">
                  <div
                    className="cs-roulette-items"
                    style={{
                      transform: `translateX(${scrollPosition}px)`,
                      transition: 'none',
                    }}
                  >
                    {[...roulettePrizes, ...roulettePrizes, ...roulettePrizes].map((prize, index) => {
                      const isSelected = !isSpinning && selectedPrize?.id === prize.id;
                      return (
                        <div
                          key={`${prize.id}-${index}`}
                          className={`cs-prize-item ${isSelected ? 'selected' : ''}`}
                        >
                          <div className="cs-prize-inner">
                            {prize.image ? (
                              <img
                                src={prize.image}
                                alt={prize.name}
                                className="cs-prize-image"
                              />
                            ) : (
                              <div className="cs-prize-placeholder">
                                {prize.name.charAt(0)}
                              </div>
                            )}
                            <div className="cs-prize-name">{prize.name}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {selectedPrize && !isSpinning && (
              <div className="result-overlay">
                <div className="result-content">
                  <button
                    onClick={() => setSelectedPrize(null)}
                    className="result-close-button"
                    aria-label="Закрыть"
                  >
                    ×
                  </button>
                  <h2 className="result-title">Выигрыш!</h2>
                  <div className="result-prize">
                    {selectedPrize.image && (
                      <img
                        src={selectedPrize.image}
                        alt={selectedPrize.name}
                        className="result-prize-image"
                      />
                    )}
                    <div className="result-prize-name">{selectedPrize.name}</div>
                    {selectedPrize.description && (
                      <div className="result-prize-desc">{selectedPrize.description}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="spin-container club-qr-spin-container">
          <div className="spin-page-loading club-qr-loading" />
        </div>
      )}

      {/* Чат побед — снизу по центру, последние 10 */}
      <div className="club-qr-wins-chat">
        <div className="club-qr-wins-chat-list">
          {winsChat.map((item) => (
            <div key={item.id} className="club-qr-wins-chat-line">
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {isFullscreen && (
        <>
          <button
            type="button"
            className="club-qr-test-spin-btn"
            onClick={handleTestSpin}
            disabled={isSpinning || roulettePrizes.length === 0}
          >
            Тестовый спин
          </button>
          <div className="club-qr-fullscreen-qr">
          <div className="club-qr-fullscreen-qr-inner">
            {club.qrCode && club.qrCode.startsWith('data:image') ? (
              <img src={club.qrCode} alt="QR код" className="club-qr-fullscreen-qr-image" />
            ) : (
              <QRCodeSVG
                value={`${getQrBaseUrl()}/spin?club=${club.token || club.clubId}`}
                size={140}
                level="H"
              />
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
