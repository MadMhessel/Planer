
import React, { useState, useEffect } from 'react';
import { User, Project, SystemSettings } from '../types';
import { Mail, Shield, Folder, Edit, Plus, User as UserIcon, ArrowUpDown, Send, MessageSquare, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { TelegramService } from '../services/telegram';

interface SettingsViewProps {
  users: User[];
  projects: Project[];
  onEditProject: (project: Project) => void;
  onCreateProject: () => void;
  onEditUser: (user: User) => void;
  onInviteUser: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  currentUser?: User;
  onUpdateCurrentUser?: (user: User) => void;
  systemSettings: SystemSettings;
  onUpdateSystemSettings: (settings: SystemSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
    users, 
    projects, 
    onEditProject, 
    onCreateProject,
    onEditUser,
    onInviteUser,
    isDarkMode,
    toggleTheme,
    currentUser,
    onUpdateCurrentUser,
    systemSettings,
    onUpdateSystemSettings
}) => {
  const [projectSortOrder, setProjectSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Telegram State
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [tgEnabled, setTgEnabled] = useState(false);
  const [tgTestStatus, setTgTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
      // Load user specific settings
      if (currentUser?.telegram) {
          setTgChatId(currentUser.telegram.chatId || '');
          setTgEnabled(currentUser.telegram.enabled || false);
      }
      // Load global settings
      if (systemSettings?.telegramBotToken) {
          setTgBotToken(systemSettings.telegramBotToken);
      }
  }, [currentUser, systemSettings]);

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const roleColors = {
    OWNER: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
    ADMIN: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
    MEMBER: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    GUEST: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  };

  const roleLabels = {
    OWNER: 'Владелец',
    ADMIN: 'Администратор',
    MEMBER: 'Участник',
    GUEST: 'Гость',
  };

  const sortedProjects = [...projects].sort((a, b) => {
      return projectSortOrder === 'asc' 
        ? a.name.localeCompare(b.name) 
        : b.name.localeCompare(a.name);
  });

  const toggleProjectSort = () => {
      setProjectSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleSaveTelegram = () => {
      if (!currentUser || !onUpdateCurrentUser) return;
      
      // Save User Settings (Chat ID)
      const updatedUser: User = {
          ...currentUser,
          telegram: {
              chatId: tgChatId,
              enabled: tgEnabled
          }
      };
      onUpdateCurrentUser(updatedUser);

      // Save System Settings (Bot Token) - Only if Owner
      if (currentUser.role === 'OWNER') {
          onUpdateSystemSettings({
              ...systemSettings,
              telegramBotToken: tgBotToken
          });
      }
  };

  const handleTestTelegram = async () => {
      setTgTestStatus('loading');
      try {
          // Use the entered token (if owner) or the stored global token
          const tokenToUse = currentUser?.role === 'OWNER' ? tgBotToken : systemSettings.telegramBotToken;
          
          if (!tokenToUse) throw new Error("Bot token not set");

          await TelegramService.testConnection(tokenToUse, tgChatId);
          setTgTestStatus('success');
          setTimeout(() => setTgTestStatus('idle'), 3000);
      } catch (e) {
          console.error(e);
          setTgTestStatus('error');
          setTimeout(() => setTgTestStatus('idle'), 3000);
      }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-20 max-w-4xl mx-auto">
        
      {/* Projects Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-4 md:px-6 md:py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2">
                <Folder className="text-gray-400" size={20} />
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Проекты</h2>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={toggleProjectSort}
                    className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Сортировать"
                >
                    <ArrowUpDown size={18} />
                </button>
                <button 
                    onClick={onCreateProject}
                    className="flex items-center gap-1 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Plus size={16} /> <span className="hidden xs:inline">Создать</span>
                </button>
            </div>
        </div>
        
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {sortedProjects.map(project => (
                <div key={project.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                         <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg shadow-sm flex-shrink-0" style={{ backgroundColor: project.color }}></div>
                         <div className="min-w-0">
                             <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{project.name}</h3>
                             <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{project.description || 'Нет описания'}</p>
                         </div>
                    </div>
                    <button 
                        onClick={() => onEditProject(project)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors flex-shrink-0"
                    >
                        <Edit size={18} />
                    </button>
                </div>
            ))}
        </div>
        {projects.length === 0 && (
             <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                 <Folder size={48} className="mx-auto mb-2 opacity-20" />
                 <p>Нет активных проектов</p>
             </div>
        )}
      </div>

      {/* Users Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-4 md:px-6 md:py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center gap-2">
            <Shield className="text-gray-400" size={20} />
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Пользователи</h2>
        </div>
        
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {users.map(user => (
                <div key={user.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors gap-3 group relative">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {user.avatar ? (
                                <img src={user.avatar} className="w-full h-full object-cover" alt={user.name} />
                            ) : (
                                <span className="font-bold text-gray-500 dark:text-gray-400">{getInitials(user.name)}</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
                              {user.name}
                              {/* Current user indicator */}
                              {currentUser?.id === user.id && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Вы</span>}
                              <button 
                                onClick={() => onEditUser(user)}
                                className="text-gray-400 hover:text-indigo-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Edit size={14} />
                              </button>
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                                <Mail size={12} /> {user.email}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:self-center self-start pl-[52px] sm:pl-0">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${roleColors[user.role] || roleColors.MEMBER}`}>
                            {roleLabels[user.role]}
                        </span>
                    </div>
                </div>
            ))}
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 text-center">
            <button 
                onClick={onInviteUser}
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors w-full sm:w-auto py-2"
            >
                + Пригласить участника
            </button>
        </div>
      </div>

       {/* Telegram Integration */}
       {currentUser && onUpdateCurrentUser && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
              <div className="p-4 md:px-6 md:py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center gap-2 text-[#2AABEE]">
                  <Send size={20} />
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white">Интеграция Telegram</h2>
              </div>
              <div className="p-4 md:p-6 space-y-4">
                  <div className="flex items-start justify-between">
                      <div className="pr-4">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">Уведомления в Telegram</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Получайте уведомления о назначенных задачах и изменениях статусов.
                          </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={tgEnabled}
                            onChange={(e) => {
                                setTgEnabled(e.target.checked);
                            }}
                          />
                          <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2AABEE]"></div>
                      </label>
                  </div>

                  {tgEnabled && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg space-y-4 animate-fade-in">
                          
                          {/* GLOBAL BOT SETTINGS - VISIBLE ONLY TO OWNER */}
                          {currentUser.role === 'OWNER' && (
                            <div className="p-4 border border-indigo-100 dark:border-indigo-900/50 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/20 mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Lock size={14} className="text-indigo-600 dark:text-indigo-400"/>
                                    <label className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                                        Токен Бота (Глобальная настройка)
                                    </label>
                                </div>
                                <input 
                                    type="password" 
                                    value={tgBotToken}
                                    onChange={(e) => setTgBotToken(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-indigo-200 dark:border-indigo-800 rounded-md dark:bg-gray-800 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Введите токен от @BotFather"
                                />
                                <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-1">
                                    Этот токен будет использоваться для отправки уведомлений ВСЕМ пользователям системы.
                                </p>
                            </div>
                          )}

                          {/* USER SPECIFIC SETTINGS */}
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ваш Chat ID</label>
                              <input 
                                type="text" 
                                value={tgChatId}
                                onChange={(e) => setTgChatId(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                placeholder="Например: 123456789"
                              />
                              <p className="text-xs text-gray-400 mt-1">Напишите боту <a href="https://t.me/userinfobot" target="_blank" className="text-indigo-500 hover:underline">@userinfobot</a> чтобы узнать свой ID</p>
                          </div>
                          
                          <div className="flex items-center gap-3 pt-2">
                              <button 
                                onClick={handleSaveTelegram}
                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                              >
                                  Сохранить настройки
                              </button>
                              <button 
                                onClick={handleTestTelegram}
                                disabled={!tgChatId || tgTestStatus === 'loading'}
                                className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                              >
                                  {tgTestStatus === 'loading' && <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>}
                                  {tgTestStatus === 'success' && <CheckCircle2 size={16} className="text-green-500" />}
                                  {tgTestStatus === 'error' && <AlertCircle size={16} className="text-red-500" />}
                                  {tgTestStatus === 'idle' && <MessageSquare size={16} />}
                                  Проверить
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
       )}

      {/* General Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
          <div className="p-4 md:px-6 md:py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Общие настройки</h2>
          </div>
          <div className="p-4 md:p-6 space-y-5">
              <div className="flex items-center justify-between">
                  <div className="pr-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm md:text-base">Системные уведомления</h4>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Внутри приложения</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
              </div>
              <div className="flex items-center justify-between">
                  <div className="pr-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm md:text-base">Темная тема</h4>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Переключить оформление</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isDarkMode}
                        onChange={toggleTheme}
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
              </div>
          </div>
      </div>
    </div>
  );
};
