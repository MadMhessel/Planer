import React, { useCallback, useEffect, useState } from 'react';
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
import { FirestoreService } from './services/firestore';
import { StorageService } from './services/storage';
import { ApiService } from './services/api';
import { GeminiService } from './services/gemini';
import { TelegramService } from './services/telegram';

import { Project, Task, TaskPriority, TaskStatus, User, ViewMode, Workspace, WorkspaceInvite, WorkspaceMember } from './types';

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
// Helper to extract Chat IDs based on task assignee and creator
const getRecipientsForTask = (task: Partial<Task>, allMembers: WorkspaceMember[], creatorId?: string): string[] => {
  const recipients: string[] = [];
  
  // Добавляем исполнителя задачи
  if (task.assigneeId) {
    const assignee = allMembers.find(m => m.userId === task.assigneeId);
    if (assignee?.telegramChatId) {
      recipients.push(assignee.telegramChatId);
    }
  }
  
  // Добавляем создателя задачи (если он не исполнитель)
  if (creatorId && creatorId !== task.assigneeId) {
    const creator = allMembers.find(m => m.userId === creatorId);
    if (creator?.telegramChatId && !recipients.includes(creator.telegramChatId)) {
      recipients.push(creator.telegramChatId);
    }
  }
  
  return recipients;
};

// Helper to get all workspace members with Telegram chat IDs
const getAllTelegramRecipients = (allMembers: WorkspaceMember[]): string[] => {
  return allMembers
    .filter(m => m.telegramChatId && m.status === 'ACTIVE')
    .map(m => m.telegramChatId!)
    .filter((id, index, self) => self.indexOf(id) === index); // Убираем дубликаты
};

type ThemeMode = 'light' | 'dark' | 'system';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

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

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = AuthService.subscribeToAuth(async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Workspace, members, tasks, projects subscriptions
  useEffect(() => {
    if (!currentUser) return;

    const unsubWorkspaces = FirestoreService.subscribeToWorkspaces(currentUser, (ws) => {
      setWorkspaces(ws);

      if (!currentWorkspaceId && ws.length > 0) {
        const saved = StorageService.getSelectedWorkspaceId();
        const found = ws.find(x => x.id === saved) || ws[0];
        setCurrentWorkspaceId(found.id);
      }
    });

    return () => {
      unsubWorkspaces && unsubWorkspaces();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentWorkspaceId || !currentUser) return;

    StorageService.setSelectedWorkspaceId(currentWorkspaceId);

    const unsubTasks = FirestoreService.subscribeToTasks(currentWorkspaceId, setTasks);
    const unsubProjects = FirestoreService.subscribeToProjects(currentWorkspaceId, setProjects);
    const unsubMembers = FirestoreService.subscribeToMembers(currentWorkspaceId, setMembers);
    const unsubInvites = FirestoreService.subscribeToInvites(currentWorkspaceId, setInvites);

    return () => {
      unsubTasks && unsubTasks();
      unsubProjects && unsubProjects();
      unsubMembers && unsubMembers();
      unsubInvites && unsubInvites();
    };
  }, [currentWorkspaceId, currentUser]);

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

  const handleWorkspaceChange = (workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId);
  };

  const handleCreateWorkspace = async (name: string) => {
    if (!currentUser) return;
    const workspace = await FirestoreService.createWorkspace(name, currentUser);
    setCurrentWorkspaceId(workspace.id);
  };

