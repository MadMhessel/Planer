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
  chatId?: string;
  enabled?: boolean;
}

export interface User {
  id: string; // Firebase UID
  name: string;
  email: string;
  avatar?: string;
  role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
  telegram?: TelegramConfig;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  allowedEmails: string[];
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  workspaceId: string;
}

export interface Task {
  id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  startDate: string;
  dueDate: string;
  tags: string[];
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

export type ViewMode = 'LIST' | 'BOARD' | 'CALENDAR' | 'GANTT' | 'DASHBOARD' | 'SETTINGS';

export interface SystemSettings {
  telegramBotToken?: string;
}