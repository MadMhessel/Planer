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
    
    onSave({
      ...formData,
      id: task?.id || Math.random().toString(36).substr(2, 9),
      createdAt: task?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dependencies: task?.dependencies || [],
      tags: formData.tags || []
    } as Task);
    onClose();
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">
            {task ? 'Редактировать задачу' : 'Новая задача'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название задачи</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg font-medium"
              placeholder="Что нужно сделать?"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Проект</label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({...formData, projectId: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white appearance-none pl-10"
                >
                    <option value="">Не назначен</option>
                    {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                     {formData.assigneeId ? (
                         users.find(u => u.id === formData.assigneeId)?.avatar ? (
                             <img src={users.find(u => u.id === formData.assigneeId)?.avatar} className="w-5 h-5 rounded-full" />
                         ) : (
                            <div className="w-5 h-5 rounded-full bg-indigo-100 text-[10px] flex items-center justify-center font-bold text-indigo-700">
                                {getInitials(users.find(u => u.id === formData.assigneeId)?.name || '')}
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value={TaskPriority.LOW}>Низкий</option>
                <option value={TaskPriority.NORMAL}>Обычный</option>
                <option value={TaskPriority.HIGH}>Высокий</option>
                <option value={TaskPriority.CRITICAL}>Критический</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
             {/* Dates */}
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar size={14} /> Начало
                </label>
                <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Детали задачи..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div>
             {task && (
                 <button 
                    onClick={() => {
                        if (confirm('Вы уверены, что хотите удалить задачу?')) {
                            onDelete(task.id);
                            onClose();
                        }
                    }}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                 >
                     <Trash2 size={16} /> Удалить
                 </button>
             )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
            >
              <Save size={18} /> Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};