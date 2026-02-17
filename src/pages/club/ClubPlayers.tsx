import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import Skeleton from '@/components/Skeleton';
import Modal from '@/components/Modal';
import type { Club, Player } from '@/types';
import './ClubPages.css';

/** Оставляет только цифры из строки (для поиска по телефону в любом формате) */
function digitsOnly(s: string): string {
  return (s ?? '').replace(/\D/g, '');
}

/** Проверяет, что заявка относится к игроку по id */
function claimBelongsToPlayer(claim: any, playerId: string): boolean {
  const uid = claim.userId?._id ?? claim.userId?.id ?? claim.userId;
  return uid != null && String(uid) === String(playerId);
}

export default function ClubPlayers() {
  const { currentUser, players, fetchClubPlayers, fetchClubPrizeClaims, isLoading } = useStore();
  const club = currentUser as Club | null;
  const [prizeClaims, setPrizeClaims] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

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

  const selectedPlayerClaims = useMemo(() => {
    if (!selectedPlayer) return [];
    return prizeClaims
      .filter((c) => claimBelongsToPlayer(c, selectedPlayer.id))
      .sort((a, b) => {
        const dateA = a.confirmedAt || a.createdAt || '';
        const dateB = b.confirmedAt || b.createdAt || '';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
  }, [prizeClaims, selectedPlayer]);

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
                placeholder="Поиск по ФИО, телефону..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="players-search"
                aria-label="Поиск игроков"
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
                      <th>ФИО</th>
                      <th>Телефон</th>
                      <th>Баланс</th>
                      <th>Призов в клубе</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map((player: Player) => (
                      <tr
                        key={player.id}
                        className="players-row-clickable"
                        onClick={() => setSelectedPlayer(player)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedPlayer(player);
                          }
                        }}
                      >
                        <td className="players-cell-fio">{player.name?.trim() || '—'}</td>
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

      <Modal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        title={selectedPlayer?.name?.trim() || 'Карточка игрока'}
        size="medium"
      >
        {selectedPlayer && (
          <div className="player-modal">
            <dl className="player-modal-info">
              <div className="player-modal-row">
                <dt>ФИО</dt>
                <dd>{selectedPlayer.name?.trim() || '—'}</dd>
              </div>
              <div className="player-modal-row">
                <dt>Телефон</dt>
                <dd>{selectedPlayer.phone ?? '—'}</dd>
              </div>
              <div className="player-modal-row">
                <dt>Баланс</dt>
                <dd>{Number(selectedPlayer.balance) ?? 0} баллов</dd>
              </div>
              <div className="player-modal-row">
                <dt>Выиграно призов в клубе</dt>
                <dd>{prizeCountByUserId[String(selectedPlayer.id)] ?? 0}</dd>
              </div>
            </dl>
            {selectedPlayerClaims.length > 0 && (
              <div className="player-modal-claims">
                <h4>Выигранные призы</h4>
                <ul className="player-modal-claims-list">
                  {selectedPlayerClaims.map((claim) => (
                    <li key={claim._id || claim.id}>
                      <span className="player-modal-claim-name">
                        {claim.prizeId?.name ?? (typeof claim.prizeId === 'string' ? claim.prizeId : 'Приз')}
                      </span>
                      <span className="player-modal-claim-date">
                        {claim.confirmedAt
                          ? new Date(claim.confirmedAt).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : claim.createdAt
                            ? new Date(claim.createdAt).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
                {prizeCountByUserId[String(selectedPlayer.id)] > selectedPlayerClaims.length && (
                  <p className="player-modal-claims-hint">
                    Показаны последние заявки из загруженных. Всего выигрышей: {prizeCountByUserId[String(selectedPlayer.id)]}.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
