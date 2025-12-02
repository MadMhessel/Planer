export interface Notification {
  id?: string;
  workspaceId: string;
  title: string;
  message: string;
  type: 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'INFO' | 'AI';
  createdAt: string; // ISO
  readBy: string[];  // userIds, empty => unread by all
  recipients?: string[]; // optional target ids
}
