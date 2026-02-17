import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import logoUrl from '@/assets/logo.png';
import './AdminLayout.css';

export default function AdminLayout() {
  const {
    currentUser,
    logout,
    companyLogoUrl,
    fetchCompanyLogo,
    uploadCompanyLogo,
    deleteCompanyLogo,
  } = useStore();

  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchCompanyLogo();
    }
  }, [currentUser, fetchCompanyLogo]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setLogoError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogo = async () => {
    if (!selectedFile) {
      setLogoError('Выберите файл логотипа.');
      return;
    }
    setIsSaving(true);
    const ok = await uploadCompanyLogo(selectedFile);
    if (ok) {
      setIsLogoModalOpen(false);
      setSelectedFile(null);
      setPreview(null);
      setLogoError(null);
    } else {
      setLogoError('Не удалось сохранить логотип. Попробуйте ещё раз.');
    }
    setIsSaving(false);
  };

  const handleDeleteLogo = async () => {
    if (!window.confirm('Удалить текущий логотип и вернуть стандартный?')) return;
    setIsSaving(true);
    const ok = await deleteCompanyLogo();
    if (ok) {
      setPreview(null);
      setSelectedFile(null);
      setLogoError(null);
    } else {
      setLogoError('Не удалось удалить логотип. Попробуйте ещё раз.');
    }
    setIsSaving(false);
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  const effectiveLogoSrc = preview || companyLogoUrl || logoUrl;

  return (
    <div className="admin-dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-left">
            <div className="logo-edit-wrapper">
              <img src={effectiveLogoSrc} alt="Infinity" className="header-logo" />
              <button
                type="button"
                className="logo-edit-button"
                onClick={() => setIsLogoModalOpen(true)}
                title="Изменить логотип"
                aria-label="Изменить логотип"
              >
                ✎
              </button>
            </div>
            <h1>Панель администратора</h1>
          </div>
          <div className="header-actions">
            <span className="admin-name">{currentUser.name || 'Администратор'}</span>
            <button onClick={logout} className="logout-button">
              Выйти
            </button>
          </div>
        </header>

        <nav className="dashboard-tabs">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Обзор
          </NavLink>
          <NavLink
            to="/admin/clubs"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Клубы
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Пользователи
          </NavLink>
          <NavLink
            to="/admin/prizes"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Призы
          </NavLink>
          <NavLink
            to="/admin/roulette"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Рулетка
          </NavLink>
          <NavLink
            to="/admin/analytics"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Аналитика
          </NavLink>
        </nav>

        <div className="dashboard-content">
          <Outlet />
        </div>
      </div>

      {isLogoModalOpen && (
        <div className="logo-modal-overlay" onClick={() => setIsLogoModalOpen(false)}>
          <div className="logo-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="logo-modal-title">Логотип компании</h2>
            <p className="logo-modal-hint">
              Загрузите новый логотип, который будет отображаться в админке. Рекомендуется квадратное изображение в PNG или SVG.
            </p>
            <div className="logo-modal-preview">
              <img src={effectiveLogoSrc} alt="Текущий логотип" />
            </div>
            <div className="logo-modal-controls">
              <button
                type="button"
                className="image-upload-button"
                onClick={() => fileInputRef.current?.click()}
              >
                Выбрать файл
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="logo-modal-file-input"
                onChange={handleFileChange}
              />
              {companyLogoUrl && (
                <button
                  type="button"
                  className="logo-modal-delete"
                  onClick={handleDeleteLogo}
                  disabled={isSaving}
                >
                  Удалить логотип
                </button>
              )}
            </div>
            {logoError && <p className="logo-modal-error">{logoError}</p>}
            <div className="logo-modal-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() => setIsLogoModalOpen(false)}
                disabled={isSaving}
              >
                Отмена
              </button>
              <button
                type="button"
                className="save-button"
                onClick={handleSaveLogo}
                disabled={isSaving || !selectedFile}
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
