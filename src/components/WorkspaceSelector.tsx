import React from 'react';
import { Workspace } from '../types';

type Props = {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  onWorkspaceChange: (id: string) => void;
  onCreateWorkspace: (name: string) => void;
};

export const WorkspaceSelector: React.FC<Props> = ({
  workspaces,
  currentWorkspaceId,
  onWorkspaceChange,
  onCreateWorkspace
}) => {
  const handleCreate = () => {
    const name = window.prompt('Название нового рабочего пространства');
    if (name && name.trim()) {
      onCreateWorkspace(name.trim());
    }
  };

  if (workspaces.length === 0) {
    return (
      <div className="mb-4 p-4 rounded-xl border border-dashed border-slate-600/50 bg-slate-900/60 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-100 mb-1">Нет рабочих пространств</p>
            <p className="text-xs text-slate-400">
              Создайте первое пространство, чтобы добавить задачи и проекты.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold hover:from-sky-600 hover:to-indigo-700 shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/40 transition-all hover:-translate-y-0.5"
          >
            + Создать пространство
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-slate-900/40 backdrop-blur-sm border border-slate-700/30">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-slate-400">Рабочее пространство:</span>
        <select
          className="bg-slate-800/80 border border-slate-700/50 rounded-lg text-sm px-3 py-1.5 focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all font-medium"
          value={currentWorkspaceId || ''}
          onChange={e => onWorkspaceChange(e.target.value)}
        >
          {workspaces.map(w => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={handleCreate}
        className="self-start sm:self-auto px-4 py-2 text-sm rounded-lg border border-slate-600/50 hover:bg-slate-800/80 hover:border-slate-500 transition-all font-medium"
      >
        + Новое пространство
      </button>
    </div>
  );
};
