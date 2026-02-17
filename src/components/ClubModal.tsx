import { useState, useEffect } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import MapPicker from './MapPicker';
import { KAZAKHSTAN_CITIES } from '@/constants/cities';
import type { Club } from '@/types';

export interface ClubFormData {
  name: string;
  phone: string;
  address: string;
  managerFio?: string;
  city?: string;
  latitude: number;
  longitude: number;
}

interface ClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ClubFormData) => Promise<void>;
  club?: Club | null;
}

export default function ClubModal({ isOpen, onClose, onSave, club }: ClubModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [managerFio, setManagerFio] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState<number>(43.238949);
  const [longitude, setLongitude] = useState<number>(76.945465);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (club) {
      setName(club.clubName || '');
      setPhone(club.phone || '');
      setAddress(club.address || '');
      setManagerFio(club.managerFio || '');
      setCity(club.city || '');
      setLatitude(club.latitude ?? 43.238949);
      setLongitude(club.longitude ?? 76.945465);
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setManagerFio('');
      setCity('');
      setLatitude(43.238949);
      setLongitude(76.945465);
    }
  }, [club, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || (!club && !address)) return;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    setIsLoading(true);
    try {
      await onSave({
        name,
        phone,
        address,
        managerFio: managerFio.trim() || undefined,
        city: city.trim() || undefined,
        latitude,
        longitude,
      });
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
        <div className="form-field">
          <label htmlFor="club-city">Город</label>
          <select
            id="club-city"
            name="city"
            value={city}
            onChange={(e) => {
              const value = e.target.value;
              setCity(value);
              const found = KAZAKHSTAN_CITIES.find((c) => c.name === value);
              if (found) {
                setLatitude(found.latitude);
                setLongitude(found.longitude);
              }
            }}
            className="form-input"
          >
            <option value="">Выберите город</option>
            {city && !KAZAKHSTAN_CITIES.some((c) => c.name === city) && (
              <option value={city}>{city}</option>
            )}
            {KAZAKHSTAN_CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Геолокация клуба</label>
          <MapPicker
            latitude={latitude}
            longitude={longitude}
            onChange={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
            }}
            height={260}
          />
        </div>
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
