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

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  projectId?: string;
  assigneeId?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  dueDate?: string;  // ISO date string
  startDate?: string; // ISO date string
  priority: TaskPriority;
  tags?: string[];
  estimatedHours?: number;
  loggedHours?: number;
  dependencies?: string[];
  workspaceId: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  startDate?: string;
  endDate?: string;
  status?: 'ACTIVE' | 'ARCHIVED' | 'PLANNED';
  workspaceId: string;
};

export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type User = {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  telegramChatId?: string;
  pushSubscription?: PushSubscription; // Web Push subscription
  notificationSettings?: UserNotificationSettings;
};

export type Workspace = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  ownerId: string;
  plan?: 'FREE' | 'PRO' | 'TEAM';
};

export type WorkspaceMember = {
  id: string;
  userId: string;
  email: string;
  role: UserRole;
  joinedAt: string;
  invitedBy?: string;
  status: 'ACTIVE' | 'PENDING' | 'REMOVED';
  telegramChatId?: string;
};

export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export type WorkspaceInvite = {
  id: string;
  token: string;
  email: string;
  role: UserRole;
  workspaceId: string;
  invitedBy: string;
  status: InviteStatus;
  createdAt: string;
  expiresAt: string;
};

// Notification type with Firestore persistence support
export type Notification = {
  id?: string; // Firestore doc ID
  workspaceId: string;
  type: 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'PROJECT_UPDATED' | 'SYSTEM' | 'AI' | 'INFO';
  title: string;
  message: string;
  createdAt: string;
  readBy: string[]; // Array of userIds who have read this notification
  recipients?: string[]; // Optional: specific userIds to notify (for @mentions)
};

// User notification settings
export type UserNotificationSettings = {
  channels: {
    telegram: boolean;
    push: boolean;
    email: boolean;
  };
  muteUntil?: string; // ISO timestamp
  soundEnabled: boolean;
};

export type ViewMode = 'BOARD' | 'CALENDAR' | 'GANTT' | 'LIST' | 'DASHBOARD';
