import type { Task } from '../types';

export const ApiService = {
  async syncTaskToTelegram(task: Task) {
    // Placeholder for future Telegram integration
    try {
      await fetch('/api/telegram/sync-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      });
    } catch (e) {
      console.warn('Failed to sync task to Telegram:', e);
    }
  }
};
