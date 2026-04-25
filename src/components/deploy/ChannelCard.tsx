import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { Channel } from '../../types';
import { Card } from '../ui/Card';
import { Toggle } from '../ui/Toggle';

interface ChannelCardProps {
  channel: Channel;
}

export const ChannelCard = ({ channel }: ChannelCardProps) => {
  const [connected, setConnected] = useState(channel.connected);

  return (
    <Card hoverable animate>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-slate-900">{channel.name}</p>
          <p className="text-sm text-slate-500">{channel.handle}</p>
        </div>
        <Toggle
          checked={connected}
          onChange={setConnected}
          ariaLabel={connected ? `Отключить канал ${channel.name}` : `Подключить канал ${channel.name}`}
        />
      </div>

      <div className="mt-4 rounded-card border border-slate-200 bg-slate-50 p-3">
        <p className="rounded-md bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">{channel.preview}</p>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-1.5 text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {connected ? 'Подключено' : 'Не подключено'}
        </span>
        <button type="button" className="inline-flex items-center gap-1 text-slate-500 transition-colors hover:text-accent-violet">
          Предпросмотр
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </Card>
  );
};
