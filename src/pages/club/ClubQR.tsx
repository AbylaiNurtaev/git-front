import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '@/store/useStore';
import { apiService } from '@/services/api';
import { getSocketUrl } from '@/config/api';
import { transformPrize } from '@/utils/transformers';
import type { Club, Prize } from '@/types';
import './ClubPages.css';
import '../ClubRoulettePage.css';
import '../SpinPage.css';

const PRIZE_WIDTH = 284;
const IDLE_SPEED_PX = 15.5;
const MAX_WINS_CHAT = 10;
/** Буфер копий рулетки справа, чтобы не было пустого места */
const ROULETTE_MIN_COPIES = 50;
const ROULETTE_REPLENISH_THRESHOLD = 25;
const ROULETTE_REPLENISH_COUNT = 25;

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

/** Один выигрыш в ленте (имя приоритетнее номера телефона) */
interface WinItem {
  text?: string;
  prizeName: string;
  playerName?: string;
  name?: string;
  maskedPhone?: string;
}

/** Отображаемое имя для ленты: имя игрока, иначе замаскированный телефон, иначе "Гость" */
function winDisplayName(w: WinItem): string {
  return w.name ?? w.playerName ?? w.maskedPhone ?? 'Гость';
}

/** Payload события spin с бэкенда (с recentWins — последние 10 выигрышей по клубу) */
interface SpinPayload {
  _id?: string;
  prize?: { name?: string; slotIndex?: number; image?: string; [k: string]: unknown };
  spin?: { prize?: unknown };
  playerPhone?: string;
  playerName?: string;
  name?: string;
  createdAt?: string;
  recentWins?: WinItem[];
}

