const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const createDOMPurify = require('isomorphic-dompurify');
const DOMPurify = createDOMPurify();
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (например, мобильные приложения, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' })); // Ограничение размера тела запроса

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: 'Слишком много запросов с этого IP, попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 10, // максимум 10 AI запросов в минуту
  message: 'Слишком много AI запросов, подождите немного.',
});

// Применяем rate limiting к API
app.use('/api/', apiLimiter);

// HTTPS enforcement в production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https' && !req.header('host')?.includes('localhost')) {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Request Logging Middleware (Helpful for debugging 404s in Cloud Logs)
app.use((req, res, next) => {
    // Логируем только в development или для важных endpoints
    if (process.env.NODE_ENV === 'development' || req.path.startsWith('/api/')) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    // Логируем ошибки статических файлов в production для отладки
    if (req.path.startsWith('/assets/') && process.env.NODE_ENV === 'production') {
        const filePath = path.join(distPath, req.path);
        if (!fs.existsSync(filePath)) {
            console.error(`[${new Date().toISOString()}] Static file not found: ${req.path} (${filePath})`);
        }
    }
    next();
});

// Утилита для санитизации HTML
const sanitizeHTML = (html) => {
    if (!html || typeof html !== 'string') {
        return '';
    }
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'u', 's', 'code', 'pre', 'a'],
        ALLOWED_ATTR: ['href'],
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false
    });
};

// --- Инициализация Gemini ---
const apiKey =
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY ||
  process.env.API_KEY;

let model = null;

if (!apiKey) {
  if (process.env.NODE_ENV === 'development') {
    console.warn("GOOGLE_API_KEY is not set - Gemini features disabled");
  }
} else {
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-001",
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

// Firebase Configuration Endpoint
// Возвращает конфигурацию Firebase из переменных окружения Cloud Run
app.get('/api/config/firebase', (req, res) => {
  const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID
  };

  // Проверка наличия обязательных полей
  if (!config.apiKey || !config.projectId || !config.authDomain) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Firebase config incomplete:', {
        hasApiKey: !!config.apiKey,
        hasProjectId: !!config.projectId,
        hasAuthDomain: !!config.authDomain
      });
    }
  }

  res.json(config);
});

// Legacy Storage Endpoint (Fallback for older clients or cached builds)
// Use /tmp for Cloud Run as it is the only writable system path (in-memory)
const DB_FILE = path.join('/tmp', 'db.json');

