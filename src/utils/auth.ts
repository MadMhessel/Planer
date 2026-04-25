import { api, authToken, type AuthResponse } from '../lib/api';

export interface ПользовательПлатформы {
  имя: string;
  email: string;
}

export const получитьПользователя = (): ПользовательПлатформы | null => {
  const имя = window.sessionStorage.getItem('ai_user_name');
  const email = window.sessionStorage.getItem('ai_user_email');
  if (!имя || !email) {
    return null;
  }
  return { имя, email };
};

export const авторизован = (): boolean => authToken.isAuthenticated();

export const сохранитьСессию = (auth: AuthResponse): void => {
  authToken.set(auth);
};

export const войтиЧерезApi = async (email: string, password: string): Promise<void> => {
  const auth = await api.login({ email, password });
  сохранитьСессию(auth);
};

export const зарегистрироватьЧерезApi = async (имя: string, email: string, password: string): Promise<void> => {
  const auth = await api.register({
    email,
    password,
    full_name: имя,
    organization_name: `${имя || 'Новая команда'} workspace`,
  });
  сохранитьСессию(auth);
};

export const выйтиИзАккаунта = async (): Promise<void> => {
  try {
    await api.logout();
  } catch {
    // Локальный выход должен сработать даже если API временно недоступен.
  } finally {
    authToken.clear();
  }
};
