import React, { useMemo } from 'react';
import { Task, Project, User, TaskStatus, TaskPriority } from '../types';
import { X, Plus, Calendar, Play, Flag } from 'lucide-react';
import { formatMoscowDate } from '../utils/dateUtils';
import { getPriorityLabel, getPriorityColor, getStatusLabel, getStatusColor } from '../utils/taskHelpers';

interface DayTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string; // ISO date string (YYYY-MM-DD)
  tasks: Task[];
  projects: Project[];
  users: User[];
  onTaskClick: (task: Task) => void;
  onCreateTask: (date: string) => void;
}

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

export const DayTasksModal: React.FC<DayTasksModalProps> = ({
  isOpen,
  onClose,
  date,
  tasks,
  projects,
  users,
  onTaskClick,
  onCreateTask
}) => {
  // Фильтруем задачи, которые относятся к выбранной дате
  const dayTasks = useMemo(() => {
    const dateStr = date.slice(0, 10); // YYYY-MM-DD
    
    return tasks.filter(task => {
      const startDateStr = task.startDate ? task.startDate.slice(0, 10) : null;
      const dueDateStr = task.dueDate ? task.dueDate.slice(0, 10) : null;
      
      // Задача относится к дате, если она начинается или заканчивается в этот день
      return startDateStr === dateStr || dueDateStr === dateStr;
    }).map(task => {
      const startDateStr = task.startDate ? task.startDate.slice(0, 10) : null;
      const dueDateStr = task.dueDate ? task.dueDate.slice(0, 10) : null;
      const dateStr = date.slice(0, 10);
      
      return {
        task,
        isStart: startDateStr === dateStr,
        isEnd: dueDateStr === dateStr
      };
    });
  }, [tasks, date]);

  if (!isOpen) return null;

  const formattedDate = formatMoscowDate(date, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long'
  });

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
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                Задачи на {formattedDate}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                {dayTasks.length} {dayTasks.length === 1 ? 'задача' : dayTasks.length < 5 ? 'задачи' : 'задач'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-white dark:bg-slate-900">
          {dayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Нет задач на этот день
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                Создайте новую задачу, чтобы начать планирование
              </p>
              <button
                onClick={() => {
                  onCreateTask(date);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-lg hover:from-sky-600 hover:to-indigo-700 transition-all shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40 font-semibold"
              >
                <Plus size={18} />
                Создать задачу
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Кнопка создания новой задачи */}
              <button
                onClick={() => {
                  onCreateTask(date);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-lg hover:from-sky-600 hover:to-indigo-700 transition-all shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40 font-semibold mb-4"
              >
                <Plus size={18} />
                Создать новую задачу
              </button>

              {/* Список задач */}
              <div className="space-y-3">
                {dayTasks.map(({ task, isStart, isEnd }) => {
                  const project = projects.find(p => p.id === task.projectId);
                  const user = users.find(u => u.id === task.assigneeId);
                  
                  // Определяем стиль в зависимости от типа даты
                  let borderColor = 'border-gray-200 dark:border-slate-700';
                  let icon = null;
                  let iconColor = 'text-gray-600 dark:text-slate-400';
                  
                  if (isStart && isEnd) {
                    borderColor = 'border-emerald-300 dark:border-emerald-700';
                    iconColor = 'text-emerald-600 dark:text-emerald-400';
                  } else if (isStart) {
                    borderColor = 'border-emerald-300 dark:border-emerald-700';
                    icon = <Play className="w-4 h-4" />;
                    iconColor = 'text-emerald-600 dark:text-emerald-400';
                  } else if (isEnd) {
                    borderColor = 'border-orange-300 dark:border-orange-700';
                    icon = <Flag className="w-4 h-4" />;
                    iconColor = 'text-orange-600 dark:text-orange-400';
                  }

                  return (
                    <div
                      key={task.id}
                      onClick={() => {
                        onTaskClick(task);
                        onClose();
                      }}
                      className={`bg-white dark:bg-slate-800/80 backdrop-blur-sm p-4 rounded-xl shadow-md border-2 ${borderColor} cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]`}
                    >
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {icon && <span className={`${iconColor} flex-shrink-0`}>{icon}</span>}
                          {project && (
                            <span 
                              className="text-xs font-bold px-2 py-1 rounded-md text-white shadow-sm truncate max-w-[40%]"
                              style={{ backgroundColor: project.color }}
                            >
                              {project.name}
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wide rounded-full flex-shrink-0 ${getPriorityColor(task.priority)}`}>
                            {getPriorityLabel(task.priority)}
                          </span>
                        </div>
                      </div>
                      
                      <h3 className="font-semibold text-base text-gray-900 dark:text-slate-100 mb-2 leading-snug">
                        {task.title}
                      </h3>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 dark:text-slate-400 mb-3 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {task.tags.map(t => (
                            <span 
                              key={t} 
                              className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded border border-gray-200 dark:border-slate-600"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 pt-3 mt-3 gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {user?.photoURL ? (
                              <img src={user.photoURL} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <span className="text-[9px] font-bold text-gray-500 dark:text-slate-400">
                                {user ? getInitials(user.displayName || user.email) : '?'}
                              </span>
                            )}
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium truncate min-w-0 ${getStatusColor(task.status)}`}>
                            {getStatusLabel(task.status)}
                          </div>
                        </div>
                        <div className="flex items-center text-xs text-gray-400 dark:text-slate-500 font-medium flex-shrink-0">
                          {task.startDate && isStart && (
                            <span className="flex items-center gap-1">
                              <Play className="w-3 h-3" />
                              <span>Начало: {formatMoscowDate(task.startDate, { day: 'numeric', month: 'short' })}</span>
                            </span>
                          )}
                          {task.dueDate && isEnd && (
                            <span className="flex items-center gap-1">
                              <Flag className="w-3 h-3" />
                              <span>Срок: {formatMoscowDate(task.dueDate, { day: 'numeric', month: 'short' })}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
