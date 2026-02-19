export type UserRole = 'admin' | 'club' | 'player';

export interface User {
  id: string;
  phone: string;
  role: UserRole;
  name?: string;
  email?: string;
  createdAt: string;
}

export interface Player extends User {
  role: 'player';
  balance: number;
  clubId?: string;
  prizes: Prize[];
  /** Количество выигранных призов (с бэкенда) */
  prizeCount?: number;
  history: Transaction[];
}

/** Цветовая палитра клуба — сохраняется на бэкенде и подставляется в тему сайта */
export interface ClubTheme {
  /** Основной цвет (кнопки, акценты) — hex, например #8B5CF6 */
  primary: string;
  /** Тёмный вариант основного (градиенты, ховеры) — hex */
  primaryDark: string;
  /** Дополнительный акцент (подсветка, неон) — hex */
  accent?: string;
}

/** Цвета страницы QR рулетки — каждый элемент редактируемый (пока хранится в localStorage) */
export interface QRPageTheme {
  pageBg: string;
  spinContainerBg: string;
  spinnerLabel: string;
  spinnerValue: string;
  pointer: string;
  trackBg: string;
  cardBg: string;
  cardBorder: string;
  cardText: string;
  cardPlaceholderBg: string;
  selectedCardBorder: string;
  winsChatBg: string;
  winsChatText: string;
  fullscreenBtnBg: string;
  fullscreenBtnText: string;
  fullscreenBtnBorder: string;
  resultOverlayBg: string;
  resultContentBg: string;
  resultTitle: string;
  resultPrizeText: string;
  loadingText: string;
  retryBtnBg: string;
  retryBtnText: string;
}

/** Фон страницы QR (изображение/видео) — URL загруженного файла и непрозрачность 0–1 */
export interface QRPageBackground {
  url: string;
  opacity: number;
}

export interface Club extends User {
  role: 'club';
  clubId: string;
  clubName: string;
  qrCode: string;
  token: string;
  /** Код клуба (6 цифр) для ввода без QR */
  pinCode?: string;
  players: string[];
  /** Количество игроков в клубе (с бэкенда) */
  playerCount?: number;
  statistics: ClubStatistics;
  /** ФИО менеджера клуба (необязательно) */
  managerFio?: string;
  /** Город клуба (для аналитики по городам) */
  city?: string;
  /** Адрес (с бэкенда) */
  address?: string;
  /** Широта (геолокация клуба) */
  latitude?: number;
  /** Долгота (геолокация клуба) */
  longitude?: number;
  /** Цветовая палитра клуба — тема сайта при входе по QR/коду клуба и в кабинете клуба */
  theme?: ClubTheme;
  /** Оформление страницы QR рулетки (цвета элементов) — сохраняется на бэкенде */
  qrPageTheme?: QRPageTheme;
  /** Фон страницы QR (PNG, GIF, видео) + непрозрачность — сохраняется на бэкенде */
  qrPageBackground?: QRPageBackground;
}

export interface Admin extends User {
  role: 'admin';
}

export interface Prize {
  id: string;
  name: string;
  type: 'physical' | 'points' | 'time' | 'none' | 'club_time';
  value?: number;
  description: string;
  image?: string;
  /** URL фона модалки выигрыша (задаётся админом) */
  backgroundImage?: string;
  probability: number;
  slotIndex?: number;
  /** Участвует ли приз в рулетке (админ может отключить) */
  isActive?: boolean;
  status: 'pending' | 'confirmed' | 'issued';
  wonAt: string;
  clubId?: string;
}

export interface Transaction {
  id: string;
  type: 'earned' | 'spent' | 'prize';
  amount: number;
  description: string;
  date: string;
  clubId?: string;
}

export interface ClubStatistics {
  totalPlayers: number;
  totalSpins: number;
  totalPrizes: number;
  activePlayers: number;
}

export interface RouletteSlot {
  id: string;
  prizeId: string;
  probability: number;
}

export interface RouletteConfig {
  slots: RouletteSlot[];
  totalProbability: number;
}

/** Ответ GET /admin/users/:id — детальная карточка пользователя */
export interface AdminUserDetailClub {
  name: string;
  clubId: string;
  address?: string;
}

export interface AdminUserDetailVisit {
  createdAt: string;
}

export interface AdminUserDetailClubVisits {
  clubId: string;
  clubName: string;
  clubSlug: string;
  visits: AdminUserDetailVisit[];
  totalVisits: number;
}

export interface AdminUserDetailBalanceItem {
  _id: string;
  type: string;
  amount: number;
  description?: string;
  createdAt: string;
  relatedSpinId?: unknown;
}

export interface AdminUserDetail {
  _id: string;
  phone: string;
  role: string;
  balance: number;
  clubId?: string;
  isActive?: boolean;
  /** Флаг бана (GET /admin/users/:id → isBanned: true/false) */
  isBanned?: boolean;
  /** Причина бана, если есть */
  banReason?: string;
  /** Дата окончания временного бана (ISO-строка), если есть */
  banUntil?: string;
  createdAt: string;
  name?: string;
  email?: string;
  club?: AdminUserDetailClub;
  visitHistory: AdminUserDetailClubVisits[];
  balanceHistory: AdminUserDetailBalanceItem[];
}

/** Клуб в отчёте аналитики по городам */
export interface AnalyticsByCityClub {
  id: string;
  name: string;
  address?: string;
  manager?: string;
  isActive?: boolean;
  playerCount: number;
  spinsCount: number;
  totalSpent: number;
  prizeClaimsCount: number;
}

/** Данные по одному городу (GET /admin/analytics/by-city) */
export interface AnalyticsByCityItem {
  city: string;
  clubCount: number;
  totalPlayers: number;
  totalSpins: number;
  totalSpent: number;
  clubs: AnalyticsByCityClub[];
}

/** Ответ GET /admin/analytics/by-city */
export interface AnalyticsByCityResponse {
  summary: { cityCount: number; totalClubs: number };
  byCity: AnalyticsByCityItem[];
}

/** Один спин в отчёте по клубу */
export interface AnalyticsClubRecentSpin {
  id: string;
  playerPhone?: string;
  playerId?: string;
  prizeName?: string;
  prizeId?: string;
  createdAt: string;
}

/** Пагинация заявок на призы GET /clubs/prize-claims */
export interface PrizeClaimsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Ответ GET /clubs/prize-claims с пагинацией */
export interface ClubPrizeClaimsResponse {
  items: any[];
  pagination: PrizeClaimsPagination;
}

/** Ответ GET /admin/analytics/club/:id */
export interface AnalyticsClubResponse {
  club: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    managerFio?: string;
    phone?: string;
    clubId?: string;
    isActive?: boolean;
  };
  analytics: {
    playerCount: number;
    spinsCount: number;
    totalSpent: number;
    prizeClaimsCount: number;
  };
  recentSpins: AnalyticsClubRecentSpin[];
}
