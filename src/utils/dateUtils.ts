/**
 * Утилиты для работы с датами в московском времени (UTC+3)
 * Московское время используется во всем приложении
 */

// Московское время: UTC+3 (фиксированное, без учета летнего времени)
const MOSCOW_TIMEZONE_OFFSET = 3 * 60; // 3 часа в минутах

/**
 * Получить текущую дату и время в московском времени
 * @returns Date объект, представляющий текущее время в Москве
 */
export function getMoscowDate(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const moscowTime = new Date(utc + (MOSCOW_TIMEZONE_OFFSET * 60000));
  return moscowTime;
}

/**
 * Получить текущую дату и время в московском времени в формате ISO строки
 * @returns ISO строка с текущим временем в Москве
 */
export function getMoscowISOString(): string {
  return getMoscowDate().toISOString();
}

/**
 * Получить текущую дату в московском времени в формате YYYY-MM-DD
 * @returns Строка в формате YYYY-MM-DD
 */
export function getMoscowDateString(): string {
  const moscowDate = getMoscowDate();
  const year = moscowDate.getUTCFullYear();
  const month = String(moscowDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(moscowDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Конвертировать дату в московское время
 * @param date - Дата для конвертации (может быть строкой ISO или Date объектом)
 * @returns Date объект в московском времени
 */
export function toMoscowDate(date: string | Date): Date {
  if (typeof date === 'string') {
    // Если это строка даты без времени (YYYY-MM-DD), интерпретируем как полночь в Москве
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = date.split('-').map(Number);
      const utc = Date.UTC(year, month - 1, day);
      return new Date(utc - (MOSCOW_TIMEZONE_OFFSET * 60000));
    }
    // Иначе парсим как ISO строку
    return new Date(date);
  }
  return date;
}

/**
 * Форматировать дату в московском времени для отображения
 * @param date - Дата для форматирования
 * @param options - Опции форматирования (как в Intl.DateTimeFormat)
 * @returns Отформатированная строка
 */
export function formatMoscowDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const moscowDate = toMoscowDate(date);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Moscow',
    ...options
  };
  return new Intl.DateTimeFormat('ru-RU', defaultOptions).format(moscowDate);
}

/**
 * Получить относительное время (например, "2 часа назад") в московском времени
 * @param dateString - ISO строка даты
 * @returns Отформатированная строка с относительным временем
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const moscowNow = getMoscowDate();
  const diffMs = moscowNow.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays < 7) return `${diffDays} дн. назад`;
  
  return formatMoscowDate(date, { 
    day: 'numeric', 
    month: 'short',
    year: moscowNow.getFullYear() !== date.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Получить дату через N дней от текущей даты в московском времени
 * @param days - Количество дней (может быть отрицательным)
 * @returns ISO строка даты
 */
export function getMoscowDatePlusDays(days: number): string {
  const moscowDate = getMoscowDate();
  moscowDate.setUTCDate(moscowDate.getUTCDate() + days);
  return moscowDate.toISOString().split('T')[0];
}

