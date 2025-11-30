import React, { useEffect, useMemo, useState } from 'react';
import { Task, TaskPriority, TaskStatus, Project, User } from '../types';
import { Plus, MoreHorizontal } from 'lucide-react';

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

  const priorityLabel = (p: TaskPriority) => {
    switch (p) {
      case TaskPriority.LOW:
        return 'Низкий';
      case TaskPriority.NORMAL:
        return 'Обычный';
      case TaskPriority.HIGH:
        return 'Высокий';
      case TaskPriority.CRITICAL:
        return 'Критичный';
      default:
        return p;
    }
  };

  const priorityColor = (p: TaskPriority) => {
    switch (p) {
      case TaskPriority.LOW:
        return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/60';
      case TaskPriority.NORMAL:
        return 'bg-slate-800 text-slate-200 border-slate-600/70';
      case TaskPriority.HIGH:
        return 'bg-amber-900/40 text-amber-300 border-amber-700/60';
      case TaskPriority.CRITICAL:
        return 'bg-red-900/50 text-red-300 border-red-700/80';
      default:
        return 'bg-slate-800 text-slate-200 border-slate-600/70';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100">
          Канбан-доска
        </h2>
        <button
          onClick={onCreateTask}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-sky-500 text-slate-900 font-medium hover:bg-sky-400"
        >
          <Plus className="w-3 h-3" />
          <span>Новая задача</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-3">
        {columns.map(col => (
          <div
            key={col.id}
            className={
              'flex flex-col rounded-xl bg-slate-900/70 border border-slate-700 min-h-[120px]' +
              (dragOverColumn === col.id
                ? ' ring-1 ring-sky-500/70'
                : '')
            }
            onDragOver={handleDragOver(col.id)}
            onDrop={handleDrop(col.id)}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 text-xs">
              <span className="font-semibold text-slate-100">
                {col.title}
              </span>
              <span className="text-[11px] text-slate-400">
                {tasksByStatus[col.id].length}
              </span>
            </div>

            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {tasksByStatus[col.id].map(task => (
                <div
                  key={task.id}
                  className={
                    'rounded-lg border px-2 py-2 text-xs bg-slate-900/90 cursor-pointer ' +
                    (draggedTaskId === task.id && !isTouchDevice
                      ? 'opacity-60'
                      : 'hover:border-sky-500/70')
                  }
                  draggable={!isTouchDevice}
                  onDragStart={handleDragStart(task.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onTaskClick(task)}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="font-medium text-slate-100 line-clamp-2">
                      {task.title}
                    </div>
                    {/* Меню "ещё" — для тач-версии будет "Move to" */}
                    <div className="relative shrink-0">
                      <MoreHorizontal className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>

                  {task.description && (
                    <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {task.projectId && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-200">
                        {getProjectName(task.projectId)}
                      </span>
                    )}

                    {task.assigneeId && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-200">
                        {getUserShort(task.assigneeId)}
                      </span>
                    )}

                    <span
                      className={
                        'ml-auto px-2 py-0.5 rounded-full border text-[10px] ' +
                        priorityColor(task.priority)
                      }
                    >
                      {priorityLabel(task.priority)}
                    </span>
                  </div>

                  {/* Для тач-устройств — явное управление статусом без drag'n'drop */}
                  {isTouchDevice && (
                    <div className="mt-2">
                      <label className="text-[10px] text-slate-400">
                        Переместить:
                      </label>
                      <select
                        value={task.status}
                        onChange={e =>
                          onStatusChange(task, e.target.value as TaskStatus)
                        }
                        className="mt-1 w-full px-2 py-1 rounded-md bg-slate-900 border border-slate-700 text-[11px]"
                      >
                        {columns.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}

              {tasksByStatus[col.id].length === 0 && (
                <div className="text-[11px] text-slate-500 text-center py-3">
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