const handleAddTask = async (partial: Partial<Task>) => {
    if (!currentWorkspaceId || !currentUser) return;

    const now = new Date().toISOString();
    
    // Подготовка объекта задачи
    const taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      title: partial.title || 'Новая задача',
      description: partial.description || '',
      status: partial.status || TaskStatus.TODO,
      projectId: partial.projectId,
      assigneeId: partial.assigneeId,
      createdAt: now,
      updatedAt: now,
      dueDate: partial.dueDate,
      startDate: partial.startDate,
      priority: partial.priority || TaskPriority.NORMAL,
      tags: partial.tags || [],
      estimatedHours: partial.estimatedHours,
      loggedHours: partial.loggedHours,
      dependencies: partial.dependencies || [],
      workspaceId: currentWorkspaceId
    };

    // 1. Создаем задачу в Firestore
    const created = await FirestoreService.createTask(taskData);
    
    // 2. Добавляем локальное уведомление
    const assignee = created.assigneeId ? members.find(m => m.userId === created.assigneeId) : null;
    const assigneeName = assignee ? (assignee.email) : 'Не назначен';
    
    setNotifications(prev => [
      {
        id: Date.now().toString(),
        type: 'TASK_ASSIGNED',
        title: 'Новая задача создана',
        message: `Задача "${created.title}" ${created.assigneeId ? `назначена ${assigneeName}` : 'создана'}`,
        createdAt: new Date().toISOString(),
        read: false
      },
      ...prev
    ]);

    // 3. Отправляем уведомление в Telegram
    const recipients = getRecipientsForTask(created, members, currentUser.id);
    if (recipients.length > 0) {
        const projectName = created.projectId ? projects.find(p => p.id === created.projectId)?.name : null;
        const priorityText = {
          [TaskPriority.LOW]: 'Низкий',
          [TaskPriority.NORMAL]: 'Обычный',
          [TaskPriority.HIGH]: 'Высокий',
          [TaskPriority.CRITICAL]: 'Критический'
        }[created.priority] || 'Обычный';
        
        let text = `🆕 <b>Новая задача</b>\n\n📝 <b>${created.title}</b>`;
        if (created.description) {
          text += `\n\n${created.description}`;
        }
        if (projectName) {
          text += `\n📁 Проект: ${projectName}`;
        }
        if (created.dueDate) {
          const dueDate = new Date(created.dueDate).toLocaleDateString('ru-RU');
          text += `\n📅 Срок: ${dueDate}`;
        }
        text += `\n⚡ Приоритет: ${priorityText}`;
        
        await TelegramService.sendNotification(recipients, text);
    }
  };

