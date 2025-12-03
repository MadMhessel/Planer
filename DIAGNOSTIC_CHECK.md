# 🔍 Диагностика проблемы с удалением пользователей

## Шаг 1: Проверка развертывания правил Firestore

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект
3. Перейдите в **Firestore Database** → **Rules**
4. Убедитесь, что правила содержат функцию `isSuperAdmin()` и правило для удаления:
   ```javascript
   allow delete: if request.auth != null && 
                    (isSuperAdmin() || isAdminOrOwner(workspaceId));
   ```
5. Если правила не совпадают - скопируйте содержимое `firestore.rules` и нажмите **"Publish"**

## Шаг 2: Проверка email в токене Firebase Auth

Проблема может быть в том, что `request.auth.token.email` не содержит email. Проверьте:

1. Откройте консоль браузера (F12)
2. Вставьте следующий код для проверки токена:
   ```javascript
   import { auth } from './firebase';
   import { getIdTokenResult } from 'firebase/auth';
   
   auth.currentUser && getIdTokenResult(auth.currentUser).then(token => {
     console.log('Token email:', token.claims.email);
     console.log('All claims:', token.claims);
   });
   ```
3. Убедитесь, что `token.claims.email` содержит ваш email: `crazymhessel@gmail.com`

## Шаг 3: Альтернативное решение - проверка через документ пользователя

Если `request.auth.token.email` не работает, можно использовать проверку через документ пользователя в Firestore.

### Вариант A: Обновить правила для использования документа пользователя

Вместо проверки `request.auth.token.email`, можно проверить поле в документе пользователя:

1. Создайте поле `isSuperAdmin: true` в документе пользователя в коллекции `users`
2. Обновите правила Firestore для проверки этого поля

### Вариант B: Использовать Custom Claims (рекомендуется)

1. В Firebase Console перейдите в **Authentication** → **Users**
2. Найдите пользователя с email `crazymhessel@gmail.com`
3. Добавьте Custom Claim:
   - В Firebase Console это делается через Cloud Functions или Admin SDK
   - Или используйте Firebase CLI:
     ```bash
     firebase auth:export users.json
     # Затем добавьте claim через Admin SDK
     ```

## Шаг 4: Проверка индексов

Убедитесь, что созданы все необходимые индексы:

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Перейдите в **Firestore Database** → **Indexes**
3. Проверьте наличие индекса для collection group `members`:
   - Collection ID: `members` (collection group)
   - Fields: `userId` (Ascending), `status` (Ascending)
   - Query scope: Collection group

## Шаг 5: Временное решение - добавить супер-админа как члена workspace

Если ничего не помогает, можно временно добавить супер-админа как члена workspace с ролью OWNER:

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Перейдите в **Firestore Database**
3. Найдите ваш workspace → `members`
4. Создайте документ с ID = ваш `userId` (из Firebase Auth)
5. Добавьте данные:
   ```json
   {
     "userId": "ваш-userId",
     "email": "crazymhessel@gmail.com",
     "role": "OWNER",
     "status": "ACTIVE",
     "joinedAt": "2024-01-01T00:00:00.000Z",
     "invitedBy": "ваш-userId"
   }
   ```

## Шаг 6: Проверка через консоль браузера

Добавьте временный код для отладки в `SettingsView.tsx`:

```typescript
// В функции handleRemoveMember, перед вызовом FirestoreService.removeMember
console.log('Attempting to remove member:', {
  workspaceId: workspace.id,
  memberId: member.id,
  actingUser: actingMember,
  currentUser: currentUser,
  isSuperAdmin: currentUser.email && SUPER_ADMINS.map(e => e.toLowerCase()).includes(currentUser.email.toLowerCase())
});

// Также проверьте токен
import { getIdTokenResult } from 'firebase/auth';
getIdTokenResult(auth.currentUser).then(token => {
  console.log('Auth token email:', token.claims.email);
});
```

## Шаг 7: Проверка правил через Firebase Console

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Перейдите в **Firestore Database** → **Rules**
3. Используйте **Rules Playground** для тестирования:
   - Location: `workspaces/{workspaceId}/members/{memberId}`
   - Operation: `delete`
   - Authenticated: `true`
   - User ID: ваш `userId`
   - Custom Claims: добавьте `email: "crazymhessel@gmail.com"`
   - Проверьте, что правило проходит

## Возможные проблемы и решения

### Проблема 1: `request.auth.token.email` равен `null`

**Решение**: Используйте Custom Claims или проверку через документ пользователя

### Проблема 2: Правила не применяются

**Решение**: 
1. Убедитесь, что правила опубликованы (кнопка "Publish" в Firebase Console)
2. Подождите несколько секунд после публикации
3. Обновите страницу приложения

### Проблема 3: Ошибки в snapshot listeners

**Решение**: 
1. Проверьте, что индексы созданы
2. Проверьте, что правила для `list` в members корректны
3. Временно отключите collection group queries для отладки

## Быстрая проверка

Выполните в консоли браузера:

```javascript
// 1. Проверка текущего пользователя
console.log('Current user:', auth.currentUser?.email);

// 2. Проверка токена
import { getIdTokenResult } from 'firebase/auth';
auth.currentUser && getIdTokenResult(auth.currentUser).then(token => {
  console.log('Token email:', token.claims.email);
  console.log('Is super admin email?', token.claims.email?.toLowerCase() === 'crazymhessel@gmail.com');
});

// 3. Проверка членства в workspace
import { doc, getDoc } from 'firebase/firestore';
const workspaceId = 'ваш-workspace-id';
const memberRef = doc(db, 'workspaces', workspaceId, 'members', auth.currentUser?.uid);
getDoc(memberRef).then(snap => {
  console.log('Is member?', snap.exists());
  console.log('Member data:', snap.data());
});
```


