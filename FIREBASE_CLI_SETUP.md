# 🔧 Настройка через Firebase CLI

## Быстрая настройка (одна команда)

Если у вас уже установлен Firebase CLI и вы авторизованы:

```bash
# Задеплойте правила Firestore
firebase deploy --only firestore:rules
```

---

## Полная настройка с нуля

### Шаг 1: Установка Firebase CLI

#### Windows (PowerShell)
```powershell
npm install -g firebase-tools
```

#### Mac/Linux
```bash
npm install -g firebase-tools
```

### Шаг 2: Авторизация

```bash
firebase login
```

- Откроется браузер
- Разрешите доступ к Firebase
- Вернитесь в терминал

### Шаг 3: Инициализация проекта

```bash
# Перейдите в директорию проекта
cd C:\Users\User\Documents\GitHub\Planer

# Инициализируйте Firestore
firebase init firestore
```

**Выберите:**
- ✅ Use an existing project (выберите ваш проект)
- ✅ Firestore Rules file: `firestore.rules` (уже существует)
- ✅ Firestore indexes file: `firestore.indexes.json` (можно пропустить, нажать Enter)

### Шаг 4: Деплой правил

```bash
firebase deploy --only firestore:rules
```

**Ожидаемый результат:**
```
=== Deploying to 'your-project-id'...

i  deploying firestore: rules
✔  firestore: rules deployed successfully

✔  Deploy complete!
```

### Шаг 5: Проверка

1. Откройте Firebase Console → Firestore → Rules
2. Убедитесь, что правила обновились
3. Должна быть функция `isSuperAdmin()` с тремя способами проверки

---

## Автоматический скрипт

Создайте файл `deploy-rules.bat` (Windows) или `deploy-rules.sh` (Mac/Linux):

### Windows (deploy-rules.bat)
```batch
@echo off
echo Deploying Firestore rules...
firebase deploy --only firestore:rules
echo Done!
pause
```

### Mac/Linux (deploy-rules.sh)
```bash
#!/bin/bash
echo "Deploying Firestore rules..."
firebase deploy --only firestore:rules
echo "Done!"
```

Запустите:
- Windows: двойной клик на `deploy-rules.bat`
- Mac/Linux: `chmod +x deploy-rules.sh && ./deploy-rules.sh`

---

## Проверка текущих правил

```bash
firebase firestore:rules:get
```

Покажет текущие правила, развернутые в Firebase.

---

## Откат правил

Если что-то пошло не так, можно откатить к предыдущей версии:

1. Firebase Console → Firestore → Rules
2. Нажмите на иконку истории (часы) вверху
3. Выберите предыдущую версию
4. Нажмите "Restore"

