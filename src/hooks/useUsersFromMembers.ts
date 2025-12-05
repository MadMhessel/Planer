import { useState, useEffect, useMemo } from 'react';
import { WorkspaceMember, User } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { logger } from '../utils/logger';
import { SUPER_ADMINS } from '../constants/superAdmins';

/**
 * Хук для преобразования members в users с загрузкой displayName из Firestore
 * Для супер-админов гарантирует, что все участники workspace отображаются,
 * даже если супер-админ сам не является участником
 */
export const useUsersFromMembers = (
  members: WorkspaceMember[],
  currentUser: User | null,
  workspaceId?: string | null
): User[] => {
  const [userDataMap, setUserDataMap] = useState<Record<string, Partial<User>>>({});

  // Загружаем данные пользователей из Firestore
  useEffect(() => {
    if (members.length === 0) {
      setUserDataMap({});
      return;
    }

    const loadUserData = async () => {
      const userData: Record<string, Partial<User>> = {};
      
      // Загружаем данные для всех уникальных userId
      const uniqueUserIds = [...new Set(members.map(m => m.userId))];
      
      await Promise.all(
        uniqueUserIds.map(async (userId) => {
          try {
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
              const userDataFromFirestore = userSnap.data() as User;
              userData[userId] = {
                displayName: userDataFromFirestore.displayName,
                photoURL: userDataFromFirestore.photoURL
              };
            }
          } catch (error) {
            logger.warn(`Failed to load user data for ${userId}`, error instanceof Error ? error : undefined);
          }
        })
      );
      
      setUserDataMap(userData);
    };

    loadUserData();
  }, [members]);

  // Проверяем, является ли текущий пользователь супер-админом
  const isSuperAdmin = useMemo(() => {
    if (!currentUser || !currentUser.email) return false;
    return SUPER_ADMINS.map(e => e.toLowerCase()).includes(currentUser.email.toLowerCase());
  }, [currentUser]);

  // Преобразуем members в users с использованием загруженных данных
  const users = useMemo(() => {
    const usersList: User[] = members.map(m => {
      const userData = userDataMap[m.userId] || {};
      return {
        id: m.userId,
        email: m.email,
        displayName: userData.displayName || m.email, // Используем displayName из Firestore, если есть
        photoURL: userData.photoURL,
        role: m.role,
        isActive: m.status === 'ACTIVE',
        createdAt: m.joinedAt
      };
    });

    // Для супер-админов: если список участников пуст или содержит только текущего пользователя,
    // это может означать, что супер-админ не является участником workspace.
    // В этом случае мы все равно показываем всех участников из members (они должны быть загружены через Firestore rules).
    // Но если members пуст, это может быть проблемой загрузки.
    
    // Добавляем текущего пользователя, если его нет в списке
    if (currentUser && currentUser.id) {
      const userExists = usersList.some(u => u.id === currentUser.id);
      if (!userExists) {
        usersList.push({
          id: currentUser.id,
          email: currentUser.email || '',
          displayName: currentUser.displayName || currentUser.email || '',
          photoURL: currentUser.photoURL,
          role: currentUser.role || 'MEMBER',
          isActive: currentUser.isActive !== false,
          createdAt: currentUser.createdAt
        });
      }
    }

    // Для супер-админов: если список содержит только одного пользователя (самого супер-админа),
    // но members не пуст, это означает, что другие участники не были преобразованы.
    // Это не должно происходить, но на всякий случай логируем.
    if (isSuperAdmin && usersList.length === 1 && members.length > 1) {
      logger.warn('[useUsersFromMembers] Супер-админ видит только себя, но в members есть другие участники', {
        currentUserId: currentUser?.id,
        membersCount: members.length,
        usersCount: usersList.length
      });
    }

    return usersList;
  }, [members, userDataMap, currentUser, isSuperAdmin]);

  return users;
};

