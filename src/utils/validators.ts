import { Task, Project } from '../types';
import { MAX_TASK_TITLE_LENGTH, MAX_TASK_DESCRIPTION_LENGTH, MAX_PROJECT_NAME_LENGTH } from '../constants/tasks';

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

export const validateTask = (task: Partial<Task>): ValidationResult => {
  const errors: string[] = [];

  if (!task.title || task.title.trim().length === 0) {
    errors.push('Название задачи обязательно');
  }

  if (task.title && task.title.length > MAX_TASK_TITLE_LENGTH) {
    errors.push(`Название задачи не должно превышать ${MAX_TASK_TITLE_LENGTH} символов`);
  }

  if (task.description && task.description.length > MAX_TASK_DESCRIPTION_LENGTH) {
    errors.push(`Описание задачи не должно превышать ${MAX_TASK_DESCRIPTION_LENGTH} символов`);
  }

  if (task.dueDate && task.startDate) {
    const due = new Date(task.dueDate);
    const start = new Date(task.startDate);
    if (due < start) {
      errors.push('Срок выполнения не может быть раньше даты начала');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateProject = (project: Partial<Project>): ValidationResult => {
  const errors: string[] = [];

  if (!project.name || project.name.trim().length === 0) {
    errors.push('Название проекта обязательно');
  }

  if (project.name && project.name.length > MAX_PROJECT_NAME_LENGTH) {
    errors.push(`Название проекта не должно превышать ${MAX_PROJECT_NAME_LENGTH} символов`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Валидация email
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];

  if (!email || email.trim().length === 0) {
    errors.push('Email обязателен');
  } else {
    // Простая проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('Введите корректный email адрес');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Валидация пароля
export const validatePassword = (password: string, isRegistration: boolean = false): ValidationResult => {
  const errors: string[] = [];

  if (!password || password.length === 0) {
    errors.push('Пароль обязателен');
  } else {
    if (password.length < 6) {
      errors.push('Пароль должен содержать минимум 6 символов');
    }
    
    if (isRegistration && password.length < 8) {
      errors.push('Для регистрации пароль должен содержать минимум 8 символов');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Валидация имени пользователя
export const validateDisplayName = (displayName: string): ValidationResult => {
  const errors: string[] = [];

  if (!displayName || displayName.trim().length === 0) {
    errors.push('Имя обязательно');
  } else {
    if (displayName.trim().length < 2) {
      errors.push('Имя должно содержать минимум 2 символа');
    }
    if (displayName.trim().length > 50) {
      errors.push('Имя не должно превышать 50 символов');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

