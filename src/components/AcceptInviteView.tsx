import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { FirestoreService } from '../services/firestore';
import { User, WorkspaceInvite } from '../types';

type InviteContext = {
  workspaceId: string;
  token: string;
};

type Props = {
  currentUser: User;
  inviteContext: InviteContext;
  onClose: () => void;
};

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; invite: WorkspaceInvite }
  | { status: 'accepted' };

export const AcceptInviteView: React.FC<Props> = ({
  currentUser,
  inviteContext,
  onClose
}) => {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const run = async () => {
      try {
        const invite = await FirestoreService.getInvite(
          inviteContext.workspaceId,
          inviteContext.token
        );

        if (!invite) {
          setState({ status: 'error', message: 'Приглашение не найдено.' });
          return;
        }

        const now = new Date();
        if (new Date(invite.expiresAt) < now) {
          setState({ status: 'error', message: 'Срок действия приглашения истёк.' });
          return;
        }

        if (invite.status !== 'PENDING') {
          setState({
            status: 'error',
            message: 'Приглашение уже было использовано или отозвано.'
          });
          return;
        }

        if (invite.email.toLowerCase() !== currentUser.email.toLowerCase()) {
          setState({
            status: 'error',
            message: `Это приглашение предназначено для ${invite.email}, а вы вошли как ${currentUser.email}.`
          });
          return;
        }

        setState({ status: 'ready', invite });
      } catch (e: any) {
        setState({
          status: 'error',
          message: e?.message || 'Ошибка при проверке приглашения.'
        });
      }
    };

    run();
  }, [inviteContext.workspaceId, inviteContext.token, currentUser.email]);

  const handleAccept = async () => {
    if (state.status !== 'ready') return;
    try {
      await FirestoreService.acceptInvite(
        inviteContext.workspaceId,
        inviteContext.token,
        currentUser
      );
      setState({ status: 'accepted' });

      // чистим параметры в адресной строке
      const url = new URL(window.location.href);
      url.searchParams.delete('invite');
      url.searchParams.delete('workspace');
      window.history.replaceState({}, '', url.toString());

      // Даем время для обновления подписок Firestore
      setTimeout(() => {
        onClose();
        // Принудительно обновляем страницу, чтобы workspace появился в списке
        window.location.reload();
      }, 2000);
    } catch (e: any) {
      setState({
        status: 'error',
        message: e?.message || 'Не удалось принять приглашение.'
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/80 border border-slate-700 p-6 shadow-xl">
        {state.status === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            <p className="text-sm text-slate-300">
              Проверяем приглашение…
            </p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="w-10 h-10 text-red-500" />
            <p className="text-sm text-slate-200 text-center">
              {state.message}
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 text-sm rounded-lg bg-slate-800 hover:bg-slate-700"
            >
              Вернуться в приложение
            </button>
          </div>
        )}

        {state.status === 'ready' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              Приглашение в рабочее пространство
            </h2>
            <p className="text-sm text-slate-300">
              Вас пригласили в рабочее пространство с ролью{' '}
              <span className="font-semibold">{state.invite.role}</span>.
            </p>
            <p className="text-xs text-slate-400">
              Приглашение для адреса: {state.invite.email}
            </p>
            <button
              onClick={handleAccept}
              className="w-full mt-3 px-4 py-2 text-sm rounded-lg bg-sky-500 text-slate-900 font-medium hover:bg-sky-400"
            >
              Принять приглашение
            </button>
            <button
              onClick={onClose}
              className="w-full mt-2 px-4 py-2 text-xs rounded-lg border border-slate-600 hover:bg-slate-800"
            >
              Отменить
            </button>
          </div>
        )}

        {state.status === 'accepted' && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <p className="text-sm text-slate-200 text-center">
              Вы успешно присоединились к рабочему пространству.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
