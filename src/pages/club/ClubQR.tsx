import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiService } from '@/services/api';
import { getSocketUrl } from '@/config/api';
import { transformPrize } from '@/utils/transformers';
import type { Club, Prize } from '@/types';
import logoUrl from '@/assets/logo.png';
import { useQRPageTheme } from '@/hooks/useQRPageTheme';
import { qrThemeToCssVars } from '@/constants/qrTheme';
import { DEFAULT_QR_PAGE_THEME } from '@/constants/qrTheme';
import './ClubPages.css';
import '../ClubRoulettePage.css';
import '../SpinPage.css';

/** Ширина одной карточки приза (400px) + gap (24px) — для расчёта позиции рулетки */
const PRIZE_CARD_WIDTH = 400;
const PRIZE_GAP = 24;
const PRIZE_WIDTH = PRIZE_CARD_WIDTH + PRIZE_GAP;
/** Левый padding у .cs-roulette-items — без него рулетка останавливается мимо приза */
const ROULETTE_ITEMS_PADDING_LEFT = 20;
const IDLE_SPEED_PX = 15.5;

/** Фоновые изображения для карточек призов на странице QR (цикл по 4 картинкам) */
const PRIZE_ITEM_BG_IMAGES = [
  'https://zira.uz/wp-content/uploads/2018/07/coca-cola-co.jpg',
  'https://news.store.rambler.ru/img/9b01eec37d7cc156eddf892f5feb5c5f?img-format=auto&img-1-resize=height:400,fit:max&img-2-filter=sharpen',
  'https://tovaro.s3.eu-central-1.amazonaws.com/b/uploads/2023/08/08131459/pepsi-branding-3.jpg',
  'https://lindeal.com/images/photos/red-bull-kak-lipkaya-voda-s-kofeinom-stala-legendoj-dayushchej-krylya.jpeg',
];
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
  /** Игрок с бэкенда — объект с ФИО или id для подстановки по списку игроков */
  playerId?: { _id?: string; id?: string; name?: string; fio?: string } | string;
}

/** Тир приза по проценту выпадения (dropChance/percentage 0–100): цвет обводки и свечения */
export type PrizeTier = 'red' | 'purple' | 'green' | 'blue' | 'gray';

export function getPrizeTier(prize: Prize): PrizeTier {
  const pct = (prize.probability ?? 0) * 100;
  if (pct < 5) return 'red';
  if (pct < 10) return 'purple';
  if (pct < 15) return 'green';
  if (pct <= 20) return 'blue';
  return 'gray';
}

/** Отображаемое имя для ленты: ФИО/имя игрока (приоритет), иначе замаскированный телефон, иначе "Гость" */
function winDisplayName(w: WinItem, resolvePlayerId?: (id: string) => string | undefined): string {
  const fromObj =
    w.name ??
    w.playerName ??
    (typeof w.playerId === 'object' && w.playerId !== null
      ? w.playerId.name ?? w.playerId.fio
      : undefined);
  if (fromObj) return fromObj;
  const id =
    typeof w.playerId === 'string'
      ? w.playerId
      : typeof w.playerId === 'object' && w.playerId !== null
        ? w.playerId.id ?? w.playerId._id
        : undefined;
  if (id && resolvePlayerId) {
    const resolved = resolvePlayerId(id);
    if (resolved) return resolved;
  }
  return w.maskedPhone ?? 'Гость';
}

/** Payload события spin с бэкенда (с recentWins — последние 10 выигрышей по клубу) */
interface SpinPayload {
  _id?: string;
  prize?: { name?: string; slotIndex?: number; image?: string; [k: string]: unknown };
  spin?: { prize?: unknown };
  playerPhone?: string;
  playerName?: string;
  name?: string;
  /** Игрок с ФИО (приоритетнее номера) */
  playerId?: { _id?: string; id?: string; name?: string; fio?: string };
  createdAt?: string;
  recentWins?: WinItem[];
}

