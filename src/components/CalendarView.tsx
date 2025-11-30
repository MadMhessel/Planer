
import React from 'react';
import { Task, Project } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  projects: Project[];
  onTaskClick: (task: Task) => void;
  onEditTask: (task: Task) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, projects, onTaskClick, onEditTask }) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    // 0 - Воскресенье, делаем сдвиг чтобы Понедельник был 0 для рендера (если нужно), но пока стандартно
    // Стандарт JS: 0=Вс. Для Русского календаря (Пн-Вс): Пн=0..Вс=6.
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1; 
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getTasksForDay = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${d}`;
    return tasks.filter(t => t.dueDate === dateStr || t.startDate === dateStr);
  };

  const getTasksForMonth = () => {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      // Simple string match for month YYYY-MM
      const monthPrefix = `${year}-${month}`;
      return tasks.filter(t => t.dueDate.startsWith(monthPrefix)).sort((a,b) => a.dueDate.localeCompare(b.dueDate));
  }

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const monthTasks = getTasksForMonth();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col pb-20 md:pb-0">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-800 capitalize">
            {currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </h2>
        </div>
        <div className="flex gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
          <button onClick={prevMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600">
            <ChevronLeft size={20} />
          </button>
          <button onClick={nextMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Desktop Grid View */}
      <div className="hidden md:flex flex-col flex-1 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {weekDays.map(day => (
            <div key={day} className="py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">
                {day}
            </div>
            ))}
        </div>
        
        <div className="grid grid-cols-7 grid-rows-5 flex-1 overflow-y-auto">
            {emptyDays.map(d => (
                <div key={`empty-${d}`} className="bg-gray-50/30 border-r border-b border-gray-100" />
            ))}

            {days.map(day => {
            const dayTasks = getTasksForDay(day);
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
            
            return (
                <div key={day} className="bg-white p-1 border-r border-b border-gray-100 min-h-[100px] hover:bg-gray-50 transition-colors group relative">
                    <div className="flex justify-end p-1">
                        <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                            isToday ? 'bg-indigo-600 text-white' : 'text-gray-700'
                        }`}>
                            {day}
                        </span>
                    </div>
                
                    <div className="space-y-1 overflow-y-auto max-h-[80px]">
                        {dayTasks.map(task => {
                        const project = projects.find(p => p.id === task.projectId);
                        return (
                            <div 
                            key={task.id} 
                            onClick={() => onEditTask(task)}
                            className="text-[10px] px-2 py-1 rounded cursor-pointer truncate font-medium border-l-2 hover:opacity-80 transition-opacity"
                            style={{ 
                                backgroundColor: `${project?.color}15` || '#f3f4f6',
                                borderLeftColor: project?.color || '#9ca3af',
                                color: '#374151'
                            }}
                            title={task.title}
                            >
                            {task.title}
                            </div>
                        );
                        })}
                    </div>
                </div>
            );
            })}
        </div>
      </div>

      {/* Mobile Agenda View */}
      <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-4">
        {monthTasks.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
                <CalendarIcon size={48} className="mx-auto mb-2 opacity-20" />
                <p>Нет задач в этом месяце</p>
            </div>
        ) : (
            monthTasks.map(task => {
                const project = projects.find(p => p.id === task.projectId);
                const day = new Date(task.dueDate).getDate();
                const weekDay = new Date(task.dueDate).toLocaleDateString('ru-RU', { weekday: 'short' });
                
                return (
                    <div key={task.id} onClick={() => onEditTask(task)} className="flex gap-3 active:scale-95 transition-transform">
                        <div className="flex flex-col items-center min-w-[3.5rem] pt-1">
                             <span className="text-xl font-bold text-gray-800">{day}</span>
                             <span className="text-xs text-gray-400 uppercase font-medium">{weekDay}</span>
                        </div>
                        <div className="flex-1 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                             <div className="flex justify-between items-start mb-1">
                                <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">{task.title}</h4>
                                {project && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ml-2" style={{ background: project.color }} />}
                             </div>
                             <p className="text-xs text-gray-500 line-clamp-1">{task.description || 'Нет описания'}</p>
                        </div>
                    </div>
                )
            })
        )}
      </div>
    </div>
  );
};
