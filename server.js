const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Request Logging Middleware (Helpful for debugging 404s in Cloud Logs)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Initialize Gemini
// NOTE: API_KEY must be set in Cloud Run Environment Variables
const apiKey = process.env.API_KEY || '';
let ai = null;
if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
}

// --- API Routes ---

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

// Legacy Storage Endpoint (Fallback for older clients or cached builds)
// Use /tmp for Cloud Run as it is the only writable system path (in-memory)
const DB_FILE = path.join('/tmp', 'db.json');

app.get('/api/storage', (req, res) => {
    console.log('Serving storage request');
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            res.json(JSON.parse(data));
        } else {
            // Return empty object if no file exists yet
            res.json({});
        }
    } catch (e) {
        console.error("Storage read error", e);
        res.json({});
    }
});

// --- Telegram Notification Endpoint ---
app.post('/api/telegram/notify', async (req, res) => {
  const { chatIds, message } = req.body;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
    return res.status(400).json({ error: 'No recipients provided' });
  }

  // Helper to send a single message
  const sendOne = async (chatId) => {
    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });
      const data = await response.json();
      return { chatId, success: data.ok, error: data.description };
    } catch (err) {
      console.error(`Failed to send to ${chatId}:`, err);
      return { chatId, success: false, error: err.message };
    }
  };

  // Send to all recipients in parallel
  const results = await Promise.all(chatIds.map(sendOne));
  
  // Log results for debugging
  console.log('Notification results:', results);

  res.json({ success: true, results });
});

// AI Endpoint (Proxies request to Gemini to keep key secret)
app.post('/api/ai/generate', async (req, res) => {
  try {
    if (!ai) {
        return res.status(500).json({ error: 'Server AI configuration missing' });
    }

    const { command, context } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    
    // Construct context string
    const projectContext = context?.projects?.map(p => `${p.name} (ID: ${p.id})`).join(', ') || '';
    const userContext = context?.users?.map(u => `${u.name} (ID: ${u.id})`).join(', ') || '';

    const systemInstruction = `
      Вы — ИИ-ассистент для Системы Управления Задачами.
      Текущая дата: ${todayStr}.
      
      Доступные проекты: ${projectContext}.
      Доступные пользователи: ${userContext}.
      
      Ваша цель: интерпретировать команду пользователя на естественном языке (русском или английском) и вывести структурированный JSON-объект, представляющий намерение.
      
      Поддерживаемые действия (action):
      1. create_task: Создать новую задачу.
      2. create_project: Создать новый проект.
      
      Правила:
      - Если проект не указан, попробуйте вывести его из контекста или оставьте пустым.
      - Если дата относительная (например, "в следующую пятницу"), вычислите ISO дату YYYY-MM-DD.
      - Поле summary должно быть кратким описанием действий на РУССКОМ языке.
      - Верните ТОЛЬКО JSON объект, соответствующий схеме.
    `;

    const prompt = `
      ${systemInstruction}
      
      КОМАНДА ПОЛЬЗОВАТЕЛЯ: "${command}"
      
      Формат ответа JSON:
      {
        "action": "create_task" | "create_project",
        "data": {
          "title": string,
          "description": string,
          "projectId": string,
          "assigneeId": string,
          "priority": "LOW" | "NORMAL" | "HIGH" | "CRITICAL",
          "dueDate": string (YYYY-MM-DD),
          "startDate": string (YYYY-MM-DD),
          "projectName": string (for create_project),
          "projectDescription": string
        },
        "summary": string
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    res.json(JSON.parse(jsonStr));

  } catch (error) {
    console.error('AI API Error:', error);
    res.status(500).json({ error: 'Failed to process AI command', details: error.message });
  }
});

// --- Static Files ---
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Fallback
app.get('*', (req, res) => {
  const distIndex = path.join(__dirname, 'dist', 'index.html');
  if (require('fs').existsSync(distIndex)) {
      res.sendFile(distIndex);
  } else {
      // Fallback for dev mode / non-built environment
      const localIndex = path.join(__dirname, 'index.html');
      if (require('fs').existsSync(localIndex)) {
        res.sendFile(localIndex);
      } else {
        res.status(404).send('Build not found. Please run npm run build.');
      }
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});