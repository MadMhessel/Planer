# Настройка автоматического деплоя из репозитория

## Проблема

При автоматической сборке из репозитория переменные окружения из Cloud Run (runtime) **недоступны** во время сборки Docker образа. Vite нужны **build-time** переменные.

## Решение: Настройка Substitutions в Cloud Build триггере

### Вариант 1: Substitutions в триггере (проще всего)

1. **Откройте Cloud Build триггеры:**
   ```bash
   # Список триггеров
   gcloud builds triggers list
   ```

2. **Обновите триггер с substitutions:**
   
   Через консоль:
   - Cloud Console → Cloud Build → Triggers
   - Выберите ваш триггер
   - Нажмите "Edit"
   - В разделе "Substitution variables" добавьте:
     ```
     _VITE_FIREBASE_API_KEY = ваш_api_key
     _VITE_FIREBASE_AUTH_DOMAIN = ваш_auth_domain
     _VITE_FIREBASE_PROJECT_ID = ваш_project_id
     _VITE_FIREBASE_STORAGE_BUCKET = ваш_storage_bucket
     _VITE_FIREBASE_MESSAGING_SENDER_ID = ваш_sender_id
     _VITE_FIREBASE_APP_ID = ваш_app_id
     ```

   Через CLI:
   ```bash
   # Получите ID триггера
   TRIGGER_ID=$(gcloud builds triggers list --format="value(id)" --filter="name:command-task-planner" | head -1)
   
   # Обновите триггер (замените значения)
   gcloud builds triggers update $TRIGGER_ID \
     --substitutions=_VITE_FIREBASE_API_KEY="AIzaSy...",_VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com",_VITE_FIREBASE_PROJECT_ID="your-project-id",_VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com",_VITE_FIREBASE_MESSAGING_SENDER_ID="123456789",_VITE_FIREBASE_APP_ID="1:123456789:web:abc123"
   ```

### Вариант 2: Secret Manager (рекомендуется для продакшена)

1. **Создайте секреты:**
   ```bash
   # Включите Secret Manager API
   gcloud services enable secretmanager.googleapis.com
   
   # Создайте секреты
   echo -n "AIzaSyВашКлюч" | gcloud secrets create firebase-api-key --data-file=-
   echo -n "your-project.firebaseapp.com" | gcloud secrets create firebase-auth-domain --data-file=-
   echo -n "your-project-id" | gcloud secrets create firebase-project-id --data-file=-
   echo -n "your-project.appspot.com" | gcloud secrets create firebase-storage-bucket --data-file=-
   echo -n "123456789" | gcloud secrets create firebase-messaging-sender-id --data-file=-
   echo -n "1:123456789:web:abc123" | gcloud secrets create firebase-app-id --data-file=-
   ```

2. **Дайте доступ Cloud Build к секретам:**
   ```bash
   PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
   
   gcloud secrets add-iam-policy-binding firebase-api-key \
     --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   
   # Повторите для всех секретов
   for secret in firebase-api-key firebase-auth-domain firebase-project-id firebase-storage-bucket firebase-messaging-sender-id firebase-app-id; do
     gcloud secrets add-iam-policy-binding $secret \
       --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
       --role="roles/secretmanager.secretAccessor"
   done
   ```

3. **Обновите cloudbuild.yaml:**
   
   Раскомментируйте секцию `availableSecrets` в `cloudbuild.yaml` и обновите шаг сборки.

### Вариант 3: Переменные в репозитории (не рекомендуется для секретов)

Если значения не секретные, можно хранить их в файле в репозитории, но **НЕ рекомендуется** для Firebase ключей.

## Проверка

После настройки:

1. **Запустите сборку вручную для проверки:**
   ```bash
   gcloud builds submit --config cloudbuild.yaml \
     --substitutions=_VITE_FIREBASE_API_KEY="your_key",_VITE_FIREBASE_AUTH_DOMAIN="your_domain",_VITE_FIREBASE_PROJECT_ID="your_project",_VITE_FIREBASE_STORAGE_BUCKET="your_bucket",_VITE_FIREBASE_MESSAGING_SENDER_ID="your_sender",_VITE_FIREBASE_APP_ID="your_app_id"
   ```

2. **Проверьте логи сборки:**
   - Cloud Console → Cloud Build → History
   - Откройте последнюю сборку
   - Проверьте, что переменные переданы

3. **Проверьте собранное приложение:**
   - Откройте URL Cloud Run
   - F12 → Console
   - Должно быть: `✅ Firebase initialized successfully`

## Получение значений Firebase

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите проект
3. ⚙️ Project Settings → General
4. В разделе "Your apps" найдите веб-приложение
5. Скопируйте значения из `firebaseConfig`

## Важно

- ✅ **Substitutions** - простой способ, но значения видны в логах сборки
- ✅ **Secret Manager** - безопасный способ для продакшена
- ❌ **Cloud Run env vars** - не работают для build-time переменных
- ❌ **Хранение в репозитории** - небезопасно для секретов

## Быстрая команда для обновления триггера

```bash
# Замените значения на ваши
gcloud builds triggers update YOUR_TRIGGER_ID \
  --substitutions=_VITE_FIREBASE_API_KEY="AIzaSy...",_VITE_FIREBASE_AUTH_DOMAIN="studio-2234511114-48ef4.firebaseapp.com",_VITE_FIREBASE_PROJECT_ID="studio-2234511114-48ef4",_VITE_FIREBASE_STORAGE_BUCKET="studio-2234511114-48ef4.firebasestorage.app",_VITE_FIREBASE_MESSAGING_SENDER_ID="677150406616",_VITE_FIREBASE_APP_ID="1:677150406616:web:79da619b454567e00c24ad"
```

