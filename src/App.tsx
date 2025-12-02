import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Layout } from './components/Layout';
import { TaskList } from './components/TaskList';
import { KanbanBoard } from './components/KanbanBoard';
import { CalendarView } from './components/CalendarView';
import { GanttChart } from './components/GanttChart';
import { Dashboard } from './components/Dashboard';
import { TaskModal } from './components/TaskModal';
import { ProjectModal } from './components/ProjectModal';
import { UserModal } from './components/UserModal';
import { SettingsView } from './components/SettingsView';
import { AuthView } from './components/AuthView';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { NotificationCenter } from './components/NotificationCenter';
import { AcceptInviteView } from './components/AcceptInviteView';
import { AICommandBar } from './components/AICommandBar';

import { AuthService } from './services/auth';
import { StorageService } from './services/storage';
import { GeminiService } from './services/gemini';
import { TelegramService } from './services/telegram';

import { Project, Task, TaskPriority, TaskStatus, User, ViewMode, Notification } from './types';

// Hooks
import { useWorkspace } from './hooks/useWorkspace';
import { useTasks } from './hooks/useTasks';
import { useProjects } from './hooks/useProjects';
import { useMembers } from './hooks/useMembers';
import { useInvites } from './hooks/useInvites';
import { logger } from './utils/logger';

type AppView =
  | 'BOARD'
  | 'CALENDAR'
  | 'GANTT'
  | 'LIST'
  | 'DASHBOARD'
  | 'SETTINGS';

type InviteContext = {
  workspaceId: string;
  token: string;
};

type ThemeMode = 'light' | 'dark' | 'system';

