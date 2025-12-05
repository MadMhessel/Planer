import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, Project, WorkspaceMember, User, TaskStatus, TaskPriority } from '../types';
import { taskRepository } from '../infrastructure/firestore/TaskRepository';
import { TaskNotificationsService } from '../infrastructure/notifications/TaskNotificationsService';
import { validateTask } from '../utils/validators';
import { logger } from '../utils/logger';
import { getMoscowISOString } from '../utils/dateUtils';

export const useTasks = (
  workspaceId: string | null,
  members: WorkspaceMember[],
  projects: Project[],
  currentUser: User | null
) => {
  // Логируем members при изменении для диагностики
  useEffect(() => {
    if (members.length > 0) {
      const membersWithTelegram = members.filter(m => m.telegramChatId);
      logger.info('[useTasks] Members updated', {
        totalMembers: members.length,
        membersWithTelegram: membersWithTelegram.length,
        membersWithTelegramDetails: membersWithTelegram.map(m => ({
          userId: m.userId,
          email: m.email,
          hasTelegramChatId: !!m.telegramChatId
        }))
      });
    }
  }, [members]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setTasks([]);
      return;
    }

    try {
      const unsubscribe = taskRepository.subscribeToTasks(workspaceId, (newTasks) => {
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
      const now = getMoscowISOString();
      
      // Создаем объект задачи, исключая undefined значения и поля createdAt/updatedAt (они будут добавлены в TaskRepository)
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

      const created = await taskRepository.createTask(taskData);
      
      // Обрабатываем уведомления через сервис
      await TaskNotificationsService.onTaskCreated({
        workspaceId,
        task: created,
        members,
        projects,
        currentUser
      });

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
        t.id === taskId ? { ...t, ...updates, updatedAt: getMoscowISOString() } : t
      ));

      // Фильтруем undefined значения перед передачей в TaskRepository
      const filteredUpdates: Partial<Task> = {
        updatedAt: getMoscowISOString()
      };
      
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          filteredUpdates[key as keyof Task] = value as any;
        }
      }
      
      await taskRepository.updateTask(taskId, filteredUpdates);

      // Обрабатываем уведомления через сервис
      const newTaskState = { ...oldTask, ...updates } as Task;
      await TaskNotificationsService.onTaskUpdated({
        workspaceId,
        task: newTaskState,
        oldTask,
        updates,
        members,
        currentUser
      });
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
      await taskRepository.deleteTask(taskId);

      // Обрабатываем уведомления через сервис
      await TaskNotificationsService.onTaskDeleted({
        workspaceId,
        task: taskToDelete,
        members,
        currentUser
      });
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

