import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import Skeleton from '@/components/Skeleton';
import type { Club, Player } from '@/types';
import './ClubPages.css';

/** Оставляет только цифры из строки (для поиска по телефону в любом формате) */
function digitsOnly(s: string): string {
  return (s ?? '').replace(/\D/g, '');
}

export default function ClubPlayers() {
  const { currentUser, players, fetchClubPlayers, fetchClubPrizeClaims, isLoading } = useStore();
  const club = currentUser as Club | null;
  const [prizeClaims, setPrizeClaims] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (club) {
      fetchClubPlayers();
      fetchClubPrizeClaims(1, 100).then((res) => setPrizeClaims(res.items));
    }
  }, [club, fetchClubPlayers, fetchClubPrizeClaims]);

  const prizeCountByUserId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const claim of prizeClaims) {
      const uid = claim.userId?._id ?? claim.userId?.id ?? claim.userId;
      if (uid) {
        const key = String(uid);
        map[key] = (map[key] ?? 0) + 1;
      }
    }
    return map;
  }, [prizeClaims]);

  const filteredPlayers = useMemo(() => {
    const q = search.trim();
    if (!q) return players;
    const qLower = q.toLowerCase();
    const qDigits = digitsOnly(q);
    return players.filter((p: Player) => {
      const phone = p.phone ?? '';
      const phoneDigits = digitsOnly(phone);
      const name = (p.name ?? '').toLowerCase();
      const matchName = name && qLower.length >= 2 && name.includes(qLower);
      const matchPhoneDigits = qDigits.length >= 1 && phoneDigits.includes(qDigits);
      const matchPhoneRaw = phone.toLowerCase().includes(qLower);
      return matchName || matchPhoneDigits || matchPhoneRaw;
    });
  }, [players, search]);

  if (isLoading && players.length === 0) {
    return <Skeleton />;
  }

  return (
    <div className="club-page">
      <div className="players-tab">
        <h2>Игроки Infinity</h2>
        {!club ? (
          <div className="empty-state">
            <p>Клуб не найден</p>
          </div>
        ) : players.length === 0 ? (
          <div className="empty-state">
            <p>Нет зарегистрированных игроков</p>
            <p className="hint">Игроки появятся после привязки к клубу или прокрутки рулетки</p>
          </div>
        ) : (
          <>
            <div className="players-search-wrap">
              <input
                type="search"
                placeholder="Поиск по телефону или имени..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="players-search"
              />
              <span className="players-search-hint">
                {filteredPlayers.length} из {players.length}
              </span>
            </div>
            {filteredPlayers.length === 0 ? (
              <div className="empty-state empty-state-small">
                <p>{search.trim() ? `Ничего не найдено по запросу «${search.trim()}»` : 'Нет игроков'}</p>
              </div>
            ) : (
              <div className="players-table-wrap">
                <table className="players-table">
                  <thead>
                    <tr>
                      <th>Телефон</th>
                      <th>Баланс</th>
                      <th>Призов</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map((player: Player) => (
                      <tr key={player.id}>
                        <td className="players-cell-phone">{player.phone ?? '—'}</td>
                        <td>{Number(player.balance) ?? 0} баллов</td>
                        <td>{prizeCountByUserId[String(player.id)] ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
