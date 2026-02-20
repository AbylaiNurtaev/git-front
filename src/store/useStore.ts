import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Player, Club, Admin, Prize, RouletteConfig, AnalyticsByCityResponse, AnalyticsClubResponse, ClubPrizeClaimsResponse } from '@/types';
import { apiService } from '@/services/api';
import {
  transformUser,
  transformPlayer,
  transformClub,
  transformAdmin,
  transformPrize,
  transformTransaction,
  transformSpinResponse,
} from '@/utils/transformers';

interface Store {
  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  token: string | null;
  
  // Data
  players: Player[];
  clubs: Club[];
  admins: Admin[];
  prizes: Prize[];
  rouletteConfig: RouletteConfig;
  /** URL кастомного логотипа компании для админки (если загружен) */
  companyLogoUrl: string | null;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (phone: string, code: string) => Promise<boolean>;
  register: (phone: string, code: string) => Promise<boolean>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
  fetchPlayerData: () => Promise<void>;
  fetchClubData: () => Promise<void>;
  fetchAdminData: () => Promise<void>;
  /** Загрузить URL логотипа компании (для админа) */
  fetchCompanyLogo: () => Promise<void>;
  /** Загрузить/обновить логотип компании */
  uploadCompanyLogo: (image: File) => Promise<boolean>;
  /** Удалить кастомный логотип компании (вернуться к дефолтному) */
  deleteCompanyLogo: () => Promise<boolean>;
  
  // Player actions
  spinRoulette: (clubId: string) => Promise<Prize | null>;
  getClubByQR: (qrToken: string) => Promise<Club | null>;
  getClub: (club: string) => Promise<Club | null>;
  attachClub: (clubId: string) => Promise<boolean>;
  
  // Club actions
  fetchClubPlayers: () => Promise<Player[]>;
  fetchClubPlayersStats: () => Promise<any>;
  fetchClubPrizeClaims: (page?: number, limit?: number) => Promise<ClubPrizeClaimsResponse>;
  confirmPrizeClaim: (claimId: string, notes?: string) => Promise<boolean>;
  updateClubTime: (claimId: string, action: string) => Promise<boolean>;
  fetchClubReports: (startDate?: string, endDate?: string) => Promise<any>;
  /** Обновить профиль своего клуба (в т.ч. палитру) */
  updateClubMe: (data: Partial<{ theme: import('@/types').ClubTheme; qrPageTheme: import('@/types').QRPageTheme; qrPageBackground: import('@/types').QRPageBackground }>) => Promise<boolean>;
  
