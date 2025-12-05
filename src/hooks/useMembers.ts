import { useState, useEffect } from 'react';
import { WorkspaceMember } from '../types';
import { FirestoreService } from '../services/firestore';
import { logger } from '../utils/logger';

export const useMembers = (workspaceId: string | null) => {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const unsubscribe = FirestoreService.subscribeToMembers(workspaceId, (newMembers) => {
        logger.info('[useMembers] Members loaded', {
          workspaceId,
          membersCount: newMembers.length,
          memberIds: newMembers.map(m => m.userId),
          memberEmails: newMembers.map(m => m.email)
        });
        setMembers(newMembers);
        setLoading(false);
      });

      return () => {
        unsubscribe();
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load members');
      logger.error('Failed to subscribe to members', error);
      setError(error);
      setLoading(false);
    }
  }, [workspaceId]);

  return {
    members,
    loading,
    error
  };
};

