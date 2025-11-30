import React, { useState } from 'react';
import { Workspace, User } from '../types';
import { Plus, Users, ChevronDown, Check, LogOut } from 'lucide-react';
import { inviteUserToWorkspace, createWorkspace } from '../services/firestore';

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onSelect: (ws: Workspace) => void;
  currentUser: User;
  onLogout: () => void;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  workspaces,
  currentWorkspace,
  onSelect,
  currentUser,
  onLogout
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName) return;
    try {
      await createWorkspace(newWsName, currentUser);
      setIsCreating(false);
      setNewWsName('');
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      alert('Ошибка создания рабочей области');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inviteEmail || !currentWorkspace) return;
      try {
          await inviteUserToWorkspace(currentWorkspace.id, inviteEmail);
          alert(`Приглашение отправлено пользователю ${inviteEmail}`);
          setInviteEmail('');
      } catch (e) {
          console.error(e);
          alert('Ошибка приглашения');
      }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full"
      >
        <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold">
          {currentWorkspace?.name?.[0] || '+'}
        </div>
        <div className="flex-1 text-left hidden md:block">
            <p className="text-sm font-bold text-gray-800 dark:text-white truncate">
                {currentWorkspace?.name || 'Нет команды'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Рабочая область
            </p>
        </div>
        <ChevronDown size={16} className="text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-fade-in">
           <div className="max-h-60 overflow-y-auto">
               {workspaces.map(ws => (
                   <button
                     key={ws.id}
                     onClick={() => { onSelect(ws); setIsOpen(false); }}
                     className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                   >
                       <span className="font-medium text-gray-700 dark:text-gray-200">{ws.name}</span>
                       {ws.id === currentWorkspace?.id && <Check size={16} className="text-indigo-600" />}
                   </button>
               ))}
           </div>

           <div className="p-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                {!isCreating ? (
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600"
                    >
                        <Plus size={16} /> Создать команду
                    </button>
                ) : (
                    <form onSubmit={handleCreate} className="p-2">
                        <input 
                            autoFocus
                            className="w-full px-3 py-1.5 text-sm border rounded mb-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Название команды"
                            value={newWsName}
                            onChange={e => setNewWsName(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <button type="submit" className="bg-indigo-600 text-white px-3 py-1 rounded text-xs">OK</button>
                            <button onClick={() => setIsCreating(false)} className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs">Отмена</button>
                        </div>
                    </form>
                )}
           </div>
           
           {currentWorkspace && (
               <div className="p-3 border-t border-gray-100 dark:border-gray-700">
                   <p className="text-xs font-bold text-gray-500 mb-2">ПРИГЛАСИТЬ УЧАСТНИКА</p>
                   <form onSubmit={handleInvite} className="flex gap-2">
                       <input 
                         className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                         placeholder="email@example.com"
                         value={inviteEmail}
                         onChange={e => setInviteEmail(e.target.value)}
                       />
                       <button type="submit" className="bg-indigo-100 text-indigo-700 p-1.5 rounded hover:bg-indigo-200">
                           <Users size={16} />
                       </button>
                   </form>
               </div>
           )}

           <div className="border-t border-gray-100 dark:border-gray-700">
               <button 
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
               >
                   <LogOut size={16} /> Выйти из аккаунта
               </button>
           </div>
        </div>
      )}
    </div>
  );
};