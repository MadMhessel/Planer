import { LockKeyhole, Mail } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { ApiError } from '../lib/api';
import { войтиЧерезApi } from '../utils/auth';

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [пароль, setПароль] = useState('');
  const [загрузка, setЗагрузка] = useState(false);
  const [ошибка, setОшибка] = useState('');

  const отправитьФорму = async (event: FormEvent) => {
    event.preventDefault();
    setОшибка('');
    setЗагрузка(true);
    try {
      await войтиЧерезApi(email, пароль);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setОшибка(error instanceof ApiError ? error.message : 'Не удалось войти. Проверьте данные и повторите попытку.');
    } finally {
      setЗагрузка(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-8">
      <Card className="w-full max-w-md" title="Вход в аккаунт" description="Введите данные для доступа к конструктору.">
        <form className="space-y-4" onSubmit={отправитьФорму}>
          <Input
            label="Электронная почта"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Введите электронную почту"
            prefix={<Mail className="h-4 w-4" />}
            required
          />
          <Input
            label="Пароль"
            type="password"
            value={пароль}
            onChange={(event) => setПароль(event.target.value)}
            placeholder="Введите пароль"
            prefix={<LockKeyhole className="h-4 w-4" />}
            error={ошибка || undefined}
            required
          />

          <div className="text-right">
            <button type="button" className="text-sm font-medium text-accent-violet hover:text-violet-700">
              Забыли пароль?
            </button>
          </div>

          <Button fullWidth type="submit" loading={загрузка}>
            Войти
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          Нет аккаунта?{' '}
          <Link to="/register" className="font-semibold text-accent-violet hover:text-violet-700">
            Зарегистрироваться
          </Link>
        </p>
      </Card>
    </div>
  );
};
