import InputMask from 'react-input-mask';
import './FormField.css';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'number' | 'email' | 'tel' | 'select' | 'textarea';
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  required?: boolean;
  mask?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
}

export default function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  mask,
  options,
  min,
  max,
  step,
}: FormFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (type === 'number') {
      const inputValue = e.target.value.trim();
      
      // Если поле пустое, устанавливаем 0
      if (inputValue === '' || inputValue === null || inputValue === undefined) {
        onChange(0);
        return;
      }
      
      // Убираем все нечисловые символы кроме точки, минуса и запятой
      let cleaned = inputValue.replace(/[^\d.,-]/g, '');
      // Заменяем запятую на точку
      cleaned = cleaned.replace(',', '.');
      
      // Убираем ведущие нули (кроме случаев типа "0.5" или просто "0")
      if (cleaned.length > 1 && cleaned[0] === '0' && cleaned[1] !== '.') {
        cleaned = cleaned.replace(/^0+/, '');
      }
      
      // Если после очистки пусто, возвращаем 0
      if (cleaned === '' || cleaned === '-') {
        onChange(0);
        return;
      }
      
      const numValue = parseFloat(cleaned);
      
      // Если значение валидное число
      if (!isNaN(numValue) && isFinite(numValue)) {
        // Применяем ограничения min/max если они заданы
        let finalValue = numValue;
        if (min !== undefined && finalValue < min) finalValue = min;
        if (max !== undefined && finalValue > max) finalValue = max;
        onChange(finalValue);
      } else if (cleaned === '' || cleaned === '-') {
        // Если пустое или только минус, устанавливаем 0
        onChange(0);
      }
      // Если не число, просто игнорируем (не обновляем значение)
    } else {
      onChange(e.target.value);
    }
  };

  return (
    <div className="form-field">
      <label htmlFor={name} className="form-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      {type === 'select' && options ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          className="form-input"
          required={required}
        >
          <option value="">Выберите...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          className="form-input form-textarea"
          placeholder={placeholder}
          required={required}
          rows={4}
        />
      ) : mask ? (
        <InputMask
          mask={mask}
          value={value as string}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            onChange(e.target.value);
          }}
          placeholder={placeholder}
        >
          {(inputProps: any) => (
            <input
              {...inputProps}
              id={name}
              name={name}
              type={type}
              className="form-input"
              required={required}
            />
          )}
        </InputMask>
      ) : (
        <input
          id={name}
          name={name}
          type={type === 'number' ? 'text' : type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={type === 'number' ? (value === 0 || value === '' ? '' : String(value).replace(/^0+(?=\d)/, '')) : value}
          onChange={handleChange}
          onBlur={(e) => {
            // При потере фокуса нормализуем значение
            if (type === 'number' && e.target.value === '') {
              onChange(0);
            }
          }}
          className="form-input"
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          step={step}
        />
      )}
    </div>
  );
}
