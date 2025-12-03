// Скрипт для добавления поля isSuperAdmin в документ пользователя
// Запустите в консоли браузера после авторизации

import { db, auth } from '../src/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

async function setupSuperAdmin() {
  const user = auth.currentUser;
  
  if (!user) {
    console.error('❌ Пользователь не авторизован. Пожалуйста, войдите в систему.');
    return;
  }

  console.log('👤 Текущий пользователь:', user.email);
  console.log('🆔 User ID:', user.uid);

  try {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('❌ Документ пользователя не найден в Firestore');
      return;
    }

    const userData = userDoc.data();
    console.log('📄 Текущие данные пользователя:', userData);

    // Проверяем, есть ли уже поле isSuperAdmin
    if (userData.isSuperAdmin === true) {
      console.log('✅ Поле isSuperAdmin уже установлено в true');
      return;
    }

    // Обновляем документ
    await updateDoc(userRef, {
      isSuperAdmin: true
    });

    console.log('✅ Поле isSuperAdmin успешно добавлено!');
    console.log('🔄 Обновите страницу и попробуйте удалить пользователя снова.');
  } catch (error) {
    console.error('❌ Ошибка при обновлении документа:', error);
  }
}

// Запустить функцию
setupSuperAdmin();


