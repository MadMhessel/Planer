import React, { useState } from 'react';

type AuthViewProps = {
  onAuth: (isLogin: boolean, ...args: string[]) => void | Promise<void>;
};

export const AuthView: React.FC<AuthViewProps> = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    onAuth(false);
  };

  const handleDemoLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      // Используем специальный флаг для демо-режима
      await onAuth(false, 'demo');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при входе в демо-режим';
      setError(errorMessage);
      // Ошибка уже логируется в AuthService
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        // Вход
        await onAuth(true, email, password);
      } else {
        // Регистрация
        await onAuth(false, email, password, displayName);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при аутентификации';
      setError(errorMessage);
      // Ошибка уже логируется в AuthService
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-semibold mb-2 text-center text-gray-900 dark:text-slate-100">
          Command Task Planner
        </h1>
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-6 text-center">
          {isLogin ? 'Войдите, чтобы управлять задачами' : 'Создайте аккаунт для начала работы'}
        </p>

        {/* Форма email/password */}
        <form onSubmit={handleEmailAuth} className="space-y-4 mb-4">
          {!isLogin && (
            <div>
              <label className="block text-sm text-gray-700 dark:text-slate-300 mb-1">
                Имя
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Ваше имя"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-700 dark:text-slate-300 mb-1">
              Email
            </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete={isLogin ? "email" : "username"}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="your@email.com"
              />
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-slate-300 mb-1">
              Пароль
            </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="••••••"
              />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-sky-500 hover:bg-sky-400 disabled:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition"
          >
            {isLoading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>

        {/* Переключение между входом и регистрацией */}
        <div className="text-center mb-4">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-300 underline"
          >
            {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
        </div>

        {/* Разделитель */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-gray-200 dark:border-slate-700"></div>
          <span className="px-3 text-sm text-gray-500 dark:text-slate-500">или</span>
          <div className="flex-1 border-t border-gray-200 dark:border-slate-700"></div>
        </div>

        {/* Кнопка Демо режим */}
        <button
          onClick={handleDemoLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg transition shadow-md hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Демо режим</span>
        </button>

        {/* Кнопка Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 font-medium py-2 rounded-lg transition mt-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Войти через Google</span>
        </button>

        <div className="mt-4 space-y-2">
          <p className="text-[11px] text-gray-500 dark:text-slate-500 text-center">
            Авторизация нужна только для привязки задач к вашему аккаунту
            и совместной работы в рабочих пространствах.
          </p>
          <p className="text-[10px] text-gray-400 dark:text-slate-600 text-center">
            💡 Демо режим позволяет протестировать приложение без регистрации
          </p>
        </div>
      </div>
    </div>
  );
};
