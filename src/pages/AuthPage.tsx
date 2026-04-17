import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import InputMask from 'react-input-mask';
import Skeleton from '@/components/Skeleton';
import BrandLogo from '@/components/BrandLogo';
import './AuthPage.css';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister] = useState(false);
  const [error, setError] = useState('');
  const { login, register, isAuthenticated, currentUser, error: storeError, companyLogoUrl, fetchCompanyLogoPublic } = useStore();

  useEffect(() => {
    fetchCompanyLogoPublic();
  }, [fetchCompanyLogoPublic]);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const path = redirectTo?.startsWith('/') ? redirectTo : redirectTo ? `/${redirectTo}` : null;
      if (path && currentUser.role === 'player') {
        navigate(path, { replace: true });
      } else if (currentUser.role === 'admin') {
        navigate('/admin');
      } else if (currentUser.role === 'club') {
        // Если до истечения сессии был /club/qr или другой /club/..., возвращаем туда
        navigate(path && path.startsWith('/club') ? path : '/club', { replace: true });
      } else {
        navigate('/player');
      }
    }
  }, [isAuthenticated, currentUser, navigate, redirectTo]);

  useEffect(() => {
    if (storeError) {
      setError(storeError);
    }
  }, [storeError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let success = false;
      if (isRegister) {
        success = await register(phone, code);
      } else {
        success = await login(phone, code);
      }

      if (success) {
        const user = useStore.getState().currentUser;
        const path = redirectTo?.startsWith('/') ? redirectTo : redirectTo ? `/${redirectTo}` : null;
        if (path && user?.role === 'player') {
          navigate(path, { replace: true });
          return;
        }
        if (path && path.startsWith('/club') && user?.role === 'club') {
          navigate(path, { replace: true });
          return;
        }
      } else {
        const storeError = useStore.getState().error;
        setError(storeError || (isRegister ? 'Ошибка регистрации' : 'Неверный телефон или код'));
      }
    } catch (err) {
      setError('Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />
      <div className="auth-grid">
        <section className="auth-hero">
          <div className="auth-badge">spinclub.kz</div>
          <div className="auth-header">
            <BrandLogo src={companyLogoUrl} alt="Spin Club" className="header-logo" />
          </div>

          <div className="auth-hero-copy">
            <p className="auth-kicker">Новая механика вовлечения</p>
            <h2 className="auth-hero-title">
              Превращаем вход в клуб в яркий цифровой опыт с бонусами, рулеткой и CRM-логикой.
            </h2>
            <p className="auth-hero-text">
              Единый кабинет для администратора клуба, быстрый вход по номеру телефона и удобная
              точка контакта с игроком прямо внутри бренда клуба.
            </p>
          </div>

          <div className="auth-metrics">
            <div className="metric-item">
              <span className="metric-value">01</span>
              <span className="metric-text">Авторизация по номеру и коду</span>
            </div>
            <div className="metric-item">
              <span className="metric-value">02</span>
              <span className="metric-text">Доступ к клубному кабинету и розыгрышам</span>
            </div>
            <div className="metric-item">
              <span className="metric-value">03</span>
              <span className="metric-text">Готово для интеграции в бренд клуба</span>
            </div>
          </div>
        </section>

        <section className="auth-container">
          <div className="auth-panel-top">
            <span className="auth-panel-eyebrow">Club Access</span>
            <h3 className="auth-panel-title">Вход в кабинет</h3>
            <p className="auth-panel-description">
              Введите номер телефона и код подтверждения, чтобы открыть доступ к платформе SpinClub.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="phone">Номер телефона</label>
              {isLoading ? (
                <Skeleton height="56px" />
              ) : (
                <InputMask
                  id="phone"
                  mask="+7 (999) 999-99-99"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (___) ___-__-__"
                  className="input"
                  disabled={isLoading}
                />
              )}
            </div>

            <div className="form-group">
              <label htmlFor="code">Код подтверждения</label>
              {isLoading ? (
                <Skeleton height="56px" />
              ) : (
                <InputMask
                  id="code"
                  mask="9999"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="0000"
                  className="input"
                  disabled={isLoading}
                />
              )}
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="submit-button"
              disabled={isLoading || !phone || !code}
            >
              {isLoading ? (
                <div className="button-skeleton">
                  <Skeleton height="20px" width="100px" />
                </div>
              ) : isRegister ? (
                'Зарегистрироваться'
              ) : (
                'Продолжить'
              )}
            </button>
          </form>

          <div className="auth-panel-footer">
            <div className="footer-chip">PC Clubs</div>
            <div className="footer-chip">Rewards</div>
            <div className="footer-chip">Spin Mechanics</div>
          </div>
        </section>
      </div>
    </div>
  );
}
