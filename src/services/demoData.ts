// src/services/demoData.ts
import { FirestoreService } from './firestore';
import { User, Workspace, Task, Project, TaskStatus, TaskPriority } from '../types';
import { logger } from '../utils/logger';

/**
 * Создает демо-пространство с примерами задач и проектов
 */
export async function initializeDemoData(user: User): Promise<Workspace> {
  try {
    logger.info('Инициализация демо-данных для пользователя', { userId: user.id });

    // 1. Создаем демо-пространство
    // Если уже существует, FirestoreService.createWorkspace создаст новое с другим именем
    // Но мы создаем только при первом входе, так что это не проблема
    const workspace = await FirestoreService.createWorkspace('Демо пространство', user);
    logger.info('Демо-пространство создано', { workspaceId: workspace.id });

    // 2. Создаем демо-проекты
    const projects = [
      {
        name: 'Веб-приложение',
        description: 'Разработка нового веб-приложения для управления проектами',
        color: '#3b82f6'
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

    // 3. Создаем демо-задачи
    const now = new Date();
    const tasks: Array<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> = [
      // Задачи в статусе "В планах"
      {
        title: 'Создать дизайн главной страницы',
        description: 'Разработать современный и привлекательный дизайн главной страницы приложения',
        status: TaskStatus.TODO,
        projectId: createdProjects.find(p => p.name === 'Дизайн')?.id,
        assigneeId: user.id,
        priority: TaskPriority.HIGH,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() + 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0],
        tags: ['дизайн', 'UI/UX'],
        estimatedHours: 8
      },
      {
        title: 'Настроить CI/CD pipeline',
        description: 'Настроить автоматическую сборку и деплой приложения',
        status: TaskStatus.TODO,
        projectId: createdProjects.find(p => p.name === 'Веб-приложение')?.id,
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() + 2 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 5 * 86400000).toISOString().split('T')[0],
        tags: ['разработка', 'devops'],
        estimatedHours: 4
      },
      {
        title: 'Провести исследование рынка',
        description: 'Изучить конкурентов и целевую аудиторию',
        status: TaskStatus.TODO,
        projectId: createdProjects.find(p => p.name === 'Маркетинг')?.id,
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() + 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0],
        tags: ['исследование', 'маркетинг'],
        estimatedHours: 6
      },
      // Задачи в статусе "В работе"
      {
        title: 'Реализовать систему аутентификации',
        description: 'Добавить вход через email и Google OAuth',
        status: TaskStatus.IN_PROGRESS,
        projectId: createdProjects.find(p => p.name === 'Веб-приложение')?.id,
        assigneeId: user.id,
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
        description: 'Разработать уникальный логотип, отражающий ценности бренда',
        status: TaskStatus.IN_PROGRESS,
        projectId: createdProjects.find(p => p.name === 'Дизайн')?.id,
        assigneeId: user.id,
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0],
        tags: ['дизайн', 'брендинг'],
        estimatedHours: 10,
        loggedHours: 4
      },
      // Задачи в статусе "На проверке"
      {
        title: 'Написать документацию API',
        description: 'Создать подробную документацию для REST API',
        status: TaskStatus.REVIEW,
        projectId: createdProjects.find(p => p.name === 'Веб-приложение')?.id,
        assigneeId: user.id,
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
        description: 'Создать презентацию с результатами работы за квартал',
        status: TaskStatus.REVIEW,
        projectId: createdProjects.find(p => p.name === 'Маркетинг')?.id,
        priority: TaskPriority.HIGH,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 3 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 86400000).toISOString().split('T')[0],
        tags: ['презентация', 'отчет'],
        estimatedHours: 6,
        loggedHours: 5
      },
      // Задачи в статусе "Пауза"
      {
        title: 'Интеграция с платежной системой',
        description: 'Добавить поддержку различных способов оплаты',
        status: TaskStatus.HOLD,
        projectId: createdProjects.find(p => p.name === 'Веб-приложение')?.id,
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 10 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() + 10 * 86400000).toISOString().split('T')[0],
        tags: ['разработка', 'интеграция'],
        estimatedHours: 16,
        loggedHours: 2
      },
      // Задачи в статусе "Готово"
      {
        title: 'Настроить базу данных',
        description: 'Создать схему БД и настроить индексы',
        status: TaskStatus.DONE,
        projectId: createdProjects.find(p => p.name === 'Веб-приложение')?.id,
        assigneeId: user.id,
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
        description: 'Разработать посадочную страницу для продукта',
        status: TaskStatus.DONE,
        projectId: createdProjects.find(p => p.name === 'Маркетинг')?.id,
        assigneeId: user.id,
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
        description: 'Протестировать различные варианты дизайна кнопок',
        status: TaskStatus.DONE,
        projectId: createdProjects.find(p => p.name === 'Дизайн')?.id,
        priority: TaskPriority.NORMAL,
        workspaceId: workspace.id,
        startDate: new Date(now.getTime() - 10 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(now.getTime() - 5 * 86400000).toISOString().split('T')[0],
        tags: ['тестирование', 'дизайн'],
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

