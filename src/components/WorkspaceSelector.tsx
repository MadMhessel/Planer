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
      <div className="mb-3 p-3 rounded-xl border border-dashed border-slate-600 bg-slate-900/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Нет рабочих пространств</p>
            <p className="text-xs text-slate-400">
              Создайте первое пространство, чтобы добавить задачи и проекты.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-3 py-1.5 text-xs rounded-lg bg-sky-500 text-slate-900 font-medium hover:bg-sky-400"
          >
            + Создать пространство
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Рабочее пространство:</span>
        <select
          className="bg-slate-900 border border-slate-700 rounded-md text-xs px-2 py-1"
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
        className="self-start sm:self-auto px-3 py-1.5 text-xs rounded-lg border border-slate-600 hover:bg-slate-800"
      >
        + Новое пространство
      </button>
    </div>
  );
};
