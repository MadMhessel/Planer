// src/services/demoData.ts
import { FirestoreService } from './firestore';
import { User, Workspace, Task, Project, TaskStatus, TaskPriority, WorkspaceMember, UserRole } from '../types';
import { logger } from '../utils/logger';
import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, getDoc, query, where } from 'firebase/firestore';

/**
 * Создает фиктивного пользователя для демо-режима
 */
async function createDemoUser(userId: string, email: string, displayName: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    id: userId,
    email,
    displayName,
    role: 'MEMBER',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  });
}

/**
 * Создает участника в workspace
 */
async function createDemoMember(
  workspaceId: string,
  userId: string,
  email: string,
  role: UserRole,
  invitedBy: string
): Promise<void> {
  const memberRef = doc(collection(db, 'workspaces', workspaceId, 'members'), userId);
  await setDoc(memberRef, {
    id: userId,
    userId,
    email,
    role,
    joinedAt: new Date().toISOString(),
    invitedBy,
    status: 'ACTIVE'
  });
}

/**
 * Создает демо-пространство с примерами задач и проектов
 */
export async function initializeDemoData(user: User): Promise<Workspace> {
  try {
    logger.info('Инициализация демо-данных для пользователя', { userId: user.id });

    // Проверяем, есть ли уже демо-пространство для этого пользователя
    const workspacesQuery = query(
      collection(db, 'workspaces'),
      where('ownerId', '==', user.id)
    );
    const existingWorkspaces = await getDocs(workspacesQuery);
    
    // Ищем существующее демо-пространство
    const existingDemoWorkspace = existingWorkspaces.docs.find(
      doc => doc.data().name === 'Демо пространство'
    );
    
    if (existingDemoWorkspace) {
      logger.info('Демо-пространство уже существует', { workspaceId: existingDemoWorkspace.id });
      return { ...(existingDemoWorkspace.data() as Workspace), id: existingDemoWorkspace.id };
    }

    // 1. Создаем демо-пространство
    const workspace = await FirestoreService.createWorkspace('Демо пространство', user);
    logger.info('Демо-пространство создано', { workspaceId: workspace.id });

    // 2. Создаем искусственных участников
    const demoMembers = [
      { id: `demo_user_${workspace.id}_1`, email: 'anna.ivanova@demo.com', displayName: 'Анна Иванова', role: 'ADMIN' as UserRole },
      { id: `demo_user_${workspace.id}_2`, email: 'petr.petrov@demo.com', displayName: 'Петр Петров', role: 'MEMBER' as UserRole },
      { id: `demo_user_${workspace.id}_3`, email: 'maria.sidorova@demo.com', displayName: 'Мария Сидорова', role: 'MEMBER' as UserRole },
      { id: `demo_user_${workspace.id}_4`, email: 'alex.kuznetsov@demo.com', displayName: 'Алексей Кузнецов', role: 'MEMBER' as UserRole },
      { id: `demo_user_${workspace.id}_5`, email: 'elena.volkova@demo.com', displayName: 'Елена Волкова', role: 'MEMBER' as UserRole }
    ];

    // Проверяем существующих участников
    const membersRef = collection(db, 'workspaces', workspace.id, 'members');
    const existingMembers = await getDocs(membersRef);
    const existingMemberIds = new Set(existingMembers.docs.map(doc => doc.id));

    for (const member of demoMembers) {
      try {
        // Создаем пользователя только если его еще нет
        const userRef = doc(db, 'users', member.id);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await createDemoUser(member.id, member.email, member.displayName);
        }
        
        // Создаем участника только если его еще нет
        if (!existingMemberIds.has(member.id)) {
          await createDemoMember(workspace.id, member.id, member.email, member.role, user.id);
          logger.info('Создан демо-участник', { userId: member.id, name: member.displayName });
        } else {
          logger.info('Демо-участник уже существует', { userId: member.id, name: member.displayName });
        }
      } catch (err) {
        logger.warn('Не удалось создать демо-участника', { member: member.displayName, error: err });
      }
    }

    logger.info('Демо-участники созданы', { count: demoMembers.length });

    // 3. Создаем демо-проекты
    const projects = [
      {
        name: 'Веб-приложение',
        description: 'Разработка нового веб-приложения для управления проектами',
        color: '#3b82f6'
      },
      {
        name: 'Мобильное приложение',
        description: 'Разработка iOS и Android приложений',
        color: '#8b5cf6'
      },
      {
        name: 'Маркетинг',
        description: 'Маркетинговая кампания для продвижения продукта',
        color: '#10b981'
      },
      {
        name: 'Дизайн',
        description: 'Создание дизайна интерфейса и брендинга',
        color: '#f59e0b'
      },
      {
        name: 'QA и тестирование',
        description: 'Обеспечение качества и тестирование продукта',
        color: '#ef4444'
      },
      {
        name: 'Документация',
        description: 'Создание технической и пользовательской документации',
        color: '#06b6d4'
      }
    ];

    const createdProjects: Project[] = [];
    for (const projectData of projects) {
      try {
        const project = await FirestoreService.createProject({
          name: projectData.name,
          description: projectData.description,
          workspaceId: workspace.id,
          ownerId: user.id,
          color: projectData.color
        });
        createdProjects.push(project);
      } catch (err) {
        logger.warn('Не удалось создать демо-проект', { project: projectData.name, error: err });
      }
    }

    logger.info('Демо-проекты созданы', { count: createdProjects.length });

    // 4. Создаем демо-задачи с распределением между участниками
    const now = new Date();
    
    const tasks: Array<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> = [
      // Задачи в статусе "В планах" (TODO)
      {
        title: 'Создать дизайн главной страницы',
        description: 'Разработать современный и привлекательный дизайн главной страницы приложения с учетом UX принципов',
        status: TaskStatus.TODO,
        projectId: createdProjects.find(p => p.name === 'Дизайн')?.id,
        assigneeId: demoMembers[2].id, // Мария Сидорова
        priority: TaskPriority.HIGH,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() + 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0],
        tags: ['дизайн', 'UI/UX'],
        estimatedHours: 8
      },
      {
        title: 'Настроить CI/CD pipeline',
        description: 'Настроить автоматическую сборку и деплой приложения в облако',
        status: TaskStatus.TODO,
        projectId: createdProjects.find(p => p.name === 'Веб-приложение')?.id,
        assigneeId: demoMembers[1].id, // Петр Петров
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() + 2 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 5 * 86400000).toISOString().split('T')[0],
        tags: ['разработка', 'devops'],
        estimatedHours: 4
      },
      {
        title: 'Провести исследование рынка',
        description: 'Изучить конкурентов и целевую аудиторию для разработки стратегии продвижения',
        status: TaskStatus.TODO,
        projectId: createdProjects.find(p => p.name === 'Маркетинг')?.id,
        assigneeId: demoMembers[4].id, // Елена Волкова
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() + 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0],
        tags: ['исследование', 'маркетинг'],
        estimatedHours: 6
      },
      {
        title: 'Разработать архитектуру мобильного приложения',
        description: 'Спроектировать архитектуру iOS и Android приложений',
        status: TaskStatus.TODO,
        projectId: createdProjects.find(p => p.name === 'Мобильное приложение')?.id,
        assigneeId: demoMembers[3].id, // Алексей Кузнецов
        priority: TaskPriority.HIGH,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 10 * 86400000).toISOString().split('T')[0],
        tags: ['архитектура', 'мобильная разработка'],
        estimatedHours: 16
      },
      {
        title: 'Написать пользовательское руководство',
        description: 'Создать подробное руководство для конечных пользователей продукта',
        status: TaskStatus.TODO,
        projectId: createdProjects.find(p => p.name === 'Документация')?.id,
        assigneeId: demoMembers[0].id, // Анна Иванова
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() + 5 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 12 * 86400000).toISOString().split('T')[0],
        tags: ['документация', 'руководство'],
        estimatedHours: 10
      },
      {
        title: 'Подготовить план тестирования',
        description: 'Разработать стратегию и план тестирования всех компонентов системы',
        status: TaskStatus.TODO,
        projectId: createdProjects.find(p => p.name === 'QA и тестирование')?.id,
        assigneeId: demoMembers[4].id, // Елена Волкова
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() + 2 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 6 * 86400000).toISOString().split('T')[0],
        tags: ['тестирование', 'QA'],
        estimatedHours: 8
      },
      // Задачи в статусе "В работе" (IN_PROGRESS)
      {
        title: 'Реализовать систему аутентификации',
        description: 'Добавить вход через email и Google OAuth с поддержкой двухфакторной аутентификации',
        status: TaskStatus.IN_PROGRESS,
        projectId: createdProjects.find(p => p.name === 'Веб-приложение')?.id,
        assigneeId: demoMembers[1].id, // Петр Петров
        priority: TaskPriority.HIGH,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 2 * 86400000).toISOString().split('T')[0],
        tags: ['разработка', 'безопасность'],
        estimatedHours: 12,
        loggedHours: 6
      },
      {
        title: 'Создать логотип компании',
        description: 'Разработать уникальный логотип, отражающий ценности бренда и корпоративную идентичность',
        status: TaskStatus.IN_PROGRESS,
        projectId: createdProjects.find(p => p.name === 'Дизайн')?.id,
        assigneeId: demoMembers[2].id, // Мария Сидорова
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0],
        tags: ['дизайн', 'брендинг'],
        estimatedHours: 10,
        loggedHours: 4
      },
      {
        title: 'Разработать REST API',
        description: 'Создать RESTful API для взаимодействия фронтенда и бэкенда',
        status: TaskStatus.IN_PROGRESS,
        projectId: createdProjects.find(p => p.name === 'Веб-приложение')?.id,
        assigneeId: demoMembers[3].id, // Алексей Кузнецов
        priority: TaskPriority.HIGH,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 3 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 4 * 86400000).toISOString().split('T')[0],
        tags: ['разработка', 'API'],
        estimatedHours: 20,
        loggedHours: 12
      },
      {
        title: 'Создать контент для социальных сетей',
        description: 'Подготовить посты и визуальный контент для Instagram, Facebook и LinkedIn',
        status: TaskStatus.IN_PROGRESS,
        projectId: createdProjects.find(p => p.name === 'Маркетинг')?.id,
        assigneeId: demoMembers[4].id, // Елена Волкова
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 5 * 86400000).toISOString().split('T')[0],
        tags: ['контент', 'SMM'],
        estimatedHours: 8,
        loggedHours: 3
      },
      {
        title: 'Провести юнит-тестирование',
        description: 'Написать и выполнить юнит-тесты для критических модулей приложения',
        status: TaskStatus.IN_PROGRESS,
        projectId: createdProjects.find(p => p.name === 'QA и тестирование')?.id,
        assigneeId: demoMembers[0].id, // Анна Иванова
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0],
        tags: ['тестирование', 'QA'],
        estimatedHours: 12,
        loggedHours: 7
      },
      // Задачи в статусе "На проверке" (REVIEW)
      {
        title: 'Написать документацию API',
        description: 'Создать подробную документацию для REST API с примерами запросов и ответов',
        status: TaskStatus.REVIEW,
        projectId: createdProjects.find(p => p.name === 'Документация')?.id,
        assigneeId: demoMembers[3].id, // Алексей Кузнецов
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 5 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() - 86400000).toISOString().split('T')[0],
        tags: ['документация', 'API'],
        estimatedHours: 8,
        loggedHours: 8
      },
      {
        title: 'Подготовить презентацию для клиента',
        description: 'Создать презентацию с результатами работы за квартал и планами на будущее',
        status: TaskStatus.REVIEW,
        projectId: createdProjects.find(p => p.name === 'Маркетинг')?.id,
        assigneeId: demoMembers[4].id, // Елена Волкова
        priority: TaskPriority.HIGH,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 3 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 86400000).toISOString().split('T')[0],
        tags: ['презентация', 'отчет'],
        estimatedHours: 6,
        loggedHours: 5
      },
      {
        title: 'Провести code review',
        description: 'Провести ревью кода для модуля аутентификации и исправить найденные проблемы',
        status: TaskStatus.REVIEW,
        projectId: createdProjects.find(p => p.name === 'Веб-приложение')?.id,
        assigneeId: demoMembers[1].id, // Петр Петров
        priority: TaskPriority.HIGH,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 86400000).toISOString().split('T')[0],
        tags: ['code review', 'качество'],
        estimatedHours: 4,
        loggedHours: 3
      },
      // Задачи в статусе "Пауза" (HOLD)
      {
        title: 'Интеграция с платежной системой',
        description: 'Добавить поддержку различных способов оплаты (карты, электронные кошельки)',
        status: TaskStatus.HOLD,
        projectId: createdProjects.find(p => p.name === 'Веб-приложение')?.id,
        assigneeId: demoMembers[3].id, // Алексей Кузнецов
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 10 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 10 * 86400000).toISOString().split('T')[0],
        tags: ['разработка', 'интеграция'],
        estimatedHours: 16,
        loggedHours: 2
      },
      {
        title: 'Разработка темной темы',
        description: 'Реализовать темную тему для веб-приложения',
        status: TaskStatus.HOLD,
        projectId: createdProjects.find(p => p.name === 'Дизайн')?.id,
        assigneeId: demoMembers[2].id, // Мария Сидорова
        priority: TaskPriority.LOW,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0],
        tags: ['дизайн', 'UI'],
        estimatedHours: 6,
        loggedHours: 1
      },
      // Задачи в статусе "Готово" (DONE)
      {
        title: 'Настроить базу данных',
        description: 'Создать схему БД и настроить индексы для оптимизации производительности',
        status: TaskStatus.DONE,
        projectId: createdProjects.find(p => p.name === 'Веб-приложение')?.id,
        assigneeId: demoMembers[1].id, // Петр Петров
        priority: TaskPriority.HIGH,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() - 3 * 86400000).toISOString().split('T')[0],
        tags: ['разработка', 'БД'],
        estimatedHours: 6,
        loggedHours: 6
      },
      {
        title: 'Создать landing page',
        description: 'Разработать посадочную страницу для продукта с адаптивным дизайном',
        status: TaskStatus.DONE,
        projectId: createdProjects.find(p => p.name === 'Маркетинг')?.id,
        assigneeId: demoMembers[2].id, // Мария Сидорова
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0],
        tags: ['разработка', 'маркетинг'],
        estimatedHours: 12,
        loggedHours: 12
      },
      {
        title: 'Провести A/B тестирование',
        description: 'Протестировать различные варианты дизайна кнопок и форм',
        status: TaskStatus.DONE,
        projectId: createdProjects.find(p => p.name === 'Дизайн')?.id,
        assigneeId: demoMembers[0].id, // Анна Иванова
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 10 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() - 5 * 86400000).toISOString().split('T')[0],
        tags: ['тестирование', 'дизайн'],
        estimatedHours: 4,
        loggedHours: 4
      },
      {
        title: 'Настроить систему мониторинга',
        description: 'Внедрить систему мониторинга производительности и ошибок',
        status: TaskStatus.DONE,
        projectId: createdProjects.find(p => p.name === 'Веб-приложение')?.id,
        assigneeId: demoMembers[1].id, // Петр Петров
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 12 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() - 6 * 86400000).toISOString().split('T')[0],
        tags: ['devops', 'мониторинг'],
        estimatedHours: 8,
        loggedHours: 8
      },
      {
        title: 'Создать брендбук',
        description: 'Разработать руководство по использованию фирменного стиля',
        status: TaskStatus.DONE,
        projectId: createdProjects.find(p => p.name === 'Дизайн')?.id,
        assigneeId: demoMembers[2].id, // Мария Сидорова
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 15 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() - 8 * 86400000).toISOString().split('T')[0],
        tags: ['дизайн', 'брендинг'],
        estimatedHours: 10,
        loggedHours: 10
      },
      {
        title: 'Настроить аналитику',
        description: 'Интегрировать Google Analytics и настроить отслеживание событий',
        status: TaskStatus.DONE,
        projectId: createdProjects.find(p => p.name === 'Маркетинг')?.id,
        assigneeId: demoMembers[4].id, // Елена Волкова
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 11 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() - 4 * 86400000).toISOString().split('T')[0],
        tags: ['аналитика', 'маркетинг'],
        estimatedHours: 4,
        loggedHours: 4
      }
    ];

    // Создаем задачи
    let createdTasksCount = 0;
    for (const taskData of tasks) {
      try {
        await FirestoreService.createTask(taskData);
        createdTasksCount++;
      } catch (err) {
        logger.warn('Не удалось создать демо-задачу', { task: taskData.title, error: err });
      }
    }

    logger.info('Демо-данные инициализированы', {
      workspaceId: workspace.id,
      membersCount: demoMembers.length + 1, // +1 для владельца
      projectsCount: createdProjects.length,
      tasksCount: createdTasksCount
    });

    return workspace;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Ошибка при инициализации демо-данных', err);
    throw err;
  }
}

