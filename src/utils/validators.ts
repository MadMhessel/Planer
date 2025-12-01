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

