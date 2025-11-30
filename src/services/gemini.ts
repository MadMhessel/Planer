import { GoogleGenerativeAI } from '@google/genai';
import type { Task } from '../types';

// Assume API key is provided via environment variable
const env = (import.meta as any).env;
const apiKey = env.VITE_GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

export const GeminiService = {
  async suggestTasksFromCommand(
    command: string,
    context: { projectNames: string[]; userNames: string[] }
  ): Promise<Partial<Task>[]> {
    if (!genAI) {
      console.warn('Gemini API key not configured');
      return [];
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Ты — интеллектуальный помощник-планировщик задач для небольшой команды.

Пользователь вводит команду на естественном языке, а ты возвращаешь список задач.

Требования к ответу:

* Формат строго JSON-массив объектов без пояснений, комментариев и текста вокруг.
* Каждый объект описывает одну задачу и может содержать поля:
  - "title": краткое название задачи
  - "description": подробное описание
  - "projectName": название проекта (если логично привязать к одному из: ${context.projectNames.join(', ') || 'нет запланированных проектов'})
  - "assigneeName": имя исполнителя (если подходит к одному из: ${context.userNames.join(', ') || 'нет известных пользователей'})
  - "dueDate": желаемый крайний срок (ISO-формат YYYY-MM-DD, если из контекста понятно)
  - "priority": одна из: LOW, NORMAL, HIGH, CRITICAL

Команда пользователя:
"${command}"
`;

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024
      }
    });

    const text = result.response.text().trim();

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed as Partial<Task>[];
      }
      if (parsed && typeof parsed === 'object') {
        return [parsed as Partial<Task>];
      }
      return [];
    } catch (e) {
      console.warn('Failed to parse Gemini response as JSON', e, text);
      return [];
    }
  }
};
