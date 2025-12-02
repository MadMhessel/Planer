import React, { useEffect, useMemo, useState } from 'react';
import { Task, TaskPriority, TaskStatus, Project, User } from '../types';
import { Plus, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPriorityLabel, getPriorityColor } from '../utils/taskHelpers';

type Props = {
  tasks: Task[];
  projects: Project[];
  users: User[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  onCreateTask: () => void;
};

type Column = {
  id: TaskStatus;
  title: string;
};

const columns: Column[] = [
  { id: TaskStatus.TODO,        title: 'В планах' },
  { id: TaskStatus.IN_PROGRESS, title: 'В работе' },
  { id: TaskStatus.REVIEW,      title: 'На проверке' },
  { id: TaskStatus.HOLD,        title: 'Пауза' },
  { id: TaskStatus.DONE,        title: 'Готово' }
];

export const KanbanBoard: React.FC<Props> = ({
  tasks,
  projects,
  users,
  onTaskClick,
  onStatusChange,
  onCreateTask
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [currentColumnIndex, setCurrentColumnIndex] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const touch =
        ('ontouchstart' in window) ||
        (navigator as any).maxTouchPoints > 0;
      setIsTouchDevice(touch);
    }
  }, []);

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.REVIEW]: [],
      [TaskStatus.DONE]: [],
      [TaskStatus.HOLD]: []
    };

    for (const t of tasks) {
      if (map[t.status]) {
        map[t.status].push(t);
      }
    }

    return map;
  }, [tasks]);

  const getProjectName = (projectId?: string) => {
    if (!projectId) return '';
    const p = projects.find(p => p.id === projectId);
    return p?.name || '';
  };

  const getUserShort = (id?: string) => {
    if (!id) return '';
    const u = users.find(u => u.id === id);
    if (!u) return '';
    if (u.displayName) {
      const parts = u.displayName.split(' ');
      return parts[0];
    }
    return u.email;
  };

  const handleDragStart = (taskId: string) => (e: React.DragEvent) => {
    if (isTouchDevice) return;
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (col: TaskStatus) => (e: React.DragEvent) => {
    if (isTouchDevice) return;
    e.preventDefault();
    setDragOverColumn(col);
  };

  const handleDrop = (col: TaskStatus) => (e: React.DragEvent) => {
    if (isTouchDevice) return;
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!id) return;
    const task = tasks.find(t => t.id === id);
    if (!task || task.status === col) return;
    onStatusChange(task, col);
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };


  const currentColumn = columns[currentColumnIndex];
  const currentTasks = tasksByStatus[currentColumn.id] || [];

  // Mobile: Single column view with swipe
  const handlePrevColumn = () => {
    if (currentColumnIndex > 0) {
      setCurrentColumnIndex(prev => prev - 1);
    }
  };

  const handleNextColumn = () => {
    if (currentColumnIndex < columns.length - 1) {
      setCurrentColumnIndex(prev => prev + 1);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header - Hidden on mobile, shown on desktop */}
      <div className="hidden md:flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white bg-gradient-to-r from-sky-500 to-indigo-600 dark:from-sky-400 dark:to-indigo-400 bg-clip-text text-transparent">
          Канбан-доска
        </h2>
        <button
          onClick={onCreateTask}
          className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold hover:from-sky-600 hover:to-indigo-700 shadow-lg shadow-sky-500/30 transition-all hover:shadow-xl hover:shadow-sky-500/40 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          <span>Новая задача</span>
        </button>
      </div>

      {/* Mobile: Single Column View with Navigation */}
      <div className="md:hidden w-full max-w-full overflow-x-hidden">
        {/* Column Header with Navigation */}
        <div className="flex items-center justify-between mb-3 px-2 py-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 w-full">
          <button
            onClick={handlePrevColumn}
            disabled={currentColumnIndex === 0}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-slate-400 transition-all flex-shrink-0"
            aria-label="Предыдущая колонка"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="flex-1 text-center px-2 min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
              {currentColumn.title}
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">
              {currentColumnIndex + 1} из {columns.length} • {currentTasks.length} {currentTasks.length === 1 ? 'задача' : currentTasks.length < 5 ? 'задачи' : 'задач'}
            </p>
          </div>
          <button
            onClick={handleNextColumn}
            disabled={currentColumnIndex === columns.length - 1}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-slate-400 transition-all flex-shrink-0"
            aria-label="Следующая колонка"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Tasks List for Current Column */}
        <div className="space-y-2.5 pb-4 w-full max-w-full">
          {currentTasks.length > 0 ? currentTasks.map(task => (
            <div
              key={task.id}
              className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 sm:px-3 py-2 sm:py-2.5 text-xs shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98] w-full max-w-full overflow-hidden"
              onClick={() => onTaskClick(task)}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="font-medium text-gray-900 dark:text-slate-100 line-clamp-2 flex-1">
                  {task.title}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="relative shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                </button>
              </div>

              {task.description && (
                <p className="mt-1 text-[11px] text-gray-600 dark:text-slate-400 line-clamp-2">
                  {task.description}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-1">
                {task.projectId && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-[10px] text-gray-700 dark:text-slate-200">
                    {getProjectName(task.projectId)}
                  </span>
                )}

                {task.assigneeId && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-[10px] text-gray-700 dark:text-slate-200">
                    {getUserShort(task.assigneeId)}
                  </span>
                )}

                <span
                  className={`ml-auto px-2 py-0.5 rounded-full border text-[10px] ${getPriorityColor(task.priority)}`}
                >
                  {getPriorityLabel(task.priority)}
                </span>
              </div>

              {/* Status Selector for Mobile */}
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <label className="text-[10px] text-gray-500 dark:text-slate-400 mb-1 block">
                  Статус:
                </label>
                <select
                  value={task.status}
                  onChange={e => {
                    e.stopPropagation();
                    onStatusChange(task, e.target.value as TaskStatus);
                  }}
                  className="w-full px-2 py-1 rounded-md bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-[11px] text-gray-900 dark:text-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  {columns.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )) : (
            <div className="text-center py-8 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Нет задач</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">В этой колонке пока нет задач</p>
              <button
                onClick={onCreateTask}
                className="mt-3 px-4 py-2 text-xs rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-medium hover:from-sky-600 hover:to-indigo-700 transition-all shadow-sm"
              >
                Создать задачу
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: Full Grid View */}
      <div className="hidden md:grid grid-cols-5 gap-3 md:gap-4">
        {columns.map(col => (
          <div
            key={col.id}
            className={
              'flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 min-h-[200px] shadow-sm transition-all ' +
              (dragOverColumn === col.id
                ? ' ring-2 ring-sky-500/70 border-sky-500/50 shadow-sky-500/20'
                : 'hover:border-gray-300 dark:hover:border-slate-600')
            }
            onDragOver={handleDragOver(col.id)}
            onDrop={handleDrop(col.id)}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 rounded-t-xl">
              <span className="font-bold text-sm text-gray-900 dark:text-slate-100">
                {col.title}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300">
                {tasksByStatus[col.id].length}
              </span>
            </div>

            <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
              {tasksByStatus[col.id].map(task => (
                <div
                  key={task.id}
                  className={
                    'rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2.5 text-xs bg-white dark:bg-slate-800 cursor-pointer transition-all shadow-sm hover:shadow-md ' +
                    (draggedTaskId === task.id && !isTouchDevice
                      ? 'opacity-60 scale-95'
                      : 'hover:border-sky-500/70 hover:bg-gray-50 dark:hover:bg-slate-800/80 hover:-translate-y-0.5')
                  }
                  draggable={!isTouchDevice}
                  onDragStart={handleDragStart(task.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onTaskClick(task)}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="font-medium text-gray-900 dark:text-slate-100 line-clamp-2">
                      {task.title}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="relative shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                      title="Дополнительные действия"
                    >
                      <MoreHorizontal className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    </button>
                  </div>

                  {task.description && (
                    <p className="mt-1 text-[11px] text-gray-600 dark:text-slate-400 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {task.projectId && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-[10px] text-gray-700 dark:text-slate-200">
                        {getProjectName(task.projectId)}
                      </span>
                    )}

                    {task.assigneeId && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-[10px] text-gray-700 dark:text-slate-200">
                        {getUserShort(task.assigneeId)}
                      </span>
                    )}

                    <span
                      className={`ml-auto px-2 py-0.5 rounded-full border text-[10px] ${priorityColor(task.priority)}`}
                    >
                      {priorityLabel(task.priority)}
                    </span>
                  </div>
                </div>
              ))}

              {tasksByStatus[col.id].length === 0 && (
                <div className="text-[11px] text-gray-500 dark:text-slate-400 text-center py-3">
                  Нет задач
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
