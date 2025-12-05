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
        
        // Улучшаем сообщения об ошибках для пользователя
        let userFriendlyMessage = errorMessage;
        if (errorMessage.includes('chat not found') || errorMessage.includes('Chat not found')) {
          userFriendlyMessage = 'Чат не найден. Убедитесь, что вы начали диалог с ботом и указали правильный Chat ID.';
        } else if (errorMessage.includes('Forbidden') || errorMessage.includes('bot was blocked')) {
          userFriendlyMessage = 'Бот заблокирован. Разблокируйте бота в Telegram и попробуйте снова.';
        } else if (errorMessage.includes('Invalid chatId')) {
          userFriendlyMessage = 'Неверный формат Chat ID. Проверьте правильность введенного ID.';
        }
        
        setError(userFriendlyMessage);
        toast.error(userFriendlyMessage);
        logger.warn('Telegram test failed', { error: result.error, details: result.details });
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
        try {
          await FirestoreService.syncTelegramChatIdToMembers(user.id, newTelegramChatId);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transition-colors">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Редактировать профиль
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Email нельзя изменить</p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Имя пользователя
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                className="w-full pl-10 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Ваше имя"
                maxLength={50}
              />
            </div>
          </div>

          {/* Telegram Chat ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <MessageCircle size={14} /> Telegram Chat ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.telegramChatId}
                onChange={(e) => setFormData({...formData, telegramChatId: e.target.value})}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Введите ваш Telegram Chat ID"
                disabled={loading || testingTelegram}
              />
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={loading || testingTelegram || !formData.telegramChatId.trim()}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                <Send size={16} />
                {testingTelegram ? 'Отправка...' : 'Тест'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Уведомления о задачах будут отправляться в Telegram. 
            </p>
            <details className="text-xs text-gray-500 mt-1">
              <summary className="cursor-pointer hover:text-gray-600 dark:hover:text-gray-300">
                Как получить Chat ID?
              </summary>
              <div className="mt-2 space-y-1 pl-2">
                <p>1. Найдите бота <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">@userinfobot</code> в Telegram</p>
                <p>2. Начните диалог с ботом (отправьте /start)</p>
                <p>3. Бот отправит вам ваш Chat ID (число, например: 123456789)</p>
                <p>4. Скопируйте это число и вставьте в поле выше</p>
                <p className="text-orange-600 dark:text-orange-400 mt-2">
                  ⚠️ Важно: Перед тестированием убедитесь, что вы начали диалог с вашим Telegram ботом!
                </p>
              </div>
            </details>
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Аватар
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                {currentAvatar ? (
                  <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                    {formData.displayName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </div>
                )}
              </div>
              <label className="flex-1 cursor-pointer">
                <div className="w-full px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Upload size={16} />
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
            <p className="text-xs text-gray-400 mt-1">PNG, JPG до 1MB</p>
          </div>

          {/* Error/Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400">
              {message}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

