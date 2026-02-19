/**
 * Утилита хранения последних 10 выигрышей по клубу (в памяти).
 * Используется в POST /api/players/spin и при эмите события spin в сокет.
 *
 * Формат записи: { playerName?, maskedPhone, prizeName }
 * На фронте /club/qr выводится «playerName выиграл prizeName»; если playerName нет — maskedPhone.
 */

const MAX_RECENT_WINS = 10;

/** @type {Record<string, Array<{ playerName?: string, maskedPhone: string, prizeName: string }>>} */
const byClubId = {};

/**
 * Маска телефона: +7 771 *** 3738 (первые 3 цифры после 7, последние 4)
 * @param {string} phone - например "+79991234567" или "79991234567"
 * @returns {string}
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '+7 *** *** ****';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 5) return '+7 *** *** ****';
  const after7 = digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits;
  const visible = after7.slice(0, 3);
  const last = after7.slice(-4);
  return `+7 ${visible} *** ${last}`;
}

/**
 * Добавить выигрыш по клубу. Список обрезается до MAX_RECENT_WINS.
 * @param {string} clubId
 * @param {string} playerPhone - сырой телефон игрока
 * @param {string} prizeName - название приза
 * @param {string} [playerName] - имя игрока (ФИО); если есть, на /club/qr выводится «Имя выиграл Приз»
 * @returns {Array<{ playerName?: string, maskedPhone: string, prizeName: string }>} текущий список recentWins после добавления
 */
function addWin(clubId, playerPhone, prizeName, playerName) {
  if (!clubId) return [];
  if (!byClubId[clubId]) byClubId[clubId] = [];
  const masked = maskPhone(playerPhone);
  const entry = { prizeName, maskedPhone: masked };
  if (playerName != null && String(playerName).trim()) entry.playerName = String(playerName).trim();
  byClubId[clubId].unshift(entry);
  byClubId[clubId] = byClubId[clubId].slice(0, MAX_RECENT_WINS);
  return byClubId[clubId];
}

/**
 * Получить последние выигрыши по клубу (до 10).
 * @param {string} clubId
 * @returns {Array<{ playerName?: string, maskedPhone: string, prizeName: string }>}
 */
function getRecentWins(clubId) {
  if (!clubId) return [];
  return byClubId[clubId] ? [...byClubId[clubId]] : [];
}

module.exports = {
  maskPhone,
  addWin,
  getRecentWins,
  MAX_RECENT_WINS,
};
