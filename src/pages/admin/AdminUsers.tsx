import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import UserModal from '@/components/UserModal';
import Skeleton from '@/components/Skeleton';
import type { Player } from '@/types';
import { phoneMatchesSearch, formatPhoneForDisplay } from '@/utils/phone';
import './AdminPages.css';

export default function AdminUsers() {
  const navigate = useNavigate();
  const {
    players,
    fetchUsers,
    updateUser,
    deleteUser,
    isLoading,
  } = useStore();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Player | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    return players.filter((player: Player) => phoneMatchesSearch(player.phone, searchQuery));
  }, [players, searchQuery]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        await fetchUsers('player');
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [fetchUsers]);

  if ((initialLoading || isLoading) && players.length === 0) {
    return (
      <div className="admin-page admin-users-page">
        <div className="tab-header">
          <Skeleton height="40px" width="320px" />
        </div>

        <div className="admin-search-row admin-users-search-row">
          <div className="admin-search-field">
            <Skeleton height="16px" width="180px" />
            <Skeleton height="48px" />
            <Skeleton height="14px" width="260px" />
          </div>
        </div>

        <div className="users-table-container users-table-container--loading">
          <div className="users-table-skeleton">
            <div className="users-table-skeleton__head">
              <Skeleton height="14px" width="120px" />
              <Skeleton height="14px" width="80px" />
              <Skeleton height="14px" width="80px" />
              <Skeleton height="14px" width="120px" />
              <Skeleton height="14px" width="120px" />
            </div>

            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="users-table-skeleton__row">
                <Skeleton height="18px" width="150px" />
                <Skeleton height="18px" width="90px" />
                <Skeleton height="18px" width="60px" />
                <Skeleton height="18px" width="110px" />
                <div className="users-table-skeleton__actions">
                  <Skeleton height="36px" width="120px" />
                  <Skeleton height="36px" width="96px" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page admin-users-page">
      <div className="tab-header">
        <h2>Управление игроками</h2>
      </div>
      {players.length > 0 && (
        <div className="admin-search-row admin-users-search-row">
          <label className="admin-search-field">
            <span className="admin-search-field__label">Поиск по телефону</span>
            <input
              type="search"
              inputMode="tel"
              className="admin-search"
              placeholder="Например: +7 777 123 45 67 или 7771234567"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="admin-search-field__hint">
              Ищет по номеру в любом формате: с `+7`, пробелами, скобками или без них.
            </span>
          </label>
        </div>
      )}
      {players.length === 0 ? (
        <div className="empty-state">
          <p>Нет зарегистрированных игроков</p>
        </div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Телефон</th>
                <th>Баланс</th>
                <th>Призы</th>
                <th>Дата регистрации</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-row">
                    По запросу «{searchQuery}» ничего не найдено
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player: Player) => (
                  <tr
                    key={player.id}
                    className="clickable-row"
                    onClick={() => navigate(`/admin/users/${player.id}`)}
                  >
                    <td>{formatPhoneForDisplay(player.phone)}</td>
                    <td>{player.balance} баллов</td>
                    <td>{player.prizeCount ?? player.prizes?.length ?? 0}</td>
                    <td>{new Date(player.createdAt).toLocaleDateString('ru-RU')}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="club-actions">
                        <button className="edit-button" onClick={() => {
                          setSelectedUser(player);
                          setUserModalOpen(true);
                        }}>Редактировать</button>
                        <button className="delete-button" onClick={async () => {
                          if (window.confirm('Удалить игрока?')) {
                            await deleteUser(player.id);
                            await fetchUsers('player');
                          }
                        }}>Удалить</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <UserModal
        isOpen={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={async (data) => {
          if (selectedUser) {
            await updateUser(selectedUser.id, data);
            await fetchUsers('player');
          }
        }}
        user={selectedUser}
      />
    </div>
  );
}
