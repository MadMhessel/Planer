import { Send } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../lib/api';
import { useAssistantStore } from '../../store/assistantStore';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Toggle } from '../ui/Toggle';

const initialMessages = [
  {
    id: '1',
    role: 'user' as const,
    text: 'Можете объяснить, как работает двухфакторная аутентификация?',
    time: '10:42',
  },
  {
    id: '2',
    role: 'assistant' as const,
    text: 'Двухфакторная аутентификация добавляет второй шаг подтверждения после пароля, обычно это код из телефона.',
    time: '10:42',
  },
  {
    id: '3',
    role: 'assistant' as const,
    text: 'Вы можете задать мне любой вопрос...',
    time: '10:43',
  },
];

export const ChatPreview = () => {
  const selectedAssistantId = useAssistantStore((state) => state.selectedAssistantId);
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);

  const отправить = async () => {
    const message = text.trim();
    if (!message) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: message, time: 'сейчас' }]);
    setText('');
    setLoading(true);
    try {
      const response = await api.chat(selectedAssistantId, {
        message,
        conversation_id: conversationId,
        user_external_id: 'preview-user',
        channel_type: 'web',
      });
      setConversationId(response.conversation.id);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${response.assistant_message.id}`,
          role: 'assistant',
          text: response.assistant_message.content,
          time: 'сейчас',
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: 'Не удалось получить ответ. Проверьте подключение к API.',
          time: 'сейчас',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Предпросмотр" description="Окно чата для проверки поведения ассистента." animate>
      <div className="space-y-3 rounded-card border border-slate-200 bg-slate-50 p-3">
        {messages.map((message) => (
          <div key={message.id} className={`flex items-start gap-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
            {message.role === 'assistant' ? <Avatar name="ЮристАссистент" size="sm" status="online" /> : null}
            <div
              className={`max-w-[82%] rounded-card px-3 py-2 text-sm leading-5 ${
                message.role === 'assistant' ? 'bg-violet-100 text-slate-700' : 'bg-cyan-100 text-slate-800'
              }`}
            >
              <p>{message.text}</p>
              <p className="mt-1 text-[11px] text-slate-500">{message.time}</p>
            </div>
            {message.role === 'user' ? <Avatar name="Вы" size="sm" /> : null}
          </div>
        ))}
      </div>

      <form
        className="mt-4 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void отправить();
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="h-10 flex-1 rounded-input border border-slate-200 px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-accent-violet focus:outline-none focus:ring-2 focus:ring-accent-violet/25"
          placeholder="Вы можете задать мне любой вопрос..."
          aria-label="Сообщение для предпросмотра"
        />
        <Button variant="secondary" type="submit" loading={loading} aria-label="Отправить сообщение в предпросмотре">
          <Send className="h-4 w-4" />
          Отправить
        </Button>
      </form>

      <div className="mt-3 flex items-center justify-between rounded-card border border-slate-200 px-3 py-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          Авто-запуск
          <Toggle checked onChange={() => undefined} ariaLabel="Включить или выключить авто-запуск" />
        </div>
        <div className="flex items-center gap-2">
          Показывать токены
          <Toggle checked onChange={() => undefined} ariaLabel="Включить или выключить показ токенов" />
        </div>
      </div>
    </Card>
  );
};
