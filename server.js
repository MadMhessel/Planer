const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
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

// --- Инициализация Gemini ---
const apiKey =
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY ||
  process.env.API_KEY;

let model = null;

if (!apiKey) {
  console.warn("GOOGLE_API_KEY is not set - Gemini features disabled");
} else {
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-001", // или твоя модель
  });
}

const parseGeminiResponse = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return null;
  const cleaned = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const tryParse = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  let parsed = tryParse(cleaned);
  if (parsed) return parsed;

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    parsed = tryParse(arrayMatch[0]);
    if (parsed) return parsed;
  }

  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    parsed = tryParse(objectMatch[0]);
    if (parsed) return parsed;
  }

  return null;
};

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
  if (!model) {
    return res
      .status(500)
      .json({ error: "Gemini API key is not configured on the server" });
  }

  try {
    const { command, context } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    
    // Construct context string
    const projectContext = context?.projectNames?.join(', ') || 'нет запланированных проектов';
    const userContext = context?.userNames?.join(', ') || 'нет известных пользователей';

    const systemInstruction = `
      Ты — интеллектуальный помощник-планировщик задач для небольшой команды.
      Текущая дата: ${todayStr}.
      
      Доступные проекты: ${projectContext}.
      Доступные пользователи: ${userContext}.
      
      Твоя цель: интерпретировать команду пользователя на естественном языке (русском или английском) и вывести структурированный JSON-массив объектов, представляющих задачи.
      
      Каждый объект должен содержать поля:
      - "title": краткое название задачи
      - "description": подробное описание
      - "projectName": название проекта (если логично привязать к одному из доступных проектов)
      - "assigneeName": имя исполнителя (если подходит к одному из доступных пользователей)
      - "dueDate": желаемый крайний срок (ISO-формат YYYY-MM-DD, если из контекста понятно)
      - "priority": одна из: LOW, NORMAL, HIGH, CRITICAL
      
      Правила:
      - Формат строго JSON-массив объектов без пояснений, комментариев и текста вокруг.
      - Если проект не указан, оставьте "projectName" пустым.
      - Если исполнитель не указан, оставьте "assigneeName" пустым.
      - Если дата относительная (например, "в следующую пятницу"), вычислите ISO дату YYYY-MM-DD.
      - Верните ТОЛЬКО JSON массив, соответствующий схеме.
    `;

    const prompt = `
      ${systemInstruction}
      
      КОМАНДА ПОЛЬЗОВАТЕЛЯ: "${command}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const parsed = parseGeminiResponse(text);

    if (!parsed) {
      console.error('Gemini returned unparseable payload:', text);
      return res.status(422).json({
        error: 'Gemini не смог сформировать задачи. Попробуйте переформулировать запрос.'
      });
    }
    
    res.json(parsed);

  } catch (error) {
    console.error('AI API Error:', error);
    res.status(500).json({ error: 'Failed to process AI command', details: error.message });
  }
});

// --- Static Files ---
// Раздаём собранный фронт Vite
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA Fallback - для всех маршрутов возвращаем index.html
// В Express 5.x используем middleware вместо wildcard маршрута
app.use((req, res, next) => {
  // Если это API маршрут, пропускаем
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // Для всех остальных маршрутов возвращаем index.html
  res.sendFile(path.join(distPath, 'index.html'));
});

// Запуск сервера с обработкой ошибок
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Health check: http://0.0.0.0:${PORT}/api/health`);
});

// Обработка ошибок при запуске
server.on('error', (err) => {
  console.error('✗ Server startup error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});