# ✅ Чеклист для автоматического деплоя

## 📋 Перед деплоем

### 1. Переменные окружения в Cloud Run

Убедитесь, что в Cloud Run сервисе установлены все переменные:

```bash
# Проверка текущих переменных
gcloud run services describe command-task-planner \
  --region us-west1 \
  --format="value(spec.template.spec.containers[0].env)"
```

**Обязательные переменные:**
- ✅ `VITE_FIREBASE_API_KEY`
- ✅ `VITE_FIREBASE_AUTH_DOMAIN`
- ✅ `VITE_FIREBASE_PROJECT_ID`
- ✅ `VITE_FIREBASE_STORAGE_BUCKET`
- ✅ `VITE_FIREBASE_MESSAGING_SENDER_ID`
- ✅ `VITE_FIREBASE_APP_ID`
- ✅ `GOOGLE_API_KEY` (для Gemini)
- ✅ `TELEGRAM_BOT_TOKEN` (для уведомлений)

### 2. Cloud Build триггер

Проверьте, что триггер настроен и не требует substitutions:

```bash
# Список триггеров
gcloud builds triggers list

# Проверка конфигурации триггера
gcloud builds triggers describe TRIGGER_ID
```

**Триггер должен:**
- ✅ Использовать `cloudbuild.yaml`
- ✅ Не требовать substitutions для Firebase переменных
- ✅ Быть привязан к нужной ветке репозитория

### 3. Файлы в репозитории

Убедитесь, что все файлы закоммичены:

```bash
git status
git add .
git commit -m "Configure runtime Firebase config"
git push
```

## 🚀 Процесс деплоя

### Автоматический (через триггер)

1. Сделайте push в репозиторий
2. Cloud Build автоматически запустит сборку
3. После сборки образ будет задеплоен в Cloud Run
4. Переменные окружения из Cloud Run будут использованы

### Ручной запуск сборки

```bash
# Запуск сборки вручную
gcloud builds submit --config cloudbuild.yaml
```

## ✅ Проверка после деплоя

### 1. Проверка логов сборки

```bash
# Последняя сборка
gcloud builds list --limit=1

# Логи сборки
gcloud builds log BUILD_ID
```

**Должно быть:**
- ✅ Сборка успешна
- ✅ Образ создан
- ✅ Нет ошибок

### 2. Проверка Cloud Run

```bash
# URL сервиса
gcloud run services describe command-task-planner \
  --region us-west1 \
  --format 'value(status.url)'

# Логи сервиса
gcloud run services logs read command-task-planner \
  --region us-west1 \
  --limit 50
```

**Должно быть:**
- ✅ Сервис работает
- ✅ Нет ошибок в логах
- ✅ Endpoint `/api/config/firebase` доступен

### 3. Проверка в браузере

1. Откройте URL Cloud Run сервиса
2. Откройте консоль (F12)
3. Проверьте сообщения:

**Ожидаемые:**
- ✅ `🔧 Loading Firebase configuration from server (Cloud Run)...`
- ✅ `✅ Firebase configuration loaded from server`
- ✅ `✅ Firebase initialized successfully`
- ✅ `🔐 Initializing Firebase and setting up auth listener...`
- ✅ `👤 Auth state changed: No user`

**Ошибки (не должно быть):**
- ❌ `❌ Failed to load Firebase configuration`
- ❌ `Firebase configuration not available`
- ❌ `Cannot read properties of undefined`

### 4. Проверка API endpoint

```bash
# Проверка конфигурации
curl https://YOUR_SERVICE_URL/api/config/firebase

# Должен вернуть JSON с конфигурацией Firebase
```

## 🔧 Устранение проблем

### Проблема: Пустой экран

**Причина:** Firebase не инициализирован

**Решение:**
1. Проверьте переменные в Cloud Run
2. Проверьте логи сервера
3. Проверьте endpoint `/api/config/firebase`

### Проблема: Ошибка "Firebase configuration not available"

**Причина:** Переменные не установлены в Cloud Run

**Решение:**
```bash
# Установите переменные
gcloud run services update command-task-planner \
  --region us-west1 \
  --update-env-vars "VITE_FIREBASE_API_KEY=ключ,VITE_FIREBASE_AUTH_DOMAIN=домен,..."
```

### Проблема: Сборка падает

**Причина:** Ошибка в коде или зависимостях

**Решение:**
1. Проверьте логи сборки
2. Проверьте локально: `npm run build`
3. Проверьте синтаксис в `cloudbuild.yaml`

## 📝 Быстрые команды

```bash
# Обновить переменные
gcloud run services update command-task-planner \
  --region us-west1 \
  --update-env-vars "KEY=value"

# Посмотреть переменные
gcloud run services describe command-task-planner \
  --region us-west1 \
  --format="value(spec.template.spec.containers[0].env)"

# Перезапустить сервис
gcloud run services update-traffic command-task-planner \
  --region us-west1 \
  --to-latest

# Логи в реальном времени
gcloud run services logs tail command-task-planner \
  --region us-west1
```

