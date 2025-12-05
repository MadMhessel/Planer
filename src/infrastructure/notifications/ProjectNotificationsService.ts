/**
 * Сервис для обработки уведомлений, связанных с проектами
 * Инкапсулирует логику отправки уведомлений в Firestore и Telegram
 */
import { Project, WorkspaceMember, User, Notification } from '../../types';
import { NotificationsService } from '../../services/notifications';
import { TelegramService } from '../../services/telegram';
import { createTelegramMessage, getAllTelegramRecipients } from '../../utils/notificationHelpers';
import { logger } from '../../utils/logger';
import { getMoscowISOString } from '../../utils/dateUtils';

/**
 * Параметры для обработки уведомления о создании проекта
 */
export interface OnProjectCreatedParams {
  workspaceId: string;
  project: Project;
  members: WorkspaceMember[];
  currentUser: User;
}

/**
 * Параметры для обработки уведомления об обновлении проекта
 */
export interface OnProjectUpdatedParams {
  workspaceId: string;
  project: Project;
  oldProject: Project;
  updates: Partial<Project>;
  members: WorkspaceMember[];
  currentUser: User;
}

/**
 * Параметры для обработки уведомления об удалении проекта
 */
export interface OnProjectDeletedParams {
  workspaceId: string;
  project: Project;
  members: WorkspaceMember[];
  currentUser: User;
}

/**
 * Сервис для обработки уведомлений о проектах
 */
export class ProjectNotificationsService {
  /**
   * Обрабатывает уведомления при создании проекта
   */
  static async onProjectCreated(params: OnProjectCreatedParams): Promise<void> {
    const { workspaceId, project, members, currentUser } = params;

    try {
      // Определяем получателей уведомления - всех участников workspace с Telegram
      const telegramRecipients = getAllTelegramRecipients(members);
      
      // Создаем уведомление в Firestore
      const notificationData: Omit<Notification, 'id'> = {
        workspaceId,
        title: 'Проект создан',
        message: `Проект "${project.name}" был создан`,
        type: 'PROJECT_UPDATED',
        readBy: [],
        createdAt: getMoscowISOString()
      };
      
      // Добавляем recipients только если есть получатели
      if (telegramRecipients.length > 0) {
        notificationData.recipients = telegramRecipients.map(r => r.userId);
      }
      
      await NotificationsService.add(workspaceId, notificationData);

      // Отправляем Telegram уведомления
      if (telegramRecipients.length > 0) {
        const message = createTelegramMessage('PROJECT_CREATED', project);
        if (message) {
          try {
            const result = await TelegramService.sendNotification(telegramRecipients, message);
            if (!result.success) {
              logger.warn('[ProjectNotificationsService.onProjectCreated] Failed to send Telegram notification', { 
                error: result.error, 
                projectId: project.id,
                recipientsCount: telegramRecipients.length
              });
            } else {
              logger.info('[ProjectNotificationsService.onProjectCreated] Telegram notification sent', { 
                projectId: project.id,
                recipientsCount: telegramRecipients.length
              });
            }
          } catch (err) {
            logger.error('[ProjectNotificationsService.onProjectCreated] Exception sending Telegram notification', err);
          }
        }
      } else {
        logger.info('[ProjectNotificationsService.onProjectCreated] No Telegram recipients', { 
          projectId: project.id,
          membersCount: members.length
        });
      }
    } catch (error) {
      logger.error('[ProjectNotificationsService.onProjectCreated] Failed to process notifications', error);
      // Не пробрасываем ошибку, чтобы не сломать создание проекта
    }
  }

