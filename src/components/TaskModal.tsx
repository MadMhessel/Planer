import React, { useState, useEffect } from 'react';
import { Task, Project, User, TaskStatus, TaskPriority } from '../types';
import { X, Save, Trash2, Calendar, User as UserIcon, Tag } from 'lucide-react';

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
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    tags: []
  });

  useEffect(() => {
    if (task) {
      // Ensure optional fields are not undefined to prevent uncontrolled input warning
      // Поддержка обратной совместимости: если есть assigneeId, но нет assigneeIds, создаем массив
      const assigneeIds = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []);
      setFormData({ 
          ...task,
          description: task.description || '',
          assigneeId: task.assigneeId || '',
          assigneeIds: assigneeIds,
          tags: task.tags || []
      });
    } else {
      // Reset for new task
      setFormData({
        title: '',
        description: '',
        status: TaskStatus.TODO,
        priority: TaskPriority.NORMAL,
        projectId: projects[0]?.id || '',
        assigneeId: '',
        assigneeIds: [],
        startDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        tags: []
      });
    }
  }, [task, isOpen, projects]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate
    if (!formData.title) return;
    
    // Для новой задачи не передаем id, чтобы App.tsx мог определить, что это новая задача
    const assigneeIds = formData.assigneeIds && formData.assigneeIds.length > 0 
      ? formData.assigneeIds 
      : (formData.assigneeId ? [formData.assigneeId] : []);
    
    const taskData: Task = {
      ...formData,
      projectId: formData.projectId || undefined,
      assigneeId: assigneeIds.length > 0 ? assigneeIds[0] : undefined, // Обратная совместимость
      assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
      id: task?.id || '', // Пустая строка для новой задачи
      createdAt: task?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dependencies: task?.dependencies || [],
      tags: formData.tags || [],
      workspaceId: task?.workspaceId || '', // Будет установлено в App.tsx
      status: formData.status || TaskStatus.TODO,
      priority: formData.priority || TaskPriority.NORMAL
    } as Task;
    
    onSave(taskData);
    onClose();
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className={`bg-white dark:bg-slate-900 shadow-2xl w-full ${
        isMobile 
          ? 'h-full rounded-none flex flex-col' 
          : 'max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-slate-700 animate-scale-in'
      }`}>
        {/* Header */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {task ? 'Редактировать задачу' : 'Новая задача'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 bg-white dark:bg-slate-900">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Проект</label>
              <select
                value={formData.projectId || ''}
                onChange={(e) => setFormData({...formData, projectId: e.target.value || undefined})}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              >
                <option value="">Без проекта</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as TaskStatus})}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              >
                <option value={TaskStatus.TODO}>К выполнению</option>
                <option value={TaskStatus.IN_PROGRESS}>В работе</option>
                <option value={TaskStatus.REVIEW}>На проверке</option>
                <option value={TaskStatus.DONE}>Готово</option>
                <option value={TaskStatus.HOLD}>Отложено</option>
              </select>
            </div>

             {/* Assignees - Multiple selection */}
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                 <UserIcon size={14} /> Участники
              </label>
              <div className="space-y-2">
                <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800">
                  {users.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-2">Нет доступных пользователей</p>
                  ) : (
                    users.map(user => {
                      const isSelected = formData.assigneeIds?.includes(user.id) || false;
                      return (
                        <label
                          key={user.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const currentIds = formData.assigneeIds || [];
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  assigneeIds: [...currentIds, user.id],
                                  assigneeId: currentIds.length === 0 ? user.id : formData.assigneeId // Обратная совместимость
                                });
                              } else {
                                const newIds = currentIds.filter(id => id !== user.id);
                                setFormData({
                                  ...formData,
                                  assigneeIds: newIds,
                                  assigneeId: newIds.length > 0 ? newIds[0] : undefined // Обратная совместимость
                                });
                              }
                            }}
                            className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                          />
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {user.photoURL ? (
                              <img src={user.photoURL} className="w-6 h-6 rounded-full flex-shrink-0" alt="" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-[10px] flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300 flex-shrink-0">
                                {getInitials(user.displayName || user.email)}
                              </div>
                            )}
                            <span className="text-sm text-gray-900 dark:text-slate-100 truncate">
                              {user.displayName || user.email}
                            </span>
                          </div>
                        </label>
                      );
                    })
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value as TaskPriority})}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              >
                <option value={TaskPriority.LOW}>Низкий</option>
                <option value={TaskPriority.NORMAL}>Обычный</option>
                <option value={TaskPriority.HIGH}>Высокий</option>
                <option value={TaskPriority.CRITICAL}>Критический</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
             {/* Dates */}
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar size={14} /> Начало
                </label>
                <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar size={14} /> Срок
                </label>
                <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                />
             </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <textarea
              rows={4}
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 sm:px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 resize-none"
              placeholder="Детали задачи..."
            />
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 sm:pt-6 border-t border-gray-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-900 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 pb-0">
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
                      className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg transition-all text-sm font-medium"
                   >
                       <Trash2 size={16} /> Удалить
                   </button>
               )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all font-medium"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-lg hover:from-sky-600 hover:to-indigo-700 transition-all shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40 font-semibold text-sm sm:text-base"
              >
                <Save size={16} className="sm:w-[18px] sm:h-[18px]" /> Сохранить
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};