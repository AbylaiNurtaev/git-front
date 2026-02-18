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

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    return players.filter((player: Player) => phoneMatchesSearch(player.phone, searchQuery));
  }, [players, searchQuery]);

  useEffect(() => {
    fetchUsers('player');
  }, [fetchUsers]);

  if (isLoading && players.length === 0) {
    return <Skeleton />;
  }

  return (
    <div className="admin-page">
      <div className="tab-header">
        <h2>Управление игроками</h2>
      </div>
      {players.length > 0 && (
        <div className="admin-search-row">
          <input
            type="search"
            className="admin-search"
            placeholder="Поиск по телефону..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
