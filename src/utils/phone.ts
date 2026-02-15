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
