import React, { useMemo, useState, useEffect } from 'react';
import { Task, TaskStatus } from '../types';
import { ChevronLeft, ChevronRight, Play, Flag, CheckCircle2 } from 'lucide-react';
import { getMoscowDateString, formatMoscowDate } from '../utils/dateUtils';

type Props = {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCreateTask: (dateIso: string) => void;
  onDateClick: (dateIso: string) => void;
};

export const CalendarView: React.FC<Props> = ({
  tasks,
  onTaskClick,
  onCreateTask,
  onDateClick
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const tasksByDate = useMemo(() => {
    // Используем Map с информацией о типе даты (start/end)
    const map = new Map<string, { task: Task; isStart: boolean; isEnd: boolean }[]>();

    for (const t of tasks) {
      if (t.startDate) {
        const startDateStr = t.startDate.slice(0, 10);
        const arr = map.get(startDateStr) || [];
        arr.push({ task: t, isStart: true, isEnd: t.dueDate ? t.dueDate.slice(0, 10) === startDateStr : false });
        map.set(startDateStr, arr);
      }
      if (t.dueDate) {
        const dueDateStr = t.dueDate.slice(0, 10);
        // Добавляем задачу в дату окончания только если это не та же дата, что и начало
        if (!t.startDate || t.startDate.slice(0, 10) !== dueDateStr) {
          const arr = map.get(dueDateStr) || [];
          arr.push({ task: t, isStart: false, isEnd: true });
          map.set(dueDateStr, arr);
        }
      }
    }

    return map;
  }, [tasks]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0–11
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthLabel = formatMoscowDate(currentDate, {
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
    // Создаем дату напрямую в формате YYYY-MM-DD без конвертации через UTC
    // Это избегает смещения из-за часовых поясов
    const yearStr = year;
    const monthStr = String(month + 1).padStart(2, '0'); // month 0-11, нужно +1
    const dayStr = String(day).padStart(2, '0');
    return `${yearStr}-${monthStr}-${dayStr}`;
  };

  const getTasksForDate = (iso: string): { task: Task; isStart: boolean; isEnd: boolean }[] => {
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
          const isToday = iso === getMoscowDateString();

          return (
            <button
              key={day}
              type="button"
              onClick={() => onDateClick(iso)}
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
                {dayTasks.slice(0, (typeof window !== 'undefined' && window.innerWidth < 768) ? 2 : 3).map(({ task, isStart, isEnd }) => {
                  const isDone = task.status === TaskStatus.DONE;
                  
                  // Определяем стиль в зависимости от типа даты
                  let bgColor = 'bg-sky-50 dark:bg-slate-800/80';
                  let borderColor = 'border-sky-200 dark:border-slate-700/50';
                  let icon = null;
                  let iconColor = 'text-sky-600 dark:text-sky-400';
                  
                  if (isDone) {
                    // Задача выполнена - зеленый цвет
                    bgColor = 'bg-green-50 dark:bg-green-900/30';
                    borderColor = 'border-green-300 dark:border-green-700/50';
                    icon = <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />;
                    iconColor = 'text-green-600 dark:text-green-400';
                  } else if (isStart && isEnd) {
                    // Задача начинается и заканчивается в один день
                    bgColor = 'bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-900/30 dark:to-sky-900/30';
                    borderColor = 'border-emerald-300 dark:border-emerald-700/50';
                    iconColor = 'text-emerald-600 dark:text-emerald-400';
                  } else if (isStart) {
                    // Начало задачи
                    bgColor = 'bg-emerald-50 dark:bg-emerald-900/30';
                    borderColor = 'border-emerald-300 dark:border-emerald-700/50';
                    icon = <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3" />;
                    iconColor = 'text-emerald-600 dark:text-emerald-400';
                  } else if (isEnd) {
                    // Конец задачи
                    bgColor = 'bg-orange-50 dark:bg-orange-900/30';
                    borderColor = 'border-orange-300 dark:border-orange-700/50';
                    icon = <Flag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />;
                    iconColor = 'text-orange-600 dark:text-orange-400';
                  }
                  
                  return (
                    <div
                      key={task.id}
                      onClick={e => {
                        e.stopPropagation();
                        onTaskClick(task);
                      }}
                      className={`truncate px-1 sm:px-2 py-0.5 sm:py-1 rounded-md ${bgColor} backdrop-blur-sm border ${borderColor} text-[9px] sm:text-[10px] font-medium hover:opacity-80 cursor-pointer transition-all shadow-sm flex items-center gap-1 ${
                        isDone ? 'opacity-75' : ''
                      }`}
                      title={`${task.title}${isStart ? ' (начало)' : ''}${isEnd ? ' (окончание)' : ''}${isDone ? ' ✓ Готово' : ''}`}
                    >
                      {icon && <span className={`${iconColor} flex-shrink-0`}>{icon}</span>}
                      <span className={`truncate flex-1 ${isDone ? 'line-through text-gray-500 dark:text-slate-400' : 'text-gray-900 dark:text-slate-100'}`}>
                        {task.title}
                      </span>
                    </div>
                  );
                })}
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
