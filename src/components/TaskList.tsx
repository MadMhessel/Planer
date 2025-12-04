import React, { useState, useMemo } from 'react';
import { Task, Project, User, TaskStatus, TaskPriority } from '../types';
import { Clock, User as UserIcon, Calendar, Hash, ArrowUpDown, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { getPriorityLabel, getPriorityColor, getStatusLabel, getStatusColor } from '../utils/taskHelpers';
import { getMoscowISOString, formatMoscowDate } from '../utils/dateUtils';

interface TaskListProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
  onTaskClick: (task: Task) => void;
  onEditTask: (task: Task) => void;
}

// Используем централизованные утилиты из taskHelpers
// Для TaskList используется другой стиль приоритета (для таблицы)
const getPriorityColorForTable = (p: TaskPriority) => {
  switch(p) {
    case TaskPriority.CRITICAL: return 'text-red-700 bg-red-50 border border-red-200 dark:text-red-300 dark:bg-red-900/30 dark:border-red-700';
    case TaskPriority.HIGH: return 'text-orange-700 bg-orange-50 border border-orange-200 dark:text-orange-300 dark:bg-orange-900/30 dark:border-orange-700';
    case TaskPriority.NORMAL: return 'text-blue-700 bg-blue-50 border border-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-700';
    default: return 'text-gray-600 bg-gray-50 border border-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-600';
  }
};

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

