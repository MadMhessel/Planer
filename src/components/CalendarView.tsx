import React, { useMemo, useState } from 'react';
import { Task } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCreateTask: (dateIso: string) => void;
};

export const CalendarView: React.FC<Props> = ({
  tasks,
  onTaskClick,
  onCreateTask
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();

    for (const t of tasks) {
      const dateStrings = new Set<string>();

      if (t.startDate) {
        dateStrings.add(t.startDate.slice(0, 10));
      }
      if (t.dueDate) {
        dateStrings.add(t.dueDate.slice(0, 10));
      }

      for (const ds of dateStrings) {
        const arr = map.get(ds) || [];
        arr.push(t);
        map.set(ds, arr);
      }
    }

    return map;
  }, [tasks]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0–11
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthLabel = currentDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  });

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handlePrevMonth = () => {
    const d = new Date(year, month - 1, 1);
    setCurrentDate(d);
  };

  const handleNextMonth = () => {
    const d = new Date(year, month + 1, 1);
    setCurrentDate(d);
  };

  const buildIso = (day: number) => {
    const d = new Date(year, month, day);
    return d.toISOString().slice(0, 10);
  };

  const getTasksForDate = (iso: string): Task[] => {
    return tasksByDate.get(iso) || [];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-full border border-slate-700 hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-full border border-slate-700 hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold text-slate-100">
            {monthLabel}
          </h2>
        </div>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="px-3 py-1.5 text-xs rounded-md border border-slate-600 hover:bg-slate-800"
        >
          Сегодня
        </button>
      </div>

      <div className="grid grid-cols-7 text-[11px] text-slate-400">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
          <div key={d} className="px-1 py-1 text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-[2px] bg-slate-800/60 p-[2px] rounded-xl">
        {daysArray.map(day => {
          const iso = buildIso(day);
          const dayTasks = getTasksForDate(iso);
          const hasTasks = dayTasks.length > 0;

          return (
            <button
              key={day}
              type="button"
              onClick={() => onCreateTask(iso)}
              className={
                'min-h-[72px] flex flex-col items-stretch rounded-md bg-slate-900/80 border border-slate-800 text-left px-1 py-1 text-[11px] ' +
                (hasTasks ? 'hover:border-sky-500/70' : 'hover:border-slate-600')
              }
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100 text-xs">
                  {day}
                </span>
                {hasTasks && (
                  <span className="text-[10px] text-slate-400">
                    {dayTasks.length}
                  </span>
                )}
              </div>

              <div className="mt-1 space-y-0.5">
                {dayTasks.slice(0, 3).map(task => (
                  <div
                    key={task.id}
                    onClick={e => {
                      e.stopPropagation();
                      onTaskClick(task);
                    }}
                    className="truncate px-1 py-[2px] rounded bg-slate-800 text-[10px] text-slate-100"
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-[10px] text-slate-500">
                    + ещё {dayTasks.length - 3}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
