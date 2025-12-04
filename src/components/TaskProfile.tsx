import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Task, Project, User, TaskStatus, TaskPriority } from '../types';
import { getStatusLabel, getPriorityLabel, getPriorityColor, getStatusColor } from '../utils/taskHelpers';
import { formatMoscowDate } from '../utils/dateUtils';
import { X, Edit, Calendar, User as UserIcon, Tag, Clock, Users, FileText } from 'lucide-react';

// Lazy load TaskComments to avoid circular dependencies and improve performance
const TaskComments = lazy(() => import('./TaskComments').then(m => ({ default: m.TaskComments })));

interface TaskProfileProps {
  task: Task | null;
  projects: Project[];
  users: User[];
  currentUser: User;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete?: (task: Task) => void | Promise<void>;
}

export const TaskProfile: React.FC<TaskProfileProps> = ({
  task,
  projects,
  users,
  currentUser,
  onClose,
  onEdit,
  onDelete
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Закрытие по Escape
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (task) {
      document.addEventListener('keydown', handleEscape);
      // Блокируем прокрутку body при открытой панели
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [task, onClose]);

  if (!task) return null;

  const project = projects.find(p => p.id === task.projectId);
  const assignee = users.find(u => u.id === task.assigneeId);
  
  // Получаем всех участников (assigneeIds или assigneeId)
  const assigneeIds = task.assigneeIds || (task.assigneeId ? [task.assigneeId] : []);
  const assignees = assigneeIds
    .map(id => users.find(u => u.id === id))
    .filter((u): u is User => u !== undefined);

  const handleDelete = async () => {
    if (!onDelete || !confirm(`Вы уверены, что хотите удалить задачу "${task.title}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(task);
      onClose();
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Side Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-slate-900 z-50 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 truncate">
              {task.title}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onEdit(task)}
              className="px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 flex items-center gap-1.5"
              aria-label="Редактировать задачу"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Редактировать</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">
            {/* Статус и приоритет */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Статус:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                  {getStatusLabel(task.status)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Приоритет:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(task.priority)}`}>
                  {getPriorityLabel(task.priority)}
                </span>
              </div>
            </div>

            {/* Проект */}
            {project && (
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Проект:</span>
                  <span
                    className="ml-2 px-2 py-1 rounded-md text-sm font-semibold text-white"
                    style={{ backgroundColor: project.color || '#3b82f6' }}
                  >
                    {project.name}
                  </span>
                </div>
              </div>
            )}

            {/* Исполнитель */}
            {assignee && (
              <div className="flex items-center gap-3">
                <UserIcon className="w-5 h-5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Исполнитель:</span>
                  <div className="mt-1 flex items-center gap-2">
                    {assignee.photoURL ? (
                      <img
                        src={assignee.photoURL}
                        alt={assignee.displayName || assignee.email}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                        {(assignee.displayName || assignee.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm text-gray-900 dark:text-slate-100">
                      {assignee.displayName || assignee.email}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Участники (если есть несколько) */}
            {assignees.length > 1 && (
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-gray-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-2">
                    Участники ({assignees.length}):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {assignees.map((user) => (
                      <div key={user.id} className="flex items-center gap-2">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || user.email}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                            {(user.displayName || user.email).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm text-gray-900 dark:text-slate-100">
                          {user.displayName || user.email}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Даты */}
            <div className="space-y-3">
              {task.startDate && (
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Начало:</span>
                    <span className="ml-2 text-sm text-gray-900 dark:text-slate-100">
                      {formatMoscowDate(new Date(task.startDate), {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              )}
              {task.dueDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Срок:</span>
                    <span className={`ml-2 text-sm ${
                      new Date(task.dueDate) < new Date()
                        ? 'text-red-600 dark:text-red-400 font-semibold'
                        : 'text-gray-900 dark:text-slate-100'
                    }`}>
                      {formatMoscowDate(new Date(task.dueDate), {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                      {new Date(task.dueDate) < new Date() && (
                        <span className="ml-2 text-xs">(просрочено)</span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Теги */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex items-start gap-3">
                <Tag className="w-5 h-5 text-gray-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-2">
                    Теги:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-md text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Описание */}
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-gray-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300 block mb-2">
                  Описание:
                </span>
                {task.description ? (
                  <div className="text-sm text-gray-900 dark:text-slate-100 whitespace-pre-wrap break-words">
                    {task.description}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-slate-400 italic">
                    Описание отсутствует
                  </p>
                )}
              </div>
            </div>

            {/* Метаданные */}
            <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="text-xs text-gray-500 dark:text-slate-400 space-y-1">
                <div>
                  Создано: {formatMoscowDate(new Date(task.createdAt), {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                {task.updatedAt && task.updatedAt !== task.createdAt && (
                  <div>
                    Обновлено: {formatMoscowDate(new Date(task.updatedAt), {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Кнопка удаления (если есть права) */}
            {onDelete && (
              <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Удаление...' : 'Удалить задачу'}
                </button>
              </div>
            )}
          </div>

          {/* Комментарии */}
          <div className="border-t border-gray-200 dark:border-slate-700 mt-6">
            <div className="h-[400px]">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm text-gray-500 dark:text-slate-400">Загрузка комментариев...</div>
                </div>
              }>
                <TaskComments
                  taskId={task.id}
                  currentUserId={currentUser.id}
                  currentUserName={currentUser.displayName || currentUser.email}
                  currentUserEmail={currentUser.email}
                  currentUserAvatar={currentUser.photoURL}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

