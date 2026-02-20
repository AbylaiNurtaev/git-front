import axios, { AxiosInstance, AxiosError } from 'axios';
import { getApiBaseUrl } from '@/config/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: getApiBaseUrl(),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor: прод — всегда прод API; + токен
    this.api.interceptors.request.use(
      (config) => {
        config.baseURL = getApiBaseUrl();
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Interceptor для обработки ошибок
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Токен истек или невалиден — очищаем и токен, и сохранённое состояние (Zustand persist),
          // иначе после перезагрузки приложение снова «считает» пользователя авторизованным и редиректит,
          // запрос снова даёт 401 → получается цикл /auth ↔ /admin
          localStorage.removeItem('token');
          localStorage.removeItem('pc-club-storage');
          window.location.href = '/auth';
        }
        return Promise.reject(error);
      }
    );
  }

  // Unified Auth API
  async login(phone: string, code: string) {
    const response = await this.api.post('/auth/login', { phone, code });
    return response.data;
  }

  // Player API
  async playerRegister(phone: string, code: string) {
    const response = await this.api.post('/players/register', { phone, code });
    return response.data;
  }

  async getPlayerMe() {
    const response = await this.api.get('/players/me');
    return response.data;
  }

  async getPlayerBalance() {
    const response = await this.api.get('/players/balance');
    return response.data;
  }

  async getPlayerTransactions() {
    const response = await this.api.get('/players/transactions');
    return response.data;
  }

  async getClubByQR(qrToken: string) {
    const response = await this.api.get(`/players/club-by-qr/${qrToken}`);
    return response.data;
  }

  /** Получить клуб по коду (6 цифр), qrToken или clubId — публичный, без авторизации */
  async getClub(club: string) {
    const response = await this.api.get('/players/club', {
      params: { club: club.trim() },
    });
    return response.data;
  }

  async spinRoulette(clubId: string) {
    const response = await this.api.post('/players/spin', { clubId });
    return response.data;
  }

  /** Крутить рулетку по телефону без токена — публичный */
  async spinByPhone(clubId: string, phone: string) {
    const response = await this.api.post('/players/spin-by-phone', {
      clubId: clubId.trim(),
      phone: phone.trim(),
    });
    return response.data;
  }

  async getPlayerPrizes() {
    const response = await this.api.get('/players/prizes');
    return response.data;
  }

  async getRoulettePrizes(clubId?: string) {
    const url = clubId
      ? `/players/roulette-prizes?club=${encodeURIComponent(clubId)}`
      : '/players/roulette-prizes';
    const response = await this.api.get(url);
    return response.data;
  }

  /** Публичный эндпоинт: последние 10 выигрышей (для ленты на /club/qr). Приоритет отображения: name / playerName → maskedPhone → "Гость" */
  async getRecentWins(): Promise<Array<{ name?: string; playerName?: string; maskedPhone?: string; prizeName: string; text?: string }>> {
    const response = await this.api.get('/players/recent-wins');
    return response.data ?? [];
  }

  async attachClub(clubId: string) {
    const response = await this.api.post('/players/attach-club', { clubId });
    return response.data;
  }

  // Club API
  async clubLogin(phone: string, code: string) {
    const response = await this.api.post('/clubs/login', { phone, code });
    return response.data;
  }

  async getClubMe() {
    const response = await this.api.get('/clubs/me');
    return response.data;
  }

  /**
   * Загрузить фон страницы QR (PNG, GIF, видео). Бэкенд: POST /clubs/me/qr-background, multipart, поле file.
   * Ответ: { url: string }. Лимиты: объём до 10 MB, рекомендуемый размер 1920×1080.
   */
  async uploadClubQRBackground(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.api.post<{ url: string }>('/clubs/me/qr-background', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  /**
   * Обновить профиль своего клуба (theme, qrPageTheme, qrPageBackground и т.д.) — для авторизованного клуба.
   * Бэкенд: PATCH /clubs/me принимает body { theme?, qrPageTheme?, qrPageBackground? }.
   * qrPageBackground: { url: string, opacity: number } (opacity 0–1). GET /clubs/me возвращает qrPageBackground.
   */
  async updateClubMe(data: Partial<{
    theme: { primary: string; primaryDark: string; accent?: string };
    qrPageTheme: import('@/types').QRPageTheme;
    qrPageBackground: import('@/types').QRPageBackground;
  }>) {
    const response = await this.api.patch('/clubs/me', data);
    return response.data;
  }

  async getClubPlayers() {
    const response = await this.api.get('/clubs/players');
    return response.data;
  }

  async getClubPlayersStats() {
    const response = await this.api.get('/clubs/players/stats');
    return response.data;
  }

  async getClubPrizeClaims(page = 1, limit = 20) {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    const response = await this.api.get(`/clubs/prize-claims?${params.toString()}`);
    const data = response.data;
    if (Array.isArray(data)) {
      return { items: data, pagination: { page: 1, limit: data.length, total: data.length, totalPages: 1 } };
    }
    return {
      items: data.items ?? [],
      pagination: data.pagination ?? { page: 1, limit, total: data.items?.length ?? 0, totalPages: 1 },
    };
  }

  async confirmPrizeClaim(claimId: string, notes?: string) {
    const response = await this.api.put(`/clubs/prize-claims/${claimId}/confirm`, { notes });
    return response.data;
  }

  async updateClubTime(claimId: string, action: string) {
    const response = await this.api.put(`/clubs/prize-claims/${claimId}/club-time`, { action });
    return response.data;
  }

  async getClubReports(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await this.api.get(`/clubs/reports?${params.toString()}`);
    return response.data;
  }

  async getClubLatestSpin() {
    // Отчёт за последние 2 дня, чтобы не пропустить спин из‑за часового пояса
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 2);
    const startDate = start.toISOString().split('T')[0];
    const endDate = end.toISOString().split('T')[0];
    const response = await this.api.get(`/clubs/reports?startDate=${startDate}&endDate=${endDate}`);
    const reports = response.data;
    if (reports?.spins && reports.spins.length > 0) {
      const sortedSpins = [...reports.spins].sort((a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      return sortedSpins[0];
    }
    return null;
  }

  /** Кол-во спинов клуба за текущий день */
  async getClubSpinsToday() {
    const response = await this.api.get('/clubs/spins-today');
    return response.data;
  }

  // Admin API
  async adminLogin(phone: string, code: string) {
    const response = await this.api.post('/admin/login', { phone, code });
    return response.data;
  }

  async createClub(data: { name: string; phone: string; address: string; managerFio?: string; city?: string; latitude: number; longitude: number }) {
    const response = await this.api.post('/admin/clubs', data);
    return response.data;
  }

  async getClubs() {
    const response = await this.api.get('/admin/clubs');
    return response.data;
  }

  async getAdminClub(id: string) {
    const response = await this.api.get(`/admin/clubs/${id}`);
    return response.data;
  }

  async updateClub(
    id: string,
    data: Partial<{
      name: string;
      isActive: boolean;
      managerFio?: string;
      city?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      theme?: { primary: string; primaryDark: string; accent?: string };
    }>
  ) {
    const response = await this.api.put(`/admin/clubs/${id}`, data);
    return response.data;
  }

  async deleteClub(id: string) {
    const response = await this.api.delete(`/admin/clubs/${id}`);
    return response.data;
  }

  async getUsers(role?: string) {
    const params = role ? `?role=${role}` : '';
    const response = await this.api.get(`/admin/users${params}`);
    return response.data;
  }

  async getAdminUser(id: string) {
    const response = await this.api.get(`/admin/users/${id}`);
    return response.data;
  }

  async updateUser(id: string, data: Partial<{ balance: number; isActive: boolean }>) {
    const response = await this.api.put(`/admin/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string) {
    const response = await this.api.delete(`/admin/users/${id}`);
    return response.data;
  }

  /** Временный или бессрочный бан пользователя (POST /api/admin/users/:id/ban) */
  async banUser(
    id: string,
    data: {
      /** Кол-во дней бана. Если не указывать — бессрочный бан. */
      days?: number;
      /** Причина блокировки (обязательно). */
      reason: string;
    }
  ) {
    const response = await this.api.post(`/admin/users/${id}/ban`, data);
    return response.data;
  }

  /** Снять бан с пользователя (POST /api/admin/users/:id/unban) */
  async unbanUser(id: string) {
    const response = await this.api.post(`/admin/users/${id}/unban`, {});
    return response.data;
  }

  async createPrize(data: {
    name: string;
    type: string;
    value?: number;
    dropChance: number;
    slotIndex: number;
    totalQuantity: number;
    image?: File | null;
    backgroundImage?: File | null;
  }) {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('type', data.type);
    if (data.value !== undefined) {
      formData.append('value', data.value.toString());
    }
    formData.append('dropChance', data.dropChance.toString());
    formData.append('slotIndex', data.slotIndex.toString());
    formData.append('totalQuantity', data.totalQuantity.toString());
    if (data.image) {
      formData.append('image', data.image);
    }
    if (data.backgroundImage) {
      formData.append('backgroundImage', data.backgroundImage);
    }

    const response = await this.api.post('/admin/prizes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getPrizes() {
    const response = await this.api.get('/admin/prizes');
    return response.data;
  }

  async updatePrize(id: string, data: Partial<{
    name: string;
    type: string;
    value?: number;
    dropChance: number;
    slotIndex: number;
    totalQuantity: number;
    isActive: boolean;
    image?: File | null;
    backgroundImage?: File | null;
    removeBackgroundImage?: boolean;
  }>) {
    const formData = new FormData();
    if (data.name !== undefined) {
      formData.append('name', data.name);
    }
    if (data.type !== undefined) {
      formData.append('type', data.type);
    }
    if (data.value !== undefined) {
      formData.append('value', data.value.toString());
    }
    if (data.dropChance !== undefined) {
      formData.append('dropChance', data.dropChance.toString());
    }
    if (data.slotIndex !== undefined) {
      formData.append('slotIndex', data.slotIndex.toString());
    }
    if (data.totalQuantity !== undefined) {
      formData.append('totalQuantity', data.totalQuantity.toString());
    }
    if (data.isActive !== undefined) {
      formData.append('isActive', data.isActive.toString());
    }
    if (data.image) {
      formData.append('image', data.image);
    }
    if (data.backgroundImage) {
      formData.append('backgroundImage', data.backgroundImage);
    }
    if (data.removeBackgroundImage === true) {
      formData.append('removeBackgroundImage', 'true');
    }

    const response = await this.api.put(`/admin/prizes/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async deletePrize(id: string) {
    const response = await this.api.delete(`/admin/prizes/${id}`);
    return response.data;
  }

  /** Задать порядок призов в рулетке (слоты). order — массив _id призов, позиция = номер слота. */
  async reorderPrizes(order: string[]) {
    const response = await this.api.put('/admin/prizes/reorder', { order });
    return response.data;
  }

  async getAnalytics(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await this.api.get(`/admin/analytics?${params.toString()}`);
    return response.data;
  }

  /** Аналитика по городам: summary + byCity (клубы по городам) */
  async getAnalyticsByCity(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await this.api.get(`/admin/analytics/by-city?${params.toString()}`);
    return response.data;
  }

  /** Аналитика по одному клубу: club, analytics, recentSpins */
  async getAnalyticsClub(clubId: string) {
    const response = await this.api.get(`/admin/analytics/club/${clubId}`);
    return response.data;
  }

  async updatePrizeFund(data: { prizeId: string; totalQuantity: number; remainingQuantity: number }) {
    const response = await this.api.put('/admin/prize-fund', data);
    return response.data;
  }

  async getLogs(type?: string, startDate?: string) {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (startDate) params.append('startDate', startDate);
    const response = await this.api.get(`/admin/logs?${params.toString()}`);
    return response.data;
  }

  // Company logo (admin)
  /** Получить логотип компании (для админки). GET /api/admin/company/logo */
  async getCompanyLogo() {
    const response = await this.api.get('/admin/company/logo');
    return response.data;
  }

  /** Загрузить/обновить логотип компании. POST /api/admin/company/logo (multipart/form-data, поле image) */
  async uploadCompanyLogo(image: File) {
    const formData = new FormData();
    formData.append('image', image);

    const response = await this.api.post('/admin/company/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /** Удалить кастомный логотип компании, вернуть дефолтный. DELETE /api/admin/company/logo */
  async deleteCompanyLogo() {
    const response = await this.api.delete('/admin/company/logo');
    return response.data;
  }
}

export const apiService = new ApiService();
