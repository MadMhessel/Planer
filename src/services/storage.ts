import { Project, Task, User, Notification, SystemSettings } from "../types";

const STORAGE_KEYS = {
  TASKS: 'ctp_tasks',
  PROJECTS: 'ctp_projects',
  USERS: 'ctp_users',
  NOTIFICATIONS: 'ctp_notifications',
  SYSTEM: 'ctp_system_settings',
};

// Removed API_URL and apiRequest to prevent 404s on missing endpoints.
// This service is now a pure LocalStorage fallback.

const getData = async (key: string, defaultValue: any) => {
    // Pure LocalStorage
    const local = localStorage.getItem(key);
    return local ? JSON.parse(local) : defaultValue;
};

const saveData = async (key: string, value: any) => {
    // Pure LocalStorage
    localStorage.setItem(key, JSON.stringify(value));
};

export const StorageService = {
  // --- Tasks ---
  getTasks: async (): Promise<Task[]> => {
    return getData(STORAGE_KEYS.TASKS, []);
  },

  saveTasks: async (tasks: Task[]): Promise<void> => {
    await saveData(STORAGE_KEYS.TASKS, tasks);
  },

  // --- Projects ---
  getProjects: async (): Promise<Project[]> => {
    return getData(STORAGE_KEYS.PROJECTS, []);
  },

  saveProjects: async (projects: Project[]): Promise<void> => {
    await saveData(STORAGE_KEYS.PROJECTS, projects);
  },

  // --- Users ---
  getUsers: async (): Promise<User[]> => {
    return getData(STORAGE_KEYS.USERS, []);
  },

  saveUsers: async (users: User[]): Promise<void> => {
    await saveData(STORAGE_KEYS.USERS, users);
  },

  // --- Notifications ---
  getNotifications: async (): Promise<Notification[]> => {
    return getData(STORAGE_KEYS.NOTIFICATIONS, []);
  },

  saveNotifications: async (notifications: Notification[]): Promise<void> => {
    await saveData(STORAGE_KEYS.NOTIFICATIONS, notifications);
  },

  addNotification: async (notification: Notification): Promise<void> => {
      const current = await StorageService.getNotifications();
      const updated = [notification, ...current].slice(0, 50); // Keep last 50
      await StorageService.saveNotifications(updated);
  },

  markNotificationRead: async (notificationId: string): Promise<void> => {
      const current = await StorageService.getNotifications();
      const updated = current.map(n => n.id === notificationId ? { ...n, isRead: true } : n);
      await StorageService.saveNotifications(updated);
  },

  markAllNotificationsRead: async (userId: string): Promise<void> => {
      const current = await StorageService.getNotifications();
      const updated = current.map(n => n.userId === userId ? { ...n, isRead: true } : n);
      await StorageService.saveNotifications(updated);
  },

  // --- System Settings ---
  getSystemSettings: async (): Promise<SystemSettings> => {
    return getData(STORAGE_KEYS.SYSTEM, {});
  },

  saveSystemSettings: async (settings: SystemSettings): Promise<void> => {
    await saveData(STORAGE_KEYS.SYSTEM, settings);
  },

  // Helper to generate IDs
  generateId: (): string => {
    return Math.random().toString(36).substring(2, 9);
  }
};