import { TaskStatus, TaskPriority } from '../types';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'К выполнению',
  [TaskStatus.IN_PROGRESS]: 'В работе',
  [TaskStatus.REVIEW]: 'На проверке',
  [TaskStatus.DONE]: 'Готово',
  [TaskStatus.HOLD]: 'Отложено'
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'Низкий',
  [TaskPriority.NORMAL]: 'Обычный',
  [TaskPriority.HIGH]: 'Высокий',
  [TaskPriority.CRITICAL]: 'Критический'
};

export const MAX_TASK_TITLE_LENGTH = 200;
export const MAX_TASK_DESCRIPTION_LENGTH = 5000;
export const MAX_PROJECT_NAME_LENGTH = 100;

