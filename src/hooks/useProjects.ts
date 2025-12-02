import { useState, useEffect, useCallback } from 'react';
import { Project, WorkspaceMember, User } from '../types';
import { FirestoreService } from '../services/firestore';
import { TelegramService } from '../services/telegram';
import { validateProject } from '../utils/validators';
import { createTelegramMessage, getAllTelegramRecipients } from '../utils/notificationHelpers';
import { logger } from '../utils/logger';
import { Notification } from '../types';

export const useProjects = (
  workspaceId: string | null,
  members: WorkspaceMember[],
  currentUser: User | null
) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setProjects([]);
      return;
    }

    try {
      const unsubscribe = FirestoreService.subscribeToProjects(workspaceId, (newProjects) => {
        setProjects(newProjects);
      });

      return () => {
        unsubscribe();
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load projects');
      logger.error('Failed to subscribe to projects', error);
      setError(error);
    }
  }, [workspaceId]);

  const addProject = useCallback(async (partial: Partial<Project>) => {
    if (!workspaceId || !currentUser) {
      throw new Error('Workspace или пользователь не выбраны');
    }

    // Валидация
    const validation = validateProject(partial);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
        name: partial.name || 'Новый проект',
        description: partial.description || '',
        color: partial.color,
        ownerId: currentUser.id,
        createdAt: now,
        updatedAt: now,
        startDate: partial.startDate,
        endDate: partial.endDate,
        status: partial.status || 'ACTIVE',
        workspaceId: workspaceId
      };

      const created = await FirestoreService.createProject(project);
      
      // Уведомления
({
        id: Date.now().toString(),
        type: 'PROJECT_UPDATED',
        title: 'Проект создан',
        message: `Проект "${created.name}" был создан`,
        createdAt: new Date().toISOString(),
        read: false
      });

      const recipients = getAllTelegramRecipients(members);
      if (recipients.length > 0) {
        const message = createTelegramMessage('PROJECT_CREATED', created);
        await TelegramService.sendNotification(recipients, message);
      }

      return created;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Не удалось создать проект');
      logger.error('Failed to create project', error);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [workspaceId, currentUser, members, ]);

  const updateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
    if (!workspaceId || !currentUser) {
      throw new Error('Workspace или пользователь не выбраны');
    }

    const oldProject = projects.find(p => p.id === projectId);
    if (!oldProject) {
      throw new Error('Проект не найден');
    }

    // Валидация
    const validation = validateProject({ ...oldProject, ...updates });
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    setLoading(true);
    setError(null);

    try {
      await FirestoreService.updateProject(projectId, updates);
      
      // Уведомления
({
        id: Date.now().toString(),
        type: 'PROJECT_UPDATED',
        title: 'Проект обновлен',
        message: `Проект "${oldProject.name}" был обновлен`,
        createdAt: new Date().toISOString(),
        read: false
      });

      const recipients = getAllTelegramRecipients(members);
      if (recipients.length > 0 && (updates.name || updates.description || updates.status)) {
        const updatedProject = { ...oldProject, ...updates } as Project;
        const message = createTelegramMessage('PROJECT_UPDATED', updatedProject, updates);
        await TelegramService.sendNotification(recipients, message);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Не удалось обновить проект');
      logger.error('Failed to update project', error);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [workspaceId, currentUser, projects, members, ]);

  const deleteProject = useCallback(async (projectId: string) => {
    if (!workspaceId || !currentUser) {
      throw new Error('Workspace или пользователь не выбраны');
    }

    const projectToDelete = projects.find(p => p.id === projectId);
    if (!projectToDelete) {
      throw new Error('Проект не найден');
    }

    setLoading(true);
    setError(null);

    try {
      await FirestoreService.deleteProject(projectId);
      
      // Уведомления
({
        id: Date.now().toString(),
        type: 'PROJECT_UPDATED',
        title: 'Проект удален',
        message: `Проект "${projectToDelete.name}" был удален`,
        createdAt: new Date().toISOString(),
        read: false
      });

      const recipients = getAllTelegramRecipients(members);
      if (recipients.length > 0) {
        const message = createTelegramMessage('PROJECT_DELETED', projectToDelete);
        await TelegramService.sendNotification(recipients, message);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Не удалось удалить проект');
      logger.error('Failed to delete project', error);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [workspaceId, currentUser, projects, members, ]);

  return {
    projects,
    loading,
    error,
    addProject,
    updateProject,
    deleteProject
  };
};

