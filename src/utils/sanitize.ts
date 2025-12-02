// src/utils/sanitize.ts
/**
 * Утилиты для санитизации HTML контента
 * Используется для безопасной отправки HTML в Telegram и других внешних сервисов
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Разрешенные HTML теги для Telegram сообщений
 */
const ALLOWED_TAGS = ['b', 'i', 'u', 's', 'code', 'pre', 'a'];

/**
 * Разрешенные атрибуты для тегов
 */
const ALLOWED_ATTR: string[] = ['href'];

/**
 * Санитизирует HTML строку, оставляя только безопасные теги
 * @param html - HTML строка для санитизации
 * @returns Санитизированная HTML строка
 */
export const sanitizeHTML = (html: string): string => {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false
  });
};

/**
 * Экранирует HTML специальные символы
 * Используется когда нужно полностью убрать HTML
 * @param text - Текст для экранирования
 * @returns Экранированный текст
 */
export const escapeHTML = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, (m) => map[m]);
};

