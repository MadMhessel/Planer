import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { X, Save, Trash2 } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  onDelete: (projectId: string) => void;
  project?: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  project
}) => {
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    description: '',
    color: '#3b82f6'
  });

  useEffect(() => {
    if (project) {
      setFormData({ 
          ...project,
          description: project.description || '' 
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
      });
    }
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    onSave({
      ...formData,
      id: project?.id || Math.random().toString(36).substr(2, 9),
    } as Project);
    onClose();
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className={`bg-white dark:bg-slate-900 shadow-2xl w-full ${
        isMobile 
          ? 'h-full rounded-none flex flex-col' 
          : 'max-w-md rounded-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-slate-700 animate-scale-in'
      }`}>
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {project ? 'Редактировать проект' : 'Новый проект'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 bg-white dark:bg-slate-900">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Название проекта</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 transition-all"
              placeholder="Например, Редизайн сайта"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Цвет</label>
            <div className="flex items-center gap-3">
                <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className="h-10 w-20 rounded cursor-pointer border-0 p-0"
                />
                <span className="text-sm text-gray-500 uppercase">{formData.color}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <textarea
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 sm:px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 resize-none"
              placeholder="Краткое описание..."
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-slate-700 sticky bottom-0 z-10 bg-white dark:bg-slate-900 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4 sm:pb-0">
             <div>
                 {project && (
                     <button
                        type="button"
                        onClick={() => {
                            if (confirm('Удалить проект? Все задачи проекта останутся, но потеряют привязку.')) {
                                onDelete(project.id);
                                onClose();
                            }
                        }}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 sm:px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-2"
                     >
                         <Trash2 size={16} /> <span className="hidden sm:inline">Удалить</span>
                     </button>
                 )}
             </div>
             <div className="flex gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all font-medium"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-lg hover:from-sky-600 hover:to-indigo-700 transition-all shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40 font-semibold text-sm sm:text-base"
                >
                  <Save size={16} className="sm:w-[18px] sm:h-[18px]" /> Сохранить
                </button>
             </div>
          </div>
        </form>
      </div>
    </div>
  );
};