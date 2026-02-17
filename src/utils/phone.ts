/** Оставляет в строке только цифры (для поиска по телефону в любом формате). */
export function getPhoneDigits(value: string): string {
  return (value ?? '').replace(/\D/g, '');
}

/** Проверяет, подходит ли номер телефона под поисковый запрос (любой формат: 8708, +7771, 8 705...). */
export function phoneMatchesSearch(phone: string | undefined, searchQuery: string): boolean {
  if (!searchQuery.trim()) return true;
  const phoneDigits = getPhoneDigits(phone ?? '');
  const searchDigits = getPhoneDigits(searchQuery);
  return phoneDigits.includes(searchDigits);
}

/** Приводит телефон к отображаемому формату, добавляя + перед первой цифрой и расставляя пробелы, если длина подходит. */
export function formatPhoneForDisplay(raw: string | undefined): string {
  if (!raw) return '';

  let value = raw.trim();

  // Если первый символ — цифра, добавляем плюс
  if (/^\d/.test(value)) {
    value = `+${value}`;
  }

  // Для более красивого отображения попробуем нормализовать номера Казахстана
  // Оставляем только цифры, предполагаем формат 7XXXXXXXXXX (11 цифр вместе с "7")
  const digits = getPhoneDigits(value);

  if (digits.length === 11 && digits.startsWith('7')) {
    const country = '+7';
    const part1 = digits.slice(1, 4);
    const part2 = digits.slice(4, 7);
    const part3 = digits.slice(7, 9);
    const part4 = digits.slice(9, 11);
    return `${country} ${part1} ${part2} ${part3} ${part4}`;
  }

  // В остальных случаях просто возвращаем строку с гарантированным плюсом
  return value;
}
