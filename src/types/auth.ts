// src/types/auth.ts
/**
 * Типы для аутентификации и создания пользователей
 */
import { User, UserRole } from './index';

/**
 * Данные для создания нового пользователя
 * Используется вместо any при создании пользователя
 */
export interface NewUserData {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string;
  photoURL?: string;
}

/**
 * Расширенный тип пользователя с опциональными полями для создания
 */
export type UserCreateData = Omit<User, 'id' | 'createdAt' | 'lastLoginAt'> & {
  id: string;
  createdAt: string;
  lastLoginAt: string;
};

