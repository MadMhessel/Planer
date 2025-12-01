# Инструкция по деплою в Cloud Run

## Проблемы и решения

### 1. Пустой экран после деплоя

**Причины:**
- Переменные окружения Firebase не переданы во время сборки
- Используется старая версия Docker образа
- CDN блокируется (aistudiocdn.com)

### 2. Переменные окружения

Vite заменяет `import.meta.env.VITE_*` переменные **во время сборки** (build time), а не runtime. Поэтому они должны быть переданы через `--build-arg` при сборке Docker образа.

## Шаги для деплоя

### Вариант 1: Использование скрипта deploy.sh

```bash
# 1. Установите переменные окружения Firebase
export VITE_FIREBASE_API_KEY="your_api_key"
export VITE_FIREBASE_AUTH_DOMAIN="your_auth_domain"
export VITE_FIREBASE_PROJECT_ID="your_project_id"
export VITE_FIREBASE_STORAGE_BUCKET="your_storage_bucket"
export VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
export VITE_FIREBASE_APP_ID="your_app_id"

# 2. Опционально: переменные для сервера
export GOOGLE_API_KEY="your_gemini_api_key"
export TELEGRAM_BOT_TOKEN="your_telegram_token"

# 3. Запустите скрипт деплоя
chmod +x deploy.sh
./deploy.sh
```

### Вариант 2: Ручной деплой

```bash
# 1. Установите переменные окружения (см. выше)

# 2. Соберите Docker образ с переменными
gcloud builds submit \
  --tag gcr.io/rugged-nucleus-476116-n8/command-task-planner \
  --build-arg VITE_FIREBASE_API_KEY="${VITE_FIREBASE_API_KEY}" \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN="${VITE_FIREBASE_AUTH_DOMAIN}" \
  --build-arg VITE_FIREBASE_PROJECT_ID="${VITE_FIREBASE_PROJECT_ID}" \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET="${VITE_FIREBASE_STORAGE_BUCKET}" \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="${VITE_FIREBASE_MESSAGING_SENDER_ID}" \
  --build-arg VITE_FIREBASE_APP_ID="${VITE_FIREBASE_APP_ID}"

# 3. Задеплойте в Cloud Run
gcloud run deploy command-task-planner \
  --image gcr.io/rugged-nucleus-476116-n8/command-task-planner \
  --platform managed \
  --region us-west1 \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_API_KEY=${GOOGLE_API_KEY},TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}"
```

## Проверка после деплоя

1. Откройте URL сервиса в браузере
2. Откройте DevTools (F12) → Console
3. Проверьте что нет ошибок:
   - ❌ `Failed to resolve module specifier "@/firebase"` - алиас не работает
   - ❌ `cdn.tailwindcss.com should not be used` - используется CDN вместо сборки
   - ❌ `Firebase: Error (auth/invalid-api-key)` - неправильные переменные Firebase
4. Проверьте Network tab - должны загружаться файлы из `/assets/index-*.js` и `/assets/index-*.css`, а НЕ из `aistudiocdn.com`

## Устранение проблем

### Если все еще пустой экран:

1. **Проверьте логи Cloud Run:**
   ```bash
   gcloud run logs read command-task-planner --region us-west1 --limit 50
   ```

2. **Проверьте что dist собран в образе:**
   ```bash
   docker run --rm -it gcr.io/rugged-nucleus-476116-n8/command-task-planner sh
   ls -la dist/
   cat dist/index.html
   ```

3. **Убедитесь что переменные окружения переданы:**
   - Проверьте логи сборки Docker образа - должны быть видны переменные
   - Проверьте что в собранном JS нет `undefined` для Firebase конфига

### Если блокируется CDN:

Если вы все еще видите запросы к `aistudiocdn.com`:
- Это означает что используется старая версия образа
- Пересоберите и задеплойте заново с правильными переменными
- Очистите кеш браузера (Ctrl+Shift+Delete)

