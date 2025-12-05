import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, Project, WorkspaceMember, User, TaskStatus, TaskPriority } from '../types';
import { FirestoreService } from '../services/firestore';
import { TelegramService } from '../services/telegram';
import { NotificationsService } from '../services/notifications';
import { validateTask } from '../utils/validators';
import { createTaskNotification, createTelegramMessage, getRecipientsForTask } from '../utils/notificationHelpers';
import { logger } from '../utils/logger';
import { getMoscowISOString, formatMoscowDate } from '../utils/dateUtils';

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
      const now = getMoscowISOString();
      
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
      // Используем assigneeIds, если есть, иначе assigneeId
      const notificationRecipients = created.assigneeIds && created.assigneeIds.length > 0
        ? created.assigneeIds
        : (created.assigneeId 
            ? [created.assigneeId]
            : NotificationsService.getRecipients(members, undefined, true)); // Иначе уведомляем админов
      
      // Сохраняем уведомление в Firestore
      const notification = createTaskNotification(
        workspaceId,
        'TASK_ASSIGNED',
        created,
        undefined,
        notificationRecipients
      );
      await NotificationsService.add(workspaceId, notification);

      // Telegram уведомление - отправляем всем участникам задачи
      // Логируем для диагностики
      logger.info('[addTask] Preparing Telegram notification', {
        taskId: created.id,
        taskTitle: created.title,
        assigneeId: created.assigneeId,
        assigneeIds: created.assigneeIds,
        membersCount: members.length,
        membersWithTelegram: members.filter(m => m.telegramChatId).length,
        membersWithTelegramDetails: members.filter(m => m.telegramChatId).map(m => ({
          userId: m.userId,
          email: m.email,
          hasTelegramChatId: !!m.telegramChatId
        }))
      });
      
      const telegramRecipients = getRecipientsForTask(created, members, currentUser.id, currentUser.email);
      logger.info('[addTask] Telegram recipients determined', {
        recipientsCount: telegramRecipients.length,
        recipients: telegramRecipients.map(r => `${r.substring(0, 5)}...`)
      });
      
      if (telegramRecipients && telegramRecipients.length > 0) {
        const projectName = created.projectId ? projects.find(p => p.id === created.projectId)?.name : undefined;
        const message = createTelegramMessage('TASK_ASSIGNED', created, undefined, undefined, projectName);
        if (message) {
          try {
            const result = await TelegramService.sendNotification(telegramRecipients, message);
            if (!result.success) {
              logger.warn('Failed to send Telegram notification for task creation', { 
                error: result.error, 
                taskId: created.id,
                recipientsCount: telegramRecipients.length
              });
            } else {
              logger.info('Telegram notification sent for task creation', { 
                taskId: created.id,
                recipientsCount: telegramRecipients.length
              });
            }
          } catch (err) {
            logger.error('Exception sending Telegram notification for task creation', err);
          }
        }
      } else {
        logger.info('No Telegram recipients for task creation', { 
          taskId: created.id,
          hasAssigneeId: !!created.assigneeId,
          hasAssigneeIds: !!created.assigneeIds,
          membersCount: members.length
        });
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
        t.id === taskId ? { ...t, ...updates, updatedAt: getMoscowISOString() } : t
      ));

      // Фильтруем undefined значения перед передачей в FirestoreService
      const filteredUpdates: Partial<Task> = {
        updatedAt: getMoscowISOString()
      };
      
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          filteredUpdates[key as keyof Task] = value as any;
        }
      }
      
      await FirestoreService.updateTask(taskId, filteredUpdates);

      // Уведомления
      const newTaskState = { ...oldTask, ...updates } as Task;
      const recipients = getRecipientsForTask(newTaskState, members, currentUser.id, currentUser.email);
      
      let notificationTitle = '';
      let notificationMessage = '';
      let telegramMessage = '';

      // Определяем тип изменения
      // Проверяем изменения assigneeIds
      const oldAssigneeIds = oldTask.assigneeIds || (oldTask.assigneeId ? [oldTask.assigneeId] : []);
      const newAssigneeIds = updates.assigneeIds || (updates.assigneeId ? [updates.assigneeId] : oldAssigneeIds);
      const assigneeIdsChanged = JSON.stringify(oldAssigneeIds.sort()) !== JSON.stringify(newAssigneeIds.sort());
      
      if (assigneeIdsChanged) {
        notificationTitle = 'Участники задачи изменены';
        notificationMessage = `Задача "${oldTask.title}" - изменены участники`;
        telegramMessage = createTelegramMessage('TASK_UPDATED', newTaskState, updates, oldTask);
      } else if (updates.status && updates.status !== oldTask.status) {
        notificationTitle = 'Статус задачи изменен';
        notificationMessage = `Задача "${oldTask.title}" изменена`;
        telegramMessage = createTelegramMessage('TASK_UPDATED', newTaskState, updates, oldTask);
      } else if (updates.dueDate && updates.dueDate !== oldTask.dueDate) {
        notificationTitle = 'Срок задачи изменен';
        const newDueDate = formatMoscowDate(updates.dueDate);
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
      } else if (Object.keys(updates).length > 1 || (Object.keys(updates).length === 1 && !updates.updatedAt)) {
        // Любые другие изменения (кроме только updatedAt)
        notificationTitle = 'Задача обновлена';
        notificationMessage = `Задача "${oldTask.title}" была обновлена`;
        telegramMessage = createTelegramMessage('TASK_UPDATED', newTaskState, updates, oldTask);
      }

      if (notificationTitle) {
        // Определяем получателей для обновления задачи
        // Используем assigneeIds, если есть, иначе assigneeId
        const notificationRecipients = newTaskState.assigneeIds && newTaskState.assigneeIds.length > 0
          ? newTaskState.assigneeIds
          : (newTaskState.assigneeId 
              ? [newTaskState.assigneeId]
              : NotificationsService.getRecipients(members, undefined, true));
        
        const notification = createTaskNotification(
          workspaceId,
          'TASK_UPDATED',
          newTaskState,
          updates,
          notificationRecipients
        );
        await NotificationsService.add(workspaceId, notification);
      }

      // Логируем для диагностики перед отправкой
      logger.info('[updateTask] Preparing Telegram notification', {
        taskId,
        taskTitle: oldTask.title,
        hasTelegramMessage: !!telegramMessage,
        recipientsCount: recipients.length,
        assigneeId: newTaskState.assigneeId,
        assigneeIds: newTaskState.assigneeIds,
        membersCount: members.length,
        membersWithTelegram: members.filter(m => m.telegramChatId).length
      });
      
      // Отправляем Telegram уведомления всем участникам задачи при любых изменениях
      if (telegramMessage && recipients && recipients.length > 0) {
        try {
          const result = await TelegramService.sendNotification(recipients, telegramMessage);
          if (!result.success) {
            logger.warn('Failed to send Telegram notification for task update', { 
              error: result.error, 
              taskId,
              recipientsCount: recipients.length
            });
          } else {
            logger.info('Telegram notification sent for task update', { 
              taskId,
              recipientsCount: recipients.length
            });
          }
        } catch (err) {
          logger.error('Exception sending Telegram notification for task update', err);
        }
      } else {
        if (!telegramMessage) {
          logger.debug('No Telegram message generated for task update', { taskId });
        }
        if (!recipients || recipients.length === 0) {
          logger.info('No Telegram recipients for task update', { 
            taskId,
            hasAssigneeId: !!newTaskState.assigneeId,
            hasAssigneeIds: !!newTaskState.assigneeIds,
            membersCount: members.length
          });
        }
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
      // Используем assigneeIds, если есть, иначе assigneeId
      const notificationRecipients = taskToDelete.assigneeIds && taskToDelete.assigneeIds.length > 0
        ? taskToDelete.assigneeIds
        : (taskToDelete.assigneeId 
            ? [taskToDelete.assigneeId]
            : NotificationsService.getRecipients(members, undefined, true));
      
      const deleteNotification: Omit<Notification, 'id'> = {
        workspaceId,
        type: 'TASK_UPDATED',
        title: 'Задача удалена',
        message: `Задача "${taskToDelete.title}" была удалена`,
        createdAt: getMoscowISOString(),
        readBy: []
      };
      
      // Добавляем recipients только если они есть
      if (notificationRecipients && notificationRecipients.length > 0) {
        deleteNotification.recipients = notificationRecipients;
      }
      
      await NotificationsService.add(workspaceId, deleteNotification);

      const recipients = getRecipientsForTask(taskToDelete, members, currentUser.id, currentUser.email);
      if (recipients && recipients.length > 0) {
        const message = createTelegramMessage('TASK_DELETED', taskToDelete);
        if (message) {
          try {
            const result = await TelegramService.sendNotification(recipients, message);
            if (!result.success) {
              logger.warn('Failed to send Telegram notification for task deletion', { 
                error: result.error, 
                taskId,
                recipientsCount: recipients.length
              });
            } else {
              logger.info('Telegram notification sent for task deletion', { 
                taskId,
                recipientsCount: recipients.length
              });
            }
          } catch (err) {
            logger.error('Exception sending Telegram notification for task deletion', err);
          }
        }
      } else {
        logger.info('No Telegram recipients for task deletion', { 
          taskId,
          hasAssigneeId: !!taskToDelete.assigneeId,
          hasAssigneeIds: !!taskToDelete.assigneeIds,
          membersCount: members.length
        });
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

