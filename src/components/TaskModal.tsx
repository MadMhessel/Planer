import React, { useState, useEffect } from 'react';
import { Task, Project, User, TaskStatus, TaskPriority } from '../types';
import { X, Save, Trash2, Calendar, User as UserIcon, Tag } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
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
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    tags: []
  });

  useEffect(() => {
    if (task) {
      // Ensure optional fields are not undefined to prevent uncontrolled input warning
      setFormData({ 
          ...task,
          description: task.description || '',
          assigneeId: task.assigneeId || '',
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
    const taskData: Task = {
      ...formData,
      projectId: formData.projectId || undefined,
      assigneeId: formData.assigneeId || undefined,
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

             {/* Assignee */}
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                 <UserIcon size={14} /> Исполнитель
              </label>
              <div className="relative">
                <select
                    value={formData.assigneeId || ''}
                    onChange={(e) => setFormData({...formData, assigneeId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 appearance-none pl-10"
                >
                    <option value="">Не назначен</option>
                    {users.map(u => (
                    <option key={u.id} value={u.id}>{u.displayName || u.email}</option>
                    ))}
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                     {formData.assigneeId ? (
                         users.find(u => u.id === formData.assigneeId)?.photoURL ? (
                             <img src={users.find(u => u.id === formData.assigneeId)?.photoURL} className="w-5 h-5 rounded-full" alt="" />
                         ) : (
                            <div className="w-5 h-5 rounded-full bg-indigo-100 text-[10px] flex items-center justify-center font-bold text-indigo-700">
                                {getInitials(users.find(u => u.id === formData.assigneeId)?.displayName || users.find(u => u.id === formData.assigneeId)?.email || '')}
                            </div>
                         )
                     ) : (
                         <UserIcon size={16} className="text-gray-400" />
                     )}
                </div>
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
        </form>

        {/* Footer */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky bottom-0 z-10">
          <div>
             {task && (
                 <button 
                    type="button"
                    onClick={() => {
                        if (confirm('Вы уверены, что хотите удалить задачу?')) {
                            onDelete(task.id);
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
      </div>
    </div>
  );
};