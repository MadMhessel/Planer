# 🔍 Анализ последовательности кода для удаления пользователя

## Полная последовательность удаления пользователя

### 1. UI: SettingsView.tsx → handleRemoveMember (строки 150-219)

**Шаг 1.1: Проверка прав (строки 151-155)**
```typescript
if (!canManage) {
  setError('У вас нет прав для удаления участников');
  return;
}
```
- `canManage` вычисляется в `useMemo` (строки 52-74)
- Проверяет: супер-админ ИЛИ роль OWNER/ADMIN в workspace
- ✅ **Проверка в коде работает**

**Шаг 1.2: Проверка роли удаляемого (строки 157-160)**
```typescript
if (member.role === 'OWNER') {
  setError('Нельзя удалить владельца рабочего пространства');
  return;
}
```
- ✅ **Проверка в коде работает**

**Шаг 1.3: Подтверждение (строки 162-164)**
```typescript
if (!window.confirm(`Убрать пользователя ${member.email} из пространства?`)) {
  return;
}
```
- ✅ **UI подтверждение работает**

**Шаг 1.4: Создание actingMember для супер-админа (строки 171-192)**
```typescript
let actingMember = currentMember;
if (!actingMember && canManage) {
  const isSuperAdmin = currentUser.email && SUPER_ADMINS.map(e => e.toLowerCase()).includes(currentUser.email.toLowerCase());
  if (isSuperAdmin) {
    actingMember = {
      id: currentUser.id,
      userId: currentUser.id,
      email: currentUser.email || '',
      role: 'OWNER',
      joinedAt: new Date().toISOString(),
      invitedBy: currentUser.id,
      status: 'ACTIVE'
    };
  }
}
```
- ✅ **Логика создания actingMember для супер-админа есть**

**Шаг 1.5: Вызов FirestoreService (строка 200)**
```typescript
await FirestoreService.removeMember(workspace.id, member.id, actingMember);
```
- ✅ **Вызов правильный**

---

### 2. Service: FirestoreService.removeMember (строки 280-296)

**Шаг 2.1: Получение документа (строки 281-283)**
```typescript
const memberRef = doc(db, 'workspaces', workspaceId, 'members', memberId);
const memberSnap = await getDoc(memberRef);
if (!memberSnap.exists()) return;
```
- ✅ **Проверка существования работает**

**Шаг 2.2: Проверка роли удаляемого (строки 287-289)**
```typescript
if (member.role === 'OWNER') {
  throw new Error('Нельзя удалить владельца рабочей области');
}
```
- ✅ **Проверка в коде работает**

**Шаг 2.3: Проверка прав actingUser (строки 291-293)**
```typescript
if (actingUser.role === 'MEMBER' || actingUser.role === 'VIEWER') {
  throw new Error('Недостаточно прав для удаления участника');
}
```
- ✅ **Проверка в коде работает**

**Шаг 2.4: Удаление документа (строка 295)**
```typescript
await deleteDoc(memberRef);
```
- ⚠️ **ЗДЕСЬ ПРОИСХОДИТ ОШИБКА "Missing or insufficient permissions"**
- Это означает, что правила Firestore блокируют операцию

---

### 3. Firestore Rules: firestore.rules → members delete (строки 145-149)

**Правило для удаления:**
```javascript
allow delete: if request.auth != null && 
                 (isSuperAdmin() || isAdminOrOwner(workspaceId));
```

**Функция isSuperAdmin() (строки 12-25):**
```javascript
function isSuperAdmin() {
  return request.auth != null && (
    // Способ 1: Проверка через токен
    (request.auth.token.email != null &&
     request.auth.token.email.toLowerCase() == 'crazymhessel@gmail.com') ||
    // Способ 2: Проверка через документ пользователя (isSuperAdmin)
    (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isSuperAdmin == true) ||
    // Способ 3: Проверка через email в документе пользователя
    (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.email != null &&
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.email.toLowerCase() == 'crazymhessel@gmail.com')
  );
}
```

**Функция isAdminOrOwner() (строки 27-32):**
```javascript
function isAdminOrOwner(workspaceId) {
  return isSuperAdmin() || 
         (exists(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid)) &&
          (get(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid)).data.role == 'ADMIN' ||
           get(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid)).data.role == 'OWNER'));
}
```

