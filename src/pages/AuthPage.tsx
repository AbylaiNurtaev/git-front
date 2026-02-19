import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import InputMask from 'react-input-mask';
import Skeleton from '@/components/Skeleton';
import logoUrl from '@/assets/logo.png';
import backImage from '@/assets/back.webp';
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
  const { login, register, isAuthenticated, currentUser, error: storeError } = useStore();

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
    <div className="auth-page" style={{ backgroundImage: `url(${backImage})` }}>
      <div className="auth-container">
        <div className="auth-header">
          <img src={logoUrl} alt="Infinity" className="header-logo" />
          <div>
            <h1 className="auth-title">Infinity</h1>
            <p className="auth-subtitle">Игровая платформа</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="phone">Номер телефона</label>
            {isLoading ? (
              <Skeleton height="48px" />
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
              <Skeleton height="48px" />
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
              'Войти'
            )}
          </button>


        </form>
      </div>
    </div>
  );
}
