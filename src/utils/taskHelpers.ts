import { TaskStatus, TaskPriority } from '../types';
import { TASK_STATUS_LABELS, PRIORITY_LABELS } from '../constants/tasks';

export const getStatusLabel = (status: TaskStatus): string => {
  return TASK_STATUS_LABELS[status] || status;
};

export const getPriorityLabel = (priority: TaskPriority): string => {
  return PRIORITY_LABELS[priority] || priority;
};

export const getPriorityColor = (priority: TaskPriority): string => {
  switch (priority) {
    case TaskPriority.LOW:
      return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60';
    case TaskPriority.NORMAL:
      return 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-600/70';
    case TaskPriority.HIGH:
      return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60';
    case TaskPriority.CRITICAL:
      return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700/80';
    default:
      return 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-600/70';
  }
};

export const getStatusColor = (status: TaskStatus): string => {
  switch(status) {
    case TaskStatus.DONE: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case TaskStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case TaskStatus.REVIEW: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    case TaskStatus.HOLD: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
};