interface TaskCardProps {
  task: Task;
  projects: Project[];
  users: User[];
  onTaskClick: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, projects, users, onTaskClick }) => {
  const project = projects.find(p => p.id === task.projectId);
  const user = users.find(u => u.id === task.assigneeId);
  
  return (
    <button
      type="button"
      onClick={() => onTaskClick(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTaskClick(task);
        }
      }}
      className="bg-white dark:bg-slate-800/80 backdrop-blur-sm p-2.5 sm:p-3 md:p-4 rounded-xl shadow-md border border-gray-100 dark:border-slate-700/50 mb-2 sm:mb-3 active:scale-[0.98] transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer w-full max-w-full overflow-hidden touch-manipulation text-left focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
      aria-label={`Задача: ${task.title}. Статус: ${getStatusLabel(task.status)}. Приоритет: ${getPriorityLabel(task.priority)}${task.description ? `. ${task.description}` : ''}`}
    >
      <div className="flex justify-between items-start mb-2 gap-2">
          {project ? (
              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-white shadow-sm truncate max-w-[40%]" style={{ backgroundColor: project.color }}>
              {project.name}
              </span>
          ) : <span />}
          <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide rounded-full flex-shrink-0 ${getPriorityColorForTable(task.priority)}`}>
              {getPriorityLabel(task.priority)}
          </span>
      </div>
      
      <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-slate-100 mb-1 leading-snug line-clamp-2">{task.title}</h3>
      
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3 overflow-hidden">
          {task.tags.map(t => (
            <span key={t} className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded border border-gray-200 dark:border-slate-600">#{t}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-50 dark:border-slate-700 pt-1.5 sm:pt-2 md:pt-3 mt-1.5 sm:mt-2 gap-1.5 sm:gap-2 min-w-0">
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 min-w-0 flex-1">
               <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user?.photoURL ? (
                        <img src={user.photoURL} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <span className="text-[7px] sm:text-[8px] md:text-[9px] font-bold text-gray-500 dark:text-slate-400">{user ? getInitials(user.displayName || user.email) : '?'}</span>
                    )}
               </div>
               <div className={`px-1 sm:px-1.5 md:px-2 py-0.5 rounded text-[9px] sm:text-[10px] md:text-xs font-medium truncate min-w-0 ${getStatusColor(task.status)}`}>
                  {getStatusLabel(task.status)}
               </div>
          </div>
          <div className="flex items-center text-[9px] sm:text-[10px] md:text-xs text-gray-400 dark:text-slate-500 font-medium flex-shrink-0">
              {task.dueDate && (
                <>
                  <Calendar size={10} className="sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                  <span className="whitespace-nowrap">{formatMoscowDate(task.dueDate, { day: 'numeric', month: 'short' })}</span>
                </>
              )}
          </div>
      </div>
    </button>
  );
};

type SortOption = 'dueDate' | 'priority' | 'status' | 'title';

export const TaskList: React.FC<TaskListProps> = ({ tasks, projects, users, onTaskClick, onEditTask }) => {
  const [sortBy, setSortBy] = useState<SortOption>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const priorityWeight = {
      [TaskPriority.CRITICAL]: 4,
      [TaskPriority.HIGH]: 3,
      [TaskPriority.NORMAL]: 2,
      [TaskPriority.LOW]: 1
  };

  const statusWeight = {
      [TaskStatus.TODO]: 1,
      [TaskStatus.IN_PROGRESS]: 2,
      [TaskStatus.REVIEW]: 3,
      [TaskStatus.HOLD]: 4,
      [TaskStatus.DONE]: 5
  };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
        let diff = 0;
        switch (sortBy) {
            case 'dueDate':
                diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                break;
            case 'priority':
                diff = priorityWeight[b.priority] - priorityWeight[a.priority]; // Default High to Low
                break;
            case 'status':
                diff = statusWeight[a.status] - statusWeight[b.status];
                break;
            case 'title':
                diff = a.title.localeCompare(b.title);
                break;
        }
        return sortOrder === 'asc' ? diff : -diff;
    });
  }, [tasks, sortBy, sortOrder]);

  const toggleSortOrder = () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0 mb-3 sm:mb-4 bg-white dark:bg-slate-800/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700/50 w-full max-w-full overflow-x-hidden">
         <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 dark:text-slate-300 min-w-0 flex-1">
             <span className="hidden sm:inline font-semibold whitespace-nowrap">Сортировка:</span>
             <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 focus:border-indigo-500 dark:focus:border-sky-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-sky-500/20 rounded-lg py-1.5 sm:py-2 px-2 sm:px-3 text-xs sm:text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-all font-medium flex-1 sm:flex-none min-w-0"
             >
                 <option value="dueDate">По сроку</option>
                 <option value="priority">По приоритету</option>
                 <option value="status">По статусу</option>
                 <option value="title">По названию</option>
             </select>
             <button 
                type="button"
                onClick={toggleSortOrder}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 flex-shrink-0 touch-manipulation min-h-[36px] sm:min-h-[40px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                title={sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
                aria-label={`${sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}. Нажмите для изменения порядка сортировки`}
                aria-pressed={sortOrder === 'desc'}
             >
                 {sortOrder === 'asc' ? <ArrowUp size={16} className="sm:w-[18px] sm:h-[18px]" aria-hidden="true" /> : <ArrowDown size={16} className="sm:w-[18px] sm:h-[18px]" aria-hidden="true" />}
             </button>
         </div>
         <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
           <div className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 font-semibold whitespace-nowrap">
               {tasks.length} {tasks.length === 1 ? 'задача' : tasks.length < 5 ? 'задачи' : 'задач'}
           </div>
           <button
             type="button"
             onClick={() => onEditTask({
               id: '',
               title: '',
               status: TaskStatus.TODO,
               createdAt: getMoscowISOString(),
               updatedAt: getMoscowISOString(),
               workspaceId: '',
               priority: TaskPriority.NORMAL
             } as Task)}
             className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:scale-95 touch-manipulation whitespace-nowrap flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
             aria-label="Создать новую задачу"
           >
             <Plus size={14} className="sm:w-4 sm:h-4" aria-hidden="true" />
             <span className="hidden xs:inline">Новая задача</span>
             <span className="xs:hidden">Создать</span>
           </button>
         </div>
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-2 pb-20 w-full max-w-full overflow-x-hidden">
        {sortedTasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            projects={projects}
            users={users}
            onTaskClick={onEditTask}
          />
        ))}
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block overflow-hidden bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-slate-700/50 flex-1">
        <div className="overflow-x-auto h-full">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700/50" role="table" aria-label="Список задач">
                <thead className="bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900 sticky top-0 z-10 border-b border-gray-200 dark:border-slate-700/50">
                <tr role="row">
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Название</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Проект</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Статус</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Исполнитель</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Срок</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Приоритет</th>
                </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900/50 divide-y divide-gray-100 dark:divide-slate-800/50">
                {sortedTasks.map((task) => {
                    const project = projects.find(p => p.id === task.projectId);
                    const user = users.find(u => u.id === task.assigneeId);
                    
                    return (
                    <tr 
                        key={task.id} 
                        onClick={() => onEditTask(task)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onEditTask(task);
                          }
                        }}
                        className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/60 cursor-pointer transition-all group focus-within:bg-indigo-50/30 dark:focus-within:bg-slate-800/60 focus-within:outline-none focus-within:ring-2 focus-within:ring-sky-500 focus-within:ring-inset"
                        role="row"
                        tabIndex={0}
                        aria-label={`Задача: ${task.title}. Статус: ${getStatusLabel(task.status)}. Приоритет: ${getPriorityLabel(task.priority)}. Нажмите Enter или Space для редактирования`}
                    >
                        <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-gray-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-sky-400 transition-colors">{task.title}</div>
                            {task.tags && task.tags.length > 0 && (
                                <div className="flex gap-1.5 mt-2">
                                    {task.tags.map(t => (
                                        <span key={t} className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-slate-700/50 text-gray-600 dark:text-slate-300 rounded-md border border-gray-200 dark:border-slate-600/50 font-medium">#{t}</span>
                                    ))}
                                </div>
                            )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        {project ? (
                            <span className="px-3 py-1.5 inline-flex text-xs font-semibold rounded-lg shadow-md text-white" style={{ backgroundColor: project.color }}>
                            {project.name}
                            </span>
                        ) : <span className="text-gray-400 dark:text-slate-500 text-xs">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1.5 inline-flex text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                                {getStatusLabel(task.status)}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                {user?.photoURL ? (
                                    <img className="h-8 w-8 rounded-full border-2 border-gray-200 dark:border-slate-600 shadow-md" src={user.photoURL} alt="" />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center border-2 border-indigo-300 dark:border-indigo-600 shadow-md">
                                        <span className="text-[11px] font-bold text-white">{user ? getInitials(user.displayName || user.email) : '?'}</span>
                                    </div>
                                )}
                                </div>
                                <div className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-200">{user ? (user.displayName || user.email) : '—'}</div>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm font-medium text-gray-600 dark:text-slate-300">
                                {task.dueDate ? formatMoscowDate(task.dueDate) : '—'}
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1.5 text-xs font-bold rounded-lg border shadow-sm ${getPriorityColorForTable(task.priority)}`}>
                                {getPriorityLabel(task.priority)}
                            </span>
                        </td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};