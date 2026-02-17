import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import { useStore } from '@/store/useStore';
import UserModal from '@/components/UserModal';
import Skeleton from '@/components/Skeleton';
import type { AdminUserDetail as AdminUserDetailType, Player } from '@/types';
import './AdminPages.css';

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  registration_bonus: 'Бонус за регистрацию',
  spin_cost: 'Стоимость крутки',
  prize_points: 'Приз (баллы)',
  prize: 'Приз',
};

function formatDate(s: string) {
  return new Date(s).toLocaleString('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateUser, deleteUser, banUser, unbanUser } = useStore();
  const [user, setUser] = useState<AdminUserDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Player | null>(null);
  const [banDays, setBanDays] = useState<string>('');
  const [banReason, setBanReason] = useState<string>('');
  const [banLoading, setBanLoading] = useState(false);
  const [unbanLoading, setUnbanLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await apiService.getAdminUser(id);
        setUser(data);
      } catch (e: any) {
        setError(e.response?.data?.message || 'Не удалось загрузить пользователя');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!user) return;
    setSelectedUser({
      id: user._id,
      phone: user.phone,
      role: 'player',
      balance: user.balance,
      clubId: user.clubId,
      prizes: [],
      history: [],
      createdAt: user.createdAt,
    });
  }, [user]);

  if (loading) {
    return <Skeleton />;
  }

  if (error || !user) {
    return (
      <div className="admin-page">
        <div className="empty-state">
          <p>{error || 'Пользователь не найден'}</p>
          <Link to="/admin/users" className="back-button">← Вернуться к списку</Link>
        </div>
      </div>
    );
  }

  const isBanned = user.isBanned === true;
  const canBan = !isBanned && !banLoading && !unbanLoading;
  const canUnban = isBanned && !banLoading && !unbanLoading;

  const handleBan = async () => {
    if (user.isBanned) {
      window.alert('Пользователь уже забанен. Сначала снимите текущий бан.');
      return;
    }
    if (!banReason.trim()) {
      window.alert('Укажите причину бана');
      return;
    }
    setBanLoading(true);
    try {
      const daysNumber = banDays.trim() ? Number(banDays) : undefined;
      const payload: { days?: number; reason: string } = {
        reason: banReason.trim(),
      };
      if (!Number.isNaN(daysNumber) && daysNumber && daysNumber > 0) {
        payload.days = daysNumber;
      }
      await banUser(user._id, payload);
      const dataAgain = await apiService.getAdminUser(user._id);
      setUser(dataAgain);
      // очищаем форму после успешного бана
      setBanDays('');
      setBanReason('');
    } finally {
      setBanLoading(false);
    }
  };

  const handleUnban = async () => {
    if (!user.isBanned) {
      window.alert('Пользователь сейчас не забанен.');
      return;
    }
    setUnbanLoading(true);
    try {
      await unbanUser(user._id);
      const dataAgain = await apiService.getAdminUser(user._id);
      setUser(dataAgain);
    } finally {
      setUnbanLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="club-detail-header">
        <Link to="/admin/users" className="back-button">← Вернуться к списку</Link>
        <div className="header-actions">
          <button className="edit-button" onClick={() => setUserModalOpen(true)}>
            Редактировать
          </button>
          <button
            className="delete-button"
            onClick={async () => {
              if (window.confirm('Удалить пользователя?')) {
                await deleteUser(user._id);
                navigate('/admin/users');
              }
            }}
          >
            Удалить
          </button>
        </div>
      </div>

      <div className="club-detail-content">
        <div className="club-detail-info">
          <h2>Профиль</h2>
          <div className="info-grid">
            <div className="info-item">
              <strong>Телефон:</strong>
              <span>{user.phone}</span>
            </div>
            <div className="info-item">
              <strong>Баланс:</strong>
              <span>{user.balance} баллов</span>
            </div>
            <div className="info-item">
              <strong>Дата регистрации:</strong>
              <span>{formatDate(user.createdAt)}</span>
            </div>
            {user.name != null && user.name !== '' && (
              <div className="info-item">
                <strong>Имя:</strong>
                <span>{user.name}</span>
              </div>
            )}
            {user.isActive !== undefined && (
              <div className="info-item">
                <strong>Активен:</strong>
                <span>{user.isActive ? 'Да' : 'Нет'}</span>
              </div>
            )}
          </div>
        </div>

        {user.club && (
          <div className="club-detail-info">
            <h2>Текущий клуб</h2>
            <div className="info-grid">
              <div className="info-item">
                <strong>Название:</strong>
                <span>{user.club.name}</span>
              </div>
              <div className="info-item">
                <strong>ID клуба:</strong>
                <span>{user.club.clubId}</span>
              </div>
              {user.club.address && (
                <div className="info-item">
                  <strong>Адрес:</strong>
                  <span>{user.club.address}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="club-detail-info">
          <h2>Блокировка игрока</h2>
          <p className={`user-ban-status ${isBanned ? 'user-ban-status-banned' : 'user-ban-status-ok'}`}>
            {isBanned ? (
              <>
                Игрок <strong>забанен</strong>
                {user.banUntil && (
                  <>
                    {' '}до {formatDate(user.banUntil)}
                  </>
                )}
                {user.banReason && (
                  <>
                    {' '}— причина: <span>{user.banReason}</span>
                  </>
                )}
              </>
            ) : (
              <>
                Игрок <strong>не забанен</strong>.
              </>
            )}
          </p>
          <p className="user-detail-hint">
            Вы можете заблокировать игрока навсегда или на определённое число дней. Для бессрочного бана оставьте поле
            «Срок бана» пустым.
          </p>
          <div className="user-ban-fields">
            <div className="user-ban-field">
              <label className="user-ban-label">
                Срок бана (дней, опционально)
                <input
                  type="number"
                  min={1}
                  value={banDays}
                  onChange={(e) => setBanDays(e.target.value)}
                  placeholder="Например, 7"
                  disabled={isBanned || banLoading || unbanLoading}
                />
              </label>
            </div>
            <div className="user-ban-field user-ban-field-full">
              <label className="user-ban-label">
                Причина бана
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Нарушение правил"
                  disabled={isBanned || banLoading || unbanLoading}
                />
              </label>
            </div>
          </div>
          <div className="user-ban-actions">
            <button
              type="button"
              className="delete-button"
              onClick={handleBan}
              disabled={!canBan}
            >
              {banLoading ? 'Применение бана...' : 'Забанить'}
            </button>
            <button
              type="button"
              className="edit-button"
              onClick={handleUnban}
              disabled={!canUnban}
            >
              {unbanLoading ? 'Снятие бана...' : 'Разбанить'}
            </button>
          </div>
        </div>

        {user.visitHistory && user.visitHistory.length > 0 && (
          <div className="club-detail-info">
            <h2>История посещений по клубам</h2>
            <p className="user-detail-hint">Клубы отсортированы по убыванию числа визитов. Один визит = одна крутка.</p>
            <div className="visit-history-list">
              {user.visitHistory.map((clubVisits) => (
                <div key={clubVisits.clubId} className="visit-history-club">
                  <div className="visit-history-club-header">
                    <span className="visit-history-club-name">{clubVisits.clubName}</span>
                    <span className="visit-history-club-count">{clubVisits.totalVisits} визитов</span>
                  </div>
                  <ul className="visit-history-dates">
                    {clubVisits.visits
                      .slice()
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((v, i) => (
                        <li key={i}>{formatDate(v.createdAt)}</li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!user.visitHistory || user.visitHistory.length === 0) && (
          <div className="club-detail-info">
            <h2>История посещений</h2>
            <p className="user-detail-empty">Нет данных о посещениях.</p>
          </div>
        )}

        <div className="club-detail-info">
          <h2>История баланса</h2>
          {user.balanceHistory && user.balanceHistory.length > 0 ? (
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Тип</th>
                    <th>Сумма</th>
                    <th>Описание</th>
                  </tr>
                </thead>
                <tbody>
                  {[...user.balanceHistory]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((item) => (
                      <tr key={item._id}>
                        <td>{formatDate(item.createdAt)}</td>
                        <td>{TRANSACTION_TYPE_LABELS[item.type] ?? item.type}</td>
                        <td className={item.amount >= 0 ? 'balance-plus' : 'balance-minus'}>
                          {item.amount >= 0 ? '+' : ''}{item.amount}
                        </td>
                        <td>{item.description ?? '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="user-detail-empty">Нет операций по балансу.</p>
          )}
        </div>
      </div>

      {selectedUser && (
        <UserModal
          isOpen={userModalOpen}
          onClose={() => setUserModalOpen(false)}
          onSave={async (data) => {
            await updateUser(user._id, data);
            const dataAgain = await apiService.getAdminUser(user._id);
            setUser(dataAgain);
            setUserModalOpen(false);
          }}
          user={selectedUser}
        />
      )}
    </div>
  );
}
