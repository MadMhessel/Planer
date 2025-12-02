import { useState, useEffect, useCallback } from 'react';
import { Task, Project, WorkspaceMember, User, TaskStatus, TaskPriority } from '../types';
import { FirestoreService } from '../services/firestore';
import { TelegramService } from '../services/telegram';
import { NotificationsService } from '../services/notifications';
import { validateTask } from '../utils/validators';
import { createTaskNotification, createTelegramMessage, getRecipientsForTask } from '../utils/notificationHelpers';
import { logger } from '../utils/logger';

export const useTasks = (
  workspaceId: string | null,
  members: WorkspaceMember[],
  projects: Project[],
  currentUser: User | null
) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setTasks([]);
      return;
    }

    try {
      const unsubscribe = FirestoreService.subscribeToTasks(workspaceId, (newTasks) => {
        setTasks(newTasks);
      });

      return () => {
        unsubscribe();
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load tasks');
      logger.error('Failed to subscribe to tasks', error);
      setError(error);
    }
  }, [workspaceId]);

  const addTask = useCallback(async (partial: Partial<Task>) => {
    if (!workspaceId || !currentUser) {
      throw new Error('Workspace или пользователь не выбраны');
    }

    // Валидация
    const validation = validateTask(partial);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Проверка существования проекта
    if (partial.projectId && !projects.find(p => p.id === partial.projectId)) {
      logger.warn('Проект не найден, задача будет создана без проекта', { projectId: partial.projectId });
      partial.projectId = undefined;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      
      // Создаем объект задачи, исключая undefined значения и поля createdAt/updatedAt (они будут добавлены в FirestoreService)
      const taskData: any = {
        title: partial.title || 'Новая задача',
        description: partial.description || '',
        status: (partial.status as TaskStatus) || TaskStatus.TODO,
        priority: (partial.priority as TaskPriority) || TaskPriority.NORMAL,
        tags: partial.tags || [],
        dependencies: partial.dependencies || [],
        workspaceId: workspaceId
      };

      // Добавляем опциональные поля только если они определены
      if (partial.projectId) {
        taskData.projectId = partial.projectId;
      }
      if (partial.assigneeId) {
        taskData.assigneeId = partial.assigneeId;
      }
      if (partial.dueDate) {
        taskData.dueDate = partial.dueDate;
      }
      if (partial.startDate) {
        taskData.startDate = partial.startDate;
      }
      if (partial.estimatedHours !== undefined) {
        taskData.estimatedHours = partial.estimatedHours;
      }
      if (partial.loggedHours !== undefined) {
        taskData.loggedHours = partial.loggedHours;
      }

      const created = await FirestoreService.createTask(taskData);
      
      // Определяем получателей уведомления
      const notificationRecipients = created.assigneeId 
        ? [created.assigneeId] // Если есть assignee, уведомляем только его
        : NotificationsService.getRecipients(members, undefined, true); // Иначе уведомляем админов
      
      // Сохраняем уведомление в Firestore
      const notification = createTaskNotification(
        workspaceId,
        'TASK_ASSIGNED',
        created,
        undefined,
        notificationRecipients
      );
      await NotificationsService.add(workspaceId, notification);

      // Telegram уведомление
      const telegramRecipients = getRecipientsForTask(created, members, currentUser.id);
      if (telegramRecipients.length > 0) {
        const projectName = created.projectId ? projects.find(p => p.id === created.projectId)?.name : undefined;
        const message = createTelegramMessage('TASK_ASSIGNED', created, undefined, undefined, projectName);
        await TelegramService.sendNotification(telegramRecipients, message);
      }

      return created;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Не удалось создать задачу');
      logger.error('Failed to create task', error);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [workspaceId, currentUser, members, projects]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    if (!workspaceId || !currentUser) {
      throw new Error('Workspace или пользователь не выбраны');
    }

    const oldTask = tasks.find(t => t.id === taskId);
    if (!oldTask) {
      throw new Error('Задача не найдена');
    }

    // Валидация
    const validation = validateTask({ ...oldTask, ...updates });
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    setLoading(true);
    setError(null);

    try {
      // Оптимистичное обновление
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ));

      await FirestoreService.updateTask(taskId, {
        ...updates,
        updatedAt: new Date().toISOString()
      });

      // Уведомления
      const newTaskState = { ...oldTask, ...updates } as Task;
      const recipients = getRecipientsForTask(newTaskState, members, currentUser.id);
      
      let notificationTitle = '';
      let notificationMessage = '';
      let telegramMessage = '';

      // Определяем тип изменения
      if (updates.status && updates.status !== oldTask.status) {
        notificationTitle = 'Статус задачи изменен';
        notificationMessage = `Задача "${oldTask.title}" изменена`;
        telegramMessage = createTelegramMessage('TASK_UPDATED', newTaskState, updates, oldTask);
      } else if (updates.dueDate && updates.dueDate !== oldTask.dueDate) {
        notificationTitle = 'Срок задачи изменен';
        const newDueDate = new Date(updates.dueDate).toLocaleDateString('ru-RU');
        notificationMessage = `Задача "${oldTask.title}" - новый срок: ${newDueDate}`;
        telegramMessage = createTelegramMessage('TASK_UPDATED', newTaskState, updates, oldTask);
      } else if (updates.assigneeId && updates.assigneeId !== oldTask.assigneeId) {
        const newAssignee = members.find(m => m.userId === updates.assigneeId);
        const newAssigneeName = newAssignee ? newAssignee.email : 'Неизвестно';
        notificationTitle = 'Задача назначена';
        notificationMessage = `Задача "${oldTask.title}" назначена ${newAssigneeName}`;
        telegramMessage = createTelegramMessage('TASK_UPDATED', newTaskState, updates, oldTask);
      } else if (updates.priority && updates.priority !== oldTask.priority) {
        notificationTitle = 'Приоритет задачи изменен';
        notificationMessage = `Задача "${oldTask.title}" - приоритет изменен`;
        telegramMessage = createTelegramMessage('TASK_UPDATED', newTaskState, updates, oldTask);
      } else if (updates.title || updates.description) {
        notificationTitle = 'Задача обновлена';
        notificationMessage = `Задача "${updates.title || oldTask.title}" была обновлена`;
        telegramMessage = createTelegramMessage('TASK_UPDATED', newTaskState, updates, oldTask);
      }

      if (notificationTitle) {
        // Определяем получателей для обновления задачи
        const notificationRecipients = newTaskState.assigneeId 
          ? [newTaskState.assigneeId]
          : NotificationsService.getRecipients(members, undefined, true);
        
        const notification = createTaskNotification(
          workspaceId,
          'TASK_UPDATED',
          newTaskState,
          updates,
          notificationRecipients
        );
        await NotificationsService.add(workspaceId, notification);
      }

      if (telegramMessage && recipients.length > 0) {
        await TelegramService.sendNotification(recipients, telegramMessage);
      }
    } catch (err) {
      // Откат при ошибке
      if (oldTask) {
        setTasks(prev => prev.map(t => 
          t.id === taskId ? oldTask : t
        ));
      }
      
      const error = err instanceof Error ? err : new Error('Не удалось обновить задачу');
      logger.error('Failed to update task', error);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [workspaceId, currentUser, tasks, members, ]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!workspaceId || !currentUser) {
      throw new Error('Workspace или пользователь не выбраны');
    }

    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) {
      throw new Error('Задача не найдена');
    }

    setLoading(true);
    setError(null);

    try {
      await FirestoreService.deleteTask(taskId);

      // Уведомление об удалении
      const notificationRecipients = taskToDelete.assigneeId 
        ? [taskToDelete.assigneeId]
        : NotificationsService.getRecipients(members, undefined, true);
      
      const deleteNotification: Omit<Notification, 'id'> = {
        workspaceId,
        type: 'TASK_UPDATED',
        title: 'Задача удалена',
        message: `Задача "${taskToDelete.title}" была удалена`,
        createdAt: new Date().toISOString(),
        readBy: []
      };
      
      // Добавляем recipients только если они есть
      if (notificationRecipients && notificationRecipients.length > 0) {
        deleteNotification.recipients = notificationRecipients;
      }
      
      await NotificationsService.add(workspaceId, deleteNotification);

      const recipients = getRecipientsForTask(taskToDelete, members, currentUser.id);
      if (recipients.length > 0) {
        const message = createTelegramMessage('TASK_DELETED', taskToDelete);
        await TelegramService.sendNotification(recipients, message);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Не удалось удалить задачу');
      logger.error('Failed to delete task', error);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [workspaceId, currentUser, tasks, members, ]);

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask
  };
};

