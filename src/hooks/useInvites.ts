import { useState, useEffect } from 'react';
import { WorkspaceInvite } from '../types';
import { FirestoreService } from '../services/firestore';
import { logger } from '../utils/logger';

export const useInvites = (workspaceId: string | null) => {
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setInvites([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const unsubscribe = FirestoreService.subscribeToInvites(workspaceId, (newInvites) => {
        setInvites(newInvites);
        setLoading(false);
      });

      return () => {
        unsubscribe();
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load invites');
      logger.error('Failed to subscribe to invites', error);
      setError(error);
      setLoading(false);
    }
  }, [workspaceId]);

  return {
    invites,
    loading,
    error
  };
};

