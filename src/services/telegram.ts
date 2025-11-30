
export const TelegramService = {
  sendMessage: async (token: string, chatId: string, message: string): Promise<boolean> => {
    if (!token || !chatId) return false;

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        console.error('Telegram API Error:', data.description);
        throw new Error(data.description);
      }
      return true;
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      throw error;
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
