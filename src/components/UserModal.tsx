
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, Save, Trash2, User as UserIcon, Mail, Shield, Upload, ImageIcon } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  onDelete: (userId: string) => void;
  user?: User | null;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  user
}) => {
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'MEMBER',
    avatar: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({ ...user });
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'MEMBER',
        avatar: ''
      });
    }
  }, [user, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    onSave({
      ...formData,
      id: user?.id || Math.random().toString(36).substr(2, 9),
    } as User);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transition-colors">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            {user ? 'Редактировать профиль' : 'Пригласить пользователя'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Имя пользователя</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full pl-10 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Иван Иванов"
              />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
             <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-10 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="name@company.com"
                />
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Роль</label>
            <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                    className="w-full pl-10 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                >
                    <option value="MEMBER">Участник</option>
                    <option value="ADMIN">Администратор</option>
                    <option value="OWNER">Владелец</option>
                    <option value="GUEST">Гость</option>
                </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Аватар</label>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={20} className="text-gray-400" />
                )}
              </div>
              <label className="flex-1 cursor-pointer">
                <div className="w-full px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Upload size={16} />
                  <span>Загрузить фото</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1 ml-16">PNG, JPG до 1MB (сохраняется в профиле)</p>
          </div>

          <div className="flex justify-between items-center pt-4">
             <div>
                 {user && (
                     <button
                        type="button"
                        onClick={() => {
                            if (confirm('Удалить пользователя?')) {
                                onDelete(user.id);
                                // onClose is handled by parent to prevent race condition
                            }
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                     >
                         <Trash2 size={16} /> Удалить
                     </button>
                 )}
             </div>
             <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
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