  // Admin actions
  fetchClubs: () => Promise<Club[]>;
  createClub: (data: { name: string; phone: string; address: string; managerFio?: string; city?: string; latitude: number; longitude: number }) => Promise<Club | null>;
  updateClub: (id: string, data: Partial<{ name: string; isActive: boolean; managerFio?: string; city?: string; address?: string; latitude?: number; longitude?: number; theme?: import('@/types').ClubTheme }>) => Promise<boolean>;
  deleteClub: (id: string) => Promise<boolean>;
  fetchUsers: (role?: string) => Promise<User[]>;
  updateUser: (id: string, data: Partial<{ balance: number; isActive: boolean }>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  fetchPrizes: () => Promise<Prize[]>;
  createPrize: (data: {
    name: string;
    type: string;
    value?: number;
    dropChance: number;
    slotIndex: number;
    totalQuantity: number;
    image?: File | null;
    backgroundImage?: File | null;
  }) => Promise<Prize | null>;
  updatePrize: (id: string, data: Partial<{
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
  }>) => Promise<boolean>;
  deletePrize: (id: string) => Promise<boolean>;
  /** Задать порядок призов (слоты рулетки). order — массив id призов, позиция = номер слота. */
  reorderPrizes: (order: string[]) => Promise<boolean>;
  fetchAnalytics: (startDate?: string, endDate?: string) => Promise<any>;
  fetchAnalyticsByCity: (startDate?: string, endDate?: string) => Promise<AnalyticsByCityResponse | null>;
  fetchAnalyticsClub: (clubId: string) => Promise<AnalyticsClubResponse | null>;
  updatePrizeFund: (data: { prizeId: string; totalQuantity: number; remainingQuantity: number }) => Promise<boolean>;
  fetchLogs: (type?: string, startDate?: string) => Promise<any>;
  
  // Utility
  setError: (error: string | null) => void;
      clearError: () => void;

      // Bans
      banUser: (id: string, data: { days?: number; reason: string }) => Promise<boolean>;
      unbanUser: (id: string) => Promise<boolean>;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      token: null,
      players: [],
      clubs: [],
      admins: [],
      prizes: [],
      rouletteConfig: {
        slots: [],
        totalProbability: 0,
      },
      companyLogoUrl: null,
      isLoading: false,
      error: null,

      login: async (phone: string, code: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // Единый эндпоинт для всех ролей
          const response = await apiService.login(phone, code);

          if (response.token) {
            localStorage.setItem('token', response.token);
            
            // Определяем роль из ответа и преобразуем пользователя
            let user: User | Player | Club | Admin;
            if (response.role === 'admin') {
              user = transformAdmin(response);
              // Загружаем данные админа после логина
              setTimeout(() => get().fetchAdminData(), 100);
            } else if (response.role === 'club') {
              user = transformClub(response);
              // Загружаем данные клуба после логина
              setTimeout(() => get().fetchClubData(), 100);
            } else {
              // Для игроков может потребоваться дополнительная загрузка данных
              user = transformPlayer(response);
              // Загружаем данные игрока после логина
              setTimeout(() => get().fetchPlayerData(), 100);
            }
            
            set({
              currentUser: user,
              isAuthenticated: true,
              token: response.token,
              isLoading: false,
            });
            return true;
          }
          return false;
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Ошибка авторизации',
            isLoading: false,
          });
          return false;
        }
      },

      register: async (phone: string, code: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiService.playerRegister(phone, code);
          
          if (response.token) {
            localStorage.setItem('token', response.token);
            const player = transformPlayer(response);
            set({
              currentUser: player,
              isAuthenticated: true,
              token: response.token,
              isLoading: false,
            });
            return true;
          }
          return false;
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Ошибка регистрации',
            isLoading: false,
          });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({
          currentUser: null,
          isAuthenticated: false,
          token: null,
          error: null,
        });
      },

      fetchCurrentUser: async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;

          const { currentUser } = get();
          if (!currentUser) return;

          let response: any;
          if (currentUser.role === 'player') {
            response = await apiService.getPlayerMe();
            const player = transformPlayer(response);
            set({ currentUser: player });
          } else if (currentUser.role === 'club') {
            response = await apiService.getClubMe();
            const club = transformClub(response);
            set({ currentUser: club });
          }
        } catch (error: any) {
          if (error.response?.status === 401) {
            get().logout();
          }
        }
      },

      fetchPlayerData: async () => {
        try {
          set({ isLoading: true });
          const [balanceRes, transactionsRes, prizesRes] = await Promise.all([
            apiService.getPlayerBalance(),
            apiService.getPlayerTransactions(),
            apiService.getPlayerPrizes(),
          ]);

          const player = get().currentUser as Player;
          if (player) {
            const updatedPlayer: Player = {
              ...player,
              balance: balanceRes.balance || player.balance,
              history: transactionsRes.map(transformTransaction),
              prizes: prizesRes.map(transformPrize),
            };
            set({ currentUser: updatedPlayer, isLoading: false });
          }
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка загрузки данных', isLoading: false });
        }
      },

      fetchClubData: async () => {
        try {
          set({ isLoading: true });
          const [clubRes, playersRes, statsRes, claimsRes] = await Promise.all([
            apiService.getClubMe(),
            apiService.getClubPlayers(),
            apiService.getClubPlayersStats(),
            apiService.getClubPrizeClaims(1, 1),
          ]);

          const club = transformClub(clubRes);
          const totalPrizes = claimsRes.pagination?.total ?? claimsRes.items?.length ?? 0;
          club.statistics = {
            totalPlayers: statsRes.totalPlayers || 0,
            totalSpins: statsRes.totalSpins || 0,
            totalPrizes,
            activePlayers: playersRes.length || 0,
          };

          set({
            currentUser: club,
            players: playersRes.map(transformPlayer),
            isLoading: false,
          });
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка загрузки данных', isLoading: false });
        }
      },

      fetchAdminData: async () => {
        try {
          set({ isLoading: true });
          const [clubsRes, usersRes, prizesRes] = await Promise.all([
            apiService.getClubs(),
            apiService.getUsers(),
            apiService.getPrizes(),
          ]);

          const activePrizes = prizesRes.filter((p: any) => p.isActive !== false);
          set({
            clubs: clubsRes.map(transformClub),
            players: usersRes.filter((u: any) => u.role === 'player').map(transformPlayer),
            admins: usersRes.filter((u: any) => u.role === 'admin').map(transformAdmin),
            prizes: prizesRes.map(transformPrize),
            rouletteConfig: {
              slots: activePrizes.map((prize: any, index: number) => ({
                id: `slot-${index}`,
                prizeId: prize._id || prize.id,
                probability: (prize.dropChance || 0) / 100,
              })),
              totalProbability: activePrizes.reduce((sum: number, p: any) => sum + (p.dropChance || 0) / 100, 0),
            },
            isLoading: false,
          });
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка загрузки данных', isLoading: false });
        }
      },

      fetchCompanyLogo: async () => {
        try {
          const data = await apiService.getCompanyLogo();
          // Бэкенд может вернуть строку-URL или объект с полем url/logoUrl
          const url =
            typeof data === 'string'
              ? data
              : data?.url || data?.logoUrl || null;
          set({ companyLogoUrl: url });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Ошибка загрузки логотипа',
            companyLogoUrl: null,
          });
        }
      },

      uploadCompanyLogo: async (image: File) => {
        try {
          set({ isLoading: true, error: null });
          const data = await apiService.uploadCompanyLogo(image);
          const url =
            typeof data === 'string'
              ? data
              : data?.url || data?.logoUrl || null;
          set({
            companyLogoUrl: url,
            isLoading: false,
          });
          return true;
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Ошибка загрузки логотипа',
            isLoading: false,
          });
          return false;
        }
      },

      deleteCompanyLogo: async () => {
        try {
          set({ isLoading: true, error: null });
          await apiService.deleteCompanyLogo();
          set({
            companyLogoUrl: null,
            isLoading: false,
          });
          return true;
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Ошибка удаления логотипа',
            isLoading: false,
          });
          return false;
        }
      },

      spinRoulette: async (clubId: string): Promise<Prize | null> => {
        try {
          set({ isLoading: true, error: null });
          const response = await apiService.spinRoulette(clubId);
          const { spin, newBalance } = transformSpinResponse(response);
          
          const player = get().currentUser as Player;
          if (player) {
            const prize = transformPrize(spin.prize);
            const updatedPlayer: Player = {
              ...player,
              balance: newBalance,
              prizes: [prize, ...player.prizes],
            };
            set({ currentUser: updatedPlayer, isLoading: false });
            return prize;
          }
          return null;
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Ошибка прокрутки рулетки',
            isLoading: false,
          });
          return null;
        }
      },

      getClubByQR: async (qrToken: string): Promise<Club | null> => {
        try {
          const response = await apiService.getClubByQR(qrToken);
          return transformClub(response);
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Infinity не найден' });
          return null;
        }
      },

      getClub: async (club: string): Promise<Club | null> => {
        try {
          const response = await apiService.getClub(club);
          return transformClub(response);
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Клуб не найден' });
          return null;
        }
      },

      attachClub: async (clubId: string) => {
        try {
          await apiService.attachClub(clubId);
          await get().fetchCurrentUser();
          return true;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка привязки к Infinity' });
          return false;
        }
      },

      fetchClubPlayers: async () => {
        try {
          const response = await apiService.getClubPlayers();
          const players = response.map(transformPlayer);
          set({ players });
          return players;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка загрузки игроков' });
          return [];
        }
      },

      fetchClubPlayersStats: async () => {
        try {
          return await apiService.getClubPlayersStats();
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка загрузки статистики' });
          return {};
        }
      },

      fetchClubPrizeClaims: async (page = 1, limit = 20) => {
        try {
          return await apiService.getClubPrizeClaims(page, limit);
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка загрузки заявок' });
          return { items: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
        }
      },

      confirmPrizeClaim: async (claimId: string, notes?: string) => {
        try {
          await apiService.confirmPrizeClaim(claimId, notes);
          return true;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка подтверждения приза' });
          return false;
        }
      },

      updateClubTime: async (claimId: string, action: string) => {
        try {
          await apiService.updateClubTime(claimId, action);
          return true;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка обновления времени' });
          return false;
        }
      },

      fetchClubReports: async (startDate?: string, endDate?: string) => {
        try {
          return await apiService.getClubReports(startDate, endDate);
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка загрузки отчетов' });
          return {};
        }
      },

      updateClubMe: async (data) => {
        try {
          await apiService.updateClubMe(data);
          await get().fetchClubData();
          return true;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка сохранения настроек' });
          return false;
        }
      },

      fetchClubs: async () => {
        try {
          const response = await apiService.getClubs();
          const clubs = response.map(transformClub);
          set({ clubs });
          return clubs;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка загрузки Infinity' });
          return [];
        }
      },

      createClub: async (data: { name: string; phone: string; address: string; managerFio?: string; city?: string; latitude: number; longitude: number }) => {
        try {
          const response = await apiService.createClub(data);
          const club = transformClub(response);
          set({ clubs: [...get().clubs, club] });
          return club;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка создания Infinity' });
          return null;
        }
      },

      updateClub: async (id: string, data: Partial<{ name: string; isActive: boolean; managerFio?: string; city?: string; address?: string; latitude?: number; longitude?: number; theme?: import('@/types').ClubTheme }>) => {
        try {
          await apiService.updateClub(id, data);
          await get().fetchClubs();
          return true;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка обновления Infinity' });
          return false;
        }
      },

      deleteClub: async (id: string) => {
        try {
          await apiService.deleteClub(id);
          set({ clubs: get().clubs.filter(c => c.id !== id) });
          return true;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка удаления Infinity' });
          return false;
        }
      },

      fetchUsers: async (role?: string) => {
        try {
          const response = await apiService.getUsers(role);
          const users = response.map((u: any) => {
            if (u.role === 'player') return transformPlayer(u);
            if (u.role === 'admin') return transformAdmin(u);
            return transformUser(u);
          });
          const playersList = users.filter((u: any) => u.role === 'player') as Player[];
          const adminsList = users.filter((u: any) => u.role === 'admin') as Admin[];
          if (role === 'player') {
            set({ players: users as Player[] });
          } else if (role === 'admin') {
            set({ admins: users as Admin[] });
          } else {
            set({ players: playersList, admins: adminsList });
          }
          return users;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка загрузки пользователей' });
          return [];
        }
      },

      updateUser: async (id: string, data: Partial<{ balance: number; isActive: boolean }>) => {
        try {
          await apiService.updateUser(id, data);
          await get().fetchUsers();
          return true;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка обновления пользователя' });
          return false;
        }
      },

      deleteUser: async (id: string) => {
        try {
          await apiService.deleteUser(id);
          set({ players: get().players.filter(p => p.id !== id) });
          return true;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка удаления пользователя' });
          return false;
        }
      },

      fetchPrizes: async () => {
        try {
          const response = await apiService.getPrizes();
          const prizes = response.map(transformPrize);
          const activePrizes = Array.isArray(response) ? response.filter((p: any) => p.isActive !== false) : [];
          const rouletteConfig = {
            slots: activePrizes.map((prize: any, index: number) => ({
              id: `slot-${index}`,
              prizeId: prize._id || prize.id,
              probability: (prize.dropChance || 0) / 100,
            })),
            totalProbability: activePrizes.reduce((sum: number, p: any) => sum + (p.dropChance || 0) / 100, 0),
          };
          set({ prizes, rouletteConfig });
          return prizes;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка загрузки призов' });
          return [];
        }
      },

      createPrize: async (data: {
        name: string;
        type: string;
        value?: number;
        dropChance: number;
        slotIndex: number;
        totalQuantity: number;
        image?: File | null;
        backgroundImage?: File | null;
      }) => {
        try {
          const response = await apiService.createPrize(data);
          const prize = transformPrize(response);
          set({ prizes: [...get().prizes, prize] });
          return prize;
        } catch (error: any) {
          const message = error.response?.data?.message || 'Ошибка создания приза';
          set({ error: message });
          throw new Error(message);
        }
      },

      updatePrize: async (id: string, data: Partial<{
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
      }>) => {
        try {
          const response = await apiService.updatePrize(id, data);
          const prev = get().prizes.find((p) => p.id === id);
          const updated = transformPrize(response ?? { _id: id, ...data });
          const merged = prev ? { ...prev, ...updated } : updated;
          if (prev && merged.backgroundImage === undefined && prev.backgroundImage)
            merged.backgroundImage = prev.backgroundImage;
          set({
            prizes: get().prizes.map((p) => (p.id === id ? merged : p)),
          });
          return true;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка обновления приза' });
          return false;
        }
      },

      deletePrize: async (id: string) => {
        try {
          await apiService.deletePrize(id);
          set({ prizes: get().prizes.filter(p => p.id !== id) });
          return true;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка удаления приза' });
          return false;
        }
      },

      reorderPrizes: async (order: string[]) => {
        try {
          const response = await apiService.reorderPrizes(order);
          const prizes = Array.isArray(response) ? response.map(transformPrize) : [];
          const activePrizes = Array.isArray(response) ? response.filter((p: any) => p.isActive !== false) : [];
          const rouletteConfig = {
            slots: activePrizes.map((prize: any, index: number) => ({
              id: `slot-${index}`,
              prizeId: prize._id || prize.id,
              probability: (prize.dropChance || 0) / 100,
            })),
            totalProbability: activePrizes.reduce((sum: number, p: any) => sum + (p.dropChance || 0) / 100, 0),
          };
          set({ prizes, rouletteConfig });
          return true;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка изменения порядка призов' });
          return false;
        }
      },

      fetchAnalytics: async (startDate?: string, endDate?: string) => {
        try {
          return await apiService.getAnalytics(startDate, endDate);
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка загрузки аналитики' });
          return {};
        }
      },

      fetchAnalyticsByCity: async (startDate?: string, endDate?: string) => {
        try {
          return await apiService.getAnalyticsByCity(startDate, endDate);
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка загрузки аналитики по городам' });
          return null;
        }
      },

      fetchAnalyticsClub: async (clubId: string) => {
        try {
          return await apiService.getAnalyticsClub(clubId);
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка загрузки аналитики клуба' });
          return null;
        }
      },

      updatePrizeFund: async (data: { prizeId: string; totalQuantity: number; remainingQuantity: number }) => {
        try {
          await apiService.updatePrizeFund(data);
          return true;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка обновления фонда' });
          return false;
        }
      },

      fetchLogs: async (type?: string, startDate?: string) => {
        try {
          return await apiService.getLogs(type, startDate);
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка загрузки логов' });
          return {};
        }
      },

      banUser: async (id: string, data: { days?: number; reason: string }) => {
        try {
          await apiService.banUser(id, data);
          // Обновляем список пользователей, чтобы статус сразу подтянулся
          await get().fetchUsers();
          return true;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка бана пользователя' });
          return false;
        }
      },

      unbanUser: async (id: string) => {
        try {
          await apiService.unbanUser(id);
          await get().fetchUsers();
          return true;
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Ошибка разбана пользователя' });
          return false;
        }
      },

      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'pc-club-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        token: state.token,
      }),
    }
  )
);
