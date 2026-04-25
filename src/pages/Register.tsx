import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { ApiError } from '../lib/api';
import { зарегистрироватьЧерезApi } from '../utils/auth';

export const Register = () => {
  const navigate = useNavigate();
  const [имя, setИмя] = useState('');
  const [email, setEmail] = useState('');
  const [пароль, setПароль] = useState('');
  const [подтверждение, setПодтверждение] = useState('');
  const [ошибка, setОшибка] = useState('');
  const [загрузка, setЗагрузка] = useState(false);

  const отправитьФорму = async (event: FormEvent) => {
    event.preventDefault();

    if (пароль !== подтверждение) {
      setОшибка('Пароли не совпадают');
      return;
    }

    setОшибка('');
    setЗагрузка(true);
    try {
      await зарегистрироватьЧерезApi(имя || 'Новый пользователь', email, пароль);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setОшибка(error instanceof ApiError ? error.message : 'Не удалось зарегистрироваться. Попробуйте ещё раз.');
    } finally {
      setЗагрузка(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-8">
      <Card className="w-full max-w-md" title="Создайте аккаунт" description="Заполните данные для доступа к платформе.">
        <form className="space-y-4" onSubmit={отправитьФорму}>
          <Input label="Имя" value={имя} onChange={(event) => setИмя(event.target.value)} placeholder="Денис Юркин" required />
          <Input
            label="Электронная почта"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Введите электронную почту"
            required
          />
          <Input
            label="Пароль"
            type="password"
            value={пароль}
            onChange={(event) => setПароль(event.target.value)}
            placeholder="Создайте пароль"
            required
          />
          <Input
            label="Подтверждение пароля"
            type="password"
            value={подтверждение}
            onChange={(event) => setПодтверждение(event.target.value)}
            placeholder="Повторите пароль"
            error={ошибка || undefined}
            required
          />

          <Button fullWidth type="submit" loading={загрузка}>
            Зарегистрироваться
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">Регистрируясь, вы соглашаетесь с условиями</p>

        <p className="mt-2 text-center text-sm text-slate-600">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="font-semibold text-accent-violet hover:text-violet-700">
            Войти
          </Link>
        </p>
      </Card>
    </div>
  );
};
