import { logger } from '../utils/logger';

export interface TelegramSendResult {
  success: boolean;
  error?: string;
  details?: any;
}

export const TelegramService = {
  sendNotification: async (chatIds: string[], message: string): Promise<TelegramSendResult> => {
    if (!chatIds || chatIds.length === 0) {
      logger.warn('TelegramService: No recipients provided');
      return { success: false, error: 'Нет получателей для отправки' };
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
        let errorData: any = {};
        let errorMessage = `HTTP ${response.status}: ${response.statusText || 'Internal Server Error'}`;
        
        try {
          // Пытаемся получить JSON ответ
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } else {
            // Если не JSON, читаем как текст
            const textError = await response.text();
            errorData = { error: textError || errorMessage, raw: textError };
            errorMessage = textError || errorMessage;
          }
        } catch (parseError) {
          // Если вообще не удалось прочитать ответ
          logger.error('Failed to parse error response', parseError instanceof Error ? parseError : undefined);
          errorData = { 
            error: errorMessage,
            parseError: parseError instanceof Error ? parseError.message : String(parseError)
          };
        }
        
      // Детальное логирование для отладки
      console.error('[TelegramService] Failed to send notification - Full details:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        errorMessage,
        url: '/api/telegram/notify',
        chatIds: chatIds.length
      });
      
      logger.error('Failed to send notification via server', undefined, {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        url: '/api/telegram/notify'
      });
      
      return { success: false, error: errorMessage, details: errorData };
      }
      
      const result = await response.json();
      
      // Проверяем результаты каждой отправки
      if (result.results && Array.isArray(result.results)) {
        const failedResults = result.results.filter((r: any) => !r.success);
        const successfulResults = result.results.filter((r: any) => r.success);
        
        if (failedResults.length > 0) {
          // Если есть ошибки, возвращаем первую ошибку
          const firstError = failedResults[0];
          const errorMessage = firstError.error || 'Неизвестная ошибка при отправке';
          logger.warn('Telegram notification partially failed', { 
            total: result.results.length,
            successful: successfulResults.length,
            failed: failedResults.length,
            errors: failedResults
          });
          return { 
            success: false, 
            error: errorMessage,
            details: { failedResults, successfulResults }
          };
        }
        
        if (successfulResults.length > 0) {
          logger.info('Telegram notification sent successfully', { 
            recipients: successfulResults.length,
            chatIds: successfulResults.map((r: any) => r.chatId)
          });
          return { success: true };
        }
      }
      
      // Если нет результатов, но success = true, считаем успешным
      if (result.success) {
        logger.info('Telegram notification sent successfully', { recipients: chatIds.length });
        return { success: true };
      }
      
      logger.warn('Telegram notification failed', result);
      return { success: false, error: 'Не удалось отправить уведомление', details: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      logger.error('Error calling notification endpoint', error instanceof Error ? error : undefined);
      return { success: false, error: `Ошибка соединения: ${errorMessage}` };
    }
  },

  testConnection: async (chatId: string): Promise<TelegramSendResult> => {
    const result = await TelegramService.sendNotification(
        [chatId], 
        '🔔 <b>Тестовое уведомление</b>\n\nСистема командного планировщика успешно подключена к вашему Telegram.'
    );
    return result;
  }
};
