import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { FirestoreService } from '../services/firestore';
import { X, Save, User as UserIcon, Upload, ImageIcon, MessageCircle, Send } from 'lucide-react';
import { logger } from '../utils/logger';
import { TelegramService } from '../services/telegram';
import toast from 'react-hot-toast';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUserUpdate: (updatedUser: User) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdate
}) => {
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    avatar: '', // Для загрузки нового аватара
    telegramChatId: user.telegramChatId || ''
  });
  const [loading, setLoading] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        avatar: '',
        telegramChatId: user.telegramChatId || ''
      });
    }
    setError(null);
    setMessage(null);
  }, [user, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Проверка размера файла (макс 1MB)
      if (file.size > 1024 * 1024) {
        setError('Размер файла не должен превышать 1MB');
        return;
      }

      // Проверка типа файла
      if (!file.type.startsWith('image/')) {
        setError('Пожалуйста, выберите изображение');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setFormData({ ...formData, avatar: result, photoURL: result });
        setError(null);
      };
      reader.onerror = () => {
        setError('Ошибка при чтении файла');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTestTelegram = async () => {
    if (!formData.telegramChatId || !formData.telegramChatId.trim()) {
      setError('Введите Telegram Chat ID для тестирования');
      return;
    }

    setTestingTelegram(true);
    setError(null);
    setMessage(null);

    try {
      const result = await TelegramService.testConnection(formData.telegramChatId.trim());
      if (result.success) {
        setMessage('Тестовое уведомление отправлено! Проверьте ваш Telegram.');
        toast.success('Тестовое уведомление отправлено');
      } else {
        // Показываем конкретную ошибку от Telegram API
        const errorMessage = result.error || 'Не удалось отправить тестовое уведомление';
        const details = result.details || {};
        
        // Улучшаем сообщения об ошибках для пользователя
        let userFriendlyMessage = errorMessage;
        
        // Проверяем детали ошибки
        if (details.error) {
          const detailError = typeof details.error === 'string' ? details.error : JSON.stringify(details.error);
          if (detailError.includes('TELEGRAM_BOT_TOKEN') || detailError.includes('not set')) {
            userFriendlyMessage = 'Ошибка конфигурации сервера: Telegram бот не настроен. Обратитесь к администратору.';
          } else if (detailError.includes('chat not found') || detailError.includes('Chat not found')) {
            userFriendlyMessage = 'Чат не найден. Убедитесь, что вы начали диалог с ботом и указали правильный Chat ID.';
          } else if (detailError.includes('Forbidden') || detailError.includes('bot was blocked')) {
            userFriendlyMessage = 'Бот заблокирован. Разблокируйте бота в Telegram и попробуйте снова.';
          } else if (detailError.includes('Invalid chatId')) {
            userFriendlyMessage = 'Неверный формат Chat ID. Проверьте правильность введенного ID.';
          } else {
            // Используем детальную ошибку, если она есть
            userFriendlyMessage = detailError.length > 200 ? detailError.substring(0, 200) + '...' : detailError;
          }
        } else if (errorMessage.includes('Server configuration error') || errorMessage.includes('TELEGRAM_BOT_TOKEN')) {
          userFriendlyMessage = 'Ошибка конфигурации сервера: Telegram бот не настроен. Обратитесь к администратору.';
        } else if (errorMessage.includes('chat not found') || errorMessage.includes('Chat not found')) {
          userFriendlyMessage = 'Чат не найден. Убедитесь, что вы начали диалог с ботом и указали правильный Chat ID.';
        } else if (errorMessage.includes('Forbidden') || errorMessage.includes('bot was blocked')) {
          userFriendlyMessage = 'Бот заблокирован. Разблокируйте бота в Telegram и попробуйте снова.';
        } else if (errorMessage.includes('Invalid chatId')) {
          userFriendlyMessage = 'Неверный формат Chat ID. Проверьте правильность введенного ID.';
        } else if (errorMessage.includes('HTTP 500') || errorMessage.includes('Internal server error')) {
          userFriendlyMessage = 'Ошибка сервера. Возможно, Telegram бот не настроен на сервере. Обратитесь к администратору.';
        } else if (errorMessage.includes('HTML вместо JSON') || errorMessage.includes('Сервер вернул HTML')) {
          userFriendlyMessage = 'Ошибка сервера: сервер вернул HTML вместо JSON. Проверьте логи сервера или обратитесь к администратору.';
        } else if (errorMessage === 'Unknown error' || errorMessage.includes('<!DOCTYPE html>')) {
          userFriendlyMessage = 'Критическая ошибка сервера. Проверьте логи сервера или обратитесь к администратору.';
        }
        
        // Логируем полную информацию для отладки
        console.error('[ProfileModal] Telegram test failed - Full details:', {
          error: result.error,
          details: result.details,
          fullResult: result
        });
        
        setError(userFriendlyMessage);
        toast.error(userFriendlyMessage);
        logger.warn('Telegram test failed', { 
          error: result.error, 
          details: result.details,
          fullResult: result
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при отправке тестового уведомления';
      logger.error('Failed to test Telegram connection', err);
      setError(errorMessage);
      toast.error('Ошибка отправки уведомления');
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const updates: Partial<User> = {};

      // Обновляем displayName, если изменилось
      if (formData.displayName !== (user.displayName || '')) {
        updates.displayName = formData.displayName.trim() || undefined;
      }

      // Обновляем photoURL, если загружен новый аватар
      if (formData.avatar && formData.avatar !== user.photoURL) {
        updates.photoURL = formData.avatar;
      }

      // Обновляем telegramChatId, если изменилось
      const newTelegramChatId = formData.telegramChatId.trim() || undefined;
      if (newTelegramChatId !== (user.telegramChatId || '')) {
        updates.telegramChatId = newTelegramChatId;
        
        // Синхронизируем telegramChatId со всеми WorkspaceMember этого пользователя
        // Передаем email как fallback для случаев, когда userId не совпадает
        try {
          await FirestoreService.syncTelegramChatIdToMembers(user.id, newTelegramChatId, user.email);
        } catch (syncError) {
          logger.warn('Failed to sync telegramChatId to members', syncError);
          // Не прерываем сохранение профиля, если синхронизация не удалась
        }
      }

      // Обновляем в Firestore
      await FirestoreService.updateUser(user.id, updates);

      // Обновляем локальное состояние
      const updatedUser: User = {
        ...user,
        ...updates
      };
      onUserUpdate(updatedUser);

      setMessage('Профиль успешно обновлён');
      toast.success('Профиль обновлён');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при обновлении профиля';
      logger.error('Failed to update user profile', err);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentAvatar = formData.photoURL || formData.avatar || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-md sm:max-h-[90vh] overflow-hidden flex flex-col transition-colors">
        {/* Header - фиксированный */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
            Редактировать профиль
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400 touch-manipulation"
            disabled={loading}
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-4 py-3 sm:py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed text-base sm:text-sm"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Email нельзя изменить</p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Имя пользователя
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                className="w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base sm:text-sm touch-manipulation"
                placeholder="Ваше имя"
                maxLength={50}
              />
            </div>
          </div>

          {/* Telegram Chat ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
              <MessageCircle size={16} /> Telegram Chat ID
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={formData.telegramChatId}
                onChange={(e) => setFormData({...formData, telegramChatId: e.target.value})}
                className="flex-1 px-4 py-3 sm:py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base sm:text-sm touch-manipulation"
                placeholder="Введите ваш Telegram Chat ID"
                disabled={loading || testingTelegram}
              />
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={loading || testingTelegram || !formData.telegramChatId.trim()}
                className="px-4 py-3 sm:py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 active:bg-sky-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-base sm:text-sm touch-manipulation min-h-[44px] sm:min-h-0"
              >
                <Send size={16} />
                <span className="whitespace-nowrap">{testingTelegram ? 'Отправка...' : 'Тест'}</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Уведомления о задачах будут отправляться в Telegram. 
            </p>
            <details className="text-xs text-gray-500 mt-2">
              <summary className="cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 py-1 touch-manipulation">
                Как получить Chat ID?
              </summary>
              <div className="mt-2 space-y-1.5 pl-2 pb-2">
                <p>1. Найдите бота <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">@userinfobot</code> в Telegram</p>
                <p>2. Начните диалог с ботом (отправьте /start)</p>
                <p>3. Бот отправит вам ваш Chat ID (число, например: 123456789)</p>
                <p>4. Скопируйте это число и вставьте в поле выше</p>
                <p className="text-orange-600 dark:text-orange-400 mt-2 font-medium">
                  ⚠️ Важно: Перед тестированием убедитесь, что вы начали диалог с вашим Telegram ботом!
                </p>
              </div>
            </details>
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Аватар
            </label>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                {currentAvatar ? (
                  <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl">
                    {formData.displayName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </div>
                )}
              </div>
              <label className="flex-1 cursor-pointer">
                <div className="w-full px-4 py-3 sm:py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300 touch-manipulation min-h-[44px] sm:min-h-0">
                  <Upload size={18} />
                  <span>Загрузить фото</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                  disabled={loading}
                />
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">PNG, JPG до 1MB</p>
          </div>

          {/* Error/Message */}
          {error && (
            <div className="p-3 sm:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 sm:p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400">
              {message}
            </div>
          )}

          {/* Actions - фиксированные внизу на мобильных */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sm:pt-4 pb-2 sm:pb-0 border-t border-gray-100 dark:border-gray-700 sm:border-t-0 mt-4 sm:mt-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-3 sm:py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px] sm:min-h-0 text-base sm:text-sm"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px] sm:min-h-0 text-base sm:text-sm"
            >
              <Save size={18} />
              <span>{loading ? 'Сохранение...' : 'Сохранить'}</span>
            </button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
};

