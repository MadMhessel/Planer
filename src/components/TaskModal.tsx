import React, { useState, useEffect } from 'react';
import { Task, Project, User, TaskStatus, TaskPriority } from '../types';
import { X, Save, Trash2, Calendar, User as UserIcon, Tag } from 'lucide-react';
import { getMoscowDateString, getMoscowDatePlusDays, getMoscowISOString } from '../utils/dateUtils';
import { logger } from '../utils/logger';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (task: Task) => void | Promise<void>;
  task?: Task | null;
  projects: Project[];
  users: User[];
}

export const TaskModal: React.FC<TaskModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete, 
  task, 
  projects, 
  users 
}) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: TaskStatus.TODO,
    priority: TaskPriority.NORMAL,
    projectId: '',
    assigneeId: '',
    assigneeIds: [],
    startDate: getMoscowDateString(),
    dueDate: getMoscowDatePlusDays(1),
    tags: []
  });

  useEffect(() => {
    if (task) {
      // Ensure optional fields are not undefined to prevent uncontrolled input warning
      // Поддержка обратной совместимости: если есть assigneeId, но нет assigneeIds, создаем массив
      const rawAssigneeIds = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []);
      // Фильтруем валидные ID
      const assigneeIds = rawAssigneeIds.filter(id => id && id !== undefined && id !== null && id !== '');
      
      logger.info('[TaskModal] Loading task data', {
        taskId: task.id,
        taskAssigneeId: task.assigneeId,
        taskAssigneeIds: task.assigneeIds,
        filteredAssigneeIds: assigneeIds,
        availableUsers: users.map(u => ({ id: u.id, email: u.email, displayName: u.displayName })),
        assigneeIdsInUsers: assigneeIds.map(id => {
          const user = users.find(u => u.id === id);
          return user ? { id, found: true, email: user.email } : { id, found: false };
        })
      });
      
      setFormData({ 
          ...task,
          description: task.description || '',
          assigneeId: task.assigneeId || '',
          assigneeIds: assigneeIds,
          tags: task.tags || []
      });
    } else {
      // Reset for new task
      logger.info('[TaskModal] Resetting form for new task', {
        availableUsers: users.map(u => ({ id: u.id, email: u.email, displayName: u.displayName }))
      });
      setFormData({
        title: '',
        description: '',
        status: TaskStatus.TODO,
        priority: TaskPriority.NORMAL,
        projectId: projects[0]?.id || '',
        assigneeId: '',
        assigneeIds: [],
        startDate: getMoscowDateString(),
        dueDate: getMoscowDatePlusDays(1),
        tags: []
      });
    }
  }, [task, isOpen, projects, users]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate
    if (!formData.title) return;
    
    // Для новой задачи не передаем id, чтобы App.tsx мог определить, что это новая задача
    // Фильтруем undefined, null и пустые строки из массива
    const rawAssigneeIds = formData.assigneeIds && formData.assigneeIds.length > 0 
      ? formData.assigneeIds 
      : (formData.assigneeId ? [formData.assigneeId] : []);
    const assigneeIds = rawAssigneeIds.filter(id => id !== undefined && id !== null && id !== '');
    
    // Создаем объект задачи, исключая undefined значения
    const taskData: any = {
      title: formData.title,
      status: formData.status || TaskStatus.TODO,
      priority: formData.priority || TaskPriority.NORMAL,
      id: task?.id || '', // Пустая строка для новой задачи
      createdAt: task?.createdAt || getMoscowISOString(),
      updatedAt: getMoscowISOString(),
      dependencies: task?.dependencies || [],
      tags: formData.tags || [],
      workspaceId: task?.workspaceId || '', // Будет установлено в App.tsx
    };
    
    // Добавляем опциональные поля только если они определены
    if (formData.description) {
      taskData.description = formData.description;
    }
    if (formData.projectId) {
      taskData.projectId = formData.projectId;
    }
    if (formData.startDate) {
      taskData.startDate = formData.startDate;
    }
    if (formData.dueDate) {
      taskData.dueDate = formData.dueDate;
    }
    
    // Обрабатываем assigneeIds и assigneeId
    if (assigneeIds.length > 0) {
      taskData.assigneeIds = assigneeIds;
      taskData.assigneeId = assigneeIds[0]; // Обратная совместимость
      
      // Валидация: проверяем, что все assigneeIds существуют в users
      const invalidAssigneeIds = assigneeIds.filter(id => !users.find(u => u.id === id));
      if (invalidAssigneeIds.length > 0) {
        logger.error('[TaskModal] Invalid assigneeIds found', {
          invalidAssigneeIds,
          allAssigneeIds: assigneeIds,
          availableUserIds: users.map(u => u.id),
          availableUserEmails: users.map(u => u.email)
        });
      }
      
      logger.info('[TaskModal] Saving task with assignees', {
        assigneeIds: assigneeIds,
        assigneeId: assigneeIds[0],
        assigneeDetails: assigneeIds.map(id => {
          const user = users.find(u => u.id === id);
          return user ? { id: user.id, email: user.email, displayName: user.displayName } : { id, error: 'User not found in users list' };
        }),
        allUsers: users.map(u => ({ id: u.id, email: u.email, displayName: u.displayName }))
      });
    } else {
      // Если нет участников, устанавливаем пустой массив для assigneeIds
      taskData.assigneeIds = [];
      logger.info('[TaskModal] Saving task without assignees');
    }
    
    // Добавляем опциональные числовые поля
    if (formData.estimatedHours !== undefined) {
      taskData.estimatedHours = formData.estimatedHours;
    }
    if (formData.loggedHours !== undefined) {
      taskData.loggedHours = formData.loggedHours;
    }
    
    onSave(taskData);
    onClose();
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className={`bg-white dark:bg-slate-900 shadow-2xl w-full ${
        isMobile 
          ? 'h-full rounded-none flex flex-col overflow-hidden' 
          : 'max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-slate-700 animate-scale-in'
      }`}>
        {/* Header */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate flex-1 mr-2">
            {task ? 'Редактировать задачу' : 'Новая задача'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 flex-shrink-0 touch-manipulation"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 bg-white dark:bg-slate-900 pb-20 sm:pb-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Название задачи</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-base sm:text-lg font-medium transition-all"
              placeholder="Что нужно сделать?"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {/* Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Проект</label>
              <select
                value={formData.projectId || ''}
                onChange={(e) => setFormData({...formData, projectId: e.target.value || undefined})}
                className="w-full px-3 py-2.5 text-base border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 touch-manipulation"
              >
                <option value="">Без проекта</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Статус</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as TaskStatus})}
                className="w-full px-3 py-2.5 text-base border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 touch-manipulation"
              >
                <option value={TaskStatus.TODO}>К выполнению</option>
                <option value={TaskStatus.IN_PROGRESS}>В работе</option>
                <option value={TaskStatus.REVIEW}>На проверке</option>
                <option value={TaskStatus.DONE}>Готово</option>
                <option value={TaskStatus.HOLD}>Отложено</option>
              </select>
            </div>

             {/* Assignees - Multiple selection */}
             <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                 <UserIcon size={14} /> Участники
              </label>
              <div className="space-y-2">
                <div className="max-h-40 sm:max-h-32 overflow-y-auto overscroll-contain border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800">
                  {users.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-2">Нет доступных пользователей</p>
                  ) : (
                    (() => {
                      const validUsers = users.filter(user => user && user.id && typeof user.id === 'string' && user.id.trim() !== '');
                      logger.info('[TaskModal] Rendering user list', {
                        totalUsers: users.length,
                        validUsers: validUsers.length,
                        usersDetails: validUsers.map(u => ({ id: u.id, email: u.email, displayName: u.displayName }))
                      });
                      return validUsers.map(user => {
                        // Фильтруем валидные ID для проверки
                        const validAssigneeIds = (formData.assigneeIds || []).filter(id => id && typeof id === 'string' && id.trim() !== '');
                        const isSelected = validAssigneeIds.includes(user.id);
                        
                        return (
                        <label
                          key={user.id}
                          htmlFor={`assignee-${user.id}`}
                          className="flex items-center gap-2 p-2.5 rounded hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors touch-manipulation active:bg-gray-100 dark:active:bg-slate-600"
                        >
                          <input
                            id={`assignee-${user.id}`}
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              logger.info('[TaskModal] Checkbox changed', {
                                userId: user.id,
                                userEmail: user.email,
                                userDisplayName: user.displayName,
                                checked: e.target.checked,
                                currentAssigneeIds: formData.assigneeIds
                              });
                              
                              // Получаем текущие валидные ID
                              const currentIds = (formData.assigneeIds || []).filter(id => id && typeof id === 'string' && id.trim() !== '');
                              
                              if (e.target.checked) {
                                // Проверяем, что user.id валидный и его еще нет в массиве
                                if (user.id && typeof user.id === 'string' && user.id.trim() !== '' && !currentIds.includes(user.id)) {
                                  const newAssigneeIds = [...currentIds, user.id];
                                  logger.info('[TaskModal] Adding assignee', { 
                                    userId: user.id, 
                                    userEmail: user.email,
                                    userDisplayName: user.displayName,
                                    newAssigneeIds 
                                  });
                                  setFormData(prev => ({
                                    ...prev,
                                    assigneeIds: newAssigneeIds,
                                    assigneeId: currentIds.length === 0 ? user.id : prev.assigneeId // Обратная совместимость
                                  }));
                                } else {
                                  logger.warn('[TaskModal] Cannot add assignee', {
                                    userId: user.id,
                                    userEmail: user.email,
                                    userDisplayName: user.displayName,
                                    userIdType: typeof user.id,
                                    alreadyIncluded: currentIds.includes(user.id || ''),
                                    currentIds
                                  });
                                }
                              } else {
                                // Удаляем user.id из массива
                                const newIds = currentIds.filter(id => id !== user.id);
                                logger.info('[TaskModal] Removing assignee', { 
                                  userId: user.id, 
                                  userEmail: user.email,
                                  userDisplayName: user.displayName,
                                  newIds 
                                });
                                setFormData(prev => ({
                                  ...prev,
                                  assigneeIds: newIds,
                                  assigneeId: newIds.length > 0 ? newIds[0] : undefined // Обратная совместимость
                                }));
                              }
                            }}
                            onClick={(e) => {
                              // Останавливаем всплытие, чтобы не закрывать модальное окно
                              e.stopPropagation();
                            }}
                            className="w-5 h-5 text-sky-600 rounded focus:ring-sky-500 cursor-pointer touch-manipulation flex-shrink-0"
                          />
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {user.photoURL ? (
                              <img src={user.photoURL} className="w-7 h-7 sm:w-6 sm:h-6 rounded-full flex-shrink-0" alt="" />
                            ) : (
                              <div className="w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-[10px] sm:text-[10px] flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                                {getInitials(user.displayName || user.email)}
                              </div>
                            )}
                            <span className="text-sm sm:text-sm text-gray-900 dark:text-slate-100 truncate">
                              {user.displayName || user.email}
                            </span>
                          </div>
                        </label>
                      );
                    });
                    })()
                  )}
                </div>
                {formData.assigneeIds && formData.assigneeIds.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Выбрано: {formData.assigneeIds.length} {formData.assigneeIds.length === 1 ? 'участник' : formData.assigneeIds.length < 5 ? 'участника' : 'участников'}
                  </p>
                )}
              </div>
            </div>

            {/* Priority */}
            <div className="sm:col-span-2 sm:col-start-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Приоритет</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value as TaskPriority})}
                className="w-full px-3 py-2.5 text-base border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 touch-manipulation"
              >
                <option value={TaskPriority.LOW}>Низкий</option>
                <option value={TaskPriority.NORMAL}>Обычный</option>
                <option value={TaskPriority.HIGH}>Высокий</option>
                <option value={TaskPriority.CRITICAL}>Критический</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
             {/* Dates */}
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                    <Calendar size={14} /> Начало
                </label>
                <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-3 py-2.5 text-base border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 touch-manipulation"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                    <Calendar size={14} /> Срок
                </label>
                <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full px-3 py-2.5 text-base border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 touch-manipulation"
                />
             </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Описание</label>
            <textarea
              rows={4}
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 sm:px-4 py-2.5 text-base border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 resize-none"
              placeholder="Детали задачи..."
            />
          </div>

          {/* Footer */}
          <div className={`flex justify-between items-center pt-4 sm:pt-6 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 pb-3 sm:pb-0 ${
            isMobile ? 'fixed bottom-0 left-0 right-0 z-20' : 'sticky bottom-0'
          }`}>
            <div>
               {task && (
                   <button 
                      type="button"
                      onClick={async () => {
                          if (confirm('Вы уверены, что хотите удалить задачу?')) {
                              await onDelete(task);
                              onClose();
                          }
                      }}
                      className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 sm:px-4 py-2 rounded-lg transition-all text-sm font-medium touch-manipulation"
                   >
                       <Trash2 size={16} /> <span className="hidden sm:inline">Удалить</span>
                   </button>
               )}
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-3 sm:px-4 md:px-5 py-2.5 sm:py-2 md:py-2.5 text-sm sm:text-base text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all font-medium touch-manipulation"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 sm:px-5 md:px-6 py-2.5 sm:py-2 md:py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-lg hover:from-sky-600 hover:to-indigo-700 transition-all shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40 font-semibold text-sm sm:text-base touch-manipulation active:scale-95"
              >
                <Save size={16} className="sm:w-[18px] sm:h-[18px]" /> <span>Сохранить</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};