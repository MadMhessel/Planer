# Автоматическое развертывание правил Firestore

## Варианты развертывания

### 1. Автоматическое развертывание через GitHub Actions (рекомендуется)

При каждом изменении файла `firestore.rules` и push в ветку `main` правила автоматически развертываются в Firebase.

#### Настройка:

1. **Получите Firebase Token:**
   ```bash
   # Локально выполните
   firebase login:ci
   # Скопируйте полученный токен
   ```

2. **Добавьте секреты в GitHub:**
   - Откройте репозиторий → Settings → Secrets and variables → Actions
   - Добавьте секреты:
     - `FIREBASE_TOKEN` - токен, полученный из `firebase login:ci`
     - `FIREBASE_PROJECT_ID` - ID вашего Firebase проекта (например, `studio-2234511114-48ef4`)

3. **Проверьте workflow:**
   - Файл `.github/workflows/deploy-firestore-rules.yml` уже создан
   - При изменении `firestore.rules` и push в `main` правила развернутся автоматически

#### Ручной запуск:

В GitHub: Actions → Deploy Firestore Rules → Run workflow

### 2. Ручное развертывание через скрипт

```bash
# Установите переменную окружения (опционально)
export FIREBASE_PROJECT_ID="your-project-id"

# Запустите скрипт
npm run deploy:rules
# или
bash deploy-firestore-rules.sh
```

### 3. Ручное развертывание через Firebase CLI

```bash
# Установите Firebase CLI (если еще не установлен)
npm install -g firebase-tools

# Авторизуйтесь
firebase login

# Разверните правила
firebase deploy --only firestore:rules --project your-project-id

# Или используйте npm скрипт
npm run firestore:deploy
```

### 4. Развертывание через Cloud Build (если используется)

Добавьте шаг в `cloudbuild.yaml`:

```yaml
steps:
  # ... существующие шаги ...
  
  # Развертывание правил Firestore
  - name: gcr.io/$PROJECT_ID/firebase
    entrypoint: sh
    args:
      - -c
      - |
        npm install -g firebase-tools
        firebase deploy --only firestore:rules --project $PROJECT_ID --token $FIREBASE_TOKEN
```

## Проверка развертывания

1. **В Firebase Console:**
   - Firestore Database → Rules
   - Проверьте, что правила обновились

2. **Через Firebase CLI:**
   ```bash
   firebase firestore:rules:get --project your-project-id
   ```

## Важно

- ✅ Правила развертываются автоматически при изменении `firestore.rules`
- ✅ Можно запустить вручную через GitHub Actions
- ✅ Скрипт `deploy-firestore-rules.sh` проверяет валидность правил перед развертыванием
- ⚠️ После развертывания правила применяются немедленно
- ⚠️ Убедитесь, что правила корректны перед развертыванием

## Устранение проблем

### Ошибка: "Permission denied"
- Проверьте, что Service Account имеет права `Firebase Admin` или `Firebase Rules Admin`

### Ошибка: "Project not found"
- Проверьте, что `FIREBASE_PROJECT_ID` указан правильно
- Убедитесь, что вы авторизованы в Firebase CLI

### Ошибка: "Invalid rules"
- Проверьте синтаксис правил через `firebase deploy --only firestore:rules --dry-run`

