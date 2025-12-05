import { useState, useEffect, useCallback } from 'react';
import { Project, WorkspaceMember, User } from '../types';
import { projectRepository } from '../infrastructure/firestore/ProjectRepository';
import { ProjectNotificationsService } from '../infrastructure/notifications/ProjectNotificationsService';
import { validateProject } from '../utils/validators';
import { logger } from '../utils/logger';

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
      const unsubscribe = projectRepository.subscribeToProjects(workspaceId, (newProjects) => {
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
      // Создаем объект проекта, исключая undefined значения
      // НЕ включаем createdAt и updatedAt - они будут добавлены в ProjectRepository.createProject
      const projectData: any = {
        name: partial.name || 'Новый проект',
        description: partial.description || '',
        color: partial.color || '#3b82f6',
        ownerId: currentUser.id,
        status: partial.status || 'ACTIVE',
        workspaceId: workspaceId
      };

      // Добавляем опциональные поля только если они определены
      if (partial.startDate) {
        projectData.startDate = partial.startDate;
      }
      if (partial.endDate) {
        projectData.endDate = partial.endDate;
      }

      const created = await projectRepository.createProject(projectData);
      
      // Обрабатываем уведомления через сервис
      await ProjectNotificationsService.onProjectCreated({
        workspaceId,
        project: created,
        members,
        currentUser
      });

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
      await projectRepository.updateProject(projectId, updates);
      
      // Обрабатываем уведомления через сервис
      const updatedProject = { ...oldProject, ...updates } as Project;
      await ProjectNotificationsService.onProjectUpdated({
        workspaceId,
        project: updatedProject,
        oldProject,
        updates,
        members,
        currentUser
      });
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
      await projectRepository.deleteProject(projectId);
      
      // Обрабатываем уведомления через сервис
      await ProjectNotificationsService.onProjectDeleted({
        workspaceId,
        project: projectToDelete,
        members,
        currentUser
      });
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