const App: React.FC = () => {
  console.log('📱 App component rendering...');
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [view, setView] = useState<AppView>('BOARD');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [inviteContext, setInviteContext] = useState<InviteContext | null>(null);
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    try {
      return StorageService.getTheme();
    } catch {
      return 'system';
    }
  });

  const applyTheme = useCallback((mode: ThemeMode) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    let finalTheme = mode;

    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      finalTheme = prefersDark ? 'dark' : 'light';
    }

    if (finalTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
    try {
      StorageService.setTheme(theme);
    } catch {
      // ignore storage errors (e.g., SSR)
    }
  }, [theme, applyTheme]);

  // Firebase и Auth инициализация
  useEffect(() => {
    console.log('🔐 Initializing Firebase and setting up auth listener...');
    let mounted = true;
    let unsubscribe: (() => void) | null = null;
    
    // Инициализируем Firebase и затем настраиваем auth listener
    import('./firebase').then(({ firebaseInit }) => {
      return firebaseInit;
    }).then(() => {
      if (!mounted) return;
      
      // После инициализации Firebase настраиваем auth listener
      unsubscribe = AuthService.subscribeToAuth(async (user) => {
        console.log('👤 Auth state changed:', user ? `User: ${user.email}` : 'No user');
        if (mounted) {
          try {
            setCurrentUser(user);
            setAuthLoading(false);
            console.log('✅ Auth state updated');
          } catch (error) {
            console.error('❌ Error setting user state:', error);
            if (mounted) {
              setAuthLoading(false);
            }
          }
        }
      });
    }).catch((error) => {
      console.error('❌ Failed to initialize Firebase:', error);
      if (mounted) {
        setAuthLoading(false);
      }
    });

    return () => {
      console.log('🧹 Cleaning up auth listener');
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Workspace hook
  const {
    workspaces,
    currentWorkspaceId,
    handleWorkspaceChange,
    handleCreateWorkspace
  } = useWorkspace(currentUser);

  // Members hook
  const { members } = useMembers(currentWorkspaceId);

  // Invites hook
  const { invites } = useInvites(currentWorkspaceId);

  // Projects hook
  const {
    projects,
    addProject,
    updateProject,
    deleteProject
  } = useProjects(
    currentWorkspaceId,
    members,
    currentUser,
    (notification) => setNotifications(prev => [notification, ...prev])
  );

  // Tasks hook
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask
  } = useTasks(
    currentWorkspaceId,
    members,
    projects,
    currentUser,
    (notification) => setNotifications(prev => [notification, ...prev])
  );

  // 3. Restore view mode from localStorage
  useEffect(() => {
    const mode = StorageService.getViewMode();
    setView(mode as AppView);
  }, []);

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setTheme(theme);
  };

  const handleChangeView = (newView: AppView) => {
    setView(newView);
    if (['BOARD', 'CALENDAR', 'GANTT', 'LIST', 'DASHBOARD'].includes(newView)) {
      StorageService.setViewMode(newView as ViewMode);
    }
  };

  // Wrapped handlers with error handling
  const handleAddTask = useCallback(async (partial: Partial<Task>) => {
    try {
      await addTask(partial);
    } catch (error) {
      logger.error('Failed to add task', error instanceof Error ? error : undefined);
      setNotifications(prev => [{
        id: Date.now().toString(),
        type: 'SYSTEM',
        title: 'Ошибка создания задачи',
        message: error instanceof Error ? error.message : 'Не удалось создать задачу',
        createdAt: new Date().toISOString(),
        read: false
      }, ...prev]);
    }
  }, [addTask]);

  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateTask(taskId, updates);
    } catch (error) {
      logger.error('Failed to update task', error instanceof Error ? error : undefined);
      setNotifications(prev => [{
        id: Date.now().toString(),
        type: 'SYSTEM',
        title: 'Ошибка обновления задачи',
        message: error instanceof Error ? error.message : 'Не удалось обновить задачу',
        createdAt: new Date().toISOString(),
        read: false
      }, ...prev]);
    }
  }, [updateTask]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (error) {
      logger.error('Failed to delete task', error instanceof Error ? error : undefined);
      setNotifications(prev => [{
        id: Date.now().toString(),
        type: 'SYSTEM',
        title: 'Ошибка удаления задачи',
        message: error instanceof Error ? error.message : 'Не удалось удалить задачу',
        createdAt: new Date().toISOString(),
        read: false
      }, ...prev]);
    }
  }, [deleteTask]);

  const handleAddProject = useCallback(async (partial: Partial<Project>) => {
    try {
      await addProject(partial);
    } catch (error) {
      logger.error('Failed to add project', error instanceof Error ? error : undefined);
      setNotifications(prev => [{
        id: Date.now().toString(),
        type: 'SYSTEM',
        title: 'Ошибка создания проекта',
        message: error instanceof Error ? error.message : 'Не удалось создать проект',
        createdAt: new Date().toISOString(),
        read: false
      }, ...prev]);
    }
  }, [addProject]);

  const handleUpdateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
    try {
      await updateProject(projectId, updates);
    } catch (error) {
      logger.error('Failed to update project', error instanceof Error ? error : undefined);
      setNotifications(prev => [{
        id: Date.now().toString(),
        type: 'SYSTEM',
        title: 'Ошибка обновления проекта',
        message: error instanceof Error ? error.message : 'Не удалось обновить проект',
        createdAt: new Date().toISOString(),
        read: false
      }, ...prev]);
    }
  }, [updateProject]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    try {
      await deleteProject(projectId);
    } catch (error) {
      logger.error('Failed to delete project', error instanceof Error ? error : undefined);
      setNotifications(prev => [{
        id: Date.now().toString(),
        type: 'SYSTEM',
        title: 'Ошибка удаления проекта',
        message: error instanceof Error ? error.message : 'Не удалось удалить проект',
        createdAt: new Date().toISOString(),
        read: false
      }, ...prev]);
    }
  }, [deleteProject]);

  const handleCommand = async (command: string) => {
    if (!currentWorkspaceId || !currentUser) return;

    setIsProcessingCommand(true);
    try {
      const projectNames = projects.map(p => p.name);
      const userNames = members.map(m => m.email);

      const suggestions = await GeminiService.suggestTasksFromCommand(command, {
        projectNames,
        userNames
      });

      // Преобразуем projectName и assigneeName в ID
      const processedSuggestions = suggestions.map(suggestion => {
        const processed: Partial<Task> = { ...suggestion };
        
        // Преобразуем projectName в projectId
        if (suggestion.projectName && !suggestion.projectId) {
          const project = projects.find(p => p.name === suggestion.projectName);
          if (project) {
            processed.projectId = project.id;
          }
          delete processed.projectName;
        }
        
        // Преобразуем assigneeName в assigneeId
        if (suggestion.assigneeName && !suggestion.assigneeId) {
          const member = members.find(m => m.email === suggestion.assigneeName);
          if (member) {
            processed.assigneeId = member.userId;
          }
          delete processed.assigneeName;
        }

        return processed;
      });

      if (processedSuggestions.length === 0) {
        setNotifications(prev => [
          {
            id: Date.now().toString(),
            type: 'SYSTEM',
            title: 'AI не вернул задачи',
            message: 'Попробуйте переформулировать запрос или добавить больше деталей.',
            createdAt: new Date().toISOString(),
            read: false
          },
          ...prev
        ]);
        return;
      }

      let createdCount = 0;
      for (const suggestion of processedSuggestions) {
        try {
          await addTask(suggestion);
          createdCount++;
        } catch (error) {
          logger.error('Failed to create task from AI suggestion', error instanceof Error ? error : undefined);
        }
      }

      setNotifications(prev => [
        {
          id: Date.now().toString(),
          type: 'SYSTEM',
          title: 'Команда обработана',
          message: `Создано задач: ${createdCount}`,
          createdAt: new Date().toISOString(),
          read: false
        },
        ...prev
      ]);

      // Отправляем уведомление только если есть получатели
      const allRecipients: string[] = [];
      processedSuggestions.forEach(s => {
        if (s.assigneeId) {
          const member = members.find(m => m.userId === s.assigneeId);
          if (member?.telegramChatId) {
            allRecipients.push(member.telegramChatId);
          }
        }
      });
      
      if (allRecipients.length > 0 && createdCount > 0) {
        const uniqueRecipients = [...new Set(allRecipients)];
        await TelegramService.sendNotification(
          uniqueRecipients, 
          `🤖 <b>AI создал задачи</b>\n\nСоздано задач из команды: <b>${createdCount}</b>`
        );
      }
    } catch (error) {
      logger.error('Error processing AI command', error instanceof Error ? error : undefined);
      setNotifications(prev => [
        {
          id: Date.now().toString(),
          type: 'SYSTEM',
          title: 'Ошибка обработки команды',
          message: error instanceof Error ? error.message : 'Не удалось обработать команду',
          createdAt: new Date().toISOString(),
          read: false
        },
        ...prev
      ]);
    } finally {
      setIsProcessingCommand(false);
    }
  };

  const handleAuth = async (isLogin: boolean, ...args: string[]) => {
    if (isLogin) {
      // Вход через email/password
      const [email, password] = args;
      await AuthService.loginWithEmail(email, password);
    } else {
      // Проверяем, это Google или регистрация через email
      if (args.length === 0) {
        // Google аутентификация
        await AuthService.loginWithGoogle();
      } else {
        // Регистрация через email/password
        const [email, password, displayName] = args;
        await AuthService.registerWithEmail(email, password, displayName);
      }
    }
  };

  const currentWorkspace = useMemo(() => 
    workspaces.find(w => w.id === currentWorkspaceId) || null,
    [workspaces, currentWorkspaceId]
  );

  const workspaceMembersMap = useMemo(() => {
    const map: Record<string, typeof members[0]> = {};
    members.forEach(m => {
      map[m.userId] = m;
    });
    return map;
  }, [members]);

  const canManageWorkspace = useCallback((user: User | null): boolean => {
    if (!user || !currentWorkspaceId) return false;
    const member = members.find(m => m.userId === user.id);
    if (!member) return false;
    return member.role === 'OWNER' || member.role === 'ADMIN';
  }, [currentWorkspaceId, members]);

  // Мемоизированное преобразование members в users
  const usersFromMembers = useMemo(() => 
    members.map(m => ({
      id: m.userId,
      email: m.email,
      displayName: m.email,
      role: m.role,
      isActive: m.status === 'ACTIVE',
      createdAt: m.joinedAt
    })),
    [members]
  );

  // Parse invite from URL
  useEffect(() => {
    const url = new URL(window.location.href);
    const inviteToken = url.searchParams.get('invite');
    const workspaceId = url.searchParams.get('workspace');

    if (inviteToken && workspaceId) {
      setInviteContext({ workspaceId, token: inviteToken });
    }
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
        <div className="text-center">
          <div className="animate-pulse text-lg mb-2 text-gray-900 dark:text-slate-100">Загрузка...</div>
          <div className="text-sm text-gray-600 dark:text-slate-400">Инициализация приложения</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthView
        onAuth={handleAuth}
      />
    );
  }

  if (inviteContext) {
    return (
      <AcceptInviteView
        currentUser={currentUser}
        inviteContext={inviteContext}
        onClose={() => setInviteContext(null)}
      />
    );
  }

  return (
    <Layout
      currentUser={currentUser}
      onLogout={AuthService.logout}
      view={view}
      onChangeView={handleChangeView}
      workspaces={workspaces}
      currentWorkspaceId={currentWorkspaceId}
      onWorkspaceChange={handleWorkspaceChange}
      onCreateWorkspace={handleCreateWorkspace}
      notifications={notifications}
      currentTheme={theme}
      onThemeChange={handleThemeChange}
      canManageCurrentWorkspace={canManageWorkspace(currentUser)}
      onNotificationsToggle={() => setNotificationsOpen(prev => !prev)}
      onCreateTask={() => {
        setEditingTask(null);
        setIsTaskModalOpen(true);
      }}
    >
      {!currentWorkspace && (
        <div className="p-6 text-slate-200">
          <h2 className="text-xl font-semibold mb-2">Добро пожаловать!</h2>
          <p className="text-slate-400 mb-4">
            Создайте первое рабочее пространство, чтобы начать планирование задач.
          </p>
        </div>
      )}

      {currentWorkspace && (
        <>
          <WorkspaceSelector
            workspaces={workspaces}
            currentWorkspaceId={currentWorkspaceId}
            onWorkspaceChange={handleWorkspaceChange}
            onCreateWorkspace={handleCreateWorkspace}
          />

          {view === 'BOARD' && (
            <KanbanBoard
              tasks={tasks}
              projects={projects}
              users={usersFromMembers}
              onTaskClick={t => {
                setEditingTask(t);
                setIsTaskModalOpen(true);
              }}
              onStatusChange={(task, status) => handleUpdateTask(task.id, { status })}
              onCreateTask={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
            />
          )}

          {view === 'CALENDAR' && (
            <CalendarView
              tasks={tasks}
              onTaskClick={t => {
                setEditingTask(t);
                setIsTaskModalOpen(true);
              }}
              onCreateTask={(date) => {
                setEditingTask({
                  id: '',
                  title: '',
                  status: TaskStatus.TODO,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  workspaceId: currentWorkspaceId!,
                  dueDate: date,
                  priority: TaskPriority.NORMAL
                } as Task);
                setIsTaskModalOpen(true);
              }}
            />
          )}

          {view === 'GANTT' && (
            <GanttChart
              tasks={tasks}
              projects={projects}
              onTaskClick={t => {
                setEditingTask(t);
                setIsTaskModalOpen(true);
              }}
              onEditTask={t => {
                setEditingTask(t);
                setIsTaskModalOpen(true);
              }}
            />
          )}

          {view === 'LIST' && (
            <TaskList
              tasks={tasks}
              projects={projects}
              users={usersFromMembers}
              onTaskClick={t => {
                setEditingTask(t);
                setIsTaskModalOpen(true);
              }}
              onEditTask={t => {
                setEditingTask(t);
                setIsTaskModalOpen(true);
              }}
            />
          )}

          {view === 'DASHBOARD' && (
            <Dashboard
              tasks={tasks}
              projects={projects}
            />
          )}

          {view === 'SETTINGS' && currentWorkspace && (
            <SettingsView
              workspace={currentWorkspace}
              members={members}
              invites={invites}
              currentUser={currentUser}
              onNotification={(title, message, type = 'SYSTEM') => {
                setNotifications(prev => [
                  {
                    id: Date.now().toString(),
                    type,
                    title,
                    message,
                    createdAt: new Date().toISOString(),
                    read: false
                  },
                  ...prev
                ]);
              }}
            />
          )}

          <NotificationCenter
            notifications={notifications}
            onClear={() => setNotifications([])}
            isOpen={notificationsOpen}
            onToggle={() => setNotificationsOpen(prev => !prev)}
          />

          <TaskModal
            isOpen={isTaskModalOpen}
            task={editingTask}
            projects={projects}
            users={members.map(m => ({
              id: m.userId,
              email: m.email,
              displayName: m.email,
              role: m.role,
              isActive: m.status === 'ACTIVE',
              createdAt: m.joinedAt
            }))}
            onClose={() => setIsTaskModalOpen(false)}
            onSave={async (t) => {
              if (!currentWorkspaceId) return;

              if (t.id) {
                await handleUpdateTask(t.id, t);
              } else {
                await handleAddTask(t);
              }

              setIsTaskModalOpen(false);
            }}
            onDelete={async (t) => {
              if (t.id) {
                await handleDeleteTask(t.id);
              }
              setIsTaskModalOpen(false);
            }}
          />

          <ProjectModal
            isOpen={isProjectModalOpen}
            project={editingProject}
            onClose={() => setIsProjectModalOpen(false)}
            onSave={async (p) => {
              if (p.id) {
                await handleUpdateProject(p.id, p);
              } else {
                await handleAddProject(p);
              }
              setIsProjectModalOpen(false);
            }}
            onDelete={async (p) => {
              if (p.id) {
                await handleDeleteProject(p.id);
              }
              setIsProjectModalOpen(false);
            }}
          />

          <UserModal
            isOpen={isUserModalOpen}
            user={editingUser}
            onClose={() => setIsUserModalOpen(false)}
            onSave={async (u) => {
              // Placeholder: пользовательские настройки/профиль
              setEditingUser(null);
              setIsUserModalOpen(false);
            }}
          />

          <AICommandBar
            onCommand={handleCommand}
            isProcessing={isProcessingCommand}
          />
        </>
      )}
    </Layout>
  );
};

export default App;
