// src/utils/userHelpers.ts
/**
 * Утилиты для работы с пользователями и участниками workspace
 */
import { WorkspaceMember, User } from '../types';

/**
 * Преобразует массив участников workspace в массив пользователей
 * @param members - Массив участников workspace
 * @returns Массив пользователей
 */
export const membersToUsers = (members: WorkspaceMember[]): User[] => {
  return members.map(m => ({
    id: m.userId,
    email: m.email,
    displayName: m.email, // Можно улучшить, если есть displayName в WorkspaceMember
    role: m.role,
    isActive: m.status === 'ACTIVE',
    createdAt: m.joinedAt
  }));
};

/**
 * Получает инициалы пользователя из имени или email
 * @param displayName - Отображаемое имя
 * @param email - Email адрес
 * @returns Инициалы (максимум 2 символа)
 */
export const getInitials = (displayName?: string, email?: string): string => {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  
  return '?';
};

