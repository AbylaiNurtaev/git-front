import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import ClubModal from '@/components/ClubModal';
import PrizeModal from '@/components/PrizeModal';
import UserModal from '@/components/UserModal';
import type { Club, Player, Prize, RouletteSlot } from '@/types';
import logoUrl from '@/assets/logo.png';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const {
    currentUser,
    logout,
    clubs,
    players,
    prizes,
    rouletteConfig,
    fetchAdminData,
    fetchClubs,
    fetchUsers,
    fetchPrizes,
    createClub,
    updateClub,
    deleteClub,
    updateUser,
    deleteUser,
    createPrize,
    updatePrize,
    deletePrize,
    fetchAnalytics,
  } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'clubs' | 'users' | 'prizes' | 'roulette' | 'analytics'>('overview');
  const [analytics, setAnalytics] = useState<any>(null);
  const [clubModalOpen, setClubModalOpen] = useState(false);
  const [prizeModalOpen, setPrizeModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [selectedUser, setSelectedUser] = useState<Player | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics().then(setAnalytics);
    }
  }, [activeTab, fetchAnalytics]);

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-left">
            <img src={logoUrl} alt="Infinity" className="header-logo" />
            <h1>Панель администратора</h1>
          </div>
          <div className="header-actions">
            <span className="admin-name">{currentUser.name || 'Администратор'}</span>
            <button onClick={logout} className="logout-button">
              Выйти
            </button>
          </div>
        </header>

        <div className="dashboard-tabs">
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            Обзор
          </button>
          <button
            className={activeTab === 'clubs' ? 'active' : ''}
            onClick={() => setActiveTab('clubs')}
          >
            Infinity
          </button>
          <button
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            Пользователи
          </button>
          <button
            className={activeTab === 'prizes' ? 'active' : ''}
            onClick={() => setActiveTab('prizes')}
          >
            Призы
          </button>
          <button
            className={activeTab === 'roulette' ? 'active' : ''}
            onClick={() => setActiveTab('roulette')}
          >
            Рулетка
          </button>
          <button
            className={activeTab === 'analytics' ? 'active' : ''}
            onClick={() => setActiveTab('analytics')}
          >
            Аналитика
          </button>
        </div>

        <div className="dashboard-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Всего клубов</h3>
                  <div className="stat-value">{clubs.length}</div>
                </div>
                <div className="stat-card">
                  <h3>Всего игроков</h3>
                  <div className="stat-value">{players.length}</div>
                </div>
                <div className="stat-card">
                  <h3>Всего призов</h3>
                  <div className="stat-value">{prizes.length}</div>
                </div>
                <div className="stat-card">
                  <h3>Слотов в рулетке</h3>
                  <div className="stat-value">{rouletteConfig.slots.length}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clubs' && (
            <div className="clubs-tab">
              <div className="tab-header">
                <h2>Управление клубами</h2>
                <button className="add-button" onClick={() => {
                  setSelectedClub(null);
                  setClubModalOpen(true);
                }}>+ Добавить клуб</button>
              </div>
              {clubs.length === 0 ? (
                <div className="empty-state">
                  <p>Нет зарегистрированных клубов</p>
                </div>
              ) : (
                <div className="clubs-list">
                  {clubs.map((club: Club) => (
                    <div key={club.id} className="club-card">
                      <div className="club-info">
                        <h3>{club.clubName}</h3>
                        <p>ID: {club.clubId}</p>
                        <p>Телефон: {club.phone}</p>
                        <p>Игроков: {club.players.length}</p>
                      </div>
                      <div className="club-actions">
                        <button className="edit-button" onClick={() => {
                          setSelectedClub(club);
                          setClubModalOpen(true);
                        }}>Редактировать</button>
                        <button className="delete-button" onClick={async () => {
                          if (window.confirm('Удалить клуб?')) {
                            await deleteClub(club.id);
                            await fetchClubs();
                          }
                        }}>Удалить</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="users-tab">
              <div className="tab-header">
                <h2>Управление пользователями</h2>
              </div>
              {players.length === 0 ? (
                <div className="empty-state">
                  <p>Нет зарегистрированных пользователей</p>
                </div>
              ) : (
                <div className="users-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Телефон</th>
                        <th>Баланс</th>
                        <th>Призов</th>
                        <th>Дата регистрации</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((player: Player) => (
                        <tr key={player.id}>
                          <td>{player.phone}</td>
                          <td>{player.balance} баллов</td>
                          <td>{player.prizes.length}</td>
                          <td>{new Date(player.createdAt).toLocaleDateString('ru-RU')}</td>
                          <td>
                            <button className="edit-button" onClick={() => {
                              setSelectedUser(player);
                              setUserModalOpen(true);
                            }}>Редактировать</button>
                            <button className="delete-button" onClick={async () => {
                              if (window.confirm('Удалить пользователя?')) {
                                await deleteUser(player.id);
                                await fetchUsers();
                              }
                            }}>Удалить</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'prizes' && (
            <div className="prizes-tab">
              <div className="tab-header">
                <h2>Управление призами</h2>
                <button className="add-button" onClick={() => {
                  setSelectedPrize(null);
                  setPrizeModalOpen(true);
                }}>+ Добавить приз</button>
              </div>
              <div className="prizes-list">
                {prizes.map((prize: Prize) => (
                  <div key={prize.id} className="prize-card">
                    {prize.image && (
                      <div className="prize-image">
                        <img src={prize.image} alt={prize.name} />
                      </div>
                    )}
                    <div className="prize-info">
                      <h3>{prize.name}</h3>
                      <p>{prize.description}</p>
                      <p>Тип: {prize.type}</p>
                      {prize.value && <p>Значение: {prize.value}</p>}
                      <p>Вероятность: {(prize.probability * 100).toFixed(1)}%</p>
                    </div>
                    <div className="prize-actions">
                      <button className="edit-button" onClick={() => {
                        setSelectedPrize(prize);
                        setPrizeModalOpen(true);
                      }}>Редактировать</button>
                      <button className="delete-button" onClick={async () => {
                        if (window.confirm('Удалить приз?')) {
                          await deletePrize(prize.id);
                          await fetchPrizes();
                        }
                      }}>Удалить</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'roulette' && (
            <div className="roulette-tab">
              <div className="tab-header">
                <h2>Настройка рулетки</h2>
                <div className="roulette-info">
                  <p className="info-text">
                    Слоты рулетки - это позиции, на которые назначаются призы. 
                    Каждый слот имеет приз и вероятность выпадения. Максимум 25 слотов.
                  </p>
                  <p className="info-text">
                    <strong>Как это работает:</strong> Создайте приз в разделе "Призы", 
                    указав индекс слота (0-24). Приз автоматически появится в рулетке.
                  </p>
                </div>
              </div>
              <div className="roulette-config">
                {rouletteConfig.slots.length === 0 ? (
                  <div className="empty-state">
                    <p>Нет слотов в рулетке</p>
                    <p className="hint">Создайте призы в разделе "Призы", чтобы они появились здесь</p>
                  </div>
                ) : (
                  <>
                    <div className="slots-list">
                      {rouletteConfig.slots.map((slot: RouletteSlot, index: number) => {
                        const prize = prizes.find((p: Prize) => p.id === slot.prizeId);
                        return (
                          <div key={slot.id} className="slot-card">
                            <div className="slot-info">
                              <h4>Слот {index + 1}</h4>
                              <p><strong>Приз:</strong> {prize?.name || 'Неизвестно'}</p>
                              {prize?.image && (
                                <div className="slot-prize-image">
                                  <img src={prize.image} alt={prize.name} />
                                </div>
                              )}
                              <p><strong>Вероятность:</strong> {(slot.probability * 100).toFixed(1)}%</p>
                              {prize?.type && <p><strong>Тип:</strong> {prize.type}</p>}
                            </div>
                            <div className="slot-actions">
                              <button 
                                className="edit-button" 
                                onClick={() => {
                                  setSelectedPrize(prize || null);
                                  setPrizeModalOpen(true);
                                }}
                              >
                                Редактировать приз
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="total-probability">
                      <p><strong>Общая вероятность:</strong> {(rouletteConfig.totalProbability * 100).toFixed(1)}%</p>
                      {rouletteConfig.totalProbability !== 1 && (
                        <p className="warning">⚠️ Внимание: сумма вероятностей должна быть равна 100%</p>
                      )}
                    </div>
                  </>
                )}
                <div className="roulette-actions">
                  <button 
                    className="add-button" 
                    onClick={() => {
                      setSelectedPrize(null);
                      setPrizeModalOpen(true);
                    }}
                  >
                    + Создать приз для рулетки
                  </button>
                  <p className="hint-text">
                    При создании приза укажите индекс слота (0-24), и он появится в рулетке
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="analytics-tab">
              <h2>Аналитика платформы</h2>
              {analytics ? (
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <h3>Общая статистика</h3>
                    <p>Всего пользователей: {analytics.totalUsers || 0}</p>
                    <p>Всего клубов: {analytics.totalClubs || 0}</p>
                    <p>Всего прокруток: {analytics.totalSpins || 0}</p>
                    <p>Всего призов: {analytics.totalPrizes || 0}</p>
                    <p>Всего потрачено: {analytics.totalSpent || 0} баллов</p>
                  </div>
                  <div className="analytics-card">
                    <h3>Статистика призов</h3>
                    {analytics.prizeStats?.map((stat: any, index: number) => (
                      <p key={index}>{stat.prizeName}: {stat.count}</p>
                    ))}
                  </div>
                  <div className="analytics-card">
                    <h3>Статистика клубов</h3>
                    {analytics.clubStats?.map((stat: any, index: number) => (
                      <p key={index}>{stat.clubName}: {stat.count}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>Загрузка аналитики...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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

      <PrizeModal
        isOpen={prizeModalOpen}
        onClose={() => {
          setPrizeModalOpen(false);
          setSelectedPrize(null);
        }}
        onSave={async (data) => {
          if (selectedPrize) {
            await updatePrize(selectedPrize.id, { 
              dropChance: data.dropChance,
              image: data.image || undefined
            });
          } else {
            await createPrize(data);
          }
          await fetchPrizes();
        }}
        prize={selectedPrize}
      />

      <UserModal
        isOpen={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={async (data) => {
          if (selectedUser) {
            await updateUser(selectedUser.id, data);
            await fetchUsers();
          }
        }}
        user={selectedUser}
      />
    </div>
  );
}
