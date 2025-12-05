/**
 * Сервис для обработки уведомлений, связанных с задачами
 * Инкапсулирует логику отправки уведомлений в Firestore и Telegram
 */
import { Task, Project, WorkspaceMember, User, Notification } from '../../types';
import { NotificationsService } from '../../services/notifications';
import { TelegramService } from '../../services/telegram';
import { createTaskNotification, createTelegramMessage, getRecipientsForTask } from '../../utils/notificationHelpers';
import { logger } from '../../utils/logger';
import { getMoscowISOString, formatMoscowDate } from '../../utils/dateUtils';

/**
 * Параметры для обработки уведомления о создании задачи
 */
export interface OnTaskCreatedParams {
  workspaceId: string;
  task: Task;
  members: WorkspaceMember[];
  projects: Project[];
  currentUser: User;
}

/**
 * Параметры для обработки уведомления об обновлении задачи
 */
export interface OnTaskUpdatedParams {
  workspaceId: string;
  task: Task;
  oldTask: Task;
  updates: Partial<Task>;
  members: WorkspaceMember[];
  currentUser: User;
}

/**
 * Параметры для обработки уведомления об удалении задачи
 */
export interface OnTaskDeletedParams {
  workspaceId: string;
  task: Task;
  members: WorkspaceMember[];
  currentUser: User;
}

/**
 * Сервис для обработки уведомлений о задачах
 */
export class TaskNotificationsService {
  /**
   * Обрабатывает уведомления при создании задачи
   */
  static async onTaskCreated(params: OnTaskCreatedParams): Promise<void> {
    const { workspaceId, task, members, projects, currentUser } = params;

    try {
      // Определяем получателей уведомления
      // Используем assigneeIds, если есть, иначе assigneeId
      const notificationRecipients = task.assigneeIds && task.assigneeIds.length > 0
        ? task.assigneeIds
        : (task.assigneeId 
            ? [task.assigneeId]
            : NotificationsService.getRecipients(members, undefined, true)); // Иначе уведомляем админов
      
      // Сохраняем уведомление в Firestore
      const notification = createTaskNotification(
        workspaceId,
        'TASK_ASSIGNED',
        task,
        undefined,
        notificationRecipients
      );
      await NotificationsService.add(workspaceId, notification);

      // Telegram уведомление - отправляем всем участникам задачи
      logger.info('[TaskNotificationsService.onTaskCreated] Preparing Telegram notification', {
        taskId: task.id,
        taskTitle: task.title,
        assigneeId: task.assigneeId,
        assigneeIds: task.assigneeIds,
        membersCount: members.length,
        membersWithTelegram: members.filter(m => m.telegramChatId).length,
        membersWithTelegramDetails: members.filter(m => m.telegramChatId).map(m => ({
          userId: m.userId,
          email: m.email,
          hasTelegramChatId: !!m.telegramChatId
        }))
      });
      
      const telegramRecipients = getRecipientsForTask(task, members, currentUser.id, currentUser.email);
      logger.info('[TaskNotificationsService.onTaskCreated] Telegram recipients determined', {
        recipientsCount: telegramRecipients.length,
        recipients: telegramRecipients.map(r => `${r.substring(0, 5)}...`)
      });
      
      if (telegramRecipients && telegramRecipients.length > 0) {
        const projectName = task.projectId ? projects.find(p => p.id === task.projectId)?.name : undefined;
        const message = createTelegramMessage('TASK_ASSIGNED', task, undefined, undefined, projectName);
        if (message) {
          try {
            const result = await TelegramService.sendNotification(telegramRecipients, message);
            if (!result.success) {
              logger.warn('[TaskNotificationsService.onTaskCreated] Failed to send Telegram notification', { 
                error: result.error, 
                taskId: task.id,
                recipientsCount: telegramRecipients.length
              });
            } else {
              logger.info('[TaskNotificationsService.onTaskCreated] Telegram notification sent', { 
                taskId: task.id,
                recipientsCount: telegramRecipients.length
              });
            }
          } catch (err) {
            logger.error('[TaskNotificationsService.onTaskCreated] Exception sending Telegram notification', err);
          }
        }
      } else {
        logger.info('[TaskNotificationsService.onTaskCreated] No Telegram recipients', { 
          taskId: task.id,
          hasAssigneeId: !!task.assigneeId,
          hasAssigneeIds: !!task.assigneeIds,
          membersCount: members.length
        });
      }
    } catch (error) {
      logger.error('[TaskNotificationsService.onTaskCreated] Failed to process notifications', error);
      // Не пробрасываем ошибку, чтобы не сломать создание задачи
    }
  }

