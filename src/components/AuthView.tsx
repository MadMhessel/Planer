import React, { useState } from 'react';

type AuthViewProps = {
  onAuth: (isLogin: boolean, ...args: string[]) => void | Promise<void>;
};

export const AuthView: React.FC<AuthViewProps> = ({ onAuth }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await onAuth(false);
    } catch (err: any) {
      setError(err.message || 'Ошибка при входе через Google');
      console.error('Ошибка аутентификации:', err);
    } finally {
      setIsLoading(false);
    }
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

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-medium py-2 rounded-lg transition"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Вход...</span>
            </>
          ) : (
            <span>Войти через Google</span>
          )}
        </button>

        <p className="mt-4 text-[11px] text-slate-500 text-center">
          Авторизация нужна только для привязки задач к вашему аккаунту
          и совместной работы в рабочих пространствах.
        </p>
        
        <p className="mt-2 text-[10px] text-slate-600 text-center">
          Если возникают проблемы, проверьте консоль браузера (F12) для деталей
        </p>
      </div>
    </div>
  );
};
