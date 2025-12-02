import { logger } from '../utils/logger';

export const TelegramService = {
  sendNotification: async (chatIds: string[], message: string): Promise<boolean> => {
    if (!chatIds || chatIds.length === 0) {
      logger.warn('TelegramService: No recipients provided');
      return false;
    }

    try {
      const response = await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatIds,
          message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to send notification via server', undefined, errorData);
        return false;
      }
      
      const result = await response.json();
      if (result.success) {
        logger.info('Telegram notification sent successfully', { recipients: chatIds.length });
        return true;
      } else {
        logger.warn('Telegram notification partially failed', result);
        return false;
      }
    } catch (error) {
      logger.error('Error calling notification endpoint', error instanceof Error ? error : undefined);
      return false;
    }
  },

  testConnection: async (chatId: string): Promise<boolean> => {
    return TelegramService.sendNotification(
        [chatId], 
        '🔔 <b>Тестовое уведомление</b>\n\nСистема командного планировщика успешно подключена к вашему Telegram.'
    );
  }
};
