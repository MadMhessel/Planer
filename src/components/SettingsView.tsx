import React, { useMemo, useState } from 'react';
import { Workspace, WorkspaceInvite, WorkspaceMember, User, UserRole } from '../types';
import { FirestoreService } from '../services/firestore';

type Props = {
  workspace: Workspace;
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
  currentUser: User;
};

type Tab = 'members' | 'invites';

export const SettingsView: React.FC<Props> = ({
  workspace,
  members,
  invites,
  currentUser
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

    try {
      await FirestoreService.revokeInvite(workspace.id, token);
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">
            Настройки пространства: {workspace.name}
          </h2>
          <p className="text-xs text-slate-400">
            Управление участниками, ролями и приглашениями.
          </p>
        </div>
        <div className="text-xs text-slate-400">
          Владелец: <span className="font-medium">{workspace.ownerId}</span>
        </div>
      </div>

      {/* Таб переключения */}
      <div className="flex border-b border-slate-700 text-xs">
        <button
          onClick={() => setActiveTab('members')}
          className={
            'px-3 py-2 border-b-2 ' +
            (activeTab === 'members'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200')
          }
        >
          Участники ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('invites')}
          className={
            'px-3 py-2 border-b-2 ' +
            (activeTab === 'invites'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200')
          }
        >
          Приглашения ({pendingInvites.length})
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-900/30 border border-red-700 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {message && (
        <div className="text-xs text-emerald-300 bg-emerald-900/20 border border-emerald-700 rounded-md px-3 py-2">
          {message}
        </div>
      )}

      {/* Вкладка участники */}
      {activeTab === 'members' && (
        <div className="space-y-3">
          <table className="w-full text-xs border border-slate-800 rounded-lg overflow-hidden">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="px-2 py-2 text-left text-slate-400 font-normal">Почта</th>
                <th className="px-2 py-2 text-left text-slate-400 font-normal">Роль</th>
                <th className="px-2 py-2 text-left text-slate-400 font-normal">Статус</th>
                <th className="px-2 py-2 text-right text-slate-400 font-normal">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-slate-900/40">
              {sortedMembers.map(m => (
                <tr key={m.id} className="border-t border-slate-800">
                  <td className="px-2 py-2 text-slate-100">
                    {m.email}
                    {m.userId === currentUser.id && (
                      <span className="ml-1 text-[10px] text-sky-400">(вы)</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-800 text-[11px]">
                      {m.role}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-slate-300">
                    {m.status === 'ACTIVE' ? 'Активен' : m.status}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {canRemoveMember(m) && (
                      <button
                        onClick={() => handleRemoveMember(m)}
                        className="px-2 py-1 text-[11px] rounded-md border border-red-500/60 text-red-300 hover:bg-red-900/40"
                      >
                        Удалить
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {sortedMembers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-slate-400 text-center">
                    Участников пока нет.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!canManage && (
            <p className="text-[11px] text-slate-500">
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
              <label className="block mb-1 text-slate-300">
                Почта приглашённого
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-2 py-1 rounded-md bg-slate-900 border border-slate-700 text-xs"
                disabled={!canManage || loading}
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-slate-300">
                Роль
              </label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as UserRole)}
                className="px-2 py-1 rounded-md bg-slate-900 border border-slate-700 text-xs"
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
                className="w-full mt-4 sm:mt-0 px-3 py-2 rounded-md bg-sky-500 text-slate-900 font-medium hover:bg-sky-400 disabled:opacity-50"
              >
                {loading ? 'Создание…' : 'Отправить'}
              </button>
            </div>
          </form>

          <table className="w-full text-xs border border-slate-800 rounded-lg overflow-hidden">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="px-2 py-2 text-left text-slate-400 font-normal">Почта</th>
                <th className="px-2 py-2 text-left text-slate-400 font-normal">Роль</th>
                <th className="px-2 py-2 text-left text-slate-400 font-normal">Статус</th>
                <th className="px-2 py-2 text-right text-slate-400 font-normal">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-slate-900/40">
              {invites.map(inv => (
                <tr key={inv.id} className="border-t border-slate-800">
                  <td className="px-2 py-2 text-slate-100">
                    {inv.email}
                  </td>
                  <td className="px-2 py-2">
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-800 text-[11px]">
                      {inv.role}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-slate-300">
                    {inv.status}
                  </td>
                  <td className="px-2 py-2 text-right space-x-1">
                    <button
                      type="button"
                      onClick={() => handleCopyInviteLink(inv)}
                      className="px-2 py-1 text-[11px] rounded-md border border-slate-600 hover:bg-slate-800"
                    >
                      Скопировать
                    </button>
                    {inv.status === 'PENDING' && canManage && (
                      <button
                        type="button"
                        onClick={() => handleRevokeInvite(inv.token)}
                        className="px-2 py-1 text-[11px] rounded-md border border-red-500/60 text-red-300 hover:bg-red-900/40"
                      >
                        Отозвать
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {invites.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 py-3 text-slate-400 text-center">
                    Активных приглашений нет.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!canManage && (
            <p className="text-[11px] text-slate-500">
              Только владелец или администратор могут создавать и отзывать приглашения.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
