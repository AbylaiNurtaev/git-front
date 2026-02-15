import { useState, useEffect } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import type { Club } from '@/types';

interface ClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; phone: string; address: string; managerFio?: string; city?: string }) => Promise<void>;
  club?: Club | null;
}

export default function ClubModal({ isOpen, onClose, onSave, club }: ClubModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [managerFio, setManagerFio] = useState('');
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (club) {
      setName(club.clubName || '');
      setPhone(club.phone || '');
      setAddress(club.address || '');
      setManagerFio(club.managerFio || '');
      setCity(club.city || '');
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setManagerFio('');
      setCity('');
    }
  }, [club, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || (!club && !address)) return;

    setIsLoading(true);
    try {
      await onSave({ name, phone, address, managerFio: managerFio.trim() || undefined, city: city.trim() || undefined });
      onClose();
    } catch (error) {
      console.error('Error saving club:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={club ? 'Редактировать клуб' : 'Создать клуб'}
      size="medium"
    >
      <form onSubmit={handleSubmit}>
        <FormField
          label="Название клуба"
          name="name"
          type="text"
          value={name}
          onChange={(value) => setName(String(value))}
          placeholder="Введите название клуба"
          required
        />
        <FormField
          label="Телефон"
          name="phone"
          type="tel"
          value={phone}
          onChange={(value) => setPhone(String(value))}
          placeholder="+7 (___) ___-__-__"
          mask="+7 (999) 999-99-99"
          required
        />
        <FormField
          label="Адрес"
          name="address"
          type="text"
          value={address}
          onChange={(value) => setAddress(String(value))}
          placeholder="Введите адрес клуба"
          required={!club}
        />
        <FormField
          label="ФИО менеджера"
          name="managerFio"
          type="text"
          value={managerFio}
          onChange={(value) => setManagerFio(String(value))}
          placeholder="Иванов Иван Иванович"
        />
        <FormField
          label="Город"
          name="city"
          type="text"
          value={city}
          onChange={(value) => setCity(String(value))}
          placeholder="Например: Шымкент"
        />
        <div className="modal-actions">
          <button type="button" onClick={onClose} className="cancel-button">
            Отмена
          </button>
          <button type="submit" className="save-button" disabled={isLoading}>
            {isLoading ? 'Сохранение...' : club ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
