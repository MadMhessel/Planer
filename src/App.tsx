import React, { useEffect, useState } from 'react';
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
// Helper to extract Chat IDs based on task assignee
const getRecipientsForTask = (task: Partial<Task>, allMembers: WorkspaceMember[]): string[] => {
  if (!task.assigneeId) return [];
  
  // Find the member corresponding to the assignee
  const assignee = allMembers.find(m => m.userId === task.assigneeId);
  
  // Return their chat ID if it exists
  if (assignee && assignee.telegramChatId) {
    return [assignee.telegramChatId];
  }
  return [];
};

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

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = AuthService.subscribeToAuth(async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      
      // Theme init
      const savedTheme = StorageService.getTheme();
      applyTheme(savedTheme);
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

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    let finalTheme = theme;

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      finalTheme = prefersDark ? 'dark' : 'light';
    }

    if (finalTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    StorageService.setTheme(theme);
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    applyTheme(theme);
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
    
    // Подготовка объекта задачи (из вашего оригинального кода)
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
    
    // (Опционально) Старый вызов ApiService, если он еще нужен, можно оставить или убрать:
    // await ApiService.syncTaskToTelegram(created); 

    // 2. УВЕДОМЛЕНИЕ: Новая задача
    const recipients = getRecipientsForTask(created, members);
    if (recipients.length > 0) {
        // Формируем сообщение
        const text = `🆕 <b>Новая задача</b>\n\n📝 ${created.title}\n📅 Срок: ${created.dueDate || 'Не указан'}`;
        // Отправляем через ваш новый сервис
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
        const recipients = getRecipientsForTask(newTaskState, members);
        
        if (recipients.length > 0) {
            let message = '';
            
            // Сценарий A: Изменился статус
            if (updates.status && updates.status !== oldTask.status) {
                message = `🔄 <b>Обновление статуса</b>\n\n📝 ${oldTask.title}\n${oldTask.status} ➡️ <b>${updates.status}</b>`;
            }
            
            // Сценарий B: Изменился дедлайн
            else if (updates.dueDate && updates.dueDate !== oldTask.dueDate) {
                 message = `📅 <b>Обновление сроков</b>\n\n📝 ${oldTask.title}\nНовый дедлайн: ${updates.dueDate}`;
            }

            // Сценарий C: Назначили нового исполнителя (если исполнитель отличается от старого)
            else if (updates.assigneeId && updates.assigneeId !== oldTask.assigneeId) {
                 message = `👉 <b>Вам назначена задача</b>\n\n📝 ${oldTask.title}`;
            }

            if (message) {
                await TelegramService.sendNotification(recipients, message);
            }
        }
    }
  };

 const handleDeleteTask = async (taskId: string) => {
    // Находим задачу перед удалением, чтобы знать название и кому отправлять уведомление
    const taskToDelete = tasks.find(t => t.id === taskId);
    
    await FirestoreService.deleteTask(taskId);
    
    // УВЕДОМЛЕНИЕ: Удаление
    if (taskToDelete) {
        const recipients = getRecipientsForTask(taskToDelete, members);
        if (recipients.length > 0) {
             const text = `🗑️ <b>Задача удалена</b>\n\n📝 ${taskToDelete.title}`;
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

    await FirestoreService.createProject(project);
  };

  const handleUpdateProject = async (projectId: string, updates: Partial<Project>) => {
    await FirestoreService.updateProject(projectId, updates);
  };

  const handleDeleteProject = async (projectId: string) => {
    await FirestoreService.deleteProject(projectId);
  };

  const handleCommand = async (command: string) => {
    if (!currentWorkspaceId) return;

    const projectNames = projects.map(p => p.name);
    const userNames = members.map(m => m.email);

    const suggestions = await GeminiService.suggestTasksFromCommand(command, {
      projectNames,
      userNames
    });

    for (const suggestion of suggestions) {
      await handleAddTask(suggestion);
    }

    setNotifications(prev => [
      {
        id: Date.now().toString(),
        type: 'SYSTEM',
        title: 'Команда обработана',
        message: `Создано задач: ${suggestions.length}`,
        createdAt: new Date().toISOString(),
        read: false
      },
      ...prev
    ]);

    await TelegramService.sendNotification(`Создано задач из команды: ${suggestions.length}`);
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
      onThemeChange={handleThemeChange}
      canManageCurrentWorkspace={canManageWorkspace(currentUser)}
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
              onCreateTask={() => {
                setEditingTask(null);
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
            />
          )}

          <NotificationCenter
            notifications={notifications}
            onClear={() => setNotifications([])}
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

          {/* AI Command bar будет внутри Layout или отдельным компонентом */}
        </>
      )}
    </Layout>
  );
};

export default App;
