const PROD_FRONT = 'https://git-front-sandy.vercel.app';
const PROD_API_BASE = 'https://shop-back-production-a38c.up.railway.app/api';
const PROD_SOCKET = 'https://shop-back-production-a38c.up.railway.app';

function isProdFront(): boolean {
  return typeof window !== 'undefined' && window.location?.origin === PROD_FRONT;
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/** Базовый URL API: на проде (git-front-sandy.vercel.app) — всегда прод бэкенд */
export function getApiBaseUrl(): string {
  if (isProdFront()) return PROD_API_BASE;
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
}

/** URL для Socket.IO: на проде — прод бэкенд, иначе из VITE_API_BASE_URL */
export function getSocketUrl(): string {
  if (isProdFront()) return PROD_SOCKET;
  try {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
    const url = new URL(base);
    return `${url.protocol}//${url.host}`;
  } catch {
    return 'http://localhost:3000';
  }
}

/** Базовый URL сайта для QR-кодов — зашит прод */
const QR_BASE_URL = PROD_FRONT;

export function getQrBaseUrl(): string {
  return QR_BASE_URL;
}

export const API_ENDPOINTS = {
  // Player endpoints
  PLAYER_REGISTER: '/players/register',
  PLAYER_LOGIN: '/players/login',
  PLAYER_ME: '/players/me',
  PLAYER_BALANCE: '/players/balance',
  PLAYER_TRANSACTIONS: '/players/transactions',
  PLAYER_CLUB_BY_QR: '/players/club-by-qr',
  PLAYER_SPIN: '/players/spin',
  PLAYER_PRIZES: '/players/prizes',
  PLAYER_ATTACH_CLUB: '/players/attach-club',

  // Club endpoints
  CLUB_LOGIN: '/clubs/login',
  CLUB_ME: '/clubs/me',
  CLUB_PLAYERS: '/clubs/players',
  CLUB_PLAYERS_STATS: '/clubs/players/stats',
  CLUB_PRIZE_CLAIMS: '/clubs/prize-claims',
  CLUB_PRIZE_CLAIM_CONFIRM: '/clubs/prize-claims',
  CLUB_PRIZE_CLAIM_CLUB_TIME: '/clubs/prize-claims',
  CLUB_REPORTS: '/clubs/reports',

  // Admin endpoints
  ADMIN_LOGIN: '/admin/login',
  ADMIN_CLUBS: '/admin/clubs',
  ADMIN_USERS: '/admin/users',
  ADMIN_PRIZES: '/admin/prizes',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_PRIZE_FUND: '/admin/prize-fund',
  ADMIN_LOGS: '/admin/logs',
} as const;
