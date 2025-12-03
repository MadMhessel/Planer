import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Layout } from './components/Layout';
// Code splitting для больших компонентов
import { TaskList } from './components/TaskList';
import { KanbanBoard } from './components/KanbanBoard';
import { lazy, Suspense } from 'react';

const CalendarView = lazy(() => import('./components/CalendarView').then(m => ({ default: m.CalendarView })));
const GanttChart = lazy(() => import('./components/GanttChart').then(m => ({ default: m.GanttChart })));
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
import { TaskModal } from './components/TaskModal';
import { ProjectModal } from './components/ProjectModal';
import { UserModal } from './components/UserModal';
import { ProfileModal } from './components/ProfileModal';
import { SettingsView } from './components/SettingsView';
import { AuthView } from './components/AuthView';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { NotificationCenter } from './components/NotificationCenter';
import { NotificationHistory } from './components/NotificationHistory';
import { AcceptInviteView } from './components/AcceptInviteView';
import { AICommandBar } from './components/AICommandBar';

// Spinner for Suspense fallbacks
import { LoadingSpinner } from './components/LoadingSpinner';
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
import { useNotifications } from './hooks/useNotifications';
import { logger } from './utils/logger';
import { membersToUsers } from './utils/userHelpers';
import { MAX_CHAT_HISTORY_LENGTH } from './constants/ai';
import toast from 'react-hot-toast';
import { SUPER_ADMINS } from './constants/superAdmins';
import { getMoscowISOString } from './utils/dateUtils';

type AppView =
  | 'BOARD'
  | 'CALENDAR'
  | 'GANTT'
  | 'LIST'
  | 'DASHBOARD'
  | 'SETTINGS'
  | 'NOTIFICATIONS';

type InviteContext = {
  workspaceId: string;
  token: string;
};

type ThemeMode = 'light' | 'dark' | 'system';

