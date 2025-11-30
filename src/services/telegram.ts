
export const TelegramService = {
sendNotification: async (chatIds: string[], message: string): Promise<boolean> => {
    if (!chatIds || chatIds.length === 0) return false;

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
        console.error('Failed to send notification via server');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error calling notification endpoint:', error);
      return false;
    }
  },

  testConnection: async (token: string, chatId: string): Promise<boolean> => {
    return TelegramService.sendMessage(
        token, 
        chatId, 
        '🔔 <b>Тестовое уведомление</b>\n\nСистема командного планировщика успешно подключена к вашему Telegram.'
    );
  }
};
