
import React, { useMemo, useState, useEffect } from 'react';
import { Task, Project } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface GanttChartProps {
  tasks: Task[];
  projects: Project[];
  onTaskClick: (task: Task) => void;
  onEditTask: (task: Task) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({ tasks, projects, onTaskClick, onEditTask }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  
  // Инициализируем viewDate на основе задач при первой загрузке
  useEffect(() => {
    if (!hasUserScrolled && tasks.length > 0) {
      const taskDates = tasks
        .filter(t => t.startDate || t.dueDate)
        .map(t => {
          if (t.startDate) return new Date(t.startDate);
          if (t.dueDate) return new Date(t.dueDate);
          return null;
        })
        .filter((d): d is Date => d !== null);
      
      if (taskDates.length > 0) {
        const minDate = new Date(Math.min(...taskDates.map(d => d.getTime())));
        setViewDate(minDate);
      }
    }
  }, [tasks, hasUserScrolled]);
  
  // Сортируем задачи: сначала по дате начала, затем по приоритету
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Задачи с датами идут первыми
      const aHasDate = !!(a.startDate || a.dueDate);
      const bHasDate = !!(b.startDate || b.dueDate);
      
      if (aHasDate && !bHasDate) return -1;
      if (!aHasDate && bHasDate) return 1;
      
      // Если обе имеют даты, сортируем по дате начала
      if (aHasDate && bHasDate) {
        const aStart = a.startDate ? new Date(a.startDate).getTime() : (a.dueDate ? new Date(a.dueDate).getTime() : Infinity);
        const bStart = b.startDate ? new Date(b.startDate).getTime() : (b.dueDate ? new Date(b.dueDate).getTime() : Infinity);
        if (aStart !== bStart) return aStart - bStart;
      }
      
      // Затем по приоритету
      const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'NORMAL': 2, 'LOW': 3 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      // В конце по названию
      return a.title.localeCompare(b.title);
    });
  }, [tasks]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Settings based on device
  const dayWidth = isMobile ? 30 : 40;
  const daysToShow = isMobile ? 14 : 30;
  
  // Вычисляем startDate на основе viewDate (для прокрутки)
  // startDate всегда сдвигается вместе с viewDate
  const startDate = useMemo(() => {
    const viewDateStart = new Date(viewDate);
    viewDateStart.setHours(0, 0, 0, 0);
    
    // Начинаем за несколько дней до viewDate, чтобы показать контекст
    const daysBeforeView = Math.floor(daysToShow / 3);
    const baseDate = new Date(viewDateStart);
    baseDate.setDate(baseDate.getDate() - daysBeforeView);
    baseDate.setHours(0, 0, 0, 0);
    
    return baseDate;
  }, [viewDate, daysToShow]);

  const dates = useMemo(() => {
    const arr = [];
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [startDate, daysToShow]);

  const getTaskStyle = (task: Task) => {
    // Определяем даты начала и окончания
    let start: Date | null = null;
    let end: Date | null = null;
    
    if (task.startDate) {
      start = new Date(task.startDate);
      start.setHours(0, 0, 0, 0);
    }
    
    if (task.dueDate) {
      end = new Date(task.dueDate);
      end.setHours(23, 59, 59, 999);
    }
    
    // Если нет дат, не показываем задачу
    if (!start && !end) {
      return {
        display: 'none' as const,
      };
    }
    
    // Если есть только одна дата, используем её для обеих
    if (!start && end) {
      start = new Date(end);
      start.setHours(0, 0, 0, 0);
    }
    if (start && !end) {
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
    }
    
    if (!start || !end) {
      return {
        display: 'none' as const,
      };
    }
    
    // Нормализуем startDate (начало дня)
    const chartStart = new Date(startDate);
    chartStart.setHours(0, 0, 0, 0);
    
    // Вычисляем количество дней от начала календаря до начала задачи
    const diffTimeStart = start.getTime() - chartStart.getTime();
    const diffDaysStart = Math.floor(diffTimeStart / (1000 * 60 * 60 * 24));
    
    // Вычисляем длительность в днях (включая начальный и конечный день)
    // Нормализуем обе даты до начала дня для правильного вычисления
    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    
    // Вычисляем разницу в днях между датами (без учета времени)
    const diffDays = Math.floor((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
    // Добавляем 1, чтобы включить оба дня (начальный и конечный)
    const durationDays = Math.max(1, diffDays + 1);
    
    // Позиция и ширина в пикселях
    const left = diffDaysStart * dayWidth;
    const width = durationDays * dayWidth;
    
    // Если задача выходит за пределы видимой области, корректируем
    const maxLeft = dates.length * dayWidth;
    if (left < 0) {
      // Задача начинается до видимой области
      return {
        left: '0px',
        width: `${Math.max(0, width + left)}px`,
        backgroundColor: '#ccc',
        opacity: 0.5,
      };
    }
    
    if (left > maxLeft) {
      // Задача начинается после видимой области
      return {
        display: 'none' as const,
      };
    }

    const project = projects.find(p => p.id === task.projectId);
    const priorityColors: Record<string, string> = {
      'CRITICAL': '#ef4444',
      'HIGH': '#f59e0b',
      'NORMAL': '#3b82f6',
      'LOW': '#10b981',
    };

    return {
      left: `${left}px`,
      width: `${Math.min(width, maxLeft - left)}px`,
      backgroundColor: project?.color || priorityColors[task.priority] || '#6b7280',
      minWidth: '20px', // Минимальная ширина для видимости
    };
  };

  const handleScroll = (amt: number) => {
    const newDate = new Date(viewDate);
    newDate.setDate(newDate.getDate() + amt);
    setViewDate(newDate);
    setHasUserScrolled(true);
  };

  // Вычисляем месяц и год на основе центра видимой области или viewDate
  const currentMonthYear = useMemo(() => {
    // Используем дату в центре видимой области для отображения месяца
    const centerDate = new Date(startDate);
    centerDate.setDate(centerDate.getDate() + Math.floor(daysToShow / 2));
    return centerDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }, [startDate, daysToShow]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-slate-700/50 overflow-hidden pb-20 md:pb-0">
      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700/50 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
             <h2 className="font-bold text-gray-800 dark:text-slate-100 text-base md:text-lg bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">Временная шкала</h2>
             <span className="text-xs md:text-sm font-semibold text-indigo-600 dark:text-indigo-400 capitalize bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg border border-indigo-200 dark:border-indigo-700/50">
                {currentMonthYear}
             </span>
        </div>
        
        <div className="flex gap-2">
            <button onClick={() => handleScroll(-7)} className="p-2 bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg shadow-md hover:shadow-lg transition-all text-gray-600 dark:text-slate-300">
                <ChevronLeft size={18}/>
            </button>
            <button onClick={() => {
              setViewDate(new Date());
              setHasUserScrolled(true);
            }} className="text-xs font-semibold px-4 py-2 bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg shadow-md hover:shadow-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-all text-gray-700 dark:text-slate-200">
                Сегодня
            </button>
            <button onClick={() => handleScroll(7)} className="p-2 bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg shadow-md hover:shadow-lg transition-all text-gray-600 dark:text-slate-300">
                <ChevronRight size={18}/>
            </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (Task Names) - Hidden on very small screens or reduced */}
        <div className="w-24 md:w-48 flex-shrink-0 border-r border-gray-200 bg-white sticky left-0 z-20 overflow-y-hidden select-none">
            <div className="h-10 border-b border-gray-200 bg-gray-50 font-semibold text-xs text-gray-500 flex items-center px-3">
                Задача
            </div>
            {sortedTasks.map(task => (
                <div 
                    key={task.id} 
                    onClick={() => onEditTask(task)}
                    className="h-12 border-b border-gray-50 flex items-center px-3 text-xs md:text-sm text-gray-700 font-medium truncate bg-white cursor-pointer hover:bg-gray-50 transition-colors" 
                    title={task.title}
                >
                    <span className="truncate">{task.title}</span>
                </div>
            ))}
        </div>

        {/* Timeline Area */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
            <div className="relative min-w-full" style={{ width: `${dates.length * dayWidth}px` }}>
                {/* Header Days */}
                <div className="flex h-10 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                    {dates.map((d, i) => (
                        <div 
                            key={i} 
                            className={`flex-shrink-0 border-r border-gray-200 flex flex-col items-center justify-center text-[10px] md:text-xs ${
                                d.getDay() === 0 || d.getDay() === 6 ? 'bg-gray-100/50' : ''
                            }`}
                            style={{ width: `${dayWidth}px` }}
                        >
                            <span className={`font-bold ${d.toDateString() === new Date().toDateString() ? 'text-indigo-600' : 'text-gray-700'}`}>
                                {d.getDate()}
                            </span>
                            <span className="text-gray-400">{d.toLocaleDateString('ru-RU', { weekday: 'short'})}</span>
                        </div>
                    ))}
                </div>

                {/* Grid Lines & Bars Container */}
                <div className="relative">
                    {/* Vertical Background Lines */}
                    <div className="absolute top-0 bottom-0 left-0 right-0 flex pointer-events-none">
                        {dates.map((d, i) => (
                            <div 
                                key={i} 
                                className={`flex-shrink-0 border-r border-gray-100 h-full ${
                                    d.getDay() === 0 || d.getDay() === 6 ? 'bg-gray-50/50' : ''
                                }`}
                                style={{ width: `${dayWidth}px` }}
                            />
                        ))}
                    </div>

                    {/* Today Line */}
                    {(() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const chartStart = new Date(startDate);
                      chartStart.setHours(0, 0, 0, 0);
                      const diffDays = Math.floor((today.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24));
                      const todayLeft = diffDays * dayWidth;
                      
                      // Показываем линию только если она в видимой области
                      if (todayLeft >= 0 && todayLeft <= dates.length * dayWidth) {
                        return (
                          <div 
                              className="absolute top-0 bottom-0 border-l-2 border-red-500 z-10 opacity-60 pointer-events-none"
                              style={{ 
                                  left: `${todayLeft}px`
                              }} 
                          />
                        );
                      }
                      return null;
                    })()}

                    {/* Tasks Rows */}
                    <div className="relative pt-0">
                        {sortedTasks
                          .filter(task => {
                            // Фильтруем задачи без дат или с датами вне видимой области
                            const style = getTaskStyle(task);
                            return style.display !== 'none';
                          })
                          .map((task) => {
                            const style = getTaskStyle(task);
                            return (
                              <div key={task.id} className="h-12 border-b border-gray-50 relative flex items-center group">
                                  <div 
                                      onClick={() => onEditTask(task)}
                                      className="absolute h-6 rounded-md shadow-sm text-[10px] text-white flex items-center px-2 whitespace-nowrap overflow-hidden cursor-pointer hover:brightness-110 hover:shadow-md transition-all z-10"
                                      style={style}
                                      title={`${task.title}${task.startDate ? ` (${new Date(task.startDate).toLocaleDateString('ru-RU')}` : ''}${task.dueDate ? ` - ${new Date(task.dueDate).toLocaleDateString('ru-RU')})` : ''}`}
                                  >
                                      {!isMobile && <span className="truncate font-medium">{task.title}</span>}
                                      {isMobile && style.width && parseFloat(style.width as string) > 40 && (
                                        <span className="truncate font-medium">{task.title}</span>
                                      )}
                                  </div>
                              </div>
                            );
                          })}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
