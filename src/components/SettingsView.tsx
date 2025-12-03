import React, { useMemo, useState } from 'react';
import { Workspace, WorkspaceInvite, WorkspaceMember, User, UserRole, Project } from '../types';
import { FirestoreService } from '../services/firestore';
import { SUPER_ADMINS } from '../constants/superAdmins';
import { getMoscowISOString } from '../utils/dateUtils';
import { Plus, Edit2, Trash2, Folder } from 'lucide-react';

type Props = {
  workspace: Workspace;
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
  projects: Project[];
  currentUser: User;
  onCreateProject: (project: Partial<Project>) => Promise<Project>;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onNotification?: (title: string, message: string, type?: 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'PROJECT_UPDATED' | 'SYSTEM') => void;
};

type Tab = 'members' | 'invites' | 'projects';

export const SettingsView: React.FC<Props> = ({
  workspace,
  members,
  invites,
  projects,
  currentUser,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onNotification
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  // Project form state
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectColor, setProjectColor] = useState('#3b82f6');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);

  const currentMember = useMemo(
    () => members.find(m => m.userId === currentUser.id) || null,
    [members, currentUser.id]
  );

  // Проверка прав: супер-админ или OWNER/ADMIN в workspace
  const canManage = useMemo(() => {
    // Глобальные супер-админы имеют все права
    const isSuperAdmin = currentUser.email && SUPER_ADMINS.map(e => e.toLowerCase()).includes(currentUser.email.toLowerCase());
    if (isSuperAdmin) {
      console.log('[SettingsView] Super admin detected:', currentUser.email);
      return true;
    }
    // Обычная проверка роли
    const hasRole = currentMember
      ? currentMember.role === 'OWNER' || currentMember.role === 'ADMIN'
      : false;
    
    if (!hasRole) {
      console.log('[SettingsView] No manage rights:', {
        currentUserEmail: currentUser.email,
        currentMember: currentMember,
        memberRole: currentMember?.role,
        allMembers: members.map(m => ({ userId: m.userId, email: m.email, role: m.role }))
      });
    }
    
    return hasRole;
  }, [currentUser.email, currentMember, members]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const invite = await FirestoreService.createInvite(
        workspace.id,
        email,
        inviteRole,
        currentUser.id
      );

      const link = `${window.location.origin}?invite=${invite.token}&workspace=${workspace.id}`;
      try {
        await navigator.clipboard.writeText(link);
        setMessage('Приглашение создано. Ссылка скопирована в буфер обмена.');
      } catch {
        setMessage('Приглашение создано. Скопируйте ссылку вручную.');
      }

      // Добавляем уведомление
      if (onNotification) {
        onNotification(
          'Приглашение создано',
          `Приглашение отправлено на ${email} с ролью ${inviteRole}`,
          'SYSTEM'
        );
      }

      setInviteEmail('');
    } catch (e: any) {
      setError(e?.message || 'Не удалось создать приглашение.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeInvite = async (token: string) => {
    if (!canManage) return;
    setError(null);
    setMessage(null);

    const invite = invites.find(i => i.token === token);
    try {
      await FirestoreService.revokeInvite(workspace.id, token);
      
      // Добавляем уведомление
      if (onNotification && invite) {
        onNotification(
          'Приглашение отозвано',
          `Приглашение для ${invite.email} было отозвано`,
          'SYSTEM'
        );
      }
    } catch (e: any) {
      setError(e?.message || 'Не удалось отозвать приглашение.');
    }
  };

  const handleCopyInviteLink = (inv: WorkspaceInvite) => {
    const link = `${window.location.origin}?invite=${inv.token}&workspace=${workspace.id}`;
    navigator.clipboard
      .writeText(link)
      .then(() => setMessage('Ссылка на приглашение скопирована.'))
      .catch(() => setError('Не удалось скопировать ссылку.'));
  };

  const handleRemoveMember = async (member: WorkspaceMember) => {
    // Проверяем права до удаления
    if (!canManage) {
      setError('У вас нет прав для удаления участников');
      return;
    }
    
    if (member.role === 'OWNER') {
      setError('Нельзя удалить владельца рабочего пространства');
      return;
    }
    
    if (!window.confirm(`Убрать пользователя ${member.email} из пространства?`)) {
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      // Для супер-админов создаем временный WorkspaceMember объект, если currentMember отсутствует
      let actingMember = currentMember;
      if (!actingMember && canManage) {
        // Проверяем, является ли пользователь супер-админом
        const isSuperAdmin = currentUser.email && SUPER_ADMINS.map(e => e.toLowerCase()).includes(currentUser.email.toLowerCase());
        console.log('[SettingsView] Super admin check:', {
          currentUserEmail: currentUser.email,
          isSuperAdmin,
          canManage,
          currentMember
        });
        if (isSuperAdmin) {
          // Создаем временный объект с ролью OWNER для супер-админа
          actingMember = {
            id: currentUser.id,
            userId: currentUser.id,
            email: currentUser.email || '',
            role: 'OWNER',
            joinedAt: getMoscowISOString(),
            invitedBy: currentUser.id,
            status: 'ACTIVE'
          };
          console.log('[SettingsView] Created actingMember for super admin:', actingMember);
        } else {
          setError('Не удалось определить вашу роль');
          setLoading(false);
          return;
        }
      }
      
      if (!actingMember) {
        setError('Не удалось определить вашу роль');
        setLoading(false);
        return;
      }

      console.log('[SettingsView] Attempting to remove member:', {
        workspaceId: workspace.id,
        memberId: member.id,
        memberEmail: member.email,
        memberRole: member.role,
        actingUser: {
          id: actingMember.userId,
          email: actingMember.email,
          role: actingMember.role
        },
        currentUser: {
          id: currentUser.id,
          email: currentUser.email
        }
      });

      await FirestoreService.removeMember(workspace.id, member.id, actingMember);
      
      setMessage(`Пользователь ${member.email} успешно удален`);
      
      // Добавляем уведомление
      if (onNotification) {
        onNotification(
          'Участник удален',
          `Пользователь ${member.email} был удален из рабочего пространства`,
          'SYSTEM'
        );
      }
    } catch (e: any) {
      const errorMessage = e?.message || 'Не удалось удалить участника';
      setError(errorMessage);
      console.error('Failed to remove member:', e);
    } finally {
      setLoading(false);
    }
  };

  const canRemoveMember = (member: WorkspaceMember): boolean => {
    if (!canManage) return false;
    if (member.role === 'OWNER') return false;
    if (member.userId === currentUser.id && currentMember?.role !== 'OWNER') {
      // не даём обычному админу удалить сам себя через этот экран
      return false;
    }
    return true;
  };

  const sortedMembers = [...members].sort((a, b) => {
    const order: Record<UserRole, number> = {
      OWNER: 0,
      ADMIN: 1,
      MEMBER: 2,
      VIEWER: 3
    };
    return order[a.role] - order[b.role];
  });

  const pendingInvites = invites.filter(i => i.status === 'PENDING');

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    if (!canManage) return;

    setProjectLoading(true);
    setError(null);
    setMessage(null);

    try {
      const newProject = await onCreateProject({
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
        color: projectColor,
        workspaceId: workspace.id,
        status: 'ACTIVE'
      });

      setProjectName('');
      setProjectDescription('');
      setProjectColor('#3b82f6');
      setMessage(`Проект "${newProject.name}" успешно создан`);

      if (onNotification) {
        onNotification(
          'Проект создан',
          `Проект "${newProject.name}" был успешно создан`,
          'PROJECT_UPDATED'
        );
      }
    } catch (e: any) {
      setError(e?.message || 'Не удалось создать проект');
    } finally {
      setProjectLoading(false);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectDescription(project.description || '');
    setProjectColor(project.color || '#3b82f6');
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !projectName.trim()) return;
    if (!canManage) return;

    setProjectLoading(true);
    setError(null);
    setMessage(null);

    try {
      await onUpdateProject(editingProject.id, {
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
        color: projectColor
      });

      setEditingProject(null);
      setProjectName('');
      setProjectDescription('');
      setProjectColor('#3b82f6');
      setMessage('Проект успешно обновлён');

      if (onNotification) {
        onNotification(
          'Проект обновлён',
          `Проект "${projectName.trim()}" был успешно обновлён`,
          'PROJECT_UPDATED'
        );
      }
    } catch (e: any) {
      setError(e?.message || 'Не удалось обновить проект');
    } finally {
      setProjectLoading(false);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!canManage) return;
    if (!window.confirm(`Удалить проект "${project.name}"? Все задачи в этом проекте останутся без проекта.`)) return;

    setError(null);
    setMessage(null);

    try {
      await onDeleteProject(project.id);
      setMessage(`Проект "${project.name}" удалён`);

      if (onNotification) {
        onNotification(
          'Проект удалён',
          `Проект "${project.name}" был удалён`,
          'PROJECT_UPDATED'
        );
      }
    } catch (e: any) {
      setError(e?.message || 'Не удалось удалить проект');
    }
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setProjectName('');
    setProjectDescription('');
    setProjectColor('#3b82f6');
  };

  const sortedProjects = [...projects].sort((a, b) => {
    if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
    if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-gray-50 dark:bg-slate-900/40 backdrop-blur-sm border border-gray-200 dark:border-slate-700/30">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-sky-500 to-indigo-600 dark:from-sky-400 dark:to-indigo-400 bg-clip-text text-transparent mb-1">
            Настройки пространства: {workspace.name}
          </h2>
          <p className="text-xs text-gray-600 dark:text-slate-400">
            Управление участниками, ролями и приглашениями.
          </p>
        </div>
        <div className="text-xs text-gray-600 dark:text-slate-400">
          Владелец: <span className="font-semibold text-gray-900 dark:text-slate-300">{workspace.ownerId}</span>
        </div>
      </div>

      {/* Таб переключения */}
      <div className="flex border-b border-gray-200 dark:border-slate-700/50 text-sm bg-white dark:bg-slate-900/40 backdrop-blur-sm rounded-t-xl p-1">
        <button
          onClick={() => setActiveTab('members')}
          className={
            'px-4 py-2 rounded-lg font-semibold transition-all ' +
            (activeTab === 'members'
              ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/50')
          }
        >
          Участники ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('invites')}
          className={
            'px-4 py-2 rounded-lg font-semibold transition-all ' +
            (activeTab === 'invites'
              ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/50')
          }
        >
          Приглашения ({pendingInvites.length})
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={
            'px-4 py-2 rounded-lg font-semibold transition-all ' +
            (activeTab === 'projects'
              ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800/50')
          }
        >
          Проекты ({projects.length})
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 rounded-lg px-4 py-3 backdrop-blur-sm shadow-lg">
          {error}
        </div>
      )}

      {message && (
        <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-lg px-4 py-3 backdrop-blur-sm shadow-lg">
          {message}
        </div>
      )}

      {/* Вкладка участники */}
      {activeTab === 'members' && (
        <div className="space-y-3">
          <table className="w-full text-xs border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900/40">
            <thead className="bg-gray-100 dark:bg-slate-900/80">
              <tr>
                <th className="px-2 py-2 text-left text-gray-700 dark:text-slate-400 font-normal">Почта</th>
                <th className="px-2 py-2 text-left text-gray-700 dark:text-slate-400 font-normal">Роль</th>
                <th className="px-2 py-2 text-left text-gray-700 dark:text-slate-400 font-normal">Статус</th>
                <th className="px-2 py-2 text-right text-gray-700 dark:text-slate-400 font-normal">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900/40">
              {sortedMembers.map(m => (
                <tr key={m.id} className="border-t border-gray-200 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 text-gray-900 dark:text-slate-100 font-medium">
                    {m.email}
                    {m.userId === currentUser.id && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-300 dark:border-sky-500/30">(вы)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800/80 border border-gray-300 dark:border-slate-700/50 text-[11px] font-semibold text-gray-700 dark:text-slate-300">
                      {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-[11px] font-medium ${
                      m.status === 'ACTIVE' 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50' 
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                    }`}>
                      {m.status === 'ACTIVE' ? 'Активен' : m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canRemoveMember(m) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveMember(m);
                        }}
                        disabled={loading}
                        className="px-3 py-1.5 text-[11px] rounded-lg border border-red-400 dark:border-red-500/60 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/40 hover:border-red-500 dark:hover:border-red-500/80 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Удаление...' : 'Удалить'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}

              {sortedMembers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-gray-600 dark:text-slate-400 text-center">
                    Участников пока нет.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!canManage && (
            <p className="text-[11px] text-gray-600 dark:text-slate-500">
              У вас нет прав для изменения состава участников. Только владелец или
              администратор может приглашать и удалять пользователей.
            </p>
          )}
        </div>
      )}

      {/* Вкладка приглашения */}
      {activeTab === 'invites' && (
        <div className="space-y-3">
          <form
            onSubmit={handleInviteSubmit}
            className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end text-xs"
          >
            <div className="flex-1">
              <label className="block mb-1 text-gray-700 dark:text-slate-300">
                Почта приглашённого
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-xs text-gray-900 dark:text-slate-100"
                disabled={!canManage || loading}
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-gray-700 dark:text-slate-300">
                Роль
              </label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as UserRole)}
                className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-xs text-gray-900 dark:text-slate-100"
                disabled={!canManage || loading}
              >
                <option value="MEMBER">MEMBER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </div>
            <div className="sm:w-[140px]">
              <button
                type="submit"
                disabled={!canManage || loading}
                className="w-full mt-4 sm:mt-0 px-3 py-2 rounded-md bg-sky-500 text-white dark:text-slate-900 font-medium hover:bg-sky-400 disabled:opacity-50"
              >
                {loading ? 'Создание…' : 'Отправить'}
              </button>
            </div>
          </form>

          <table className="w-full text-xs border border-gray-200 dark:border-slate-700/50 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40 backdrop-blur-sm shadow-lg">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-800/80 dark:to-slate-900/80">
              <tr>
                <th className="px-4 py-3 text-left text-gray-900 dark:text-slate-300 font-semibold">Почта</th>
                <th className="px-4 py-3 text-left text-gray-900 dark:text-slate-300 font-semibold">Роль</th>
                <th className="px-4 py-3 text-left text-gray-900 dark:text-slate-300 font-semibold">Статус</th>
                <th className="px-4 py-3 text-right text-gray-900 dark:text-slate-300 font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900/60">
              {invites.map(inv => (
                <tr key={inv.id} className="border-t border-gray-200 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 text-gray-900 dark:text-slate-100 font-medium">
                    {inv.email}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800/80 border border-gray-300 dark:border-slate-700/50 text-[11px] font-semibold text-gray-700 dark:text-slate-300">
                      {inv.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-[11px] font-medium ${
                      inv.status === 'PENDING'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50'
                        : inv.status === 'ACCEPTED'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => handleCopyInviteLink(inv)}
                      className="px-3 py-1.5 text-[11px] rounded-lg border border-gray-300 dark:border-slate-600/50 hover:bg-gray-100 dark:hover:bg-slate-800/80 hover:border-gray-400 dark:hover:border-slate-500 transition-all font-medium text-gray-700 dark:text-slate-300"
                    >
                      Скопировать
                    </button>
                    {inv.status === 'PENDING' && canManage && (
                      <button
                        type="button"
                        onClick={() => handleRevokeInvite(inv.token)}
                        className="px-3 py-1.5 text-[11px] rounded-lg border border-red-400 dark:border-red-500/60 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/40 hover:border-red-500 dark:hover:border-red-500/80 transition-all font-medium"
                      >
                        Отозвать
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {invites.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-gray-600 dark:text-slate-400 text-center">
                    Активных приглашений нет.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!canManage && (
            <p className="text-[11px] text-gray-600 dark:text-slate-500">
              Только владелец или администратор могут создавать и отзывать приглашения.
            </p>
          )}
        </div>
      )}

      {/* Вкладка проекты */}
      {activeTab === 'projects' && (
        <div className="space-y-3">
          {/* Форма создания/редактирования проекта */}
          {canManage && (
            <form
              onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
              className="p-4 rounded-xl bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 shadow-lg space-y-3"
            >
              <div className="flex items-center gap-2 mb-3">
                <Folder className="w-5 h-5 text-sky-500" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">
                  {editingProject ? 'Редактировать проект' : 'Создать новый проект'}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block mb-1 text-xs text-gray-700 dark:text-slate-300">
                    Название проекта *
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    placeholder="Название проекта"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                    disabled={projectLoading}
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs text-gray-700 dark:text-slate-300">
                    Цвет
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={projectColor}
                      onChange={e => setProjectColor(e.target.value)}
                      className="w-full h-10 rounded-lg border border-gray-300 dark:border-slate-600 cursor-pointer"
                      disabled={projectLoading}
                    />
                    <input
                      type="text"
                      value={projectColor}
                      onChange={e => setProjectColor(e.target.value)}
                      className="w-20 px-2 py-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-xs text-gray-900 dark:text-slate-100"
                      disabled={projectLoading}
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-xs text-gray-700 dark:text-slate-300">
                  Описание
                </label>
                <textarea
                  value={projectDescription}
                  onChange={e => setProjectDescription(e.target.value)}
                  placeholder="Описание проекта (необязательно)"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 resize-none"
                  disabled={projectLoading}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={projectLoading || !projectName.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 text-white font-medium hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {projectLoading ? 'Сохранение...' : editingProject ? 'Сохранить изменения' : 'Создать проект'}
                </button>
                {editingProject && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={projectLoading}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    Отмена
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Список проектов */}
          <div className="border border-gray-200 dark:border-slate-700/50 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40 backdrop-blur-sm shadow-lg">
            <table className="w-full text-xs">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-800/80 dark:to-slate-900/80">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-900 dark:text-slate-300 font-semibold">Проект</th>
                  <th className="px-4 py-3 text-left text-gray-900 dark:text-slate-300 font-semibold">Описание</th>
                  <th className="px-4 py-3 text-left text-gray-900 dark:text-slate-300 font-semibold">Статус</th>
                  <th className="px-4 py-3 text-right text-gray-900 dark:text-slate-300 font-semibold">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900/60">
                {sortedProjects.map(project => (
                  <tr key={project.id} className="border-t border-gray-200 dark:border-slate-800/50 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: project.color || '#3b82f6' }}
                        />
                        <span className="font-medium text-gray-900 dark:text-slate-100">
                          {project.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400">
                      {project.description || <span className="text-gray-400 dark:text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-[11px] font-medium ${
                        project.status === 'ACTIVE'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50'
                          : project.status === 'ARCHIVED'
                          ? 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50'
                      }`}>
                        {project.status === 'ACTIVE' ? 'Активен' : project.status === 'ARCHIVED' ? 'Архивирован' : 'Запланирован'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleEditProject(project)}
                              className="p-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:border-gray-400 dark:hover:border-slate-500 transition-all"
                              title="Редактировать"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProject(project)}
                              className="p-1.5 rounded-lg border border-red-400 dark:border-red-500/60 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/40 hover:border-red-500 dark:hover:border-red-500/80 transition-all"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {sortedProjects.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-600 dark:text-slate-400">
                      <Folder className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-slate-600" />
                      <p className="text-sm">Проектов пока нет</p>
                      {canManage && (
                        <p className="text-xs mt-1">Создайте первый проект выше</p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!canManage && (
            <p className="text-[11px] text-gray-600 dark:text-slate-500">
              Только владелец или администратор могут создавать и редактировать проекты.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
