import type { Task } from '../types';

export const GeminiService = {
  async suggestTasksFromCommand(
    command: string,
    context: { projectNames: string[]; userNames: string[] }
  ): Promise<Partial<Task>[]> {
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, context }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch AI suggestions from server');
      }
      const suggestions = await response.json();
      if (Array.isArray(suggestions)) {
        return suggestions as Partial<Task>[];
      }
      if (suggestions && typeof suggestions === 'object') {
        return [suggestions as Partial<Task>];
      }
      throw new Error('Gemini не вернул задачи');
    } catch (error: any) {
      console.error('Error calling AI endpoint:', error);
      throw error;
    }
  }
};
