import React from 'react';

type AuthViewProps = {
  onAuth: (isLogin: boolean, ...args: string[]) => void | Promise<void>;
};

export const AuthView: React.FC<AuthViewProps> = ({ onAuth }) => {
  const handleGoogleLogin = () => {
    onAuth(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <div className="w-full max-w-sm bg-slate-900/70 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-semibold mb-2 text-center">
          Command Task Planner
        </h1>
        <p className="text-sm text-slate-400 mb-6 text-center">
          Войдите, чтобы управлять задачами своей команды
        </p>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-900 font-medium py-2 rounded-lg transition"
        >
          <span>Войти через Google</span>
        </button>

        <p className="mt-4 text-[11px] text-slate-500 text-center">
          Авторизация нужна только для привязки задач к вашему аккаунту
          и совместной работы в рабочих пространствах.
        </p>
      </div>
    </div>
  );
};
