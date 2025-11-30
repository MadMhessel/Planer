
import React, { useState } from 'react';
import { Task, Project, User, TaskStatus } from '../types';
import { MoreHorizontal, Plus, Edit, Trash2, X } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: TaskStatus.TODO, title: 'К выполнению', color: 'bg-gray-200' },
  { id: TaskStatus.IN_PROGRESS, title: 'В работе', color: 'bg-blue-200' },
  { id: TaskStatus.REVIEW, title: 'На проверке', color: 'bg-purple-200' },
  { id: TaskStatus.DONE, title: 'Готово', color: 'bg-green-200' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, projects, users, onTaskClick, onStatusChange, onEditTask, onDeleteTask }) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
        onStatusChange(taskId, status);
    }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    // Container with snap scrolling for mobile
    <div 
        className="flex h-full overflow-x-auto overflow-y-hidden pb-4 gap-4 md:gap-6 snap-x snap-mandatory px-0.5 md:px-0 scrollbar-hide"
        onClick={() => setActiveMenuId(null)} // Close menus on outside click
    >
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter(t => t.status === col.id);
        
        return (
          <div 
            key={col.id} 
            className="flex-shrink-0 w-[80vw] md:w-80 flex flex-col max-h-full snap-center bg-gray-100/50 md:bg-gray-100 rounded-xl border border-gray-200/60 md:border-transparent"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column Header */}
            <div className="p-3 md:p-4 flex justify-between items-center bg-white md:bg-gray-50 rounded-t-xl border-b border-gray-200 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                 <div className={`w-3 h-3 rounded-full ${col.color}`} />
                 <h3 className="font-bold text-sm text-gray-700">{col.title}</h3>
                 <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-medium">{colTasks.length}</span>
              </div>
            </div>
            
            {/* Tasks Area */}
            <div className="p-2 md:p-3 flex-1 overflow-y-auto space-y-3 min-h-0">
              {colTasks.map(task => {
                const project = projects.find(p => p.id === task.projectId);
                const user = users.find(u => u.id === task.assigneeId);
                const isMenuOpen = activeMenuId === task.id;
                
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-all active:scale-95 group relative select-none"
                  >
                    <div className="flex justify-between items-start mb-2">
                      {project ? (
                         <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white" style={{ backgroundColor: project.color }}>
                            {project.name}
                         </span>
                      ) : <span />}
                      
                      {/* Context Menu Trigger */}
                      <div className="relative">
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(isMenuOpen ? null : task.id);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          
                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditTask(task);
                                        setActiveMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 text-left"
                                >
                                    <Edit size={12} /> Редактировать
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Удалить задачу?')) onDeleteTask(task.id);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 text-left border-t border-gray-50"
                                >
                                    <Trash2 size={12} /> Удалить
                                </button>
                            </div>
                          )}
                      </div>
                    </div>
                    
                    <div onClick={() => onEditTask(task)} className="cursor-pointer">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3 leading-snug">{task.title}</h4>
                        
                        <div className="flex justify-between items-end">
                            <div className="flex items-center -space-x-1.5">
                                {user ? (
                                    user.avatar ? (
                                        <img src={user.avatar} className="w-6 h-6 rounded-full border-2 border-white" alt={user.name} title={user.name} />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-indigo-700" title={user.name}>
                                            {getInitials(user.name)}
                                        </div>
                                    )
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] text-gray-400">?</div>
                                )}
                            </div>
                            <div className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                                new Date(task.dueDate) < new Date() ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-500 border-gray-100'
                            }`}>
                                {new Date(task.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </div>
                        </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Empty State */}
              {colTasks.length === 0 && (
                  <div className="h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 text-sm bg-gray-50/50">
                      <span className="text-xs">Нет задач</span>
                  </div>
              )}
            </div>
             
             {/* Footer Action */}
             <div className="p-3">
                <button 
                    onClick={() => onEditTask({ status: col.id } as Task)} // Pass partial task to pre-fill status
                    className="w-full py-2 flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 hover:bg-white hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-gray-200"
                >
                    <Plus size={16} /> Добавить задачу
                </button>
            </div>
          </div>
        );
      })}
       {/* Spacer for end of scroll */}
       <div className="w-4 flex-shrink-0 md:hidden" />
    </div>
  );
};
