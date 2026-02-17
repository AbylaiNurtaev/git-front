import type { User, Player, Club, Admin, Prize, Transaction } from '@/types';

// Transform backend response to frontend types
export function transformUser(user: any): User {
  return {
    id: user._id || user.id,
    phone: user.phone,
    role: user.role,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt || new Date().toISOString(),
  };
}

export function transformPlayer(player: any): Player {
  return {
    ...transformUser(player),
    role: 'player',
    balance: player.balance || 0,
    clubId: player.clubId?._id || player.clubId?.clubId || player.clubId,
    prizes: (player.prizes || []).map(transformPrize),
    prizeCount: player.prizeCount,
    history: (player.transactions || []).map(transformTransaction),
  };
}

export function transformClub(club: any): Club {
  const playersArray = Array.isArray(club.players) ? club.players : [];
  return {
    id: club._id || club.id,
    phone: club.ownerId?.phone || club.phone,
    role: 'club',
    clubId: club.clubId,
    clubName: club.name,
    qrCode: club.qrCode || '',
    token: club.qrToken || '',
    pinCode: club.pinCode,
    players: playersArray,
    playerCount: club.playerCount ?? (playersArray.length > 0 ? playersArray.length : undefined),
    statistics: {
      totalPlayers: club.statistics?.totalPlayers || 0,
      totalSpins: club.statistics?.totalSpins || 0,
      totalPrizes: club.statistics?.totalPrizes || 0,
      activePlayers: club.statistics?.activePlayers || 0,
    },
    createdAt: club.createdAt || new Date().toISOString(),
    managerFio: club.managerFio,
    city: club.city,
    address: club.address,
    latitude: club.latitude != null ? Number(club.latitude) : undefined,
    longitude: club.longitude != null ? Number(club.longitude) : undefined,
  };
}

export function transformAdmin(admin: any): Admin {
  return {
    ...transformUser(admin),
    role: 'admin',
  };
}

export function transformPrize(prize: any): Prize {
  return {
    id: prize._id || prize.id || prize.prizeId?._id || prize.prizeId?.id,
    name: prize.name || prize.prizeId?.name || 'Неизвестный приз',
    type: prize.type || prize.prizeId?.type || 'none',
    value: prize.value || prize.prizeId?.value,
    description: prize.description || prize.prizeId?.description || '',
    image: prize.image || prize.prizeId?.image,
    probability: prize.dropChance ? prize.dropChance / 100 : (prize.probability || 0),
    slotIndex: prize.slotIndex !== undefined ? prize.slotIndex : (prize.prizeId?.slotIndex),
    isActive: prize.isActive !== false,
    status: prize.status || 'pending',
    wonAt: prize.createdAt || prize.wonAt || new Date().toISOString(),
    clubId: prize.clubId?._id || prize.clubId?.clubId || prize.clubId,
  };
}

export function transformTransaction(transaction: any): Transaction {
  return {
    id: transaction._id || transaction.id,
    type: transaction.type === 'registration_bonus' || transaction.type === 'prize_points' 
      ? 'earned' 
      : transaction.type === 'spin_cost' 
      ? 'spent' 
      : transaction.amount > 0 
      ? 'earned' 
      : 'spent',
    amount: Math.abs(transaction.amount || 0),
    description: transaction.description || '',
    date: transaction.createdAt || transaction.date || new Date().toISOString(),
    clubId: transaction.clubId?._id || transaction.clubId?.clubId || transaction.clubId,
  };
}

export function transformSpinResponse(spinResponse: any) {
  return {
    spin: {
      id: spinResponse.spin?._id || spinResponse.spin?.id,
      prize: transformPrize(spinResponse.spin?.prize || spinResponse.prize),
      cost: spinResponse.spin?.cost || 20,
      createdAt: spinResponse.spin?.createdAt || new Date().toISOString(),
    },
    newBalance: spinResponse.newBalance || 0,
  };
}
