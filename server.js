const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const createDOMPurify = require('isomorphic-dompurify');
const DOMPurify = createDOMPurify();
const webpush = require('web-push');
require('dotenv').config();

// Проверка доступности fetch (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('ERROR: fetch is not available. Node.js version must be 18+ or install node-fetch');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 8080;

// Определяем distPath ДО использования
const distPath = path.join(__dirname, 'dist');

// Проверяем существование dist директории при запуске
if (!fs.existsSync(distPath)) {
  console.error(`ERROR: dist directory not found at ${distPath}`);
  console.error('Make sure to run "npm run build" before starting the server');
  process.exit(1);
} else {
  console.log(`✓ Static files directory found: ${distPath}`);
  // Логируем структуру dist при запуске (важно для диагностики в Cloud Run)
  try {
    const files = fs.readdirSync(distPath);
    console.log(`✓ Dist directory contains: ${files.join(', ')}`);
    if (fs.existsSync(path.join(distPath, 'assets'))) {
      const assets = fs.readdirSync(path.join(distPath, 'assets'));
      console.log(`✓ Assets directory contains ${assets.length} files`);
      // В production логируем первые несколько файлов для проверки
      if (process.env.NODE_ENV === 'production' && assets.length > 0) {
        console.log(`✓ Sample assets: ${assets.slice(0, 5).join(', ')}${assets.length > 5 ? '...' : ''}`);
      }
    } else {
      console.error('ERROR: dist/assets directory not found!');
    }
  } catch (e) {
    console.error('ERROR: Could not read dist directory:', e.message);
    process.exit(1);
  }
}

// ===== СТАТИЧЕСКИЕ ФАЙЛЫ ДОЛЖНЫ ОБРАБАТЫВАТЬСЯ ПЕРВЫМИ, ДО CORS =====

// Раздача /assets через express.static (проще и без wildcard ошибок в Express 5)
app.use('/assets', express.static(path.join(distPath, 'assets'), {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Явно задаём charset для CSS/JS
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));

// Также обслуживаем корневые статические файлы (index.html и т.д.)
app.use(express.static(distPath, {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  fallthrough: true
}));

// CORS Configuration - применяется только к API запросам
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000'
];

