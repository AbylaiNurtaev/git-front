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

export interface Club extends User {
  role: 'club';
  clubId: string;
  clubName: string;
  qrCode: string;
  token: string;
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
