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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700 animate-scale-in">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900">
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
            {project ? 'Редактировать проект' : 'Новый проект'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-all text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white dark:bg-slate-900">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Название проекта</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-800 dark:text-slate-100 transition-all"
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
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Краткое описание..."
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-slate-700">
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
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-2"
                     >
                         <Trash2 size={16} /> Удалить
                     </button>
                 )}
             </div>
             <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-all font-medium"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 font-semibold"
                >
                  <Save size={18} /> Сохранить
                </button>
             </div>
          </div>
        </form>
      </div>
    </div>
  );
};