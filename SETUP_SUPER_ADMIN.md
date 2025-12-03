# 🔧 Настройка супер-админа для удаления пользователей

## Проблема

Правила Firestore могут не распознавать супер-админа, если `request.auth.token.email` не содержит email в токене.

## Решение: Добавить поле `isSuperAdmin` в документ пользователя

### Шаг 1: Откройте Firebase Console

1. Перейдите в [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект
3. Перейдите в **Firestore Database**

### Шаг 2: Найдите документ пользователя

1. Откройте коллекцию `users`
2. Найдите документ с вашим `userId` (можно найти через **Authentication** → **Users** → скопировать UID)
3. Или найдите по email: `crazymhessel@gmail.com`

### Шаг 3: Добавьте поле `isSuperAdmin`

1. Откройте документ пользователя
2. Нажмите **"Add field"** (Добавить поле)
3. Добавьте:
   - **Field name**: `isSuperAdmin`
   - **Type**: `boolean`
   - **Value**: `true`
4. Нажмите **"Update"**

### Альтернатива: Использовать Firebase CLI

```bash
# Установите Firebase CLI (если еще не установлен)
npm install -g firebase-tools

# Войдите в Firebase
firebase login

# Обновите документ пользователя
firebase firestore:update users/YOUR_USER_ID --data '{"isSuperAdmin": true}'
```

Замените `YOUR_USER_ID` на ваш UID из Firebase Authentication.

### Альтернатива: Использовать код в консоли браузера

Откройте консоль браузера (F12) и выполните:

```javascript
import { db } from './firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth } from './firebase';

// Получить текущего пользователя
const user = auth.currentUser;
if (!user) {
  console.error('Пользователь не авторизован');
} else {
  const userRef = doc(db, 'users', user.uid);
  
  // Проверить существующий документ
  const userDoc = await getDoc(userRef);
  if (userDoc.exists()) {
    // Обновить документ
    await updateDoc(userRef, {
      isSuperAdmin: true
    });
    console.log('Поле isSuperAdmin добавлено!');
  } else {
    console.error('Документ пользователя не найден');
  }
}
```

## Проверка

После добавления поля `isSuperAdmin: true` в документ пользователя:

1. Обновите страницу приложения
2. Попробуйте удалить пользователя из workspace
3. Должно работать!

## Дополнительная проверка

Если проблема сохраняется, проверьте:

1. **Правила Firestore развернуты**: Firebase Console → Firestore → Rules → должна быть кнопка "Publish"
2. **Поле добавлено**: Firebase Console → Firestore → users → ваш документ → должно быть поле `isSuperAdmin: true`
3. **Пользователь авторизован**: В консоли браузера проверьте `auth.currentUser`

## Отладка

Добавьте в консоль браузера для проверки:

```javascript
import { db, auth } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

const user = auth.currentUser;
if (user) {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);
  console.log('User document:', userDoc.data());
  console.log('Is super admin?', userDoc.data()?.isSuperAdmin);
}
```


