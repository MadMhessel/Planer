import React, { useMemo, useState, useEffect } from 'react';
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
    <div className="space-y-3 sm:space-y-4 w-full max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 sm:p-2 rounded-lg border border-gray-300 dark:border-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-800/80 hover:border-gray-400 dark:hover:border-slate-600 transition-all text-gray-700 dark:text-slate-300 flex-shrink-0"
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 sm:p-2 rounded-lg border border-gray-300 dark:border-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-800/80 hover:border-gray-400 dark:hover:border-slate-600 transition-all text-gray-700 dark:text-slate-300 flex-shrink-0"
            aria-label="Следующий месяц"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-slate-100 bg-gradient-to-r from-sky-500 to-indigo-600 dark:from-sky-400 dark:to-indigo-400 bg-clip-text text-transparent ml-1 sm:ml-2 truncate min-w-0">
            {monthLabel}
          </h2>
        </div>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border border-gray-300 dark:border-slate-600/50 hover:bg-gray-100 dark:hover:bg-slate-800/80 hover:border-gray-400 dark:hover:border-slate-500 transition-all font-medium text-gray-700 dark:text-slate-300 flex-shrink-0 whitespace-nowrap"
        >
          Сегодня
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-[10px] sm:text-[11px] text-gray-600 dark:text-slate-400 w-full max-w-full">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
          <div key={d} className="px-1 py-1 text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2 bg-gray-50 dark:bg-slate-900/40 backdrop-blur-sm p-2 sm:p-3 rounded-xl border border-gray-200 dark:border-slate-700/30 w-full max-w-full overflow-x-hidden">
        {daysArray.map(day => {
          const iso = buildIso(day);
          const dayTasks = getTasksForDate(iso);
          const hasTasks = dayTasks.length > 0;
          const isToday = iso === new Date().toISOString().slice(0, 10);

          return (
            <button
              key={day}
              type="button"
              onClick={() => onCreateTask(iso)}
              className={
                'min-h-[60px] sm:min-h-[80px] flex flex-col items-stretch rounded-lg bg-white dark:bg-slate-800/60 backdrop-blur-sm border text-left px-1 sm:px-2 py-1 sm:py-2 text-[10px] sm:text-[11px] transition-all shadow-sm sm:shadow-md hover:shadow-lg hover:-translate-y-0.5 w-full overflow-hidden ' +
                (isToday 
                  ? 'border-sky-500/50 bg-sky-50 dark:bg-sky-900/20 ring-1 ring-sky-500/30' 
                  : 'border-gray-300 dark:border-slate-700/50 hover:border-gray-400 dark:hover:border-slate-600/50') +
                (hasTasks ? ' hover:border-sky-500/70' : '')
              }
            >
              <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                <span className="font-semibold text-gray-900 dark:text-slate-100 text-[10px] sm:text-xs">
                  {day}
                </span>
                {hasTasks && (
                  <span className="text-[9px] sm:text-[10px] text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 rounded-full px-1 sm:px-1.5 min-w-[16px] text-center">
                    {dayTasks.length}
                  </span>
                )}
              </div>

              <div className="mt-0.5 sm:mt-1.5 space-y-0.5 sm:space-y-1 flex-1 min-h-0 overflow-hidden">
                {dayTasks.slice(0, (typeof window !== 'undefined' && window.innerWidth < 768) ? 2 : 3).map(task => (
                  <div
                    key={task.id}
                    onClick={e => {
                      e.stopPropagation();
                      onTaskClick(task);
                    }}
                    className="truncate px-1 sm:px-2 py-0.5 sm:py-1 rounded-md bg-sky-50 dark:bg-slate-800/80 backdrop-blur-sm border border-sky-200 dark:border-slate-700/50 text-[9px] sm:text-[10px] text-gray-900 dark:text-slate-100 font-medium hover:bg-sky-100 dark:hover:bg-slate-700/80 hover:border-sky-500/50 cursor-pointer transition-all shadow-sm"
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > ((typeof window !== 'undefined' && window.innerWidth < 768) ? 2 : 3) && (
                  <div className="text-[9px] sm:text-[10px] text-gray-500 dark:text-slate-500 font-semibold px-1 sm:px-2">
                    +{dayTasks.length - ((typeof window !== 'undefined' && window.innerWidth < 768) ? 2 : 3)}
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
