import { useState, useEffect, useCallback } from 'react';
import { Task, Project, WorkspaceMember, User, TaskStatus, TaskPriority } from '../types';
import { FirestoreService } from '../services/firestore';
import { TelegramService } from '../services/telegram';
import { validateTask } from '../utils/validators';
import { createTaskNotification, createTelegramMessage, getRecipientsForTask } from '../utils/notificationHelpers';
import { logger } from '../utils/logger';
import { Notification } from '../types';

export const useTasks = (
  workspaceId: string | null,
  members: WorkspaceMember[],
  projects: Project[],
  currentUser: User | null,
  onNotification: (notification: Notification) => void
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
      
      const taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
        title: partial.title || 'Новая задача',
        description: partial.description || '',
        status: (partial.status as TaskStatus) || TaskStatus.TODO,
        projectId: partial.projectId,
        assigneeId: partial.assigneeId,
        createdAt: now,
        updatedAt: now,
        dueDate: partial.dueDate,
        startDate: partial.startDate,
        priority: (partial.priority as TaskPriority) || TaskPriority.NORMAL,
        tags: partial.tags || [],
        estimatedHours: partial.estimatedHours,
        loggedHours: partial.loggedHours,
        dependencies: partial.dependencies || [],
        workspaceId: workspaceId
      };

      const created = await FirestoreService.createTask(taskData);
      
      // Локальное уведомление
      const assignee = created.assigneeId ? members.find(m => m.userId === created.assigneeId) : null;
      const assigneeName = assignee ? assignee.email : 'Не назначен';
      
      onNotification({
        id: Date.now().toString(),
        type: 'TASK_ASSIGNED',
        title: 'Новая задача создана',
        message: `Задача "${created.title}" ${created.assigneeId ? `назначена ${assigneeName}` : 'создана'}`,
        createdAt: new Date().toISOString(),
        read: false
      });

      // Telegram уведомление
      const recipients = getRecipientsForTask(created, members, currentUser.id);
      if (recipients.length > 0) {
        const projectName = created.projectId ? projects.find(p => p.id === created.projectId)?.name : undefined;
        const message = createTelegramMessage('TASK_ASSIGNED', created, undefined, undefined, projectName);
        await TelegramService.sendNotification(recipients, message);
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
  }, [workspaceId, currentUser, members, projects, onNotification]);

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
        onNotification({
          id: Date.now().toString(),
          type: 'TASK_UPDATED',
          title: notificationTitle,
          message: notificationMessage,
          createdAt: new Date().toISOString(),
          read: false
        });
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
  }, [workspaceId, currentUser, tasks, members, onNotification]);

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

      // Уведомления
      onNotification({
        id: Date.now().toString(),
        type: 'TASK_UPDATED',
        title: 'Задача удалена',
        message: `Задача "${taskToDelete.title}" была удалена`,
        createdAt: new Date().toISOString(),
        read: false
      });

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
  }, [workspaceId, currentUser, tasks, members, onNotification]);

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask
  };
};

