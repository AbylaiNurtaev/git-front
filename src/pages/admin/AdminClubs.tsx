import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react';
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
  const [selectedCity, setSelectedCity] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          clubs
            .map((club: Club) => club.city)
            .filter((city): city is string => Boolean(city))
        )
      ).sort((a, b) => a.localeCompare(b, 'ru')),
    [clubs]
  );

  const filteredClubs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return clubs.filter((club: Club) => {
      const matchesCity = !selectedCity || club.city === selectedCity;
      const matchesSearch =
        !q ||
        club.clubName?.toLowerCase().includes(q) ||
        club.city?.toLowerCase().includes(q);

      return matchesCity && matchesSearch;
    });
  }, [clubs, searchQuery, selectedCity]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        await fetchClubs();
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
  }, [fetchClubs]);

  if ((initialLoading || isLoading) && clubs.length === 0) {
    return (
      <div className="admin-page admin-clubs-page">
        <div className="tab-header">
          <Skeleton height="40px" width="320px" />
          <Skeleton height="44px" width="170px" />
        </div>

        <div className="admin-search-row admin-clubs-filters">
          <div className="dashboard-search-input">
            <Skeleton height="48px" />
          </div>
          <div className="admin-clubs-city-filter">
            <Skeleton height="48px" />
          </div>
        </div>

        <div className="users-table-container users-table-container--loading">
          <div className="users-table-skeleton">
            <div className="users-table-skeleton__head users-table-skeleton__head--clubs">
              <Skeleton height="14px" width="120px" />
              <Skeleton height="14px" width="90px" />
              <Skeleton height="14px" width="140px" />
              <Skeleton height="14px" width="120px" />
              <Skeleton height="14px" width="80px" />
              <Skeleton height="14px" width="120px" />
            </div>

            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="users-table-skeleton__row users-table-skeleton__row--clubs">
                <Skeleton height="18px" width="150px" />
                <Skeleton height="18px" width="100px" />
                <Skeleton height="18px" width="160px" />
                <Skeleton height="18px" width="140px" />
                <Skeleton height="18px" width="70px" />
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
    <div className="admin-page admin-clubs-page">
      <div className="tab-header">
        <div className="dashboard-title-group">
          <span className="dashboard-title-group__icon">
            <Building2 size={18} />
          </span>
          <h2>Управление клубами</h2>
        </div>
        <button className="add-button" onClick={() => {
          setSelectedClub(null);
          setClubModalOpen(true);
        }}>
          <Plus size={16} />
          <span>Добавить клуб</span>
        </button>
      </div>
      <div className="admin-search-row admin-clubs-filters">
        <div className="dashboard-search-input">
          <Search size={16} className="dashboard-search-input__icon" />
          <input
            type="search"
            className="admin-search admin-clubs-search"
            placeholder="Поиск по названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {cities.length > 0 && (
          <div className="admin-clubs-city-filter">
            <label className="admin-clubs-city-label">
              <span className="dashboard-filter-label">
                <MapPin size={14} />
                <span>Город</span>
              </span>
              <select
                className="admin-search admin-clubs-city-select"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
              >
                <option value="">Все города</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
      {clubs.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon"><Building2 size={20} /></span>
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
                          <Pencil size={14} />
                          <span>Редактировать</span>
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
                          <Trash2 size={14} />
                          <span>Удалить</span>
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
