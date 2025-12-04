import React, { useState, useEffect } from 'react';
import { validateEmail, validatePassword, validateDisplayName } from '../utils/validators';
import { Eye, EyeOff, Lock, Mail, User, Sparkles, AlertCircle } from 'lucide-react';

type AuthViewProps = {
  onAuth: (isLogin: boolean, ...args: string[]) => void | Promise<void>;
};

type FieldErrors = {
  email?: string;
  password?: string;
  displayName?: string;
};

export const AuthView: React.FC<AuthViewProps> = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false); // Для будущей функциональности 2FA
  const [twoFACode, setTwoFACode] = useState('');
  
  // Ошибки валидации полей
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Общая ошибка от сервера
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Очистка ошибок при изменении режима
  useEffect(() => {
    setFieldErrors({});
    setServerError(null);
    setEmail('');
    setPassword('');
    setDisplayName('');
    setTouched({});
    setShowPassword(false);
    setShow2FA(false);
    setTwoFACode('');
  }, [isLogin]);

  // Валидация полей в реальном времени (после первого касания)
  const validateField = (fieldName: 'email' | 'password' | 'displayName', value: string) => {
    if (!touched[fieldName]) return;

    let result;
    switch (fieldName) {
      case 'email':
        result = validateEmail(value);
        break;
      case 'password':
        result = validatePassword(value, !isLogin);
        break;
      case 'displayName':
        result = validateDisplayName(value);
        break;
      default:
        return;
    }

    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: result.errors[0] || undefined
    }));
  };

  const handleBlur = (fieldName: 'email' | 'password' | 'displayName') => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    const value = fieldName === 'email' ? email : fieldName === 'password' ? password : displayName;
    validateField(fieldName, value);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setServerError(null);
    if (touched.email) {
      validateField('email', value);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setServerError(null);
    if (touched.password) {
      validateField('password', value);
    }
  };

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDisplayName(value);
    setServerError(null);
    if (touched.displayName) {
      validateField('displayName', value);
    }
  };

  const handleGoogleLogin = async () => {
    setServerError(null);
    setIsLoading(true);
    try {
      await onAuth(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при входе через Google';
      setServerError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setServerError(null);
    setFieldErrors({});
    setIsLoading(true);
    try {
      await onAuth(false, 'demo');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при входе в демо-режим';
      setServerError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    
    // Помечаем все поля как touched для показа ошибок
    const allTouched = {
      email: true,
      password: true,
      ...(!isLogin && { displayName: true })
    };
    setTouched(allTouched);

    // Валидация всех полей
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password, !isLogin);
    const displayNameValidation = !isLogin ? validateDisplayName(displayName) : { isValid: true, errors: [] };

    const newFieldErrors: FieldErrors = {};
    if (!emailValidation.isValid) {
      newFieldErrors.email = emailValidation.errors[0];
    }
    if (!passwordValidation.isValid) {
      newFieldErrors.password = passwordValidation.errors[0];
    }
    if (!displayNameValidation.isValid) {
      newFieldErrors.displayName = displayNameValidation.errors[0];
    }

    setFieldErrors(newFieldErrors);

    // Если есть ошибки валидации, не отправляем форму
    if (Object.keys(newFieldErrors).length > 0) {
      return;
    }

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
      setServerError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // Заглушка для будущей функциональности восстановления пароля
    setServerError('Функция восстановления пароля будет доступна в ближайшее время. Пожалуйста, обратитесь к администратору.');
  };

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const isFormValid = !hasFieldErrors && email.trim() && password.trim() && (isLogin || displayName.trim());

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-gray-900 dark:text-slate-100 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900/90 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl">
        {/* Заголовок и описание */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Lock className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900 dark:text-slate-100 bg-gradient-to-r from-sky-600 to-indigo-600 dark:from-sky-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Command Task Planner
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400 mb-1">
            {isLogin 
              ? 'Войдите в свой аккаунт' 
              : 'Создайте аккаунт для начала работы'}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-500">
            {isLogin
              ? 'Управляйте задачами, проектами и командой в одном месте'
              : 'Начните планировать задачи уже сегодня'}
          </p>
        </div>

        {/* Форма email/password */}
        <form onSubmit={handleEmailAuth} className="space-y-4 mb-4" noValidate>
          {/* Поле имени (только для регистрации) */}
          {!isLogin && (
            <div>
              <label 
                htmlFor="displayName" 
                className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5"
              >
                Имя
                <span className="text-red-500 ml-1" aria-label="обязательное поле">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 dark:text-slate-500" aria-hidden="true" />
                </div>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={handleDisplayNameChange}
                  onBlur={() => handleBlur('displayName')}
                  autoComplete="name"
                  className={`w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-slate-800 border rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.displayName
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500'
                  }`}
                  placeholder="Ваше имя или псевдоним"
                  aria-invalid={!!fieldErrors.displayName}
                  aria-describedby={fieldErrors.displayName ? 'displayName-error' : 'displayName-help'}
                />
              </div>
              {fieldErrors.displayName && (
                <p id="displayName-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1" role="alert">
                  <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  {fieldErrors.displayName}
                </p>
              )}
              {!fieldErrors.displayName && (
                <p id="displayName-help" className="mt-1.5 text-xs text-gray-500 dark:text-slate-500 sr-only">
                  Введите ваше имя или псевдоним (минимум 2 символа)
                </p>
              )}
            </div>
          )}

          {/* Поле email */}
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5"
            >
              Email
              <span className="text-red-500 ml-1" aria-label="обязательное поле">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400 dark:text-slate-500" aria-hidden="true" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={() => handleBlur('email')}
                required
                autoComplete={isLogin ? "email" : "username"}
                className={`w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-slate-800 border rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                  fieldErrors.email
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500'
                }`}
                placeholder="your@email.com"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : 'email-help'}
              />
            </div>
            {fieldErrors.email && (
              <p id="email-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1" role="alert">
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                {fieldErrors.email}
              </p>
            )}
            {!fieldErrors.email && (
              <p id="email-help" className="mt-1.5 text-xs text-gray-500 dark:text-slate-500 sr-only">
                Введите ваш email адрес
              </p>
            )}
          </div>

          {/* Поле пароля */}
          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5"
            >
              Пароль
              <span className="text-red-500 ml-1" aria-label="обязательное поле">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400 dark:text-slate-500" aria-hidden="true" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => handleBlur('password')}
                required
                minLength={isLogin ? 6 : 8}
                autoComplete={isLogin ? "current-password" : "new-password"}
                className={`w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                  fieldErrors.password
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500'
                }`}
                placeholder={isLogin ? "Введите пароль" : "Минимум 8 символов"}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : 'password-help'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 rounded"
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Eye className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1" role="alert">
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                {fieldErrors.password}
              </p>
            )}
            {!fieldErrors.password && !isLogin && (
              <p id="password-help" className="mt-1.5 text-xs text-gray-500 dark:text-slate-500">
                Пароль должен содержать минимум 8 символов
              </p>
            )}
            {!fieldErrors.password && isLogin && (
              <p id="password-help" className="mt-1.5 text-xs text-gray-500 dark:text-slate-500 sr-only">
                Введите ваш пароль
              </p>
            )}
          </div>

          {/* Ссылка "Забыли пароль?" (только для входа) */}
          {isLogin && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 underline focus:outline-none focus:ring-2 focus:ring-sky-500 rounded"
                aria-label="Восстановить пароль"
              >
                Забыли пароль?
              </button>
            </div>
          )}

          {/* 2FA поле (скрытое, для будущего использования) */}
          {show2FA && (
            <div className="animate-fade-in">
              <label 
                htmlFor="twoFACode" 
                className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5"
              >
                Код двухфакторной аутентификации
                <span className="text-red-500 ml-1" aria-label="обязательное поле">*</span>
              </label>
              <input
                id="twoFACode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
                aria-label="Введите 6-значный код из приложения-аутентификатора"
              />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-slate-500 text-center">
                Введите 6-значный код из приложения-аутентификатора
              </p>
            </div>
          )}

          {/* Общая ошибка от сервера */}
          {serverError && (
            <div 
              className="p-3 bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-start gap-2" 
              role="alert"
              aria-live="polite"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Кнопка отправки формы */}
          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Обработка...
              </span>
            ) : (
              isLogin ? 'Войти' : 'Создать аккаунт'
            )}
          </button>
        </form>

        {/* Переключение между входом и регистрацией */}
        <div className="text-center mb-4">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setServerError(null);
              setFieldErrors({});
            }}
            className="text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-300 underline focus:outline-none focus:ring-2 focus:ring-sky-500 rounded"
            aria-label={isLogin ? 'Перейти к регистрации' : 'Перейти ко входу'}
          >
            {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
        </div>

        {/* Разделитель */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-200 dark:border-slate-700"></div>
          <span className="px-3 text-sm text-gray-500 dark:text-slate-500">или</span>
          <div className="flex-1 border-t border-gray-200 dark:border-slate-700"></div>
        </div>

        {/* Кнопка Демо режим */}
        <button
          onClick={handleDemoLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          aria-label="Войти в демо-режим для тестирования приложения"
        >
          <Sparkles className="w-5 h-5" aria-hidden="true" />
          <span>Демо режим</span>
        </button>

        {/* Информация о демо-режиме */}
        <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-500/30 rounded-lg">
          <p className="text-xs text-purple-700 dark:text-purple-300 text-center">
            <Sparkles className="w-3 h-3 inline mr-1" aria-hidden="true" />
            <strong>Демо-режим:</strong> Попробуйте все функции без регистрации. Данные сохраняются локально.
          </p>
        </div>

        {/* Кнопка Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 font-medium py-2.5 rounded-lg transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 mt-3"
          aria-label="Войти через Google"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Войти через Google</span>
        </button>

        {/* Информация о конфиденциальности */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700 space-y-2">
          <p className="text-xs text-gray-500 dark:text-slate-500 text-center leading-relaxed">
            Продолжая, вы соглашаетесь с нашими{' '}
            <a 
              href="#" 
              className="text-sky-600 dark:text-sky-400 hover:underline focus:outline-none focus:ring-2 focus:ring-sky-500 rounded"
              onClick={(e) => {
                e.preventDefault();
                // Заглушка для будущей страницы политики конфиденциальности
                alert('Страница политики конфиденциальности будет доступна в ближайшее время.');
              }}
            >
              условиями использования
            </a>
            {' '}и{' '}
            <a 
              href="#" 
              className="text-sky-600 dark:text-sky-400 hover:underline focus:outline-none focus:ring-2 focus:ring-sky-500 rounded"
              onClick={(e) => {
                e.preventDefault();
                // Заглушка для будущей страницы политики конфиденциальности
                alert('Страница политики конфиденциальности будет доступна в ближайшее время.');
              }}
            >
              политикой конфиденциальности
            </a>
            .
          </p>
          <p className="text-[10px] text-gray-400 dark:text-slate-600 text-center">
            Ваши данные защищены и используются только для работы приложения
          </p>
        </div>
      </div>
    </div>
  );
};