// CORS применяется только к API маршрутам, не к статическим файлам
app.use('/api', cors({
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
    next();
});

// Утилита для санитизации HTML
const sanitizeHTML = (html) => {
    try {
        if (!html || typeof html !== 'string') {
            return '';
        }
        const sanitized = DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['b', 'i', 'u', 's', 'code', 'pre', 'a'],
            ALLOWED_ATTR: ['href'],
            ALLOW_DATA_ATTR: false,
            ALLOW_UNKNOWN_PROTOCOLS: false
        });
        return sanitized || '';
    } catch (error) {
        console.error('[sanitizeHTML] Error sanitizing HTML:', error);
        // В случае ошибки возвращаем текст без HTML тегов
        return String(html || '').replace(/<[^>]*>/g, '');
    }
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
  async (req, res, next) => {
    // Убеждаемся, что Content-Type установлен для JSON ответов в начале
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log('[Telegram] Request received', {
        hasChatIds: !!req.body?.chatIds,
        chatIdsCount: req.body?.chatIds?.length,
        hasMessage: !!req.body?.message,
        messageLength: req.body?.message?.length,
        contentType: req.headers['content-type'],
        bodyKeys: req.body ? Object.keys(req.body) : [],
        method: req.method,
        path: req.path
      });

      // Проверка валидации
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('[Telegram] Validation failed', errors.array());
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const { chatIds, message } = req.body;
      const token = process.env.TELEGRAM_BOT_TOKEN;

      console.log('[Telegram] Configuration check', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        tokenPrefix: token ? token.substring(0, 10) + '...' : 'none'
      });

      if (!token) {
        console.error('[Telegram] TELEGRAM_BOT_TOKEN is not set');
        return res.status(500).json({ 
          error: 'Server configuration error: TELEGRAM_BOT_TOKEN is not set',
          message: 'Telegram bot token is not configured on the server'
        });
      }

      // Санитизация HTML сообщения
      let sanitizedMessage;
      try {
        sanitizedMessage = sanitizeHTML(message);
        console.log('[Telegram] Message sanitized', {
          originalLength: message?.length,
          sanitizedLength: sanitizedMessage?.length
        });
      } catch (sanitizeError) {
        console.error('[Telegram] Error sanitizing HTML message:', sanitizeError);
        // Если санитизация не удалась, используем оригинальное сообщение без HTML
        sanitizedMessage = String(message || '').replace(/<[^>]*>/g, '');
      }

      // Helper to send a single message
      const sendOne = async (chatId) => {
        try {
          // Валидация chatId
          if (!chatId || typeof chatId !== 'string') {
            console.error('[Telegram] Invalid chatId format', { chatId, type: typeof chatId });
            return { chatId, success: false, error: 'Invalid chatId format' };
          }

          // Очищаем chatId от пробелов
          const cleanChatId = chatId.trim();
          
          if (!cleanChatId) {
            console.error('[Telegram] Empty chatId after trim', { original: chatId });
            return { chatId: chatId || 'empty', success: false, error: 'Empty chatId' };
          }

          const url = `https://api.telegram.org/bot${token}/sendMessage`;
          const requestBody = {
            chat_id: cleanChatId,
            text: sanitizedMessage,
            parse_mode: 'HTML',
          };
          
          console.log('[Telegram] Sending message', {
            chatId: cleanChatId,
            messageLength: sanitizedMessage.length,
            url: url.replace(token, 'TOKEN_HIDDEN')
          });
          
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });
        
          if (!response.ok) {
            const statusText = response.statusText || 'Unknown';
            let errorData;
            try {
              errorData = await response.json();
            } catch (parseError) {
              const textError = await response.text().catch(() => '');
              console.error('[Telegram] Failed to parse error response', {
                status: response.status,
                statusText,
                textError
              });
              errorData = { description: `HTTP ${response.status}: ${statusText}` };
            }
            
            const errorCode = errorData.error_code;
            const errorDescription = errorData.description || `HTTP ${response.status}: ${statusText}`;
            
            // Логируем ошибки для отладки
            console.error(`[Telegram] API error for chatId ${cleanChatId}:`, {
              status: response.status,
              statusText,
              code: errorCode,
              description: errorDescription,
              fullError: errorData
            });
            
            return { 
              chatId: cleanChatId, 
              success: false, 
              error: errorDescription,
              errorCode: errorCode
            };
          }

          let data;
          try {
            data = await response.json();
          } catch (jsonError) {
            const textResponse = await response.text().catch(() => '');
            console.error('[Telegram] Failed to parse success response', {
              chatId: cleanChatId,
              status: response.status,
              textResponse,
              jsonError: jsonError.message
            });
            return {
              chatId: cleanChatId,
              success: false,
              error: `Invalid response from Telegram API: ${textResponse.substring(0, 100)}`
            };
          }
          
          if (!data.ok) {
            console.error('[Telegram] Telegram API returned ok=false', {
              chatId: cleanChatId,
              data
            });
            return { 
              chatId: cleanChatId, 
              success: false, 
              error: data.description || 'Unknown error',
              errorCode: data.error_code
            };
          }
          
          console.log('[Telegram] Message sent successfully', { chatId: cleanChatId });
          return { chatId: cleanChatId, success: true };
        } catch (err) {
          console.error(`[Telegram] Exception sending to ${chatId}:`, {
            error: err.message,
            stack: err.stack,
            chatId
          });
          return { 
            chatId: chatId?.trim() || 'unknown', 
            success: false, 
            error: err.message || 'Network error'
          };
        }
      };

      // Send to all recipients in parallel (с ограничением на количество)
      const maxRecipients = 50; // Ограничение для предотвращения злоупотребления
      const limitedChatIds = chatIds.slice(0, maxRecipients);
      
      const results = await Promise.all(limitedChatIds.map(sendOne));
    
      // Подсчитываем успешные и неудачные отправки
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      // Логируем результаты (всегда, для отладки)
      console.log('[Telegram] Notification results:', {
        total: results.length,
        successful,
        failed,
        results: results.map(r => ({
          chatId: r.chatId,
          success: r.success,
          error: r.error,
          errorCode: r.errorCode
        }))
      });

      // Убеждаемся, что отправляем JSON
      if (!res.headersSent) {
        res.json({ 
          success: failed === 0, // success = true только если все отправки успешны
          results, 
          sent: successful,
          failed: failed
        });
      } else {
        console.error('[Telegram] Cannot send response - headers already sent');
      }
    } catch (error) {
      // Обработка любых неожиданных ошибок
      const errorInfo = {
        message: error.message || 'An unexpected error occurred',
        name: error.name || 'Error',
        stack: error.stack,
        body: req.body,
        hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
        tokenLength: process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.length : 0
      };
      
      console.error('[Telegram] Unexpected error in /api/telegram/notify:', errorInfo);
      
      // Определяем более понятное сообщение об ошибке
      let errorMessage = error.message || 'An unexpected error occurred';
      if (error.message?.includes('fetch')) {
        errorMessage = 'Network error: Unable to connect to Telegram API. Check server internet connection.';
      } else if (error.message?.includes('JSON')) {
        errorMessage = 'Error parsing response from Telegram API';
      } else if (error.message?.includes('is not defined') || error.message?.includes('Cannot read')) {
        errorMessage = `Server error: ${error.message}`;
      }
      
      // Всегда возвращаем детальную информацию об ошибке
      // Убеждаемся, что отправляем JSON, а не HTML
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Internal server error',
          message: errorMessage,
          details: {
            name: error.name,
            originalMessage: error.message,
            ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {})
          }
        });
      } else {
        // Если заголовки уже отправлены, логируем ошибку
        console.error('[Telegram] Cannot send error response - headers already sent');
      }
    } catch (handlerError) {
      // Если даже обработка ошибки не удалась
      console.error('[Telegram] Critical error in error handler:', handlerError);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Critical server error',
          message: 'An unexpected error occurred while processing the request'
        });
      }
    }
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
    body('context.taskTitles').optional().isArray(),
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
    const taskContext = context?.taskTitles && context.taskTitles.length > 0
      ? `Существующие задачи: ${context.taskTitles.slice(0, 30).join(', ')}${context.taskTitles.length > 30 ? '...' : ''}`
      : 'нет существующих задач';

    const systemInstruction = `
      Ты — интеллектуальный помощник-планировщик задач для небольшой команды.
      Текущая дата: ${todayStr}.
      
      Доступные проекты: ${projectContext}.
      Доступные пользователи: ${userContext}.
      ${taskContext}.
      
      Твоя цель: интерпретировать команду пользователя на естественном языке (русском или английском) и выполнить нужные действия.
      
      Ты можешь выполнять следующие действия:
      1. СОЗДАНИЕ ЗАДАЧ: "создай задачу", "добавь задачу", "нужно сделать"
      2. ОБНОВЛЕНИЕ ЗАДАЧ: "измени задачу", "обнови задачу", "переименуй задачу"
      3. УДАЛЕНИЕ ЗАДАЧ: "удали задачу", "убери задачу", "удалить"
      4. СОЗДАНИЕ ПРОЕКТОВ: "создай проект", "добавь проект"
      5. ИЗМЕНЕНИЕ СТАТУСА: "перемести в работу", "отметь как выполненное", "поставь на паузу"
      6. НАЗНАЧЕНИЕ ИСПОЛНИТЕЛЯ: "назначь на", "поручи"
      7. ИЗМЕНЕНИЕ ПРИОРИТЕТА: "сделай приоритетной", "низкий приоритет"
      8. ПОЛУЧЕНИЕ ИНФОРМАЦИИ: "покажи задачи", "какие задачи", "список проектов"
      
      Формат ответа - JSON объект:
      {
        "actions": [
          {
            "type": "create_task" | "update_task" | "delete_task" | "create_project" | "change_task_status" | "assign_task" | "set_task_priority" | "list_tasks" | "list_projects",
            "params": { ...параметры действия... },
            "description": "описание действия"
          }
        ],
        "tasks": [ ...массив задач для создания (обратная совместимость)... ],
        "textResponse": "понятный текстовый ответ пользователю на русском языке"
      }
      
      Параметры для действий:
      - create_task: { title, description?, projectName?, assigneeName?, dueDate?, priority?, status? }
      - update_task: { taskId или taskTitle, title?, description?, projectName?, assigneeName?, dueDate?, priority?, status? }
      - delete_task: { taskId или taskTitle }
      - create_project: { name, description?, color? }
      - change_task_status: { taskId или taskTitle, status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "HOLD" }
      - assign_task: { taskId или taskTitle, assigneeName }
      - set_task_priority: { taskId или taskTitle, priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL" }
      - list_tasks: { status?, projectName?, assigneeName? }
      - list_projects: {}
      
      Правила:
      - Если команда требует создания задачи, используй action "create_task" или массив "tasks" (для обратной совместимости)
      - Если команда требует изменения/удаления, используй соответствующий action
      - Если задача идентифицируется по названию, используй taskTitle в params
      - textResponse должен быть понятным и дружелюбным ответом на русском языке
      - Учитывай контекст предыдущих сообщений из истории чата
      - Если команда неясна, спроси уточнение в textResponse
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
        "actions": [массив действий],
        "tasks": [массив задач для создания - опционально, для обратной совместимости],
        "textResponse": "понятный текстовый ответ пользователю на русском языке"
      }
      
      Если команда требует создания задач, используй массив "tasks" или action "create_task".
      Если команда требует других действий (удаление, обновление и т.д.), используй массив "actions".
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

    // Проверяем наличие actions или tasks
    if (!parsed || (!parsed.actions && !parsed.tasks)) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Gemini returned unparseable payload:', text.substring(0, 500));
      }
      return res.status(422).json({
        error: 'Gemini не смог сформировать ответ. Попробуйте переформулировать запрос.',
        textResponse: 'Извините, не удалось обработать ваш запрос. Попробуйте переформулировать его.'
      });
    }
    
    // Если есть actions, валидируем их
    if (parsed.actions && Array.isArray(parsed.actions)) {
      parsed.actions = parsed.actions
        .filter(action => action && action.type && action.params)
        .slice(0, 20); // Ограничение на количество действий
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

// --- Web Push Setup ---
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || ''
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    'mailto:support@commandtaskplanner.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
  console.log('✓ Web Push configured');
} else {
  console.warn('⚠ VAPID keys not set - Web Push disabled');
}

// --- Web Push Endpoints ---
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post('/api/push/send',
  [
    body('subscription').isObject().withMessage('subscription must be an object'),
    body('title').isString().isLength({ min: 1, max: 100 }).withMessage('Title is required'),
    body('message').isString().isLength({ min: 1, max: 500 }).withMessage('Message is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { subscription, title, message } = req.body;

    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
      return res.status(503).json({ error: 'Web Push not configured' });
    }

    try {
      const payload = JSON.stringify({
        title: sanitizeHTML(title),
        body: sanitizeHTML(message),
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        timestamp: Date.now()
      });

      await webpush.sendNotification(subscription, payload);
      res.json({ success: true });
    } catch (error) {
      console.error('Web Push error:', error);
      
      // Если подписка устарела (410), сообщаем клиенту
      if (error.statusCode === 410) {
        return res.status(410).json({ error: 'Push subscription expired' });
      }
      
      res.status(500).json({ error: 'Failed to send push notification' });
    }
  }
);

// Error handler middleware - должен быть перед SPA fallback
// Обрабатывает все ошибки, включая ошибки парсинга JSON
app.use((err, req, res, next) => {
  // Обработка ошибок синтаксиса JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    if (req.path.startsWith('/api/')) {
      return res.status(400).json({ 
        error: 'Invalid JSON', 
        message: 'Request body contains invalid JSON'
      });
    }
  }
  
  // Если это API маршрут, возвращаем JSON ошибку
  if (req.path.startsWith('/api/')) {
    console.error('[Express Error Handler] API error:', {
      path: req.path,
      method: req.method,
      error: err.message,
      stack: err.stack
    });
    
    if (!res.headersSent) {
      res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        message: err.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? {
          stack: err.stack,
          name: err.name
        } : undefined
      });
    }
    return;
  }
  
  // Для не-API маршрутов передаем дальше
  next(err);
});

// SPA Fallback - для всех остальных маршрутов возвращаем index.html
// В Express 5.x используем middleware вместо wildcard маршрута
app.use((req, res, next) => {
  // Если это API маршрут, пропускаем
  if (req.path.startsWith('/api/')) {
    return next();
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
// Проверка конфигурации при старте
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
if (!telegramToken) {
  console.warn('⚠️  WARNING: TELEGRAM_BOT_TOKEN is not set. Telegram notifications will not work.');
  console.warn('   Set TELEGRAM_BOT_TOKEN environment variable to enable Telegram notifications.');
} else {
  console.log(`✓ Telegram bot token configured (${telegramToken.substring(0, 10)}...)`);
}

// Запуск сервера с обработкой ошибок
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Listening on 0.0.0.0:${PORT}`);
  if (process.env.NODE_ENV === 'development') {
    console.log(`✓ Health check: http://0.0.0.0:${PORT}/api/health`);
  }
  console.log('✓ Server is ready to accept connections');
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