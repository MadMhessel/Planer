# 🚀 Быстрый деплой в Cloud Run

## Шпаргалка для быстрого деплоя

### 1️⃣ Подготовка (один раз)

```bash
# Войдите в Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Включите API
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com
```

### 2️⃣ Настройка переменных

Создайте `.env.deploy`:

```bash
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

GOOGLE_API_KEY=your_gemini_key
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
```

### 3️⃣ Деплой

```bash
# Загрузите переменные
source .env.deploy

# Запустите деплой
chmod +x deploy.sh
./deploy.sh
```

### 4️⃣ Проверка

```bash
# Получите URL
gcloud run services describe command-task-planner \
  --region us-west1 \
  --format 'value(status.url)'

# Откройте в браузере и проверьте консоль (F12)
```

---

## 🔧 Быстрые команды

```bash
# Обновить runtime переменные
gcloud run services update command-task-planner \
  --region us-west1 \
  --set-env-vars "GOOGLE_API_KEY=new_key"

# Посмотреть логи
gcloud run logs tail command-task-planner --region us-west1

# Удалить сервис
gcloud run services delete command-task-planner --region us-west1
```

---

## ⚠️ Частые проблемы

### Пустой экран
→ Переменные Firebase не переданы при сборке. Пересоберите с `--build-arg`.

### Ошибка Firebase API Key
→ Проверьте ключ в Firebase Console и пересоберите образ.

### Запросы к CDN
→ Используется старая версия. Пересоберите и задеплойте заново.

---

📖 **Полная инструкция:** см. `DEPLOY.md`