export default function ClubQR() {
  const { currentUser, fetchClubData } = useStore();
  const club = currentUser as Club | null;

  // Подтягиваем данные клуба с бэка (GET /api/clubs/me), чтобы в объекте был pinCode
  useEffect(() => {
    if (club) fetchClubData();
  }, [club?.id, fetchClubData]);
  const [roulettePrizes, setRoulettePrizes] = useState<Prize[]>([]);
  const [rouletteCopies, setRouletteCopies] = useState(ROULETTE_MIN_COPIES);
  const rouletteCopiesRef = useRef(ROULETTE_MIN_COPIES);
  rouletteCopiesRef.current = rouletteCopies;
  const [prizesLoadError, setPrizesLoadError] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [winsChat, setWinsChat] = useState<Array<{ id: string; text: string }>>([]);
  const winsChatIdRef = useRef(0);
  const roulettePrizesRef = useRef<Prize[]>([]);
  roulettePrizesRef.current = roulettePrizes;
  const socketRef = useRef<Socket | null>(null);
  const rouletteRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const idlePositionRef = useRef(0);
  const idleRafRef = useRef<number | null>(null);
  const isSpinningRef = useRef(false);
  isSpinningRef.current = isSpinning;

  // Авто-закрытие оверлея с призом через 7 секунд
  useEffect(() => {
    if (!selectedPrize || isSpinning) return;
    const timer = window.setTimeout(() => setSelectedPrize(null), 7000);
    return () => window.clearTimeout(timer);
  }, [selectedPrize, isSpinning]);

  // Загружаем призы рулетки (по клубу, если есть)
  const loadPrizes = async () => {
    const clubId = club ? (club.id || club.clubId || club.token) : undefined;
    setPrizesLoadError(null);
    try {
      const prizes = await apiService.getRoulettePrizes(clubId);
      const transformedPrizes = prizes.map(transformPrize);
      setRoulettePrizes(transformedPrizes);
    } catch (error: unknown) {
      console.error('Ошибка загрузки призов рулетки:', error);
      const isNetworkOrCors =
        (error as { message?: string; code?: string })?.message === 'Network Error' ||
        (error as { code?: string })?.code === 'ERR_NETWORK';
      setPrizesLoadError(
        isNetworkOrCors
          ? 'Сеть недоступна или CORS: добавьте на бэкенде origin https://git-front-sandy.vercel.app (или ваш домен фронта).'
          : 'Не удалось загрузить призы. Проверьте бэкенд и VITE_API_BASE_URL в .env.'
      );
    }
  };

  useEffect(() => {
    if (club) loadPrizes();
  }, [club?.id, club?.clubId, club?.token]);

  // Загрузка ленты последних выигрышей (GET /api/players/recent-wins, публичный)
  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    apiService
      .getRecentWins()
      .then((list) => {
        if (!cancelled && Array.isArray(list) && list.length > 0) {
          setWinsChat(
            list.slice(0, MAX_WINS_CHAT).map((w, i) => {
              const item = w as WinItem;
              const text = item.text?.includes('выиграл') ? item.text! : `${winDisplayName(item)} выиграл ${item.prizeName}`;
              return { id: `recent-${i}`, text };
            })
          );
        }
      })
      .catch(() => { /* тихо игнорируем, лента остаётся пустой или от сокета */ });
    return () => { cancelled = true; };
  }, [club?.id, club?.clubId, club?.token]);

  useEffect(() => {
    setRouletteCopies(ROULETTE_MIN_COPIES);
    rouletteCopiesRef.current = ROULETTE_MIN_COPIES;
  }, [roulettePrizes.length]);

  // Socket.IO: подключаемся к комнате клуба и слушаем событие spin (вместо опроса)
  useEffect(() => {
    if (!club) return;

    const clubId = club.id || club.clubId || club.token;
    if (!clubId) return;

    const socket = io(getSocketUrl(), {
      query: { clubId },
      // Сначала polling — если на Railway/прокси WebSocket не настроен, соединение всё равно установится
      transports: ['polling', 'websocket'],
    });
    socketRef.current = socket;

    socket.on('spin', (payload: SpinPayload) => {
      const prizeData = payload?.spin?.prize ?? payload?.prize;
      if (!prizeData) return;

      const prize = transformPrize(prizeData);
      const prizeName = prize.name || 'Приз';
      const singleDisplayName = payload.name ?? payload.playerName ?? (payload.playerPhone ? maskPhone(payload.playerPhone) : randomMaskedPhone());
      const pendingWin =
        Array.isArray(payload.recentWins) && payload.recentWins.length > 0
          ? { type: 'recentWins' as const, recentWins: payload.recentWins }
          : {
              type: 'single' as const,
              displayName: singleDisplayName,
              prizeName,
            };
      startSpin(prize, () => {
        if (pendingWin.type === 'recentWins') {
          setWinsChat(
            pendingWin.recentWins.map((w, i) => {
              const text = w.text?.includes('выиграл') ? w.text : `${winDisplayName(w)} выиграл ${w.prizeName}`;
              return { id: `win-${i}`, text };
            })
          );
        } else {
          addWinToChat(pendingWin.displayName, pendingWin.prizeName);
        }
      });
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

  // Бесконечное медленное движение ленты в простое; при нехватке копий справа — пополняем
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
      const containerWidth = rouletteRef.current?.offsetWidth ?? 0;
      const rightEdge = idlePositionRef.current + containerWidth;
      const copies = rouletteCopiesRef.current;
      if (rightEdge >= (copies - ROULETTE_REPLENISH_THRESHOLD) * oneSetWidth) {
        rouletteCopiesRef.current = copies + ROULETTE_REPLENISH_COUNT;
        setRouletteCopies(rouletteCopiesRef.current);
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

  const addWinToChat = (displayName: string, prizeName: string) => {
    const id = `win-${++winsChatIdRef.current}`;
    const text = `${displayName} выиграл ${prizeName}`;
    setWinsChat(prev => [{ id, text }, ...prev.slice(0, MAX_WINS_CHAT - 1)]);
  };

  // Чат побед — только из payload.recentWins с бэкенда (без фейковых сообщений)

  // Тестовый спин — закомментирован
  // const handleTestSpin = () => {
  //   if (roulettePrizes.length > 0 && !isSpinning) {
  //     const randomPrize = roulettePrizes[Math.floor(Math.random() * roulettePrizes.length)];
  //     startSpin(randomPrize);
  //   }
  // };

  const startSpin = (prize: Prize, onComplete?: () => void) => {
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
    // Целевая позиция: выигранный приз по центру (лента крутится вправо)
    const T = -finalIndex * prizeWidth + centerOffset;
    const k = Math.floor((startPosition - T) / oneSetWidth) - 1;
    const targetPosition = T + k * oneSetWidth;

    // Одна плавная кривая: быстро в начале, долгое плавное замедление до нуля в конце (без скачков)
    const extraRotations = 3;
    const endPosition = targetPosition - extraRotations * oneSetWidth;
    const duration = 11000;
    const travel = endPosition - startPosition;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentPosition = startPosition + travel * easeOut;
      setScrollPosition(currentPosition);

      if (progress >= 1) {
        setScrollPosition(endPosition);
        idlePositionRef.current = endPosition;
        setSelectedPrize(prize);
        setIsSpinning(false);
        onComplete?.();
        return;
      }
      requestAnimationFrame(animate);
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

  if (!club) {
    return null;
  }

  return (
    <div ref={fullscreenRef} className="spin-page club-qr-page club-qr-page-wrap">
      {!isFullscreen && (
        <button
          type="button"
          className="club-qr-fullscreen-btn"
          onClick={toggleFullscreen}
          title="Полный экран (выйти — Esc)"
          aria-label="Полный экран"
        >
          Полный экран
        </button>
      )}
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
                    {Array.from({ length: rouletteCopies }, () => roulettePrizes).flat().map((prize, index) => {
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
              <div className="result-overlay" onClick={() => setSelectedPrize(null)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Escape' && setSelectedPrize(null)} aria-label="Закрыть">
                <div className="result-content" onClick={(e) => e.stopPropagation()}>
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
      ) : prizesLoadError ? (
        <div className="spin-container club-qr-spin-container">
          <div className="spin-page-loading club-qr-loading club-qr-loading-error">
            <p>{prizesLoadError}</p>
            <button type="button" onClick={loadPrizes} className="club-qr-retry-btn">
              Повторить
            </button>
          </div>
        </div>
      ) : (
        <div className="spin-container club-qr-spin-container">
          <div className="spin-page-loading club-qr-loading">
            <p>Загрузка призов...</p>
          </div>
        </div>
      )}

      {/* Чат побед — снизу по центру, только если есть хотя бы один выигрыш */}
      {winsChat.length > 0 && (
        <div className="club-qr-wins-chat">
          <div className="club-qr-wins-chat-list">
            {winsChat.map((item) => (
              <div key={item.id} className="club-qr-wins-chat-line">
                {item.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Тестовый спин — закомментирован
      {isFullscreen && (
        <button
          type="button"
          className="club-qr-test-spin-btn"
          onClick={handleTestSpin}
          disabled={isSpinning || roulettePrizes.length === 0}
          title="Крутит рулетку с замедлением и показывает выигрыш"
        >
          {isSpinning ? 'Крутится…' : 'Тестовый спин (динамичная рулетка)'}
        </button>
      )}
      */}
    </div>
  );
}
