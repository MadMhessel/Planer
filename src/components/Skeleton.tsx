// Легкий Skeleton компонент для оптимизации CLS
// Фиксированные размеры предотвращают layout shift
import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  lines?: number;
}

// Базовый skeleton элемент
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = false,
}) => {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`bg-gray-200 dark:bg-slate-700 animate-pulse ${rounded ? 'rounded' : ''} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

// Skeleton для карточек задач
export const TaskCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
    <Skeleton height={20} width="70%" rounded />
    <Skeleton height={16} width="100%" rounded />
    <div className="flex gap-2">
      <Skeleton height={24} width={80} rounded />
      <Skeleton height={24} width={100} rounded />
    </div>
  </div>
);

// Skeleton для Kanban колонок
export const KanbanSkeleton: React.FC = () => (
  <div className="flex gap-4 overflow-x-auto pb-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex-shrink-0 w-72 space-y-3">
        <Skeleton height={40} width="100%" rounded />
        {[1, 2, 3].map((j) => (
          <TaskCardSkeleton key={j} />
        ))}
      </div>
    ))}
  </div>
);

// Skeleton для списка задач
export const TaskListSkeleton: React.FC = () => (
  <div className="space-y-2">
    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
      <div key={i} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton height={20} width="60%" rounded />
            <div className="flex gap-2">
              <Skeleton height={24} width={80} rounded />
              <Skeleton height={24} width={100} rounded />
            </div>
          </div>
          <Skeleton height={32} width={32} rounded />
        </div>
      </div>
    ))}
  </div>
);

// Skeleton для Dashboard
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Stats cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6">
          <Skeleton height={16} width="60%" rounded className="mb-4" />
          <Skeleton height={40} width="40%" rounded />
        </div>
      ))}
    </div>
    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6">
        <Skeleton height={24} width="50%" rounded className="mb-4" />
        <Skeleton height={300} width="100%" rounded />
      </div>
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6">
        <Skeleton height={24} width="50%" rounded className="mb-4" />
        <Skeleton height={300} width="100%" rounded />
      </div>
    </div>
  </div>
);

// Skeleton для Calendar
export const CalendarSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4">
    <div className="flex justify-between items-center mb-4">
      <Skeleton height={32} width={200} rounded />
      <div className="flex gap-2">
        <Skeleton height={32} width={32} rounded />
        <Skeleton height={32} width={32} rounded />
      </div>
    </div>
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 35 }).map((_, i) => (
        <Skeleton key={i} height={80} width="100%" rounded />
      ))}
    </div>
  </div>
);

// Skeleton для Gantt
export const GanttSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4">
    <div className="flex justify-between items-center mb-4">
      <Skeleton height={32} width={200} rounded />
      <div className="flex gap-2">
        <Skeleton height={32} width={32} rounded />
        <Skeleton height={32} width={32} rounded />
      </div>
    </div>
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton height={40} width={200} rounded />
          <Skeleton height={40} width="100%" rounded />
        </div>
      ))}
    </div>
  </div>
);

// Skeleton для Settings
export const SettingsSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6">
      <Skeleton height={32} width="30%" rounded className="mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={48} width="100%" rounded />
        ))}
      </div>
    </div>
  </div>
);

