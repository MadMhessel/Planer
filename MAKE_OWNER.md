# Как сделать себя OWNER в workspace

## Способ 1: Через Firestore Console (быстро)

1. Откройте Firebase Console: https://console.firebase.google.com
2. Выберите проект `studio-2234511114-48ef4`
3. Перейдите в Firestore Database
4. Найдите коллекцию:
   ```
   workspaces/{workspace_id}/members/{member_id}
   ```
   Где `workspace_id` = ID workspace "Atmosphere" (из URL или из списка)
   
5. Найдите документ с вашим userId
6. Измените поле `role` с `MEMBER` на `OWNER`
7. Сохраните

## Способ 2: Через код (если супер-админ не работает)

Если глобальная проверка `SUPER_ADMINS` не срабатывает, нужно:

1. Проверить, что код задеплоен:
```bash
# В Cloud Run должна быть переменная окружения или код с SUPER_ADMINS
git log --oneline -5
# Должен быть коммит "fix(auth): super-admin email check case-insensitive"
```

2. Убедиться что в `src/constants/superAdmins.ts` есть ваш email:
```typescript
export const SUPER_ADMINS: string[] = [
  'crazymhessel@gmail.com'
];
```

3. Проверить в консоли браузера (F12):
```javascript
// После логина должно быть
console.log('Current user:', currentUser);
// email должен совпадать с 'crazymhessel@gmail.com'
```

## Способ 3: Создать новый workspace

Когда вы создаёте новый workspace через кнопку "+ Новое", вы автоматически становитесь его OWNER.

## Проверка прав супер-админа

После изменения перезайдите в приложение и проверьте:
- ✓ Доступна кнопка "Настройки" (шестерёнка)
- ✓ В настройках можно изменять роли участников
- ✓ Можно приглашать новых участников

## Текущая ситуация

Владелец workspace "Atmosphere": `qBv3ZVFV24PQEjTqZQaFishP8ot1`
Ваш userId: нужно найти в Firestore (`users/{userId}` где `email == 'crazymhessel@gmail.com'`)

Затем в `workspaces/{workspaceId}/members/{yourUserId}` изменить `role` на `OWNER`.