  /**
   * Обрабатывает уведомления при обновлении задачи
   */
  static async onTaskUpdated(params: OnTaskUpdatedParams): Promise<void> {
    const { workspaceId, task, oldTask, updates, members, currentUser } = params;

    try {
      const recipients = getRecipientsForTask(task, members, currentUser.id, currentUser.email);
      
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
        telegramMessage = createTelegramMessage('TASK_UPDATED', task, updates, oldTask);
      } else if (updates.status && updates.status !== oldTask.status) {
        notificationTitle = 'Статус задачи изменен';
        notificationMessage = `Задача "${oldTask.title}" изменена`;
        telegramMessage = createTelegramMessage('TASK_UPDATED', task, updates, oldTask);
      } else if (updates.dueDate && updates.dueDate !== oldTask.dueDate) {
        notificationTitle = 'Срок задачи изменен';
        const newDueDate = formatMoscowDate(updates.dueDate);
        notificationMessage = `Задача "${oldTask.title}" - новый срок: ${newDueDate}`;
        telegramMessage = createTelegramMessage('TASK_UPDATED', task, updates, oldTask);
      } else if (updates.assigneeId && updates.assigneeId !== oldTask.assigneeId) {
        const newAssignee = members.find(m => m.userId === updates.assigneeId);
        const newAssigneeName = newAssignee ? newAssignee.email : 'Неизвестно';
        notificationTitle = 'Задача назначена';
        notificationMessage = `Задача "${oldTask.title}" назначена ${newAssigneeName}`;
        telegramMessage = createTelegramMessage('TASK_UPDATED', task, updates, oldTask);
      } else if (updates.priority && updates.priority !== oldTask.priority) {
        notificationTitle = 'Приоритет задачи изменен';
        notificationMessage = `Задача "${oldTask.title}" - приоритет изменен`;
        telegramMessage = createTelegramMessage('TASK_UPDATED', task, updates, oldTask);
      } else if (updates.title || updates.description) {
        notificationTitle = 'Задача обновлена';
        notificationMessage = `Задача "${updates.title || oldTask.title}" была обновлена`;
        telegramMessage = createTelegramMessage('TASK_UPDATED', task, updates, oldTask);
      } else if (Object.keys(updates).length > 1 || (Object.keys(updates).length === 1 && !updates.updatedAt)) {
        // Любые другие изменения (кроме только updatedAt)
        notificationTitle = 'Задача обновлена';
        notificationMessage = `Задача "${oldTask.title}" была обновлена`;
        telegramMessage = createTelegramMessage('TASK_UPDATED', task, updates, oldTask);
      }

      if (notificationTitle) {
        // Определяем получателей для обновления задачи
        // Используем assigneeIds, если есть, иначе assigneeId
        const notificationRecipients = task.assigneeIds && task.assigneeIds.length > 0
          ? task.assigneeIds
          : (task.assigneeId 
              ? [task.assigneeId]
              : NotificationsService.getRecipients(members, undefined, true));
        
        const notification = createTaskNotification(
          workspaceId,
          'TASK_UPDATED',
          task,
          updates,
          notificationRecipients
        );
        await NotificationsService.add(workspaceId, notification);
      }

      // Логируем для диагностики перед отправкой
      logger.info('[TaskNotificationsService.onTaskUpdated] Preparing Telegram notification', {
        taskId: task.id,
        taskTitle: oldTask.title,
        hasTelegramMessage: !!telegramMessage,
        recipientsCount: recipients.length,
        assigneeId: task.assigneeId,
        assigneeIds: task.assigneeIds,
        membersCount: members.length,
        membersWithTelegram: members.filter(m => m.telegramChatId).length
      });
      
      // Отправляем Telegram уведомления всем участникам задачи при любых изменениях
      if (telegramMessage && recipients && recipients.length > 0) {
        try {
          const result = await TelegramService.sendNotification(recipients, telegramMessage);
          if (!result.success) {
            logger.warn('[TaskNotificationsService.onTaskUpdated] Failed to send Telegram notification', { 
              error: result.error, 
              taskId: task.id,
              recipientsCount: recipients.length
            });
          } else {
            logger.info('[TaskNotificationsService.onTaskUpdated] Telegram notification sent', { 
              taskId: task.id,
              recipientsCount: recipients.length
            });
          }
        } catch (err) {
          logger.error('[TaskNotificationsService.onTaskUpdated] Exception sending Telegram notification', err);
        }
      } else {
        if (!telegramMessage) {
          logger.debug('[TaskNotificationsService.onTaskUpdated] No Telegram message generated', { taskId: task.id });
        }
        if (!recipients || recipients.length === 0) {
          logger.info('[TaskNotificationsService.onTaskUpdated] No Telegram recipients', { 
            taskId: task.id,
            hasAssigneeId: !!task.assigneeId,
            hasAssigneeIds: !!task.assigneeIds,
            membersCount: members.length
          });
        }
      }
    } catch (error) {
      logger.error('[TaskNotificationsService.onTaskUpdated] Failed to process notifications', error);
      // Не пробрасываем ошибку, чтобы не сломать обновление задачи
    }
  }

  /**
   * Обрабатывает уведомления при удалении задачи
   */
  static async onTaskDeleted(params: OnTaskDeletedParams): Promise<void> {
    const { workspaceId, task, members, currentUser } = params;

    try {
      // Уведомление об удалении
      // Используем assigneeIds, если есть, иначе assigneeId
      const notificationRecipients = task.assigneeIds && task.assigneeIds.length > 0
        ? task.assigneeIds
        : (task.assigneeId 
            ? [task.assigneeId]
            : NotificationsService.getRecipients(members, undefined, true));
      
      const deleteNotification: Omit<Notification, 'id'> = {
        workspaceId,
        type: 'TASK_UPDATED',
        title: 'Задача удалена',
        message: `Задача "${task.title}" была удалена`,
        createdAt: getMoscowISOString(),
        readBy: []
      };
      
      // Добавляем recipients только если они есть
      if (notificationRecipients && notificationRecipients.length > 0) {
        deleteNotification.recipients = notificationRecipients;
      }
      
      await NotificationsService.add(workspaceId, deleteNotification);

      const recipients = getRecipientsForTask(task, members, currentUser.id, currentUser.email);
      if (recipients && recipients.length > 0) {
        const message = createTelegramMessage('TASK_DELETED', task);
        if (message) {
          try {
            const result = await TelegramService.sendNotification(recipients, message);
            if (!result.success) {
              logger.warn('[TaskNotificationsService.onTaskDeleted] Failed to send Telegram notification', { 
                error: result.error, 
                taskId: task.id,
                recipientsCount: recipients.length
              });
            } else {
              logger.info('[TaskNotificationsService.onTaskDeleted] Telegram notification sent', { 
                taskId: task.id,
                recipientsCount: recipients.length
              });
            }
          } catch (err) {
            logger.error('[TaskNotificationsService.onTaskDeleted] Exception sending Telegram notification', err);
          }
        }
      } else {
        logger.info('[TaskNotificationsService.onTaskDeleted] No Telegram recipients', { 
          taskId: task.id,
          hasAssigneeId: !!task.assigneeId,
          hasAssigneeIds: !!task.assigneeIds,
          membersCount: members.length
        });
      }
    } catch (error) {
      logger.error('[TaskNotificationsService.onTaskDeleted] Failed to process notifications', error);
      // Не пробрасываем ошибку, чтобы не сломать удаление задачи
    }
  }
}
