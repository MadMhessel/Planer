import { useState, useEffect, useCallback } from 'react';
import { User, Workspace } from '../types';
import { FirestoreService } from '../services/firestore';
import { StorageService } from '../services/storage';
import { logger } from '../utils/logger';

export const useWorkspace = (currentUser: User | null) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setWorkspaces([]);
      setCurrentWorkspaceId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const unsubscribe = FirestoreService.subscribeToWorkspaces(currentUser, (ws) => {
        setWorkspaces(ws);

        // Если нет выбранной рабочей области, выбираем сохраненную или первую доступную
        setCurrentWorkspaceId(prev => {
          // Если уже есть выбранная и она все еще в списке, оставляем её
          if (prev && ws.find(w => w.id === prev)) {
            return prev;
          }
          
          // Иначе выбираем сохраненную или первую доступную
          if (ws.length > 0) {
            const saved = StorageService.getSelectedWorkspaceId();
            const found = ws.find(x => x.id === saved) || ws[0];
            // Сохраняем выбранную рабочую область
            StorageService.setSelectedWorkspaceId(found.id);
            return found.id;
          }
          
          return null;
        });
        
        setLoading(false);
      });

      return () => {
        unsubscribe();
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load workspaces');
      logger.error('Failed to subscribe to workspaces', error);
      setError(error);
      setLoading(false);
    }
  }, [currentUser]);

  const handleWorkspaceChange = useCallback((workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId);
    StorageService.setSelectedWorkspaceId(workspaceId);
  }, []);

  const handleCreateWorkspace = useCallback(async (name: string) => {
    if (!currentUser) {
      throw new Error('Пользователь не авторизован');
    }

    try {
      const workspace = await FirestoreService.createWorkspace(name, currentUser);
      setCurrentWorkspaceId(workspace.id);
      return workspace;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Не удалось создать рабочее пространство');
      logger.error('Failed to create workspace', error);
      throw error;
    }
  }, [currentUser]);

  return {
    workspaces,
    currentWorkspaceId,
    loading,
    error,
    handleWorkspaceChange,
    handleCreateWorkspace
  };
};

