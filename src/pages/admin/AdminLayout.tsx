import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  CircleDot,
  Users,
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import logoUrl from '@/assets/logo.png';
import './AdminLayout.css';

// Ограничения для загрузки логотипа
const LOGO_MAX_FILE_SIZE_MB = 2;
const LOGO_MAX_FILE_SIZE_BYTES = LOGO_MAX_FILE_SIZE_MB * 1024 * 1024;
const LOGO_MAX_WIDTH = 512;
const LOGO_MAX_HEIGHT = 512;

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
  const [validatingDimensions, setValidatingDimensions] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchCompanyLogo();
    }
  }, [currentUser, fetchCompanyLogo]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > LOGO_MAX_FILE_SIZE_BYTES) {
      setLogoError(`Размер файла не должен превышать ${LOGO_MAX_FILE_SIZE_MB} МБ.`);
      setSelectedFile(null);
      setPreview(null);
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setLogoError(null);
    setValidatingDimensions(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      setValidatingDimensions(false);
      if (img.naturalWidth > LOGO_MAX_WIDTH || img.naturalHeight > LOGO_MAX_HEIGHT) {
        setLogoError(`Размер изображения не должен превышать ${LOGO_MAX_WIDTH}×${LOGO_MAX_HEIGHT} px.`);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setValidatingDimensions(false);
    };
    img.src = url;
  };

  const handleSaveLogo = async () => {
    if (!selectedFile) {
      setLogoError('Выберите файл логотипа.');
      return;
    }
    if (selectedFile.size > LOGO_MAX_FILE_SIZE_BYTES) {
      setLogoError(`Размер файла не должен превышать ${LOGO_MAX_FILE_SIZE_MB} МБ.`);
      return;
    }
    if (logoError) return; // ошибка размеров изображения
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

  const navItems = [
    { to: '/admin', end: true, label: 'Главная', icon: LayoutDashboard },
    { to: '/admin/clubs', end: false, label: 'Клубы', icon: Building2 },
    { to: '/admin/roulette', end: false, label: 'Рулетка', icon: CircleDot },
    { to: '/admin/users', end: false, label: 'Игроки', icon: Users },
  ] as const;

  return (
    <div className="admin-dashboard">
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'admin-sidebar--collapsed' : ''}`}>
        <div className="admin-sidebar__top">
          <div className="admin-sidebar__user">
            <div className="admin-sidebar__avatar-wrap">
              <img src={effectiveLogoSrc} alt="" className="admin-sidebar__avatar" />
              <button
                type="button"
                className="admin-sidebar__logo-edit"
                onClick={() => setIsLogoModalOpen(true)}
                title="Изменить логотип"
                aria-label="Изменить логотип"
              >
                ✎
              </button>
            </div>
            {!sidebarCollapsed && (
              <>
                <span className="admin-sidebar__name">{currentUser.name || 'Администратор'}</span>
                <span className="admin-sidebar__role">Администратор</span>
              </>
            )}
          </div>
          <button
            type="button"
            className="admin-sidebar__collapse"
            onClick={() => setSidebarCollapsed((c) => !c)}
            title={sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
            aria-label={sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        <nav className="admin-sidebar__nav">
          {navItems.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
              }
            >
              <Icon size={20} className="admin-sidebar__link-icon" />
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__locations">
            <span className="admin-topbar__location admin-topbar__location--active">Админ панель</span>
          </div>
          <div className="admin-topbar__actions">
            <span className="admin-topbar__user-name">{currentUser.name || 'Администратор'}</span>
            <button
              type="button"
              className="admin-topbar__icon-btn admin-topbar__icon-btn--logout"
              onClick={logout}
              title="Выйти"
              aria-label="Выйти"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>

      {isLogoModalOpen && (
        <div className="logo-modal-overlay" onClick={() => setIsLogoModalOpen(false)}>
          <div className="logo-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="logo-modal-title">Логотип компании</h2>
            <div className="logo-modal-preview-row">
              <div className="logo-modal-preview">
                <img src={effectiveLogoSrc} alt="Текущий логотип" />
              </div>
              <p className="logo-modal-limits">
                Ограничения: объём файла — до {LOGO_MAX_FILE_SIZE_MB} МБ, размер изображения — не более {LOGO_MAX_WIDTH}×{LOGO_MAX_HEIGHT} px.
              </p>
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
                disabled={isSaving || !selectedFile || validatingDimensions || !!logoError}
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