app.get('/api/storage', (req, res) => {
    if (process.env.NODE_ENV === 'development') {
        console.log('Serving storage request');
    }
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
app.post('/api/telegram/notify', 
  [
    body('chatIds').isArray({ min: 1 }).withMessage('chatIds must be a non-empty array'),
    body('chatIds.*').isString().withMessage('Each chatId must be a string'),
    body('message').isString().isLength({ min: 1, max: 4096 }).withMessage('Message must be between 1 and 4096 characters')
  ],
  async (req, res) => {
    // Проверка валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { chatIds, message } = req.body;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      console.error('TELEGRAM_BOT_TOKEN is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Санитизация HTML сообщения
    const sanitizedMessage = sanitizeHTML(message);

    // Helper to send a single message
    const sendOne = async (chatId) => {
      try {
        // Валидация chatId
        if (!chatId || typeof chatId !== 'string') {
          return { chatId, success: false, error: 'Invalid chatId format' };
        }

        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: sanitizedMessage,
            parse_mode: 'HTML',
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          return { chatId, success: false, error: errorData.description || 'Unknown error' };
        }

        const data = await response.json();
        return { chatId, success: data.ok, error: data.description };
      } catch (err) {
        console.error(`Failed to send to ${chatId}:`, err);
        return { chatId, success: false, error: err.message };
      }
    };

    // Send to all recipients in parallel (с ограничением на количество)
    const maxRecipients = 50; // Ограничение для предотвращения злоупотребления
    const limitedChatIds = chatIds.slice(0, maxRecipients);
    
    const results = await Promise.all(limitedChatIds.map(sendOne));
  
    // Log results только в development
    if (process.env.NODE_ENV === 'development') {
      console.log('Notification results:', results);
    }

    res.json({ success: true, results, sent: results.length });
  }
);

// AI Endpoint (Proxies request to Gemini to keep key secret)
app.post('/api/ai/generate', 
  aiLimiter, // Отдельный rate limiter для AI
  [
    body('command').isString().isLength({ min: 1, max: 1000 }).withMessage('Command must be between 1 and 1000 characters'),
    body('context').optional().isObject(),
    body('context.projectNames').optional().isArray(),
    body('context.userNames').optional().isArray(),
    body('chatHistory').optional().isArray(),
    body('chatHistory.*.role').optional().isIn(['user', 'assistant']),
    body('chatHistory.*.content').optional().isString()
  ],
  async (req, res) => {
    // Проверка валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    if (!model) {
      return res
        .status(500)
        .json({ error: "Gemini API key is not configured on the server" });
    }

    try {
      const { command, context, chatHistory = [] } = req.body;
      
      // Дополнительная проверка длины chatHistory
      const MAX_CHAT_HISTORY = 10;
      const limitedChatHistory = Array.isArray(chatHistory) 
        ? chatHistory.slice(-MAX_CHAT_HISTORY) 
        : [];

    const todayStr = new Date().toISOString().split('T')[0];
    
    // Construct context string
    const projectContext = context?.projectNames?.join(', ') || 'нет запланированных проектов';
    const userContext = context?.userNames?.join(', ') || 'нет известных пользователей';

    const systemInstruction = `
      Ты — интеллектуальный помощник-планировщик задач для небольшой команды.
      Текущая дата: ${todayStr}.
      
      Доступные проекты: ${projectContext}.
      Доступные пользователи: ${userContext}.
      
      Твоя цель: интерпретировать команду пользователя на естественном языке (русском или английском) и:
      1. Вывести структурированный JSON-массив объектов, представляющих задачи
      2. Дать понятный текстовый ответ пользователю о том, что было сделано
      
      Каждый объект задачи должен содержать поля:
      - "title": краткое название задачи
      - "description": подробное описание
      - "projectName": название проекта (если логично привязать к одному из доступных проектов)
      - "assigneeName": имя исполнителя (если подходит к одному из доступных пользователей)
      - "dueDate": желаемый крайний срок (ISO-формат YYYY-MM-DD, если из контекста понятно)
      - "priority": одна из: LOW, NORMAL, HIGH, CRITICAL
      
      Правила:
      - Формат ответа: JSON объект с двумя полями: "tasks" (массив задач) и "textResponse" (текстовый ответ пользователю)
      - Если проект не указан, оставьте "projectName" пустым.
      - Если исполнитель не указан, оставьте "assigneeName" пустым.
      - Если дата относительная (например, "в следующую пятницу"), вычислите ISO дату YYYY-MM-DD.
      - textResponse должен быть понятным и дружелюбным ответом на русском языке
      - Учитывай контекст предыдущих сообщений из истории чата
    `;

    // Формируем промпт с историей чата
    let historyContext = '';
    if (limitedChatHistory && limitedChatHistory.length > 0) {
      const MAX_AI_CONTEXT_HISTORY = 6;
      const recentHistory = limitedChatHistory.slice(-MAX_AI_CONTEXT_HISTORY);
      historyContext = '\n\nИстория предыдущих сообщений:\n' + 
        recentHistory
          .filter(msg => msg && msg.role && msg.content)
          .map(msg => {
            const sanitizedContent = sanitizeHTML(String(msg.content || ''));
            return `${msg.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${sanitizedContent}`;
          })
          .join('\n');
    }

    const prompt = `
      ${systemInstruction}
      ${historyContext}
      
      КОМАНДА ПОЛЬЗОВАТЕЛЯ: "${command}"
      
      ВАЖНО: Верни JSON объект в формате:
      {
        "tasks": [массив задач],
        "textResponse": "понятный текстовый ответ пользователю"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Пытаемся извлечь JSON из ответа
    let parsed;
    try {
      // Ищем JSON в ответе
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        // Если не нашли JSON, пытаемся парсить весь текст
        parsed = parseGeminiResponse(text);
        if (parsed) {
          // Если это массив задач, оборачиваем в новый формат
          parsed = {
            tasks: Array.isArray(parsed) ? parsed : [parsed],
            textResponse: `Обработано задач: ${Array.isArray(parsed) ? parsed.length : 1}`
          };
        }
      }
    } catch (e) {
      // Если не удалось распарсить как JSON, пытаемся старый способ
      parsed = parseGeminiResponse(text);
      if (parsed) {
        parsed = {
          tasks: Array.isArray(parsed) ? parsed : [parsed],
          textResponse: `Создано задач: ${Array.isArray(parsed) ? parsed.length : 1}`
        };
      }
    }

    if (!parsed || !parsed.tasks) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Gemini returned unparseable payload:', text.substring(0, 500));
      }
      return res.status(422).json({
        error: 'Gemini не смог сформировать задачи. Попробуйте переформулировать запрос.',
        textResponse: 'Извините, не удалось обработать ваш запрос. Попробуйте переформулировать его.'
      });
    }
    
    // Санитизация текстового ответа
    if (parsed.textResponse) {
      parsed.textResponse = sanitizeHTML(parsed.textResponse);
    } else {
      parsed.textResponse = `Обработано задач: ${Array.isArray(parsed.tasks) ? parsed.tasks.length : 1}`;
    }

    // Валидация и санитизация задач
    if (Array.isArray(parsed.tasks)) {
      parsed.tasks = parsed.tasks
        .filter(task => task && task.title) // Фильтруем некорректные задачи
        .map(task => ({
          ...task,
          title: sanitizeHTML(String(task.title || '')),
          description: task.description ? sanitizeHTML(String(task.description)) : undefined
        }))
        .slice(0, 20); // Ограничение на количество задач
    }
    
    res.json(parsed);

  } catch (error) {
    console.error('AI API Error:', error);
    // Не раскрываем детали ошибки в production
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Internal server error';
    res.status(500).json({ error: 'Failed to process AI command', details: errorMessage });
  }
});

// --- Static Files ---
// Раздаём собранный фронт Vite
const distPath = path.join(__dirname, 'dist');

// Проверяем существование dist директории при запуске
if (!fs.existsSync(distPath)) {
  console.error(`ERROR: dist directory not found at ${distPath}`);
  console.error('Make sure to run "npm run build" before starting the server');
} else {
  console.log(`✓ Static files directory found: ${distPath}`);
  // Логируем структуру dist в development
  if (process.env.NODE_ENV === 'development') {
    try {
      const files = fs.readdirSync(distPath);
      console.log(`✓ Dist directory contains: ${files.join(', ')}`);
      if (fs.existsSync(path.join(distPath, 'assets'))) {
        const assets = fs.readdirSync(path.join(distPath, 'assets'));
        console.log(`✓ Assets directory contains ${assets.length} files`);
      }
    } catch (e) {
      console.warn('Could not read dist directory:', e.message);
    }
  }
}

// Настройка для статических файлов с правильными MIME типами
app.use(express.static(distPath, {
  maxAge: '1y', // Кеширование на год для production
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Убеждаемся что CSS файлы имеют правильный MIME тип
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
    // Убеждаемся что JS файлы имеют правильный MIME тип
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  },
  // Если файл не найден, не отправляем ответ, чтобы SPA fallback мог обработать
  fallthrough: true
}));

// SPA Fallback - для всех маршрутов возвращаем index.html
// В Express 5.x используем middleware вместо wildcard маршрута
app.use((req, res, next) => {
  // Если это API маршрут, пропускаем
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Если это запрос к статическому файлу (assets), и он не был найден, возвращаем 404
  if (req.path.startsWith('/assets/')) {
    const assetPath = path.join(distPath, req.path);
    if (!fs.existsSync(assetPath)) {
      console.error(`[${new Date().toISOString()}] Asset not found: ${req.path}`);
      return res.status(404).json({ error: 'Asset not found', path: req.path });
    }
  }
  
  // Проверяем существование index.html перед отправкой
  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`ERROR: index.html not found at ${indexPath}`);
    return res.status(500).send('Application not built. Please run "npm run build" first.');
  }
  
  // Для всех остальных маршрутов возвращаем index.html
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      if (!res.headersSent) {
        res.status(500).send('Error loading application');
      }
    }
  });
});

// Запуск сервера с обработкой ошибок
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✓ Server running on port ${PORT}`);
  if (process.env.NODE_ENV === 'development') {
    console.log(`✓ Health check: http://0.0.0.0:${PORT}/api/health`);
  }
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