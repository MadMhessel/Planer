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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">
            {project ? 'Редактировать проект' : 'Новый проект'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название проекта</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
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

          <div className="flex justify-between items-center pt-4">
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
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                     >
                         <Trash2 size={16} /> Удалить
                     </button>
                 )}
             </div>
             <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
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