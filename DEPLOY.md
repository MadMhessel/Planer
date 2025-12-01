# Инструкция по деплою в Google Cloud Run

## 📋 Содержание

1. [Предварительные требования](#предварительные-требования)
2. [Настройка переменных окружения](#настройка-переменных-окружения)
3. [Способы деплоя](#способы-деплоя)
4. [Проверка после деплоя](#проверка-после-деплоя)
5. [Устранение проблем](#устранение-проблем)
6. [Обновление сервиса](#обновление-сервиса)

---

## Предварительные требования

### 1. Установленные инструменты

```bash
# Google Cloud SDK
gcloud --version

# Docker (опционально, для локальной проверки)
docker --version

# Node.js 20+ (для локальной разработки)
node --version
```

### 2. Настройка Google Cloud

```bash
# Войдите в аккаунт Google Cloud
gcloud auth login

# Установите проект по умолчанию
gcloud config set project YOUR_PROJECT_ID

# Включите необходимые API
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 3. Получение конфигурации Firebase

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект
3. Перейдите в **Project Settings** → **General**
4. В разделе **Your apps** найдите веб-приложение или создайте новое
5. Скопируйте значения из `firebaseConfig`:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 4. Получение API ключей

#### Google Gemini API Key
1. Откройте [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Создайте новый API ключ
3. Скопируйте ключ

#### Telegram Bot Token
1. Найдите [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Скопируйте токен (формат: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

---

## Настройка переменных окружения

### Важно: Build-time vs Runtime переменные

**Vite заменяет `import.meta.env.VITE_*` переменные во время сборки (build-time), а не во время выполнения (runtime).**

Это означает:
- ✅ Переменные `VITE_*` должны быть переданы через `--build-arg` при сборке Docker образа
- ✅ Переменные сервера (`GOOGLE_API_KEY`, `TELEGRAM_BOT_TOKEN`) передаются через `--set-env-vars` при деплое

### Переменные для сборки (Build-time)

Эти переменные **обязательны** для работы приложения:

```bash
export VITE_FIREBASE_API_KEY="AIzaSy..."
export VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
export VITE_FIREBASE_PROJECT_ID="your-project-id"
export VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
export VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
export VITE_FIREBASE_APP_ID="1:123456789:web:abc123"
```

### Переменные для сервера (Runtime)

Эти переменные **опциональны**, но рекомендуются:

```bash
export GOOGLE_API_KEY="your_gemini_api_key"
export TELEGRAM_BOT_TOKEN="123456789:ABCdef..."
```

### Сохранение переменных (рекомендуется)

Создайте файл `.env.deploy` (не коммитьте в Git!):

```bash
# .env.deploy
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

GOOGLE_API_KEY=your_gemini_api_key
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
```

Загрузите переменные перед деплоем:

```bash
source .env.deploy
```

---

## Способы деплоя

### Вариант 1: Использование скрипта deploy.sh (Рекомендуется)

Самый простой и безопасный способ:

```bash
# 1. Установите переменные окружения (см. выше)
source .env.deploy  # или export вручную

# 2. Сделайте скрипт исполняемым (только первый раз)
chmod +x deploy.sh

# 3. Запустите деплой
./deploy.sh
```

Скрипт автоматически:
- ✅ Проверит наличие обязательных переменных
- ✅ Соберет Docker образ с правильными build-args
- ✅ Задеплоит в Cloud Run
- ✅ Покажет URL сервиса

### Вариант 2: Ручной деплой через gcloud

Если нужно больше контроля:

```bash
# 1. Установите переменные окружения
export VITE_FIREBASE_API_KEY="..."
export VITE_FIREBASE_AUTH_DOMAIN="..."
# ... остальные переменные

# 2. Соберите Docker образ
gcloud builds submit \
  --tag gcr.io/YOUR_PROJECT_ID/command-task-planner \
  --build-arg VITE_FIREBASE_API_KEY="${VITE_FIREBASE_API_KEY}" \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN="${VITE_FIREBASE_AUTH_DOMAIN}" \
  --build-arg VITE_FIREBASE_PROJECT_ID="${VITE_FIREBASE_PROJECT_ID}" \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET="${VITE_FIREBASE_STORAGE_BUCKET}" \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="${VITE_FIREBASE_MESSAGING_SENDER_ID}" \
  --build-arg VITE_FIREBASE_APP_ID="${VITE_FIREBASE_APP_ID}"

# 3. Задеплойте в Cloud Run
gcloud run deploy command-task-planner \
  --image gcr.io/YOUR_PROJECT_ID/command-task-planner \
  --platform managed \
  --region us-west1 \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_API_KEY=${GOOGLE_API_KEY},TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

### Вариант 3: Автоматический деплой через Cloud Build

Для CI/CD пайплайна:

1. **Настройте переменные в Cloud Build:**

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_VITE_FIREBASE_API_KEY="your_key",_VITE_FIREBASE_AUTH_DOMAIN="your_domain",...
```

2. **Или используйте Secret Manager (рекомендуется для продакшена):**

```bash
# Создайте секреты
echo -n "your_api_key" | gcloud secrets create firebase-api-key --data-file=-
echo -n "your_auth_domain" | gcloud secrets create firebase-auth-domain --data-file=-
# ... остальные секреты

# Обновите cloudbuild.yaml для использования секретов
```

3. **Настройте триггер Cloud Build:**

```bash
gcloud builds triggers create github \
  --repo-name=Planer \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

---

## Проверка после деплоя

### 1. Получите URL сервиса

```bash
gcloud run services describe command-task-planner \
  --region us-west1 \
  --format 'value(status.url)'
```

### 2. Откройте приложение в браузере

Откройте URL в браузере и проверьте:

- ✅ Страница загружается (не пустой экран)
- ✅ Нет ошибок в консоли (F12 → Console)
- ✅ Firebase инициализируется корректно
- ✅ Можно войти через Google

### 3. Проверьте консоль браузера

**Ожидаемые сообщения:**
- ✅ `Firebase initialized`
- ✅ `Auth state changed`

**Ошибки, которые НЕ должны быть:**
- ❌ `Failed to resolve module specifier "@/firebase"` - проблема с алиасами
- ❌ `Firebase: Error (auth/invalid-api-key)` - неправильные переменные Firebase
- ❌ `Cannot read properties of undefined` - переменные не переданы при сборке
- ❌ Запросы к `aistudiocdn.com` - используется CDN вместо сборки

### 4. Проверьте Network tab

В DevTools → Network должны загружаться:
- ✅ `/assets/index-*.js` - собранный JavaScript
- ✅ `/assets/index-*.css` - собранный CSS
- ✅ `/assets/*.woff2` - шрифты (если есть)

**НЕ должны быть:**
- ❌ Запросы к `cdn.tailwindcss.com`
- ❌ Запросы к `aistudiocdn.com`
- ❌ Запросы к `unpkg.com`

### 5. Проверьте API endpoints

```bash
# Health check
curl https://YOUR_SERVICE_URL/api/health

# Должен вернуть: OK
```

### 6. Проверьте логи Cloud Run

```bash
# Последние 50 строк логов
gcloud run logs read command-task-planner \
  --region us-west1 \
  --limit 50

# Следите за логами в реальном времени
gcloud run logs tail command-task-planner \
  --region us-west1
```

---

## Устранение проблем

### Проблема 1: Пустой экран после деплоя

**Причины:**
- Переменные Firebase не переданы при сборке
- Используется старая версия Docker образа
- Ошибки JavaScript в консоли

**Решение:**

1. **Проверьте переменные в собранном образе:**

```bash
# Запустите контейнер
docker run --rm -it gcr.io/YOUR_PROJECT_ID/command-task-planner sh

# Проверьте собранный JS
cat dist/assets/index-*.js | grep -i firebase

# Должны быть реальные значения, а не "undefined"
```

2. **Пересоберите образ с правильными переменными:**

```bash
# Убедитесь что переменные установлены
echo $VITE_FIREBASE_API_KEY

# Пересоберите
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/command-task-planner \
  --build-arg VITE_FIREBASE_API_KEY="${VITE_FIREBASE_API_KEY}" \
  # ... остальные build-args

# Задеплойте заново
gcloud run deploy command-task-planner \
  --image gcr.io/YOUR_PROJECT_ID/command-task-planner \
  --region us-west1
```

3. **Очистите кеш браузера:**
   - Ctrl+Shift+Delete → Очистить кеш
   - Или откройте в режиме инкогнито

### Проблема 2: Ошибка "Firebase: Error (auth/invalid-api-key)"

**Причина:** Неправильный или отсутствующий API ключ Firebase

**Решение:**

1. Проверьте ключ в Firebase Console
2. Убедитесь что переменная передана при сборке:
   ```bash
   echo $VITE_FIREBASE_API_KEY
   ```
3. Пересоберите образ с правильным ключом

### Проблема 3: Запросы к CDN (aistudiocdn.com, cdn.tailwindcss.com)

**Причина:** Используется старая версия образа или неправильная сборка

**Решение:**

1. Убедитесь что `npm run build` выполняется в Dockerfile
2. Проверьте что `dist/` содержит собранные файлы
3. Пересоберите образ

### Проблема 4: Ошибка 404 для маршрутов SPA

**Причина:** Сервер не настроен для SPA fallback

**Решение:**

Проверьте `server.js` - должен быть fallback на `dist/index.html`:

```javascript
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
```

### Проблема 5: AI команды не работают

**Причина:** `GOOGLE_API_KEY` не установлен или неверный

**Решение:**

1. Проверьте переменную окружения:
   ```bash
   gcloud run services describe command-task-planner \
     --region us-west1 \
     --format 'value(spec.template.spec.containers[0].env)'
   ```

2. Установите/обновите переменную:
   ```bash
   gcloud run services update command-task-planner \
     --region us-west1 \
     --set-env-vars "GOOGLE_API_KEY=your_key"
   ```

### Проблема 6: Telegram уведомления не работают

**Причина:** `TELEGRAM_BOT_TOKEN` не установлен или неверный

**Решение:**

1. Проверьте токен в BotFather
2. Установите переменную окружения (см. выше)
3. Проверьте логи сервера на наличие ошибок

### Проблема 7: Слишком большой размер образа

**Решение:**

1. Используйте multi-stage build в Dockerfile
2. Очистите node_modules после сборки
3. Используйте `.dockerignore`

Пример `.dockerignore`:
```
node_modules
.git
.env*
dist
*.md
```

---

## Обновление сервиса

### Обновление кода

```bash
# 1. Убедитесь что переменные установлены
source .env.deploy

# 2. Запустите деплой (скрипт или вручную)
./deploy.sh
```

### Обновление переменных окружения

#### Обновление runtime переменных (сервер):

```bash
gcloud run services update command-task-planner \
  --region us-west1 \
  --set-env-vars "GOOGLE_API_KEY=new_key,TELEGRAM_BOT_TOKEN=new_token"
```

#### Обновление build-time переменных (Firebase):

Переменные `VITE_*` требуют пересборки образа:

```bash
# Обновите переменные
export VITE_FIREBASE_API_KEY="new_key"
# ... остальные

# Пересоберите и задеплойте
./deploy.sh
```

### Откат к предыдущей версии

```bash
# Список всех ревизий
gcloud run revisions list \
  --service command-task-planner \
  --region us-west1

# Откат к конкретной ревизии
gcloud run services update-traffic command-task-planner \
  --region us-west1 \
  --to-revisions REVISION_NAME=100
```

---

## Дополнительные настройки

### Настройка памяти и CPU

```bash
gcloud run services update command-task-planner \
  --region us-west1 \
  --memory 1Gi \
  --cpu 2
```

### Настройка автоскейлинга

```bash
gcloud run services update command-task-planner \
  --region us-west1 \
  --min-instances 1 \
  --max-instances 10 \
  --concurrency 80
```

### Настройка таймаутов

```bash
gcloud run services update command-task-planner \
  --region us-west1 \
  --timeout 300
```

### Настройка CORS (если нужно)

Обновите `server.js`:

```javascript
app.use(cors({
  origin: ['https://your-domain.com'],
  credentials: true
}));
```

---

## Безопасность

### Рекомендации для продакшена:

1. **Используйте Secret Manager для секретов:**
   ```bash
   # Создайте секреты
   echo -n "your_key" | gcloud secrets create firebase-api-key --data-file=-
   
   # Используйте в Cloud Run
   gcloud run services update command-task-planner \
     --update-secrets VITE_FIREBASE_API_KEY=firebase-api-key:latest
   ```

2. **Ограничьте доступ:**
   ```bash
   # Уберите --allow-unauthenticated
   gcloud run services update command-task-planner \
     --region us-west1 \
     --no-allow-unauthenticated
   ```

3. **Настройте IAM:**
   ```bash
   # Дайте доступ только нужным пользователям
   gcloud run services add-iam-policy-binding command-task-planner \
     --region us-west1 \
     --member="user:email@example.com" \
     --role="roles/run.invoker"
   ```

4. **Включите логирование:**
   ```bash
   # Настройте экспорт логов в Cloud Logging
   # (включено по умолчанию)
   ```

---

## Мониторинг

### Просмотр метрик

```bash
# CPU и память
gcloud run services describe command-task-planner \
  --region us-west1 \
  --format 'value(status.conditions)'

# Логи в реальном времени
gcloud run logs tail command-task-planner \
  --region us-west1
```

### Настройка алертов

1. Откройте [Cloud Monitoring](https://console.cloud.google.com/monitoring)
2. Создайте политику алертов для:
   - Высокого использования CPU
   - Высокого использования памяти
   - Ошибок в логах
   - Медленных запросов

---

## Стоимость

Cloud Run оплачивается за:
- **Время выполнения** (CPU и память)
- **Количество запросов**
- **Трафик**

Примерная стоимость для небольшого приложения:
- ~$5-20/месяц при умеренной нагрузке
- Бесплатный tier: 2 млн запросов, 360,000 GB-секунд CPU, 180,000 GB-секунд памяти

---

## Полезные команды

```bash
# Список всех сервисов
gcloud run services list

# Детали сервиса
gcloud run services describe command-task-planner --region us-west1

# Логи
gcloud run logs read command-task-planner --region us-west1 --limit 100

# Удаление сервиса
gcloud run services delete command-task-planner --region us-west1

# Список образов
gcloud container images list

# Удаление старых образов
gcloud container images delete gcr.io/YOUR_PROJECT_ID/command-task-planner:tag
```

---

## Поддержка

Если возникли проблемы:

1. Проверьте логи Cloud Run
2. Проверьте консоль браузера
3. Проверьте Network tab
4. Убедитесь что все переменные окружения установлены
5. Проверьте документацию [Cloud Run](https://cloud.google.com/run/docs)

---

**Последнее обновление:** 2024
**Версия приложения:** 1.0.0