  /**
   * Обрабатывает уведомления при обновлении проекта
   */
  static async onProjectUpdated(params: OnProjectUpdatedParams): Promise<void> {
    const { workspaceId, project, oldProject, updates, members, currentUser } = params;

    try {
      // Определяем, нужно ли отправлять уведомления
      // Отправляем только при изменении важных полей: name, description, status
      const shouldNotify = updates.name || updates.description || updates.status;
      
      if (shouldNotify) {
        // Создаем уведомление в Firestore
        const telegramRecipients = getAllTelegramRecipients(members);
        const notificationData: Omit<Notification, 'id'> = {
          workspaceId,
          title: 'Проект обновлен',
          message: `Проект "${oldProject.name}" был обновлен`,
          type: 'PROJECT_UPDATED',
          readBy: [],
          createdAt: getMoscowISOString()
        };
        
        // Добавляем recipients только если есть получатели
        if (telegramRecipients.length > 0) {
          notificationData.recipients = telegramRecipients.map(r => r.userId);
        }
        
        await NotificationsService.add(workspaceId, notificationData);

        // Отправляем Telegram уведомления
        if (telegramRecipients.length > 0) {
          const message = createTelegramMessage('PROJECT_UPDATED', project, updates);
          if (message) {
            try {
              const result = await TelegramService.sendNotification(telegramRecipients, message);
              if (!result.success) {
                logger.warn('[ProjectNotificationsService.onProjectUpdated] Failed to send Telegram notification', { 
                  error: result.error, 
                  projectId: project.id,
                  recipientsCount: telegramRecipients.length
                });
              } else {
                logger.info('[ProjectNotificationsService.onProjectUpdated] Telegram notification sent', { 
                  projectId: project.id,
                  recipientsCount: telegramRecipients.length
                });
              }
            } catch (err) {
              logger.error('[ProjectNotificationsService.onProjectUpdated] Exception sending Telegram notification', err);
            }
          }
        } else {
          logger.info('[ProjectNotificationsService.onProjectUpdated] No Telegram recipients', { 
            projectId: project.id,
            membersCount: members.length
          });
        }
      } else {
        logger.debug('[ProjectNotificationsService.onProjectUpdated] Skipping notification - no significant changes', {
          projectId: project.id,
          updatesKeys: Object.keys(updates)
        });
      }
    } catch (error) {
      logger.error('[ProjectNotificationsService.onProjectUpdated] Failed to process notifications', error);
      // Не пробрасываем ошибку, чтобы не сломать обновление проекта
    }
  }

  /**
   * Обрабатывает уведомления при удалении проекта
   */
  static async onProjectDeleted(params: OnProjectDeletedParams): Promise<void> {
    const { workspaceId, project, members, currentUser } = params;

    try {
      // Определяем получателей уведомления - всех участников workspace с Telegram
      const telegramRecipients = getAllTelegramRecipients(members);
      
      // Создаем уведомление в Firestore
      const notificationData: Omit<Notification, 'id'> = {
        workspaceId,
        title: 'Проект удален',
        message: `Проект "${project.name}" был удален`,
        type: 'PROJECT_UPDATED',
        readBy: [],
        createdAt: getMoscowISOString()
      };
      
      // Добавляем recipients только если есть получатели
      if (telegramRecipients.length > 0) {
        notificationData.recipients = telegramRecipients.map(r => r.userId);
      }
      
      await NotificationsService.add(workspaceId, notificationData);

      // Отправляем Telegram уведомления
      if (telegramRecipients.length > 0) {
        const message = createTelegramMessage('PROJECT_DELETED', project);
        if (message) {
          try {
            const result = await TelegramService.sendNotification(telegramRecipients, message);
            if (!result.success) {
              logger.warn('[ProjectNotificationsService.onProjectDeleted] Failed to send Telegram notification', { 
                error: result.error, 
                projectId: project.id,
                recipientsCount: telegramRecipients.length
              });
            } else {
              logger.info('[ProjectNotificationsService.onProjectDeleted] Telegram notification sent', { 
                projectId: project.id,
                recipientsCount: telegramRecipients.length
              });
            }
          } catch (err) {
            logger.error('[ProjectNotificationsService.onProjectDeleted] Exception sending Telegram notification', err);
          }
        }
      } else {
        logger.info('[ProjectNotificationsService.onProjectDeleted] No Telegram recipients', { 
          projectId: project.id,
          membersCount: members.length
        });
      }
    } catch (error) {
      logger.error('[ProjectNotificationsService.onProjectDeleted] Failed to process notifications', error);
      // Не пробрасываем ошибку, чтобы не сломать удаление проекта
    }
  }
}