const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    // 1. Получаем старое состояние задачи для сравнения
    const oldTask = tasks.find(t => t.id === taskId);
    
    // 2. Обновляем в Firestore
    await FirestoreService.updateTask(taskId, updates);

    // 3. УВЕДОМЛЕНИЕ: Смена статуса, дедлайна или исполнителя
    if (oldTask) {
        // Объединяем старое и новое, чтобы получить актуальное состояние
        const newTaskState = { ...oldTask, ...updates } as Task; 
        const recipients = getRecipientsForTask(newTaskState, members, currentUser?.id);
        
        let notificationTitle = '';
        let notificationMessage = '';
        let telegramMessage = '';
        
        // Сценарий A: Изменился статус
        if (updates.status && updates.status !== oldTask.status) {
          const statusText: Record<TaskStatus, string> = {
            [TaskStatus.TODO]: 'К выполнению',
            [TaskStatus.IN_PROGRESS]: 'В работе',
            [TaskStatus.REVIEW]: 'На проверке',
            [TaskStatus.DONE]: 'Готово',
            [TaskStatus.HOLD]: 'Отложено'
          };
          
          const oldStatusText = statusText[oldTask.status] || oldTask.status;
          const newStatusText = statusText[updates.status] || updates.status;
          
          notificationTitle = 'Статус задачи изменен';
          notificationMessage = `Задача "${oldTask.title}" изменена: ${oldStatusText} → ${newStatusText}`;
          telegramMessage = `🔄 <b>Обновление статуса</b>\n\n📝 <b>${oldTask.title}</b>\n\n${oldStatusText} ➡️ <b>${newStatusText}</b>`;
        }
        
        // Сценарий B: Изменился дедлайн
        else if (updates.dueDate && updates.dueDate !== oldTask.dueDate) {
          const newDueDate = new Date(updates.dueDate).toLocaleDateString('ru-RU');
          notificationTitle = 'Срок задачи изменен';
          notificationMessage = `Задача "${oldTask.title}" - новый срок: ${newDueDate}`;
          telegramMessage = `📅 <b>Обновление сроков</b>\n\n📝 <b>${oldTask.title}</b>\n\nНовый дедлайн: <b>${newDueDate}</b>`;
        }

        // Сценарий C: Назначили нового исполнителя
        else if (updates.assigneeId && updates.assigneeId !== oldTask.assigneeId) {
          const newAssignee = members.find(m => m.userId === updates.assigneeId);
          const newAssigneeName = newAssignee ? newAssignee.email : 'Неизвестно';
          notificationTitle = 'Задача назначена';
          notificationMessage = `Задача "${oldTask.title}" назначена ${newAssigneeName}`;
          telegramMessage = `👉 <b>Вам назначена задача</b>\n\n📝 <b>${oldTask.title}</b>`;
        }

        // Сценарий D: Изменился приоритет
        else if (updates.priority && updates.priority !== oldTask.priority) {
          const priorityText: Record<TaskPriority, string> = {
            [TaskPriority.LOW]: 'Низкий',
            [TaskPriority.NORMAL]: 'Обычный',
            [TaskPriority.HIGH]: 'Высокий',
            [TaskPriority.CRITICAL]: 'Критический'
          };
          notificationTitle = 'Приоритет задачи изменен';
          notificationMessage = `Задача "${oldTask.title}" - приоритет изменен на ${priorityText[updates.priority]}`;
          telegramMessage = `⚡ <b>Изменен приоритет</b>\n\n📝 <b>${oldTask.title}</b>\n\nНовый приоритет: <b>${priorityText[updates.priority]}</b>`;
        }

        // Сценарий E: Изменилось название или описание
        else if (updates.title || updates.description) {
          notificationTitle = 'Задача обновлена';
          notificationMessage = `Задача "${updates.title || oldTask.title}" была обновлена`;
          telegramMessage = `✏️ <b>Задача обновлена</b>\n\n📝 <b>${updates.title || oldTask.title}</b>`;
        }

        // Добавляем локальное уведомление
        if (notificationTitle) {
          setNotifications(prev => [
            {
              id: Date.now().toString(),
              type: 'TASK_UPDATED',
              title: notificationTitle,
              message: notificationMessage,
              createdAt: new Date().toISOString(),
              read: false
            },
            ...prev
          ]);
        }

        // Отправляем в Telegram
        if (telegramMessage && recipients.length > 0) {
          await TelegramService.sendNotification(recipients, telegramMessage);
        }
    }
  };

 const handleDeleteTask = async (taskId: string) => {
    // Находим задачу перед удалением, чтобы знать название и кому отправлять уведомление
    const taskToDelete = tasks.find(t => t.id === taskId);
    
    await FirestoreService.deleteTask(taskId);
    
    // УВЕДОМЛЕНИЕ: Удаление
    if (taskToDelete) {
      // Добавляем локальное уведомление
      setNotifications(prev => [
        {
          id: Date.now().toString(),
          type: 'TASK_UPDATED',
          title: 'Задача удалена',
          message: `Задача "${taskToDelete.title}" была удалена`,
          createdAt: new Date().toISOString(),
          read: false
        },
        ...prev
      ]);

      // Отправляем в Telegram
      const recipients = getRecipientsForTask(taskToDelete, members, currentUser?.id);
      if (recipients.length > 0) {
        const text = `🗑️ <b>Задача удалена</b>\n\n📝 <b>${taskToDelete.title}</b>`;
        await TelegramService.sendNotification(recipients, text);
      }
    }
  };

  const handleAddProject = async (partial: Partial<Project>) => {
    if (!currentWorkspaceId || !currentUser) return;

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
      workspaceId: currentWorkspaceId
    };

    const created = await FirestoreService.createProject(project);
    
    // Добавляем локальное уведомление
    setNotifications(prev => [
      {
        id: Date.now().toString(),
        type: 'PROJECT_UPDATED',
        title: 'Проект создан',
        message: `Проект "${created.name}" был создан`,
        createdAt: new Date().toISOString(),
        read: false
      },
      ...prev
    ]);

    // Отправляем в Telegram всем участникам workspace
    const recipients = getAllTelegramRecipients(members);
    if (recipients.length > 0) {
      const text = `📁 <b>Новый проект</b>\n\n<b>${created.name}</b>${created.description ? `\n\n${created.description}` : ''}`;
      await TelegramService.sendNotification(recipients, text);
    }
  };

  const handleUpdateProject = async (projectId: string, updates: Partial<Project>) => {
    const oldProject = projects.find(p => p.id === projectId);
    await FirestoreService.updateProject(projectId, updates);
    
    if (oldProject) {
      // Добавляем локальное уведомление
      setNotifications(prev => [
        {
          id: Date.now().toString(),
          type: 'PROJECT_UPDATED',
          title: 'Проект обновлен',
          message: `Проект "${oldProject.name}" был обновлен`,
          createdAt: new Date().toISOString(),
          read: false
        },
        ...prev
      ]);

      // Отправляем в Telegram всем участникам workspace
      const recipients = getAllTelegramRecipients(members);
      if (recipients.length > 0 && (updates.name || updates.description || updates.status)) {
        const projectName = updates.name || oldProject.name;
        let text = `📁 <b>Проект обновлен</b>\n\n<b>${projectName}</b>`;
        if (updates.status) {
          text += `\n\nСтатус: <b>${updates.status}</b>`;
        }
        await TelegramService.sendNotification(recipients, text);
      }
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const projectToDelete = projects.find(p => p.id === projectId);
    await FirestoreService.deleteProject(projectId);
    
    if (projectToDelete) {
      // Добавляем локальное уведомление
      setNotifications(prev => [
        {
          id: Date.now().toString(),
          type: 'PROJECT_UPDATED',
          title: 'Проект удален',
          message: `Проект "${projectToDelete.name}" был удален`,
          createdAt: new Date().toISOString(),
          read: false
        },
        ...prev
      ]);

      // Отправляем в Telegram всем участникам workspace
      const recipients = getAllTelegramRecipients(members);
      if (recipients.length > 0) {
        const text = `🗑️ <b>Проект удален</b>\n\n<b>${projectToDelete.name}</b>`;
        await TelegramService.sendNotification(recipients, text);
      }
    }
  };

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
          await handleAddTask(suggestion);
          createdCount++;
        } catch (error) {
          console.error('Failed to create task:', error);
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
      console.error('Error processing AI command:', error);
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
    if (!isLogin) {
      await AuthService.loginWithGoogle();
    }
  };

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || null;
  const workspaceMembersMap: Record<string, WorkspaceMember> = {};
  members.forEach(m => {
    workspaceMembersMap[m.userId] = m;
  });

  const canManageWorkspace = (user: User | null): boolean => {
    if (!user || !currentWorkspaceId) return false;
    const member = members.find(m => m.userId === user.id);
    if (!member) return false;
    return member.role === 'OWNER' || member.role === 'ADMIN';
  };

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
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <div className="animate-pulse text-lg">Загрузка...</div>
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
              users={members.map(m => ({
                id: m.userId,
                email: m.email,
                displayName: m.email,
                role: m.role,
                isActive: m.status === 'ACTIVE',
                createdAt: m.joinedAt
              }))}
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
              users={members.map(m => ({
                id: m.userId,
                email: m.email,
                displayName: m.email,
                role: m.role,
                isActive: m.status === 'ACTIVE',
                createdAt: m.joinedAt
              }))}
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
