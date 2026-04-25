import { Clock3, Cog, Link2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import type { Integration } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Toggle } from '../ui/Toggle';

interface IntegrationCardProps {
  integration: Integration;
}

export const IntegrationCard = ({ integration }: IntegrationCardProps) => {
  const [connected, setConnected] = useState(integration.status === 'connected');
  const [loading, setLoading] = useState(false);
  const { успех } = useToast();

  const переключитьСостояние = () => {
    setLoading(true);
    window.setTimeout(() => {
      setConnected((previous) => {
        const next = !previous;
        успех(next ? 'Интеграция подключена' : 'Интеграция отключена');
        return next;
      });
      setLoading(false);
    }, 450);
  };

  return (
    <Card hoverable className="h-full" animate>
      <div className="flex items-start justify-between">
        <span
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-lg font-semibold text-white"
          style={{ backgroundColor: integration.color }}
        >
          {integration.icon}
        </span>
        <Toggle
          checked={connected}
          onChange={переключитьСостояние}
          disabled={loading}
          ariaLabel={connected ? 'Отключить интеграцию' : 'Подключить интеграцию'}
        />
      </div>

      <h3 className="mt-4 text-lg font-semibold text-slate-900">{integration.name}</h3>
      <p className="mt-1 text-sm text-slate-500">{integration.description}</p>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Clock3 className="h-3.5 w-3.5" />
        Последняя синхронизация: {integration.lastSync}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Badge variant={connected ? 'success' : 'default'}>{connected ? 'Подключено' : 'Не подключено'}</Badge>
        <Button variant="outline" size="sm" loading={loading} disabled={!connected}>
          <Cog className="h-3.5 w-3.5" />
          Настроить
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button variant={connected ? 'danger' : 'secondary'} size="sm" onClick={переключитьСостояние} loading={loading}>
          {connected ? 'Отключить' : 'Подключить'}
        </Button>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-accent-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/35"
          aria-label={`Открыть предпросмотр: ${integration.name}`}
        >
          <Link2 className="h-3.5 w-3.5" />
          Предпросмотр
        </button>
      </div>
    </Card>
  );
};
