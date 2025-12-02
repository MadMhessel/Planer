import React, { useMemo, useState } from 'react';
import { Workspace, WorkspaceInvite, WorkspaceMember, User, UserRole } from '../types';
import { FirestoreService } from '../services/firestore';

type Props = {
  workspace: Workspace;
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
  currentUser: User;
  onNotification?: (title: string, message: string, type?: 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'PROJECT_UPDATED' | 'SYSTEM') => void;
};

type Tab = 'members' | 'invites';

export const SettingsView: React.FC<Props> = ({
  workspace,
  members,
  invites,
  currentUser,
  onNotification
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('members');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const currentMember = useMemo(
    () => members.find(m => m.userId === currentUser.id) || null,
    [members, currentUser.id]
  );

  const canManage = currentMember
    ? currentMember.role === 'OWNER' || currentMember.role === 'ADMIN'
    : false;

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
    if (!currentMember || !canManage) return;
    if (member.role === 'OWNER') return;
    if (!window.confirm(`Убрать пользователя ${member.email} из пространства?`)) return;

    setError(null);
    setMessage(null);

    try {
      await FirestoreService.removeMember(workspace.id, member.id, currentMember);
      
      // Добавляем уведомление
      if (onNotification) {
        onNotification(
          'Участник удален',
          `Пользователь ${member.email} был удален из рабочего пространства`,
          'SYSTEM'
        );
      }
    } catch (e: any) {
      setError(e?.message || 'Не удалось удалить участника.');
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
                    {canRemoveMember(m) && (
                      <button
                        onClick={() => handleRemoveMember(m)}
                        className="px-3 py-1.5 text-[11px] rounded-lg border border-red-400 dark:border-red-500/60 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/40 hover:border-red-500 dark:hover:border-red-500/80 transition-all font-medium"
                      >
                        Удалить
                      </button>
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
    </div>
  );
};
