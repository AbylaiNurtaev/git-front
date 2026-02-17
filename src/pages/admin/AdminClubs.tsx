import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import ClubModal from '@/components/ClubModal';
import Skeleton from '@/components/Skeleton';
import type { Club } from '@/types';
import './AdminPages.css';

export default function AdminClubs() {
  const navigate = useNavigate();
  const {
    clubs,
    fetchClubs,
    createClub,
    updateClub,
    deleteClub,
    isLoading,
  } = useStore();
  const [clubModalOpen, setClubModalOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClubs = useMemo(() => {
    if (!searchQuery.trim()) return clubs;
    const q = searchQuery.trim().toLowerCase();
    return clubs.filter((club: Club) =>
      club.clubName?.toLowerCase().includes(q) || club.city?.toLowerCase().includes(q)
    );
  }, [clubs, searchQuery]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  if (isLoading && clubs.length === 0) {
    return <Skeleton />;
  }

  return (
    <div className="admin-page">
      <div className="tab-header">
        <h2>Управление клубами</h2>
        <button className="add-button" onClick={() => {
          setSelectedClub(null);
          setClubModalOpen(true);
        }}>+ Добавить клуб</button>
      </div>
      <div className="admin-search-row">
        <input
          type="search"
          className="admin-search"
          placeholder="Поиск по названию..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      {clubs.length === 0 ? (
        <div className="empty-state">
          <p>Нет зарегистрированных клубов</p>
        </div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Город</th>
                <th>ФИО менеджера</th>
                <th>Телефон</th>
                <th>Игроков</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredClubs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-row">
                    По запросу «{searchQuery}» ничего не найдено
                  </td>
                </tr>
              ) : (
                filteredClubs.map((club: Club) => (
                  <tr
                    key={club.id}
                    className="clickable-row"
                    onClick={() => navigate(`/admin/clubs/${club.id}`)}
                  >
                    <td>{club.clubName}</td>
                    <td>{club.city ?? '—'}</td>
                    <td>{club.managerFio ?? '—'}</td>
                    <td>{club.phone}</td>
                    <td>{club.playerCount ?? club.players?.length ?? 0}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="club-actions">
                        <button
                          className="edit-button"
                          onClick={() => {
                            setSelectedClub(club);
                            setClubModalOpen(true);
                          }}
                        >
                          Редактировать
                        </button>
                        <button
                          className="delete-button"
                          onClick={async () => {
                            if (window.confirm('Удалить клуб?')) {
                              await deleteClub(club.id);
                              await fetchClubs();
                            }
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <ClubModal
        isOpen={clubModalOpen}
        onClose={() => {
          setClubModalOpen(false);
          setSelectedClub(null);
        }}
        onSave={async (data) => {
          if (selectedClub) {
            await updateClub(selectedClub.id, {
              name: data.name,
              managerFio: data.managerFio,
              city: data.city,
              address: data.address || undefined,
              latitude: data.latitude,
              longitude: data.longitude,
            });
          } else {
            await createClub(data);
          }
          await fetchClubs();
        }}
        club={selectedClub}
      />
    </div>
  );
}
