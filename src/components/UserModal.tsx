import { useState, useEffect } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import type { Player } from '@/types';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { balance: number; isActive: boolean }) => Promise<void>;
  user?: Player | null;
}

export default function UserModal({ isOpen, onClose, onSave, user }: UserModalProps) {
  const [balance, setBalance] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setBalance(user.balance || 0);
      setIsActive(true);
    } else {
      setBalance(0);
      setIsActive(true);
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave({ balance, isActive });
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Редактировать игрока"
      size="small"
    >
      <form onSubmit={handleSubmit}>
        <div className="user-info">
          <p><strong>Телефон:</strong> {user?.phone}</p>
        </div>
        <FormField
          label="Баланс"
          name="balance"
          type="number"
          value={balance}
          onChange={(value) => setBalance(typeof value === 'number' ? value : Number(value))}
          placeholder="0"
          min={0}
          required
        />
        <div className="form-field">
          <label className="form-label">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="form-checkbox"
            />
            <span style={{ marginLeft: '10px' }}>Активен</span>
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onClose} className="cancel-button">
            Отмена
          </button>
          <button type="submit" className="save-button" disabled={isLoading}>
            {isLoading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
