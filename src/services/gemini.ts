import type { Task } from '../types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  tasks: Partial<Task>[];
  textResponse: string;
}

export const GeminiService = {
  async suggestTasksFromCommand(
    command: string,
    context: { projectNames: string[]; userNames: string[] },
    chatHistory?: ChatMessage[]
  ): Promise<AIResponse> {
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command, 
          context,
          chatHistory: chatHistory || []
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch AI suggestions from server');
      }
      const data = await response.json();
      
      // Поддерживаем старый формат (только массив задач)
      if (Array.isArray(data)) {
        return {
          tasks: data as Partial<Task>[],
          textResponse: `Создано задач: ${data.length}`
        };
      }
      
      // Новый формат с текстовым ответом
      if (data.tasks && data.textResponse) {
        return {
          tasks: Array.isArray(data.tasks) ? data.tasks : [data.tasks],
          textResponse: data.textResponse
        };
      }
      
      // Если только tasks
      if (data.tasks) {
        return {
          tasks: Array.isArray(data.tasks) ? data.tasks : [data.tasks],
          textResponse: `Обработано задач: ${Array.isArray(data.tasks) ? data.tasks.length : 1}`
        };
      }
      
      throw new Error('Gemini не вернул корректный ответ');
    } catch (error: any) {
      console.error('Error calling AI endpoint:', error);
      throw error;
    }
  }
};
