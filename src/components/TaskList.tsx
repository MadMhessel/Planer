import React, { useState, useMemo } from 'react';
import { Task, Project, User, TaskStatus, TaskPriority } from '../types';
import { Clock, User as UserIcon, Calendar, Hash, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
  onTaskClick: (task: Task) => void;
  onEditTask: (task: Task) => void;
}

const getPriorityColor = (p: TaskPriority) => {
  switch(p) {
    case TaskPriority.CRITICAL: return 'text-red-700 bg-red-50 border border-red-200';
    case TaskPriority.HIGH: return 'text-orange-700 bg-orange-50 border border-orange-200';
    case TaskPriority.NORMAL: return 'text-blue-700 bg-blue-50 border border-blue-200';
    default: return 'text-gray-600 bg-gray-50 border border-gray-200';
  }
};

const getStatusColor = (s: TaskStatus) => {
    switch(s) {
        case TaskStatus.DONE: return 'bg-green-100 text-green-800';
        case TaskStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800';
        case TaskStatus.REVIEW: return 'bg-purple-100 text-purple-800';
        case TaskStatus.HOLD: return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

const translateStatus = (s: TaskStatus) => {
    switch(s) {
        case TaskStatus.TODO: return 'К выполнению';
        case TaskStatus.IN_PROGRESS: return 'В работе';
        case TaskStatus.REVIEW: return 'На проверке';
        case TaskStatus.DONE: return 'Готово';
        case TaskStatus.HOLD: return 'Отложено';
        default: return s;
    }
};

const translatePriority = (p: TaskPriority) => {
    switch(p) {
        case TaskPriority.LOW: return 'Низкий';
        case TaskPriority.NORMAL: return 'Обычный';
        case TaskPriority.HIGH: return 'Высокий';
        case TaskPriority.CRITICAL: return 'Критический';
        default: return p;
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
    <div 
      onClick={() => onTaskClick(task)}
      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 active:scale-[0.99] transition-transform"
    >
      <div className="flex justify-between items-start mb-2">
          {project ? (
              <span className="text-[10px] font-bold px-2 py-1 rounded-md text-white shadow-sm" style={{ backgroundColor: project.color }}>
              {project.name}
              </span>
          ) : <span />}
          <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full ${getPriorityColor(task.priority)}`}>
              {translatePriority(task.priority)}
          </span>
      </div>
      
      <h3 className="font-semibold text-gray-900 mb-1 leading-snug">{task.title}</h3>
      
      <div className="flex flex-wrap gap-1 mb-3">
           {task.tags.map(t => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded border border-gray-200">#{t}</span>
          ))}
      </div>

      <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-2">
          <div className="flex items-center gap-2">
               <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                    {user?.avatar ? (
                        <img src={user.avatar} className="w-full h-full object-cover"/>
                    ) : (
                        <span className="text-[9px] font-bold text-gray-500">{user ? getInitials(user.name) : '?'}</span>
                    )}
               </div>
               <div className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                  {translateStatus(task.status)}
               </div>
          </div>
          <div className="flex items-center text-xs text-gray-400 font-medium">
              <Calendar size={14} className="mr-1" />
              {new Date(task.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </div>
      </div>
    </div>
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
      <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-xl shadow-sm border border-gray-200">
         <div className="flex items-center gap-2 text-sm text-gray-600">
             <span className="hidden sm:inline font-medium">Сортировка:</span>
             <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-gray-50 border-transparent focus:border-indigo-500 focus:ring-0 rounded-lg py-1.5 px-3 text-sm cursor-pointer hover:bg-gray-100 transition-colors"
             >
                 <option value="dueDate">По сроку</option>
                 <option value="priority">По приоритету</option>
                 <option value="status">По статусу</option>
                 <option value="title">По названию</option>
             </select>
             <button 
                onClick={toggleSortOrder}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                title={sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
             >
                 {sortOrder === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
             </button>
         </div>
         <div className="text-xs text-gray-400 font-medium">
             {tasks.length} задач
         </div>
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-2 pb-20">
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
      <div className="hidden md:block overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200 flex-1">
        <div className="overflow-x-auto h-full">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Название</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Проект</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Статус</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Исполнитель</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Срок</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Приоритет</th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                {sortedTasks.map((task) => {
                    const project = projects.find(p => p.id === task.projectId);
                    const user = users.find(u => u.id === task.assigneeId);
                    
                    return (
                    <tr 
                        key={task.id} 
                        onClick={() => onEditTask(task)}
                        className="hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                    >
                        <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{task.title}</div>
                            {task.tags.length > 0 && (
                                <div className="flex gap-1 mt-1.5">
                                    {task.tags.map(t => (
                                        <span key={t} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded border border-gray-200">#{t}</span>
                                    ))}
                                </div>
                            )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        {project ? (
                            <span className="px-2.5 py-1 inline-flex text-xs font-medium rounded-md shadow-sm text-white" style={{ backgroundColor: project.color }}>
                            {project.name}
                            </span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 inline-flex text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                                {translateStatus(task.status)}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                                <div className="flex-shrink-0 h-7 w-7">
                                {user?.avatar ? (
                                    <img className="h-7 w-7 rounded-full border border-gray-200" src={user.avatar} alt="" />
                                ) : (
                                    <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
                                        <span className="text-[10px] font-bold text-indigo-700">{user ? getInitials(user.name) : '?'}</span>
                                    </div>
                                )}
                                </div>
                                <div className="ml-3 text-sm text-gray-600">{user?.name || '—'}</div>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-500">
                                {new Date(task.dueDate).toLocaleDateString('ru-RU')}
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${getPriorityColor(task.priority)}`}>
                                {translatePriority(task.priority)}
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