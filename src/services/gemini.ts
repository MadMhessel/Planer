import { GoogleGenAI, Type } from "@google/genai";
import { Project, Task, User, TaskPriority, TaskStatus } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const GeminiService = {
  interpretCommand: async (
    command: string, 
    context: { projects: Project[], users: User[], currentTasks: Task[] }
  ) => {
    if (!apiKey) {
      throw new Error("API Key is missing. Please configure it in your environment.");
    }

    const modelId = "gemini-2.5-flash";
    const todayStr = new Date().toISOString().split('T')[0];

    const projectContext = context.projects.map(p => `${p.name} (ID: ${p.id})`).join(', ');
    const userContext = context.users.map(u => `${u.name} (ID: ${u.id})`).join(', ');

    const systemInstruction = `
      Вы — ИИ-ассистент для Системы Управления Задачами.
      Текущая дата: ${todayStr}.
      
      Доступные проекты: ${projectContext}.
      Доступные пользователи: ${userContext}.
      
      Ваша цель: интерпретировать команду пользователя на естественном языке (русском или английском) и вывести структурированный JSON-объект, представляющий намерение.
      
      Поддерживаемые действия (action):
      1. create_task: Создать новую задачу.
      2. update_task: Обновить существующую (требуется идентифицировать задачу по смыслу).
      3. create_project: Создать новый проект.
      
      Правила:
      - Если проект не указан, попробуйте вывести его из контекста или оставьте пустым.
      - Если дата относительная (например, "в следующую пятницу"), вычислите ISO дату YYYY-MM-DD.
      - Поле summary должно быть кратким описанием действий на РУССКОМ языке.
      - Верните ТОЛЬКО JSON объект.
    `;

    const schema = {
      type: Type.OBJECT,
      properties: {
        action: { 
          type: Type.STRING, 
          enum: ["create_task", "create_project"] 
        },
        data: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            projectId: { type: Type.STRING },
            assigneeId: { type: Type.STRING },
            priority: { type: Type.STRING, enum: ["LOW", "NORMAL", "HIGH", "CRITICAL"] },
            dueDate: { type: Type.STRING },
            startDate: { type: Type.STRING },
            projectName: { type: Type.STRING }, // For create_project
            projectDescription: { type: Type.STRING } // For create_project
          }
        },
        summary: { type: Type.STRING, description: "Краткое описание того, что будет сделано, на русском языке." }
      },
      required: ["action", "data", "summary"]
    };

    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: command,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      const text = response.text;
      if (!text) return null;
      return JSON.parse(text);
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  },

  generateBreakdown: async (taskTitle: string) => {
      if (!apiKey) return [];
      const modelId = "gemini-2.5-flash";
      
      const response = await ai.models.generateContent({
        model: modelId,
        contents: `Разбей задачу "${taskTitle}" на 3-5 подзадач. Верни JSON массив строк на русском языке.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
      });
      
      return JSON.parse(response.text || "[]");
  }
};