export default function ClubQR() {
  const { currentUser, fetchClubData, players, fetchClubPlayers, logout, companyLogoUrl } = useStore();
  const club = currentUser as Club | null;
  const { theme: storedQRTheme } = useQRPageTheme();
  const qrTheme = club?.qrPageTheme ?? storedQRTheme ?? DEFAULT_QR_PAGE_THEME;
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Подтягиваем данные клуба и список игроков (для подстановки ФИО в истории)
  useEffect(() => {
    if (club) {
      fetchClubData();
      fetchClubPlayers();
    }
  }, [club?.id, fetchClubData, fetchClubPlayers]);
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
  const [currentSpinnerName, setCurrentSpinnerName] = useState<string | null>(null);
  const winsChatIdRef = useRef(0);
  const playersRef = useRef<typeof players>([]);
  playersRef.current = players;
  const roulettePrizesRef = useRef<Prize[]>([]);
  roulettePrizesRef.current = roulettePrizes;
  const socketRef = useRef<Socket | null>(null);
  const rouletteRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const idlePositionRef = useRef(0);
  const idleRafRef = useRef<number | null>(null);
  const isSpinningRef = useRef(false);
  isSpinningRef.current = isSpinning;
  type PendingWin =
    | { type: 'recentWins'; recentWins: WinItem[] }
    | { type: 'single'; displayName: string; prizeName: string };
  type QueuedSpin = {
    prize: Prize;
    pendingWin?: PendingWin;
    spinnerName?: string;
  };
  const spinQueueRef = useRef<QueuedSpin[]>([]);

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
      // Порядок на ленте = по slotIndex (как на бэкенде), при равенстве — по id для стабильности
      const sorted = [...transformedPrizes].sort((a, b) => {
        const sa = a.slotIndex ?? Infinity;
        const sb = b.slotIndex ?? Infinity;
        if (sa !== sb) return sa - sb;
        return String(a.id ?? '').localeCompare(String(b.id ?? ''));
      });
      setRoulettePrizes(sorted);
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
      // playerName/name с бэка: при отсутствии имени — пустая строка; пустую считаем «нет имени»
      const nameOrEmpty = (payload.name ?? payload.playerName ?? '').trim() || undefined;
      // Подставляем имя из списка игроков клуба, если бэкенд прислал только playerId
      const pid = payload.playerId;
      const idFromPayload =
        typeof pid === 'string' ? pid : pid?.id ?? (pid as { _id?: string } | undefined)?._id;
      let resolvedFromList: string | undefined;
      if (idFromPayload) {
        const list = playersRef.current;
        const p = list.find(
          (pl) => pl.id === idFromPayload || (pl as { _id?: string })._id === idFromPayload
        );
        resolvedFromList = (p?.name ?? (p as { fio?: string })?.fio)?.trim() || undefined;
      }
      const singleDisplayName =
        nameOrEmpty ??
        payload.playerId?.name ??
        payload.playerId?.fio ??
        resolvedFromList ??
        (payload.playerPhone ? maskPhone(payload.playerPhone) : randomMaskedPhone());
      const spinnerName =
        nameOrEmpty ??
        payload.playerId?.name ??
        payload.playerId?.fio ??
        resolvedFromList ??
        (payload.playerPhone ? maskPhone(payload.playerPhone) : undefined);
      const pendingWin =
        Array.isArray(payload.recentWins) && payload.recentWins.length > 0
          ? { type: 'recentWins' as const, recentWins: payload.recentWins }
          : {
              type: 'single' as const,
              displayName: singleDisplayName,
              prizeName,
            };
      enqueueSpin({ prize, pendingWin, spinnerName });
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

  const runNextSpinFromQueue = () => {
    if (isSpinningRef.current) return;
    const queue = spinQueueRef.current;
    if (queue.length === 0) return;
    const next = queue.shift();
    if (!next) return;
    const { prize, pendingWin, spinnerName } = next;
    if (spinnerName) {
      setCurrentSpinnerName(spinnerName);
    }
    startSpin(prize, () => {
      if (pendingWin) {
        if (pendingWin.type === 'recentWins') {
          const resolveFio = (id: string) => {
            const list = playersRef.current;
            const p = list.find(
              (pl) => pl.id === id || (pl as { _id?: string })._id === id
            );
            return (p?.name ?? (p as { fio?: string })?.fio)?.trim() || undefined;
          };
          setWinsChat(
            pendingWin.recentWins.map((w, i) => {
              const displayName = winDisplayName(w, resolveFio);
              const text = w.text?.includes('выиграл') ? w.text : `${displayName} выиграл ${w.prizeName}`;
              return { id: `win-${i}`, text };
            })
          );
        } else {
          addWinToChat(pendingWin.displayName, pendingWin.prizeName);
        }
      }
      setCurrentSpinnerName(null);
      // Сбрасываем флаг до запуска следующего спина из очереди (state обновится позже)
      isSpinningRef.current = false;
      runNextSpinFromQueue();
    });
  };

  const enqueueSpin = (item: QueuedSpin) => {
    spinQueueRef.current = [...spinQueueRef.current, item];
    if (!isSpinningRef.current) {
      runNextSpinFromQueue();
    }
  };

  // Тестовый спин — только на локалхосте (для отладки)
  const handleTestSpin = () => {
    if (roulettePrizes.length > 0 && isLocalhost) {
      const randomPrize = roulettePrizes[Math.floor(Math.random() * roulettePrizes.length)];
      enqueueSpin({
        prize: randomPrize,
        spinnerName: 'Тестовый игрок',
      });
    }
  };

  const startSpin = (prize: Prize, onComplete?: () => void) => {
    if (isSpinningRef.current || !rouletteRef.current) return;
    const prizes = roulettePrizesRef.current;
    if (prizes.length === 0) return;

    // Сразу помечаем спин как активный, чтобы при двух быстрых socket-событиях
    // второй не запускал анимацию параллельно (очередь обработает его после завершения первого)
    isSpinningRef.current = true;
    setIsSpinning(true);
    setSelectedPrize(null);

    // Приз ВСЕГДА решает бэкенд. Мы только крутим ленту и останавливаем на НЁМ — ищем тот же приз в нашем списке по id или slotIndex.
    // Важно: индекс в массиве (после сортировки по slotIndex), а НЕ номер слота! Призов может быть 5 со слотами 0,2,5,7,9 — индекс слота 5 = 2 в массиве.
    const targetIndex = prizes.findIndex(
      (p) => p.id === prize.id || (prize.slotIndex !== undefined && p.slotIndex === prize.slotIndex)
    );
    const finalIndex = targetIndex >= 0 ? targetIndex : 0;

    // Размер одного элемента приза (карточка 400px + gap 24px в .cs-roulette-items)
    const prizeWidth = PRIZE_WIDTH;
    const containerWidth = rouletteRef.current.offsetWidth;
    // Центр экрана: левый край слота под стрелкой (карточка 400px + gap 24px)
    const centerOffset = containerWidth / 2 - prizeWidth / 2;
    // У .cs-roulette-items padding-left: 20px — первый приз начинается не с 0, а с 20px
    const contentStart = centerOffset - ROULETTE_ITEMS_PADDING_LEFT;

    // Стартуем с текущей позиции (где остановился idle) — без прыжка
    const startPosition = idlePositionRef.current;
    const oneSetWidth = prizes.length * prizeWidth;
    // Целевая позиция: левый край приза finalIndex = contentStart (под стрелкой)
    const T = contentStart - finalIndex * prizeWidth;
    const k = Math.floor((startPosition - T) / oneSetWidth) - 1;
    const targetPosition = T + k * oneSetWidth;

    // Одна плавная кривая: сначала очень быстро, затем плавное замедление до нуля в конце (без скачков)
    const extraRotations = 6;
    const endPosition = targetPosition - extraRotations * oneSetWidth;
    const duration = 15000;
    const travel = endPosition - startPosition;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Очень быстрый старт (призы почти не различимы), затем плавное замедление
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -8 * progress);
      const currentPosition = startPosition + travel * easeOut;
      setScrollPosition(currentPosition);

      if (progress >= 1) {
        setScrollPosition(endPosition);
        idlePositionRef.current = endPosition;
        setSelectedPrize(prize);
        isSpinningRef.current = false;
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

  const bg = club.qrPageBackground;
  const isVideoBg = bg?.url && /\.(mp4|webm)$/i.test(bg.url);

  return (
    <div
      ref={fullscreenRef}
      className="spin-page club-qr-page club-qr-page-wrap"
      style={qrThemeToCssVars(qrTheme) as React.CSSProperties}
    >
      {!isFullscreen && (
        <>
          <button
            type="button"
            className="club-qr-logout-btn"
            onClick={logout}
            title="Выйти"
            aria-label="Выйти"
          >
            <LogOut size={20} />
          </button>
          <button
            type="button"
            className="club-qr-fullscreen-btn"
            onClick={toggleFullscreen}
            title="Полный экран (выйти — Esc)"
            aria-label="Полный экран"
          >
            Полный экран
          </button>
          {isLocalhost && (
            <button
              type="button"
              className="club-qr-fullscreen-btn club-qr-test-win-btn"
              onClick={() => {
                const prize =
                  roulettePrizes[0] ??
                  ({
                    id: 'test',
                    name: 'Тестовый приз',
                    description: 'Проверка попапа выигрыша',
                    type: 'physical',
                    probability: 0,
                    status: 'confirmed',
                    wonAt: new Date().toISOString(),
                  } as Prize);
                setSelectedPrize(prize);
              }}
              title="Показать попап выигрыша (только localhost)"
            >
              Показать выигрыш
            </button>
          )}
        </>
      )}
      {roulettePrizes.length > 0 ? (
        <>
            <img src={companyLogoUrl || logoUrl} alt="Infinity" className="club-qr-logo" />
          <div className="spin-container club-qr-spin-container">
            <div className="spin-roulette-section club-qr-roulette-section">
              <div className="cs-roulette-container">
                {bg?.url && (
                  <div className="club-qr-roulette-bg-layer" style={{ opacity: bg.opacity ?? 0.5 }}>
                    {isVideoBg ? (
                      <video src={bg.url} className="club-qr-roulette-bg-media" muted loop playsInline autoPlay />
                    ) : (
                      <img src={bg.url} alt="" className="club-qr-roulette-bg-media" />
                    )}
                  </div>
                )}
                <div className="club-qr-top-bar">
                  {currentSpinnerName && (
                    <div className="club-qr-current-spinner">
                      <span className="club-qr-current-spinner-label">Сейчас крутит:</span>
                      <span className="club-qr-current-spinner-value">{currentSpinnerName}</span>
                    </div>
                  )}
                </div>
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
                      const bgImageUrl = PRIZE_ITEM_BG_IMAGES[index % PRIZE_ITEM_BG_IMAGES.length];
                      return (
                        <div
                          key={`${prize.id}-${index}`}
                          className={`cs-prize-item ${isSelected ? 'selected' : ''}`}
                          data-prize-tier={getPrizeTier(prize)}
                          style={{
                            backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(${bgImageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
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
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
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

      {/* Попап выигрыша — показывается при selectedPrize (в т.ч. по тестовой кнопке на localhost) */}
      {selectedPrize && !isSpinning && (
        <div className="result-overlay" data-prize-tier={getPrizeTier(selectedPrize)} onClick={() => setSelectedPrize(null)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Escape' && setSelectedPrize(null)} aria-label="Закрыть">
          {selectedPrize.backgroundImage && (
            <div
              className="result-overlay-bg"
              aria-hidden
              style={{ backgroundImage: `url(${selectedPrize.backgroundImage})` }}
            />
          )}
          <div className="result-overlay-glow" aria-hidden />
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

      {/* Тестовый спин — только на локалхосте */}
      {isFullscreen && isLocalhost && (
        <button
          type="button"
          className="club-qr-test-spin-btn"
          onClick={handleTestSpin}
          disabled={isSpinning || roulettePrizes.length === 0}
          title="Крутит рулетку с очень быстрым стартом и плавным замедлением"
        >
          {isSpinning ? 'Крутится…' : 'Тестовый спин (динамичная рулетка)'}
        </button>
      )}
    </div>
  );
}
