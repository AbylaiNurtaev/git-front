import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { apiService } from '@/services/api';
import { transformPrize } from '@/utils/transformers';
import { useClubTheme } from '@/hooks/useClubTheme';
import type { Club, Player, Prize } from '@/types';
import BrandLogo from '@/components/BrandLogo';
import './SpinPage.css';
import './club/ClubPages.css';
import './ClubRoulettePage.css';
import { createPortal } from 'react-dom';

const PRIZE_WIDTH = 284;
/** Общая длительность спина; одна плавная кривая без скачков скорости */
const SPIN_DURATION_MS = 11000;
/** Буфер копий рулетки, чтобы справа не было пустого места */
const ROULETTE_COPIES = 50;
const NORMALIZE_THRESHOLD_COPIES = 3;

export default function SpinPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clubParam = searchParams.get('club');
  const { currentUser, spinRoulette, getClub, error } = useStore();
  const [resolvedClub, setResolvedClub] = useState<Club | null>(null);
  useClubTheme(resolvedClub);
  const [clubResolveLoading, setClubResolveLoading] = useState(!!clubParam);
  const [isScanning, setIsScanning] = useState(!clubParam);
  const [spinPrizes, setSpinPrizes] = useState<Prize[]>([]);
  const [spinPrizesLoading, setSpinPrizesLoading] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollPositionRef = useRef(0);
  useEffect(() => {
    scrollPositionRef.current = scrollPosition;
  }, [scrollPosition]);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [result, setResult] = useState<Prize | null>(null);
  const rouletteRef = useRef<HTMLDivElement>(null);

  // Режим "клиент отсканировал QR": только попап "Спасибо за участие" и редирект
  const [thankYouOpen, setThankYouOpen] = useState(false);
  const [spinErrorMessage, setSpinErrorMessage] = useState<string | null>(null);
  const spinRequestedRef = useRef(false);
  const thankYouTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isClientScanFlow = Boolean(clubParam && currentUser?.role === 'player');
  const isGuestFlow = Boolean(clubParam && !currentUser);
  const [guestPhone, setGuestPhone] = useState('');
  const [guestSpinLoading, setGuestSpinLoading] = useState(false);
  const [guestSpinError, setGuestSpinError] = useState<string | null>(null);

  useEffect(() => {
    if (result) {
      const html = document.documentElement;
      const body = document.body;
      const prevHtmlOverflow = html.style.overflow;
      const prevBodyOverflow = body.style.overflow;
      const prevBodyTouchAction = body.style.touchAction;
      const prevBodyPosition = body.style.position;
      const prevBodyWidth = body.style.width;
      const prevScrollY = window.scrollY;
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      body.style.touchAction = 'none';
      body.style.position = 'fixed';
      body.style.width = '100%';
      body.style.top = `-${prevScrollY}px`;
      return () => {
        html.style.overflow = prevHtmlOverflow;
        body.style.overflow = prevBodyOverflow;
        body.style.touchAction = prevBodyTouchAction;
        body.style.position = prevBodyPosition;
        body.style.width = prevBodyWidth;
        body.style.top = '';
        window.scrollTo(0, prevScrollY);
      };
    }
  }, [result]);

  // Разрешаем клуб по коду (6 цифр), qrToken или clubId из URL (?club=...)
  useEffect(() => {
    if (!clubParam) {
      setResolvedClub(null);
      setClubResolveLoading(false);
      return;
    }
    let cancelled = false;
    setClubResolveLoading(true);
    getClub(clubParam)
      .then((club) => {
        if (!cancelled) {
          setResolvedClub(club);
          setIsScanning(false);
        }
      })
      .catch(() => {
        if (!cancelled) setResolvedClub(null);
      })
      .finally(() => {
        if (!cancelled) setClubResolveLoading(false);
      });
    return () => { cancelled = true; };
  }, [clubParam, getClub]);

  // Клиент по QR: один раз вызываем спин и показываем попап "Спасибо за участие"
  useEffect(() => {
    if (!isClientScanFlow || !resolvedClub || spinRequestedRef.current) return;
    spinRequestedRef.current = true;
    setSpinErrorMessage(null);

    spinRoulette(resolvedClub.id)
      .then((prize) => {
        setThankYouOpen(true);
        if (!prize) {
          const err = useStore.getState().error;
          setSpinErrorMessage(err || 'Не удалось участвовать в рулетке');
        }
      })
      .catch(() => {
        const err = useStore.getState().error;
        setSpinErrorMessage(err || 'Не удалось участвовать в рулетке');
        setThankYouOpen(true);
      });
  }, [isClientScanFlow, resolvedClub?.id, spinRoulette]);

  // Таймер 5 сек: редирект на главную при открытом попапе "Спасибо"
  useEffect(() => {
    if (!thankYouOpen) return;
    thankYouTimerRef.current = setTimeout(() => {
      navigate('/player', { replace: true });
    }, 5000);
    return () => {
      if (thankYouTimerRef.current) {
        clearTimeout(thankYouTimerRef.current);
        thankYouTimerRef.current = null;
      }
    };
  }, [thankYouOpen, navigate]);

  // Загрузка призов рулетки (когда клуб разрешён) — для игрока и для гостя (код + телефон)
  useEffect(() => {
    if (!resolvedClub || isClientScanFlow) {
      if (isClientScanFlow) setSpinPrizes([]);
      return;
    }
    let cancelled = false;
    setSpinPrizesLoading(true);
    apiService
      .getRoulettePrizes()
      .then((data: any[]) => {
        if (!cancelled) {
          const list = Array.isArray(data) ? data.map(transformPrize) : [];
          setSpinPrizes(list);
        }
      })
      .catch(() => {
        if (!cancelled) setSpinPrizes([]);
      })
      .finally(() => {
        if (!cancelled) setSpinPrizesLoading(false);
      });
    return () => { cancelled = true; };
  }, [resolvedClub?.id]);

  // Начальная позиция: первый приз по центру (один раз при загрузке призов)
  const initialPositionSet = useRef(false);
  useEffect(() => {
    if (
      spinPrizes.length > 0 &&
      rouletteRef.current &&
      !initialPositionSet.current
    ) {
      initialPositionSet.current = true;
      const containerWidth = rouletteRef.current.offsetWidth;
      const centerOffset = containerWidth / 2 - PRIZE_WIDTH / 2;
      setScrollPosition(centerOffset);
      scrollPositionRef.current = centerOffset;
    }
  }, [spinPrizes.length]);

  const handleCodeOrQR = async (codeOrToken: string) => {
    const trimmed = codeOrToken.trim();
    if (!trimmed) return;
    try {
      const club = await getClub(trimmed);
      if (club) {
        const param = club.pinCode ?? club.token ?? club.clubId ?? trimmed;
        navigate(`/spin?club=${encodeURIComponent(param)}`, { replace: true });
      } else {
        alert('Клуб не найден. Проверьте код или отсканируйте QR.');
      }
    } catch (err) {
      alert('Клуб не найден. Проверьте код или отсканируйте QR.');
    }
  };

  // Рулетка: продолжаем с текущей позиции, крутим минимум один круг и останавливаемся на призе
  const startRouletteSpin = (prize: Prize, onComplete?: () => void) => {
    if (isSpinning || !rouletteRef.current || spinPrizes.length === 0) return;
    setIsSpinning(true);
    setSelectedPrize(null);
    setResult(null);

    const n = spinPrizes.length;
    const targetIndex = spinPrizes.findIndex(
      (p) => p.id === prize.id || (prize.slotIndex !== undefined && p.slotIndex === prize.slotIndex)
    );
    const finalIndex = targetIndex >= 0 ? targetIndex : 0;
    const containerWidth = rouletteRef.current.offsetWidth;
    const centerOffset = containerWidth / 2 - PRIZE_WIDTH / 2;

    const currentScroll = scrollPositionRef.current;
    const oneLap = n * PRIZE_WIDTH;
    const minTravel = oneLap;

    const raw =
      (centerOffset - currentScroll + minTravel) / PRIZE_WIDTH - finalIndex;
    const m = Math.min(
      ROULETTE_COPIES - 1,
      Math.max(0, Math.ceil(raw / n))
    );
    const targetPosition = centerOffset - (m * n + finalIndex) * PRIZE_WIDTH;

    const startPosition = currentScroll;

    const startTime = Date.now();
    const travel = targetPosition - startPosition;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / SPIN_DURATION_MS, 1);
      // Плавное замедление без «подвисания» в конце (степень 3 — не тянем последние секунды)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const pos = startPosition + travel * easeOut;
      setScrollPosition(pos);
      scrollPositionRef.current = pos;

      if (progress >= 1) {
        let finalPos = targetPosition;
        if (finalPos < -NORMALIZE_THRESHOLD_COPIES * oneLap) {
          const shift = Math.ceil(-finalPos / oneLap) * oneLap;
          finalPos += shift;
        }
        setScrollPosition(finalPos);
        scrollPositionRef.current = finalPos;
        setSelectedPrize(prize);
        setIsSpinning(false);
        onComplete?.();
        return;
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  };

  const handleSpin = async () => {
    if (!resolvedClub || !currentUser || currentUser.role !== 'player') return;
    const player = currentUser as Player;
    if (player.balance < 20) {
      alert('Недостаточно баллов для прокрутки! Нужно 20 баллов.');
      return;
    }
    setIsSpinning(true);
    setResult(null);
    setSelectedPrize(null);
    try {
      const prize = await spinRoulette(resolvedClub.id);
      if (prize) {
        startRouletteSpin(prize, () => {
          setResult(prize);
        });
      } else {
        setIsSpinning(false);
        alert(error || 'Ошибка прокрутки');
      }
    } catch (err) {
      setIsSpinning(false);
      alert('Ошибка при прокрутке рулетки');
    }
  };

  const handleGuestSpin = async () => {
    const phone = guestPhone.trim();
    if (!clubParam || !phone) {
      setGuestSpinError('Введите номер телефона');
      return;
    }
    setGuestSpinError(null);
    setGuestSpinLoading(true);
    try {
      const data = await apiService.spinByPhone(clubParam, phone);
      const prizeData = data?.spin?.prize ?? data?.prize;
      if (prizeData) {
        const prize = transformPrize(prizeData);
        startRouletteSpin(prize, () => setResult(prize));
      } else {
        setGuestSpinError(data?.message || 'Не удалось крутить рулетку');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setGuestSpinError(msg || 'Недостаточно баллов или клуб не найден');
    } finally {
      setGuestSpinLoading(false);
    }
  };

  // Гость (не авторизован): либо ввод кода / QR, либо форма "телефон + Крутить"
  if (isGuestFlow) {
    if (clubResolveLoading) {
      return (
        <div className="spin-page">
          <div className="spin-container">
            <div className="spin-page-loading"><p>Загрузка...</p></div>
          </div>
        </div>
      );
    }
    if (!resolvedClub) {
      return (
        <div className="spin-page">
          <div className="spin-container">
            <div className="qr-scanner-container">
              <p className="scan-subtitle">Клуб не найден. Введите код клуба (6 цифр) или отсканируйте QR.</p>
              <QRScanner onScan={handleCodeOrQR} />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={`spin-page${result ? ' spin-result-open' : ''}`}>
        <div className="spin-container">
          <div className="spin-top-bar">
            <div className="spin-phone-info">
              <span className="spin-phone-label">Клуб:</span>
              <span className="spin-phone-value">{resolvedClub.clubName}</span>
            </div>
          </div>
          <div className="club-info">
            <p>Infinity: {resolvedClub.clubName}</p>
            <button type="button" onClick={() => navigate('/spin', { replace: true })} className="rescan-button">
              Ввести другой код
            </button>
          </div>
          {spinPrizesLoading ? (
            <div className="spin-page-loading"><p>Загрузка призов...</p></div>
          ) : spinPrizes.length > 0 ? (
            <>
              <div className="spin-roulette-section">
                <div className="cs-roulette-container">
                  <div className="cs-roulette-pointer" />
                  <div ref={rouletteRef} className="cs-roulette-track">
                    <div
                      className="cs-roulette-items"
                      style={{
                        transform: `translateX(${scrollPosition}px)`,
                        transition: isSpinning ? 'none' : 'transform 0.3s ease-out',
                      }}
                    >
                      {Array.from({ length: ROULETTE_COPIES }, () => spinPrizes).flat().map((prize, index) => (
                        <div
                          key={`${prize.id}-${index}`}
                          className={`cs-prize-item ${!isSpinning && selectedPrize?.id === prize.id ? 'selected' : ''}`}
                        >
                          <div className="cs-prize-inner">
                            {prize.image ? (
                              <img src={prize.image} alt={prize.name} className="cs-prize-image" />
                            ) : (
                              <div className="cs-prize-placeholder">{prize.name.charAt(0)}</div>
                            )}
                            <div className="cs-prize-name">{prize.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="spin-info">
                <p className="spin-info-text">Введите номер телефона и нажмите «Крутить»</p>
              </div>
              <div className="guest-phone-form">
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="+7 999 123 45 67"
                  className="guest-phone-input"
                  disabled={guestSpinLoading || isSpinning}
                />
                {guestSpinError && <p className="guest-spin-error">{guestSpinError}</p>}
                <button
                  type="button"
                  onClick={handleGuestSpin}
                  disabled={guestSpinLoading || isSpinning}
                  className="spin-button"
                >
                  {guestSpinLoading || isSpinning ? 'Прокрутка...' : 'Крутить рулетку'}
                </button>
              </div>
              {result && createPortal(
                <div className="result-overlay" onClick={() => setResult(null)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Escape' && setResult(null)} aria-label="Закрыть">
                  <div className="result-content" onClick={(e) => e.stopPropagation()}>
                    <h2 className="result-title">Выигрыш!</h2>
                    <div className="result-prize">
                      {result.image && <img src={result.image} alt={result.name} className="result-prize-image" />}
                      <div className="result-prize-name">{result.name}</div>
                      {result.description && <div className="result-prize-desc">{result.description}</div>}
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </>
          ) : (
            <div className="spin-page-loading"><p>Нет призов в рулетке</p></div>
          )}
        </div>
      </div>
    );
  }

  // Не авторизован и нет кода в URL — показать ввод кода / QR (без редиректа на auth)
  if (currentUser === null) {
    return (
      <div className="spin-page">
        <div className="spin-container">
          <div className="qr-scanner-container">
            <h1 className="scan-title">Введите код клуба или отсканируйте QR</h1>
            <p className="scan-subtitle">Код клуба — 6 цифр на экране в клубе</p>
            <QRScanner onScan={handleCodeOrQR} />
          </div>
        </div>
      </div>
    );
  }

  if (currentUser.role !== 'player') {
    return (
      <div className="spin-page">
        <div className="error-container">
          <h2>Доступ запрещен</h2>
          <p>Только игроки могут использовать рулетку</p>
        </div>
      </div>
    );
  }

  const player = currentUser as Player;

  // Режим "клиент отсканировал QR": только попап "Спасибо за участие", без рулетки
  if (isClientScanFlow) {
    const clubNotFound = !clubResolveLoading && !resolvedClub && clubParam;
    return (
      <div className="spin-page spin-page-client-flow">
        <div className="spin-container">
          {!thankYouOpen && !clubNotFound && (
            <div className="spin-page-loading">
              <p>{resolvedClub ? 'Участие в рулетке...' : 'Загрузка...'}</p>
            </div>
          )}
          {clubNotFound && (
            <div className="spin-page-loading">
              <p>Клуб не найден</p>
              <button
                type="button"
                onClick={() => navigate('/player', { replace: true })}
                className="thank-you-button"
              >
                Вернуться на главную
              </button>
            </div>
          )}
        </div>
        {thankYouOpen && createPortal(
          <div className="result-overlay thank-you-overlay">
            <div className="result-content thank-you-content">
              <h2 className="result-title">
                {spinErrorMessage ? spinErrorMessage : 'Спасибо за участие!'}
              </h2>
              {!spinErrorMessage && (
                <p className="thank-you-text">Рулетка крутится на экране в клубе</p>
              )}
              <p className="thank-you-redirect">Через 5 сек вы вернётесь на главную</p>
              <button
                type="button"
                onClick={() => navigate('/player', { replace: true })}
                className="thank-you-button"
              >
                Вернуться на главную
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  return (
    <div className={`spin-page${result ? ' spin-result-open' : ''}`}>
      <div className="spin-container">
        {isScanning ? (
          <div className="qr-scanner-container">
            <h1 className="scan-title">Введите код клуба или отсканируйте QR</h1>
            <p className="scan-subtitle">Код клуба — 6 цифр на экране в клубе</p>
            <QRScanner onScan={handleCodeOrQR} />
          </div>
        ) : clubResolveLoading ? (
          <div className="spin-page-loading">
            <p>Загрузка...</p>
          </div>
        ) : !resolvedClub ? (
          <div className="qr-scanner-container">
            <p className="scan-subtitle">Клуб не найден. Введите код (6 цифр) или отсканируйте QR.</p>
            <QRScanner onScan={handleCodeOrQR} />
          </div>
        ) : (
          <>
            <div className="spin-top-bar">
              <div className="spin-phone-info">
                <span className="spin-phone-label">Ваш номер:</span>
                <span className="spin-phone-value">{player.phone ?? '—'}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/player')}
                className="spin-exit-button"
                aria-label="Выход в личный кабинет"
                title="Выход в личный кабинет"
              >
                ✕
              </button>
            </div>

            <div className="spin-header">
              <div className="header-left">
                <BrandLogo alt="Spin Club" className="header-logo" />
                <h1>Рулетка призов</h1>
              </div>
              <div className="balance-info">
                <span>Баланс: {player.balance} баллов</span>
                <span className="spin-cost">Стоимость: 20 баллов</span>
              </div>
            </div>

            <div className="club-info">
              <p>Infinity: {resolvedClub.clubName}</p>
              <button
                onClick={() => setIsScanning(true)}
                className="rescan-button"
              >
                Ввести другой код / сканировать QR
              </button>
            </div>

            <div className="spin-roulette-section">
              {spinPrizesLoading ? (
                <div className="spin-page-loading">
                  <p>Загрузка призов...</p>
                </div>
              ) : spinPrizes.length > 0 ? (
                <div className="cs-roulette-container">
                  <div className="cs-roulette-pointer" />
                  <div ref={rouletteRef} className="cs-roulette-track">
                    <div
                      className="cs-roulette-items"
                      style={{
                        transform: `translateX(${scrollPosition}px)`,
                        transition: isSpinning ? 'none' : 'transform 0.3s ease-out',
                      }}
                    >
                      {Array.from({ length: ROULETTE_COPIES }, () => spinPrizes).flat().map((prize, index) => {
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
                              {prize.value != null && (
                                <div className="cs-prize-value">{prize.value}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="spin-page-loading">
                  <p>Нет призов для рулетки</p>
                </div>
              )}
            </div>

            <div className="spin-info">
              <p className="spin-info-text">
                Нажмите кнопку — рулетка крутится и выпадает приз
              </p>
            </div>

            <button
              onClick={handleSpin}
              disabled={isSpinning || player.balance < 20}
              className="spin-button"
            >
              {isSpinning ? 'Прокрутка...' : 'Запустить рулетку'}
            </button>

            {result && createPortal(
              <div className="result-overlay" onClick={() => setResult(null)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Escape' && setResult(null)} aria-label="Закрыть">
                {result.backgroundImage && (
                  <div
                    className="result-overlay-bg"
                    aria-hidden
                    style={{ backgroundImage: `url(${result.backgroundImage})` }}
                  />
                )}
                <div className="result-content" onClick={(e) => e.stopPropagation()}>
                  <h2 className="result-title">Выигрыш!</h2>
                  <div className="result-prize">
                    {result.image && (
                      <img
                        src={result.image}
                        alt={result.name}
                        className="result-prize-image"
                      />
                    )}
                    <div className="result-prize-name">{result.name}</div>
                    {result.description && (
                      <div className="result-prize-desc">{result.description}</div>
                    )}
                  </div>
                </div>
             </div>,
              document.body
            )}
          </>
        )}
      </div>
    </div>
  );
}

function QRScanner({ onScan }: { onScan: (codeOrToken: string) => void }) {
  const [manualInput, setManualInput] = useState('');

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
    }
  };

  return (
    <div className="qr-scanner">
      <div className="scanner-placeholder">
        <p>📷 Отсканируйте QR-код на экране в клубе</p>
        <p className="hint">Или введите код клуба — 6 цифр</p>
      </div>
      <form onSubmit={handleManualSubmit} className="manual-input-form">
        <input
          type="text"
          inputMode="numeric"
          maxLength={20}
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="Введите код клуба (6 цифр)"
          className="manual-input"
        />
        <button type="submit" className="submit-scan-button">
          Продолжить
        </button>
      </form>
    </div>
  );
}
