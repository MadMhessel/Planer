import { CheckCircle2, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Toggle } from '../components/ui/Toggle';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../hooks/useToast';

const messages = [
  { id: 1, role: 'Пользователь', text: 'Здравствуйте, нужно перенести встречу с клиентом на завтра.', tokens: 14, time: '10:14' },
  { id: 2, role: 'Ассистент', text: 'Конечно. Подскажите, на какое время была назначена встреча?', tokens: 21, time: '10:14' },
  { id: 3, role: 'Пользователь', text: 'На 14:00, но можно сдвинуть на четверг после обеда?', tokens: 16, time: '10:15' },
  { id: 4, role: 'Ассистент', text: 'Проверю доступность и предложу слоты. Какое время вам удобнее?', tokens: 18, time: '10:15' },
  { id: 5, role: 'Пользователь', text: 'Давайте на 15:30.', tokens: 7, time: '10:15' },
  { id: 6, role: 'Ассистент', text: 'Готово, встреча перенесена на четверг, 15:30.', tokens: 28, time: '10:15' },
];

const toolCalls = [
  { tool: 'Календарь', method: 'создать_событие', status: 'ok' },
  { tool: 'База знаний', method: 'обновить_запись', status: 'ok' },
  { tool: 'Почта', method: 'отправить_сообщение', status: 'error' },
];

export const Testing = () => {
  const [текстСообщения, setТекстСообщения] = useState('');
  const { ошибка, предупреждение, успех } = useToast();

  const отправитьСообщение = () => {
    const длина = текстСообщения.trim().length;

    if (длина === 0) {
      return;
    }

    if (длина > 120) {
      предупреждение('Превышен лимит сообщений', 'Вы превысили лимит. Обновите тариф.');
      return;
    }

    if (текстСообщения.toLowerCase().includes('api') || текстСообщения.toLowerCase().includes('апи')) {
      ошибка('Ошибка АПИ', 'Не удалось сохранить. Попробуйте ещё раз.');
      return;
    }

    успех('Сообщение отправлено');
    setТекстСообщения('');
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Card title="Конструктор диалога" description="Тестируйте ассистента и уточняйте ответы.">
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-slate-500">
                  {message.id}
                </span>
                <div className="flex-1 rounded-card border border-slate-200 px-3 py-2.5">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{message.role}</p>
                    <span className="text-[11px] text-slate-500">{message.time}</span>
                  </div>
                  <p className="text-sm text-slate-700">{message.text}</p>
                  <span className="mt-2 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {message.tokens} токенов
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-card border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Событие в календаре успешно обновлено.
              </span>
            </div>
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                отправитьСообщение();
              }}
            >
              <input
                placeholder="Вы можете задать мне любой вопрос..."
                value={текстСообщения}
                onChange={(event) => setТекстСообщения(event.target.value)}
                aria-label="Сообщение для теста"
                className="h-10 flex-1 rounded-input border border-slate-200 px-3 text-sm placeholder:text-slate-400 focus:border-accent-violet focus:outline-none focus:ring-2 focus:ring-accent-violet/25"
              />
              <Button variant="secondary" type="submit" aria-label="Отправить сообщение">
                <Send className="h-4 w-4" />
                Отправить
              </Button>
            </form>
            <div className="flex items-center justify-between rounded-card border border-slate-200 px-3 py-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                Авто-запуск
                <Toggle checked onChange={() => undefined} ariaLabel="Включить или выключить авто-запуск" />
              </div>
              <div className="flex items-center gap-2">
                Показывать токены
                <Toggle checked onChange={() => undefined} ariaLabel="Включить или выключить показ токенов" />
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="space-y-4">
        <Card title="Предпросмотр" description="Так ассистент выглядит для конечного пользователя." animate>
          <div className="mx-auto w-full max-w-[260px] rounded-[28px] border-[8px] border-slate-900 bg-white p-3 shadow-soft">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <Avatar name="ТехПоддержка" size="sm" status="online" />
              <div>
                <p className="text-sm font-semibold text-slate-800">ТехПоддержка</p>
                <p className="text-xs text-emerald-600">В сети</p>
              </div>
            </div>
            <div className="space-y-2 py-3 text-xs">
              <div className="rounded-md bg-cyan-100 p-2">Здравствуйте, нужно перенести встречу.</div>
              <div className="rounded-md bg-violet-100 p-2">Конечно, на какое время была назначена?</div>
              <div className="rounded-md bg-cyan-100 p-2">Можно на 15:30?</div>
            </div>
            <input
              className="h-8 w-full rounded-md border border-slate-200 px-2 text-xs"
              placeholder="Введите сообщение..."
              readOnly
            />
          </div>
        </Card>

        <Card title="Вызовы инструментов" animate>
          <div className="space-y-2">
            {toolCalls.map((call) => (
              <div key={call.tool} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{call.tool}</p>
                  <p className="text-xs text-slate-500">{call.method}</p>
                </div>
                <Badge variant={call.status === 'ok' ? 'success' : 'danger'}>{call.status === 'ok' ? 'Успешно' : 'Ошибка'}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
