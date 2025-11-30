import React, { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { TaskList } from './components/TaskList';
import { KanbanBoard } from './components/KanbanBoard';
import { CalendarView } from './components/CalendarView';
import { GanttChart } from './components/GanttChart';
import { Dashboard } from './components/Dashboard';
import { AICommandBar } from './components/AICommandBar';
import { TaskModal } from './components/TaskModal';
import { ProjectModal } from './components/ProjectModal';
import { UserModal } from './components/UserModal';
import { SettingsView } from './components/SettingsView';
import { AuthView } from './components/AuthView';
import { WorkspaceSelector } from './components/WorkspaceSelector';

import { AuthService } from './services/auth';
import { APIService } from './services/api';
import { TelegramService } from './services/telegram';
import { 
  subscribeToTasks, 
  subscribeToProjects, 
  subscribeToMembers, 
  subscribeToWorkspaces,
  subscribeToNotifications,
  joinWorkspace,
  addTask,
  updateTask,
  deleteTask,
  addProject,
  updateProject,
  deleteProject,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  getSystemSettings,
  saveSystemSettings,
  updateUserProfile
} from './services/firestore';

import { Task, Project, User, ViewMode, TaskStatus, TaskPriority, Notification, Workspace, SystemSettings } from './types';
import { Loader } from 'lucide-react';

function App() {
  // Auth
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Data
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({});
  
  // UI State
  const [view, setView] = useState<ViewMode>('DASHBOARD');
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = AuthService.subscribeToAuth(async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      
      // Theme init
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      }

      if (user) {
          const settings = await getSystemSettings();
          setSystemSettings(settings);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Workspaces Listener
  useEffect(() => {
    if (!currentUser) {
      setWorkspaces([]);
      return;
    }
    const unsub = subscribeToWorkspaces(currentUser.email, (wsList) => {
      setWorkspaces(wsList);
      if (!currentWorkspace && wsList.length > 0) {
          setCurrentWorkspace(wsList[0]);
      } else if (currentWorkspace && !wsList.find(w => w.id === currentWorkspace.id)) {
          // If current workspace was removed or access lost
          setCurrentWorkspace(wsList.length > 0 ? wsList[0] : null);
      }
    });
    return () => unsub();
  }, [currentUser]);

  // 3. Data Listeners
  useEffect(() => {
    if (!currentWorkspace || !currentUser) {
      setTasks([]);
      setProjects([]);
      setUsers([]);
      return;
    }

    setIsDataLoading(true);
    
    // Join workspace logic
    joinWorkspace(currentWorkspace.id, currentUser).catch(console.error);

    const unsubTasks = subscribeToTasks(currentWorkspace.id, (t) => setTasks(t));
    const unsubProjects = subscribeToProjects(currentWorkspace.id, (p) => setProjects(p));
    const unsubMembers = subscribeToMembers(currentWorkspace.id, (u) => setUsers(u));
    const unsubNotifs = subscribeToNotifications(currentUser.id, (n) => setNotifications(n));

    setIsDataLoading(false);

    return () => {
      unsubTasks();
      unsubProjects();
      unsubMembers();
      unsubNotifs();
    };
  }, [currentWorkspace, currentUser]);

  // --- Handlers ---

  const handleAuth = async (isLogin: boolean, ...args: string[]) => {
      try {
          if (isLogin) await AuthService.login(args[0], args[1]);
          else await AuthService.register(args[0], args[1], args[2]);
      } catch (e: any) {
          setErrorMsg(e.message);
      }
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 3000);
  }

  const toggleTheme = () => {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      if (newMode) {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
      } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
      }
  };

  // --- CRUD & Actions ---

  const addSystemNotification = async (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (!currentUser) return;
    
    const notif: any = {
        userId: currentUser.id,
        message: msg,
        type: type,
        isRead: false,
        createdAt: new Date().toISOString()
    };
    await addNotification(currentUser.id, notif);

    const globalBotToken = systemSettings.telegramBotToken;
    const userChatId = currentUser.telegram?.chatId;
    const isTgEnabled = currentUser.telegram?.enabled;

    if (isTgEnabled && globalBotToken && userChatId) {
        const icons = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌'
        };
        const tgMsg = `${icons[type]} <b>Командный Планировщик</b>\n\n${msg}`;
        TelegramService.sendMessage(globalBotToken, userChatId, tgMsg).catch(console.error);
    }
};

  const handleSaveTask = async (task: Task) => {
    if (!currentWorkspace) return;
    try {
        if (tasks.some(t => t.id === task.id)) {
            await updateTask(currentWorkspace.id, task);
            showNotification("Задача обновлена");
            await addSystemNotification(`Задача "<b>${task.title}</b>" обновлена`, 'info');
        } else {
            const { id, ...newTask } = task;
            await addTask(currentWorkspace.id, newTask);
            showNotification("Задача создана");
            await addSystemNotification(`Новая задача: "<b>${task.title}</b>"`, 'success');
        }
    } catch (e) { console.error(e); }
  };

  const handleDeleteTask = async (taskId: string) => {
      if (!currentWorkspace) return;
      const task = tasks.find(t => t.id === taskId);
      await deleteTask(currentWorkspace.id, taskId);
      if (task) await addSystemNotification(`Задача "<b>${task.title}</b>" удалена`, 'warning');
  };

  const handleSaveProject = async (project: Project) => {
      if (!currentWorkspace) return;
      try {
          if (projects.some(p => p.id === project.id)) {
              await updateProject(currentWorkspace.id, project);
              showNotification("Проект обновлен");
          } else {
              const { id, ...newProj } = project;
              await addProject(currentWorkspace.id, newProj);
              showNotification("Проект создан");
          }
      } catch (e) { console.error(e); }
  };

  const handleDeleteProject = async (projectId: string) => {
      if (!currentWorkspace) return;
      await deleteProject(currentWorkspace.id, projectId);
      showNotification("Проект удален");
  };

  const handleSaveUser = async (user: User) => {
      try {
          await updateUserProfile(user);
          showNotification("Профиль сохранен");
          // If current user updated themselves
          if (currentUser?.id === user.id) {
              setCurrentUser({...currentUser, ...user});
          }
      } catch (e) {
          showNotification("Ошибка сохранения профиля", 'error');
      }
  };

  const handleAICommand = async (command: string) => {
      if (!currentWorkspace || !currentUser) return;
      setIsAIProcessing(true);
      try {
          const response = await APIService.aiGenerate(command, { projects, users });
          
          if (response.action === 'create_task') {
              const data = response.data;
              const newTask: any = {
                title: data.title || 'New Task',
                description: data.description || '',
                projectId: data.projectId || projects[0]?.id || '',
                status: TaskStatus.TODO,
                priority: (data.priority as TaskPriority) || TaskPriority.NORMAL,
                assigneeId: data.assigneeId || currentUser.id,
                startDate: data.startDate || new Date().toISOString(),
                dueDate: data.dueDate || new Date().toISOString(),
                tags: [],
                dependencies: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: currentUser.id
              };
              await addTask(currentWorkspace.id, newTask);
              showNotification(`ИИ: ${response.summary || 'Задача создана'}`);
          } else if (response.action === 'create_project') {
               const newProj: any = {
                   name: response.data.projectName,
                   description: response.data.projectDescription,
                   color: '#6366f1',
                   workspaceId: currentWorkspace.id
               };
               await addProject(currentWorkspace.id, newProj);
               showNotification(`ИИ: ${response.summary || 'Проект создан'}`);
          }
      } catch (e) {
          console.error("AI Error", e);
          showNotification("Ошибка ИИ ассистента", 'error');
      } finally {
          setIsAIProcessing(false);
      }
  };

  // --- Render ---

  if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader className="animate-spin" /></div>;

  if (!currentUser) {
      return (
          <AuthView 
            isLoading={false} 
            error={errorMsg}
            onLogin={(e, p) => handleAuth(true, e, p)}
            onRegister={(n, e, p) => handleAuth(false, n, e, p)}
          />
      );
  }

  return (
    <Layout 
        currentView={view} 
        onViewChange={setView} 
        onCreateTask={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
        user={currentUser}
        onLogout={AuthService.logout}
        notifications={notifications}
        onMarkNotificationRead={(id) => markNotificationRead(currentUser.id, id)}
        onMarkAllNotificationsRead={() => markAllNotificationsRead(currentUser.id)}
    >
        <div className="absolute top-4 left-20 md:left-4 z-50 md:z-auto w-48 md:w-auto">
             <WorkspaceSelector 
                workspaces={workspaces}
                currentWorkspace={currentWorkspace}
                onSelect={setCurrentWorkspace}
                currentUser={currentUser}
                onLogout={AuthService.logout}
             />
        </div>

        {notification && (
            <div className={`fixed top-4 right-4 z-[100] px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium animate-fade-in-down
                ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                {notification.message}
            </div>
        )}

        {currentWorkspace ? (
            <>
                {view === 'DASHBOARD' && <Dashboard tasks={tasks} projects={projects} users={users} />}
                {view === 'LIST' && <TaskList tasks={tasks} projects={projects} users={users} onTaskClick={t => {setEditingTask(t); setIsTaskModalOpen(true)}} onEditTask={t => {setEditingTask(t); setIsTaskModalOpen(true)}} />}
                {view === 'BOARD' && <KanbanBoard tasks={tasks} projects={projects} users={users} onTaskClick={t => {setEditingTask(t); setIsTaskModalOpen(true)}} onStatusChange={(id, s) => { const t = tasks.find(x => x.id === id); if(t) handleSaveTask({...t, status: s}) }} onEditTask={t => {setEditingTask(t); setIsTaskModalOpen(true)}} onDeleteTask={handleDeleteTask} />}
                {view === 'CALENDAR' && <CalendarView tasks={tasks} projects={projects} onTaskClick={() => {}} onEditTask={t => {setEditingTask(t); setIsTaskModalOpen(true)}} />}
                {view === 'GANTT' && <GanttChart tasks={tasks} projects={projects} onTaskClick={() => {}} onEditTask={t => {setEditingTask(t); setIsTaskModalOpen(true)}} />}
                {view === 'SETTINGS' && <SettingsView 
                    users={users} 
                    projects={projects}
                    onCreateProject={() => { setEditingProject(null); setIsProjectModalOpen(true); }}
                    onEditProject={(p) => { setEditingProject(p); setIsProjectModalOpen(true); }}
                    onEditUser={(u) => { setEditingUser(u); setIsUserModalOpen(true); }}
                    onInviteUser={() => { setEditingUser(null); setIsUserModalOpen(true); }}
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                    currentUser={currentUser}
                    onUpdateCurrentUser={handleSaveUser}
                    systemSettings={systemSettings}
                    onUpdateSystemSettings={saveSystemSettings}
                />}
            </>
        ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
                Создайте или выберите команду для начала работы
            </div>
        )}

      <AICommandBar onCommand={handleAICommand} isProcessing={isAIProcessing} />

      <TaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        task={editingTask}
        projects={projects}
        users={users}
      />
      
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
        onDelete={handleDeleteProject}
        project={editingProject}
      />

      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSave={handleSaveUser}
        onDelete={() => {}} 
        user={editingUser}
      />
    </Layout>
  );
}

export default App;