---

## 🔴 Выявленные проблемы

### Проблема 1: `request.auth.token.email` может быть `null`

**Причина:**
- Firebase Auth не всегда включает email в токен по умолчанию
- Токен может не содержать email, если пользователь авторизован не через Google OAuth

**Решение:**
- ✅ Уже добавлена проверка через документ пользователя (способ 2 и 3)
- ⚠️ **Нужно убедиться, что в документе пользователя есть поле `isSuperAdmin: true` ИЛИ `email: "crazymhessel@gmail.com"`**

### Проблема 2: Правила не развернуты

**Причина:**
- Правила в файле `firestore.rules` могут не совпадать с правилами в Firebase Console
- Правила могут быть не опубликованы

**Решение:**
- ⚠️ **Нужно проверить, что правила развернуты в Firebase Console**

### Проблема 3: `isAdminOrOwner()` не работает для супер-админа без членства

**Причина:**
- Если супер-админ не является членом workspace, `isAdminOrOwner()` может упасть при попытке получить документ member
- Но `isSuperAdmin()` проверяется первым, так что это не должно быть проблемой

**Решение:**
- ✅ Уже исправлено: `isSuperAdmin()` проверяется первым в `isAdminOrOwner()`

---

## ✅ Чек-лист для диагностики

### 1. Проверка кода (все должно работать)
- [x] `canManage` правильно определяет супер-админа
- [x] `actingMember` создается для супер-админа
- [x] `FirestoreService.removeMember` вызывается с правильными параметрами
- [x] Проверки в коде работают

### 2. Проверка настроек Firebase (здесь может быть проблема)

#### 2.1. Правила Firestore развернуты?
- [ ] Откройте Firebase Console → Firestore → Rules
- [ ] Проверьте, что правила содержат функцию `isSuperAdmin()` с тремя способами проверки
- [ ] Проверьте, что правила опубликованы (кнопка "Publish")

#### 2.2. Документ пользователя содержит нужные поля?
- [ ] Откройте Firebase Console → Firestore → `users` → ваш документ
- [ ] Проверьте наличие поля `email: "crazymhessel@gmail.com"`
- [ ] ИЛИ добавьте поле `isSuperAdmin: true` (boolean)

#### 2.3. Токен содержит email?
- [ ] Откройте консоль браузера (F12)
- [ ] Выполните код для проверки токена (см. DIAGNOSTIC_CHECK.md)

---

## 🛠️ Рекомендуемые действия

### Действие 1: Добавить поле `isSuperAdmin` в документ пользователя

**Через Firebase Console:**
1. Откройте Firebase Console → Firestore → `users`
2. Найдите документ с вашим `userId`
3. Добавьте поле: `isSuperAdmin: true` (boolean)

**Через консоль браузера:**
```javascript
import { db, auth } from './src/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const user = auth.currentUser;
if (user) {
  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, { isSuperAdmin: true });
  console.log('✅ Готово!');
}
```

### Действие 2: Проверить развертывание правил

1. Откройте Firebase Console → Firestore → Rules
2. Скопируйте содержимое `firestore.rules` из проекта
3. Вставьте в редактор правил
4. Нажмите "Publish"
5. Подождите несколько секунд

### Действие 3: Добавить логирование для отладки

Добавьте в `SettingsView.tsx` перед вызовом `FirestoreService.removeMember`:

```typescript
console.log('[DEBUG] Removing member:', {
  workspaceId: workspace.id,
  memberId: member.id,
  memberEmail: member.email,
  actingUser: actingMember,
  currentUser: {
    id: currentUser.id,
    email: currentUser.email,
    isSuperAdmin: currentUser.email && SUPER_ADMINS.map(e => e.toLowerCase()).includes(currentUser.email.toLowerCase())
  }
});
```

---

## 📊 Вывод

**Код работает правильно.** Проблема скорее всего в настройках Firebase:

1. **Правила Firestore не развернуты** (наиболее вероятно)
2. **Документ пользователя не содержит `isSuperAdmin: true` или `email`**
3. **Токен не содержит email** (но это компенсируется проверкой через документ)

**Решение:** Следуйте инструкциям в `QUICK_FIX.md` или `SETUP_SUPER_ADMIN.md`.