const App: React.FC = () => {
  logger.info('App component rendering');
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [view, setView] = useState<AppView>('BOARD');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [inviteContext, setInviteContext] = useState<InviteContext | null>(null);
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
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

  // Initialize Web Push Service Worker
  useEffect(() => {
    import('./services/push').then(({ PushService }) => {
      PushService.init().catch(err => {
        logger.warn('Push service initialization failed', err);
      });
    });
  }, []);

  // Firebase и Auth инициализация
  useEffect(() => {
    logger.info('Initializing Firebase and setting up auth listener');
    let mounted = true;
    let unsubscribe: (() => void) | null = null;
    
    // Инициализируем Firebase и затем настраиваем auth listener
    import('./firebase').then(({ firebaseInit }) => {
      return firebaseInit;
    }).then(() => {
      if (!mounted) return;
      
      // После инициализации Firebase настраиваем auth listener
      unsubscribe = AuthService.subscribeToAuth(async (user) => {
        logger.info('Auth state changed', { hasUser: !!user, email: user?.email });
        if (mounted) {
          try {
            setCurrentUser(user);
            setAuthLoading(false);
            logger.info('Auth state updated');
          } catch (error) {
            logger.error('Error setting user state', error instanceof Error ? error : undefined);
            if (mounted) {
              setAuthLoading(false);
            }
          }
        }
      });
    }).catch((error) => {
      logger.error('Failed to initialize Firebase', error instanceof Error ? error : undefined);
      if (mounted) {
        setAuthLoading(false);
      }
    });

    return () => {
      logger.info('Cleaning up auth listener');
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

  // Notifications hook
  const {
    notifications: firestoreNotifications,
    markAllAsRead,
    markAsRead,
    clearAll,
    deleteNotification
  } = useNotifications(currentWorkspaceId, currentUser?.id || null);

  // Локальные уведомления (для ошибок и системных сообщений)
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
  
  // Объединяем уведомления из Firestore и локальные
  const notifications = useMemo(() => {
    return [...firestoreNotifications, ...localNotifications];
  }, [firestoreNotifications, localNotifications]);

  // Projects hook
  const {
    projects,
    addProject,
    updateProject,
    deleteProject
  } = useProjects(
    currentWorkspaceId,
    members,
    currentUser
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
    currentUser
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
      logger.info('Creating task', { 
        title: partial.title, 
        workspaceId: partial.workspaceId,
        hasProjectId: !!partial.projectId,
        hasAssigneeId: !!partial.assigneeId
      });
      const created = await addTask(partial);
      logger.info('Task created successfully', { taskId: created.id });
      toast.success('Задача успешно создана');
    } catch (error) {
      logger.error('Failed to add task', error instanceof Error ? error : undefined);
      const errorMessage = error instanceof Error ? error.message : 'Не удалось создать задачу';
      console.error('Task creation error details:', {
        error,
        partial,
        workspaceId: partial.workspaceId,
        currentWorkspaceId
      });
      toast.error(errorMessage);
      setLocalNotifications(prev => [{
        id: Date.now().toString(),
        workspaceId: currentWorkspaceId || '',
        type: 'SYSTEM',
        title: 'Ошибка создания задачи',
        message: errorMessage,
        createdAt: getMoscowISOString(),
        readBy: []
      }, ...prev]);
    }
  }, [addTask, currentWorkspaceId]);

  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      // Фильтруем undefined значения перед передачей
      const filteredUpdates: Partial<Task> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          filteredUpdates[key as keyof Task] = value as any;
        }
      }
      await updateTask(taskId, filteredUpdates);
      toast.success('Задача обновлена');
    } catch (error) {
      logger.error('Failed to update task', error instanceof Error ? error : undefined);
      const errorMessage = error instanceof Error ? error.message : 'Не удалось обновить задачу';
      toast.error(errorMessage);
      setLocalNotifications(prev => [{
        id: Date.now().toString(),
        workspaceId: currentWorkspaceId || '',
        type: 'SYSTEM',
        title: 'Ошибка обновления задачи',
        message: errorMessage,
        createdAt: getMoscowISOString(),
        readBy: []
      }, ...prev]);
    }
  }, [updateTask]);

  // Функция для выполнения действий от AI
  const executeAIAction = async (
    action: { type: string; params: Record<string, any> },
    allTasks: Task[],
    allProjects: Project[],
    allMembers: typeof members
  ) => {
    const { type, params } = action;

    // Находим задачу по ID или названию
    const findTask = (taskIdOrTitle: string): Task | undefined => {
      // Сначала ищем по ID
      let task = allTasks.find(t => t.id === taskIdOrTitle);
      if (task) return task;
      // Затем ищем по названию (нечеткое совпадение)
      const titleLower = taskIdOrTitle.toLowerCase().trim();
      task = allTasks.find(t => t.title.toLowerCase().trim() === titleLower);
      return task;
    };

    switch (type) {
      case 'create_task': {
        const taskData: Partial<Task> = {
          title: params.title,
          description: params.description,
          priority: params.priority || TaskPriority.NORMAL,
          status: params.status || TaskStatus.TODO,
          dueDate: params.dueDate,
          startDate: params.startDate
        };
        
        if (params.projectName) {
          const project = allProjects.find(p => p.name === params.projectName);
          if (project) taskData.projectId = project.id;
        }
        
        if (params.assigneeName) {
          const member = allMembers.find(m => m.email === params.assigneeName);
          if (member) taskData.assigneeId = member.userId;
        }
        
        await addTask(taskData);
        toast.success(`Задача "${params.title}" создана`);
        break;
      }

      case 'update_task': {
        const task = findTask(params.taskId || params.taskTitle);
        if (!task) {
          throw new Error(`Задача "${params.taskId || params.taskTitle}" не найдена`);
        }

        const updates: Partial<Task> = {};
        if (params.title) updates.title = params.title;
        if (params.description !== undefined) updates.description = params.description;
        if (params.priority) updates.priority = params.priority;
        if (params.status) updates.status = params.status;
        if (params.dueDate) updates.dueDate = params.dueDate;
        
        if (params.projectName) {
          const project = allProjects.find(p => p.name === params.projectName);
          if (project) updates.projectId = project.id;
        }
        
        if (params.assigneeName) {
          const member = allMembers.find(m => m.email === params.assigneeName);
          if (member) updates.assigneeId = member.userId;
        }
        
        await updateTask(task.id, updates);
        toast.success(`Задача "${task.title}" обновлена`);
        break;
      }

      case 'delete_task': {
        const task = findTask(params.taskId || params.taskTitle);
        if (!task) {
          throw new Error(`Задача "${params.taskId || params.taskTitle}" не найдена`);
        }
        await deleteTask(task.id);
        toast.success(`Задача "${task.title}" удалена`);
        break;
      }

      case 'create_project': {
        const projectData: Partial<Project> = {
          name: params.name,
          description: params.description,
          color: params.color || '#3b82f6'
        };
        await addProject(projectData);
        toast.success(`Проект "${params.name}" создан`);
        break;
      }

      case 'change_task_status': {
        const task = findTask(params.taskId || params.taskTitle);
        if (!task) {
          throw new Error(`Задача "${params.taskId || params.taskTitle}" не найдена`);
        }
        await updateTask(task.id, { status: params.status });
        toast.success(`Статус задачи "${task.title}" изменен на ${params.status}`);
        break;
      }

      case 'assign_task': {
        const task = findTask(params.taskId || params.taskTitle);
        if (!task) {
          throw new Error(`Задача "${params.taskId || params.taskTitle}" не найдена`);
        }
        const member = allMembers.find(m => m.email === params.assigneeName);
        if (!member) {
          throw new Error(`Пользователь "${params.assigneeName}" не найден`);
        }
        await updateTask(task.id, { assigneeId: member.userId });
        toast.success(`Задача "${task.title}" назначена на ${params.assigneeName}`);
        break;
      }

      case 'set_task_priority': {
        const task = findTask(params.taskId || params.taskTitle);
        if (!task) {
          throw new Error(`Задача "${params.taskId || params.taskTitle}" не найдена`);
        }
        await updateTask(task.id, { priority: params.priority });
        toast.success(`Приоритет задачи "${task.title}" изменен`);
        break;
      }

      case 'list_tasks':
      case 'list_projects':
      case 'get_task_info':
      case 'get_project_info':
        // Эти действия только для информации, не требуют выполнения
        break;

      default:
        logger.warn('Unknown AI action type', { type, params });
    }
  };

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success('Задача удалена');
    } catch (error) {
      logger.error('Failed to delete task', error instanceof Error ? error : undefined);
      const errorMessage = error instanceof Error ? error.message : 'Не удалось удалить задачу';
      toast.error(errorMessage);
      setLocalNotifications(prev => [{
        id: Date.now().toString(),
        workspaceId: currentWorkspaceId || '',
        type: 'SYSTEM',
        title: 'Ошибка удаления задачи',
        message: errorMessage,
        createdAt: getMoscowISOString(),
        readBy: []
      }, ...prev]);
    }
  }, [deleteTask]);

  const handleAddProject = useCallback(async (partial: Partial<Project>): Promise<Project> => {
    try {
      const project = await addProject(partial);
      toast.success('Проект успешно создан');
      return project;
    } catch (error) {
      logger.error('Failed to add project', error instanceof Error ? error : undefined);
      const errorMessage = error instanceof Error ? error.message : 'Не удалось создать проект';
      toast.error(errorMessage);
      setLocalNotifications(prev => [{
        id: Date.now().toString(),
        workspaceId: currentWorkspaceId || '',
        type: 'SYSTEM',
        title: 'Ошибка создания проекта',
        message: errorMessage,
        createdAt: getMoscowISOString(),
        readBy: []
      }, ...prev]);
      throw error;
    }
  }, [addProject]);

  const handleUpdateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
    try {
      await updateProject(projectId, updates);
    } catch (error) {
      logger.error('Failed to update project', error instanceof Error ? error : undefined);
      setLocalNotifications(prev => [{
        id: Date.now().toString(),
        workspaceId: currentWorkspaceId || '',
        type: 'SYSTEM',
        title: 'Ошибка обновления проекта',
        message: error instanceof Error ? error.message : 'Не удалось обновить проект',
        createdAt: getMoscowISOString(),
        readBy: []
      }, ...prev]);
    }
  }, [updateProject]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    try {
      await deleteProject(projectId);
    } catch (error) {
      logger.error('Failed to delete project', error instanceof Error ? error : undefined);
      setLocalNotifications(prev => [{
        id: Date.now().toString(),
        workspaceId: currentWorkspaceId || '',
        type: 'SYSTEM',
        title: 'Ошибка удаления проекта',
        message: error instanceof Error ? error.message : 'Не удалось удалить проект',
        createdAt: getMoscowISOString(),
        readBy: []
      }, ...prev]);
    }
  }, [deleteProject]);

  const handleCommand = async (command: string): Promise<string | null> => {
    if (!currentWorkspaceId || !currentUser) return null;

    setIsProcessingCommand(true);
    try {
      const projectNames = projects.map(p => p.name);
      const userNames = members.map(m => m.email);
      // Добавляем контекст текущих задач для поиска по названию
      const taskTitles = tasks.map(t => t.title).slice(0, 50); // Ограничиваем для промпта

      // Получаем ответ от AI с историей
      const response = await GeminiService.suggestTasksFromCommand(command, {
        projectNames,
        userNames,
        taskTitles
      }, chatHistory);

      // Обновляем историю чата
      setChatHistory(prev => {
        const newHistory = [
          ...prev,
          { role: 'user' as const, content: command },
          { role: 'assistant' as const, content: response.textResponse }
        ];
        // Оставляем только последние N сообщений для контекста
        return newHistory.slice(-MAX_CHAT_HISTORY_LENGTH);
      });

      // Выполняем действия, если они есть
      if (response.actions && response.actions.length > 0) {
        for (const action of response.actions) {
          try {
            await executeAIAction(action, tasks, projects, members);
          } catch (error) {
            logger.error('Failed to execute AI action', error instanceof Error ? error : undefined);
            logger.warn(`AI action failed: ${action.type}`, { params: action.params });
          }
        }
      }

      // Обработка задач для обратной совместимости
      if (response.tasks && response.tasks.length > 0) {
        // Преобразуем projectName и assigneeName в ID
        const processedSuggestions = response.tasks.map((suggestion: any) => {
          const processed: Partial<Task> = { ...suggestion };
          
          // Преобразуем projectName в projectId
          if (suggestion.projectName && !suggestion.projectId) {
            const project = projects.find(p => p.name === suggestion.projectName);
            if (project) {
              processed.projectId = project.id;
            }
            delete (processed as any).projectName;
          }
          
          // Преобразуем assigneeName в assigneeId
          if (suggestion.assigneeName && !suggestion.assigneeId) {
            const member = members.find(m => m.email === suggestion.assigneeName);
            if (member) {
              processed.assigneeId = member.userId;
            }
            delete (processed as any).assigneeName;
          }

          return processed;
        });

        // Создаем задачи
        let createdCount = 0;
        for (const suggestion of processedSuggestions) {
          try {
            await addTask(suggestion);
            createdCount++;
          } catch (error) {
            logger.error('Failed to create task from AI suggestion', error instanceof Error ? error : undefined);
          }
        }

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
      }

      // Возвращаем текстовый ответ для отображения в чате
      return response.textResponse;
    } catch (error) {
      logger.error('Error processing AI command', error instanceof Error ? error : undefined);
      const errorMessage = error instanceof Error ? error.message : 'Не удалось обработать команду';
      return `Ошибка: ${errorMessage}`;
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
      // Проверяем, это Google, демо-режим или регистрация через email
      if (args.length === 0) {
        // Google аутентификация
        await AuthService.loginWithGoogle();
      } else if (args[0] === 'demo') {
        // Демо-режим
        await AuthService.loginAsDemo();
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
    if (!user) return false;
    // Глобальные супер-админы управляют любым workspace
    if (user.email && SUPER_ADMINS.map(e=>e.toLowerCase()).includes(user.email.toLowerCase())) return true;

    if (!currentWorkspaceId) return false;
    const member = members.find(m => m.userId === user.id);
    if (!member) return false;
    return member.role === 'OWNER' || member.role === 'ADMIN';
  }, [currentWorkspaceId, members]);

  // Мемоизированное преобразование members в users
  const usersFromMembers = useMemo(() => membersToUsers(members), [members]);

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
      onProfileClick={() => setIsProfileModalOpen(true)}
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
              onDeleteTask={async (task) => {
                await handleDeleteTask(task.id);
              }}
            />
          )}

          {view === 'CALENDAR' && (
            <Suspense fallback={<LoadingSpinner text="Загрузка календаря..." />}>
              <CalendarView
                tasks={tasks}
                onTaskClick={t => {
                  setEditingTask(t);
                  setIsTaskModalOpen(true);
                }}
                onCreateTask={(date) => {
                  if (!currentWorkspaceId) return;
                  setEditingTask({
                    id: '',
                    title: '',
                    status: TaskStatus.TODO,
                    createdAt: getMoscowISOString(),
                    updatedAt: getMoscowISOString(),
                    workspaceId: currentWorkspaceId,
                    dueDate: date,
                    priority: TaskPriority.NORMAL
                  } as Task);
                  setIsTaskModalOpen(true);
                }}
              />
            </Suspense>
          )}

          {view === 'GANTT' && (
            <Suspense fallback={<LoadingSpinner text="Загрузка диаграммы Ганта..." />}>
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
            </Suspense>
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
            <Suspense fallback={<LoadingSpinner text="Загрузка аналитики..." />}>
              <Dashboard
                tasks={tasks}
                projects={projects}
              />
            </Suspense>
          )}

          {view === 'NOTIFICATIONS' && currentWorkspace && currentUser && (
            <NotificationHistory
              notifications={notifications}
              currentUserId={currentUser.id}
              onMarkAsRead={async (notificationId: string) => {
                try {
                  if (firestoreNotifications.find(n => n.id === notificationId)) {
                    await markAsRead(notificationId);
                  }
                } catch (error) {
                  logger.error('Failed to mark notification as read', error instanceof Error ? error : undefined);
                }
              }}
              onDelete={async (notificationId: string) => {
                try {
                  if (firestoreNotifications.find(n => n.id === notificationId)) {
                    await deleteNotification(notificationId);
                  } else {
                    // Удаляем локальное уведомление
                    setLocalNotifications(prev => prev.filter(n => n.id !== notificationId));
                  }
                } catch (error) {
                  logger.error('Failed to delete notification', error instanceof Error ? error : undefined);
                }
              }}
            />
          )}

          {view === 'SETTINGS' && currentWorkspace && (
            <SettingsView
              workspace={currentWorkspace}
              members={members}
              invites={invites}
              projects={projects}
              currentUser={currentUser}
              onCreateProject={handleAddProject}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onNotification={(title, message, type = 'SYSTEM') => {
                setLocalNotifications(prev => [
                  {
                    id: Date.now().toString(),
                    workspaceId: currentWorkspace?.id || '',
                    type,
                    title,
                    message,
                    createdAt: getMoscowISOString(),
                    readBy: []
                  },
                  ...prev
                ]);
              }}
            />
          )}

          <NotificationCenter
            notifications={notifications}
            onClear={async () => {
              try {
                // Очищаем уведомления из Firestore
                if (currentWorkspaceId && currentUser?.id) {
                  await clearAll();
                }
                // Очищаем локальные уведомления
                setLocalNotifications([]);
              } catch (error) {
                logger.error('Failed to clear notifications', error instanceof Error ? error : undefined);
              }
            }}
            onMarkAsRead={async (notificationId: string) => {
              try {
                // Помечаем как прочитанное только если это уведомление из Firestore
                const notification = firestoreNotifications.find(n => n.id === notificationId);
                if (notification && currentWorkspaceId && currentUser?.id) {
                  // Проверяем, не помечено ли уже как прочитанное
                  if (!notification.readBy?.includes(currentUser.id)) {
                    await markAsRead(notificationId);
                  }
                }
                // Для локальных уведомлений просто удаляем их
                setLocalNotifications(prev => prev.filter(n => n.id !== notificationId));
              } catch (error) {
                logger.error('Failed to mark notification as read', error instanceof Error ? error : undefined);
              }
            }}
            onMarkAllAsRead={async () => {
              try {
                // Помечаем все уведомления из Firestore как прочитанные
                if (currentWorkspaceId && currentUser?.id) {
                  await markAllAsRead();
                }
                // Удаляем все локальные уведомления
                setLocalNotifications([]);
              } catch (error) {
                logger.error('Failed to mark all notifications as read', error instanceof Error ? error : undefined);
              }
            }}
            isOpen={notificationsOpen}
            onToggle={() => setNotificationsOpen(prev => !prev)}
            currentUserId={currentUser?.id}
          />

          <TaskModal
            isOpen={isTaskModalOpen}
            task={editingTask}
            projects={projects}
            users={usersFromMembers}
            onClose={() => setIsTaskModalOpen(false)}
            onSave={async (t) => {
              if (!currentWorkspaceId) return;

              // Проверяем, существует ли задача: если editingTask был установлен и имеет id, значит это редактирование
              const isExistingTask = editingTask && editingTask.id && editingTask.id.trim() !== '';
              
              if (isExistingTask && editingTask.id) {
                // Фильтруем undefined значения перед передачей
                const updateData: Partial<Task> = {
                  workspaceId: currentWorkspaceId
                };
                
                // Копируем только определенные поля из задачи
                for (const [key, value] of Object.entries(t)) {
                  if (value !== undefined && key !== 'id' && key !== 'workspaceId') {
                    updateData[key as keyof Task] = value as any;
                  }
                }
                
                await handleUpdateTask(editingTask.id, updateData);
              } else {
                // Для новой задачи добавляем workspaceId и убираем id
                const { id, ...taskData } = t;
                await handleAddTask({
                  ...taskData,
                  workspaceId: currentWorkspaceId
                });
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
            onDelete={async (projectId: string) => {
              await handleDeleteProject(projectId);
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
            onDelete={async (userId) => {
              // Placeholder: удаление пользователя
              setEditingUser(null);
              setIsUserModalOpen(false);
            }}
          />

          {currentUser && (
            <ProfileModal
              isOpen={isProfileModalOpen}
              user={currentUser}
              onClose={() => setIsProfileModalOpen(false)}
              onUserUpdate={(updatedUser) => {
                setCurrentUser(updatedUser);
              }}
            />
          )}

          <AICommandBar
            onCommand={handleCommand}
            isProcessing={isProcessingCommand}
            chatHistory={chatHistory}
          />
        </>
      )}
    </Layout>
  );
};

export default App;
