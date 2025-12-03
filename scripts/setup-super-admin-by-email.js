// Скрипт для добавления поля isSuperAdmin в документ пользователя по email
// Запустите в консоли браузера после авторизации как супер-админ

// Импортируем Firebase модули динамически
async function setupSuperAdminByEmail(targetEmail) {
  try {
    // Динамический импорт Firebase модулей
    const { db } = await import('../src/firebase.js');
    const { collection, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');
    
    console.log('🔍 Ищем пользователя с email:', targetEmail);
    
    // Ищем пользователя по email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', targetEmail));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.error('❌ Пользователь с email', targetEmail, 'не найден в Firestore');
      console.log('💡 Убедитесь, что пользователь хотя бы раз залогинился в систему');
      return;
    }
    
    // Обрабатываем найденных пользователей
    querySnapshot.forEach(async (userDoc) => {
      const userData = userDoc.data();
      console.log('👤 Найден пользователь:', {
        id: userDoc.id,
        email: userData.email,
        displayName: userData.displayName,
        currentIsSuperAdmin: userData.isSuperAdmin
      });
      
      // Проверяем, есть ли уже поле isSuperAdmin
      if (userData.isSuperAdmin === true) {
        console.log('✅ Поле isSuperAdmin уже установлено в true для', targetEmail);
        return;
      }
      
      // Обновляем документ
      try {
        await updateDoc(doc(db, 'users', userDoc.id), {
          isSuperAdmin: true
        });
        
        console.log('✅ Поле isSuperAdmin успешно добавлено для', targetEmail);
        console.log('🔄 Пользователь должен перезайти в систему для применения прав');
      } catch (error) {
        console.error('❌ Ошибка при обновлении документа:', error);
        console.error('💡 Возможно, у вас нет прав для обновления этого документа');
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении скрипта:', error);
    console.error('💡 Убедитесь, что вы запускаете скрипт в консоли браузера после авторизации');
  }
}

// Использование:
// setupSuperAdminByEmail('terehin.alv@yandex.ru');

// Автоматически запускаем для terehin.alv@yandex.ru
setupSuperAdminByEmail('terehin.alv@yandex.ru');

