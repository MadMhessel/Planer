
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
  HOLD = 'HOLD'
}

export enum TaskPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface TelegramConfig {
  enabled: boolean;
  chatId: string;
}

export interface SystemSettings {
  telegramBotToken?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // In a real app, never store passwords on client like this. This is for simulation.
  avatar?: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  telegram?: TelegramConfig;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  startDate: string; // ISO Date string
  dueDate: string; // ISO Date string
  tags: string[];
  dependencies: string[]; // IDs of tasks that must finish before this one starts
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string; // Who the notification is for
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'MEETING' | 'MILESTONE' | 'REMINDER';
  relatedTaskId?: string;
}

export type ViewMode = 'LIST' | 'BOARD' | 'CALENDAR' | 'GANTT' | 'DASHBOARD' | 'SETTINGS';

// AI Related Types
export interface AIAction {
  action: 'create_task' | 'update_task' | 'delete_task' | 'create_project' | 'breakdown_task';
  parameters: Record<string, any>;
  confirmationNeeded: boolean;
  description: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  allowedEmails: string[];
  createdAt: string;
}
