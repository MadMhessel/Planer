import { Info } from 'lucide-react';
import { Slider } from '../ui/Slider';
import { Card } from '../ui/Card';

interface ChunkingSettingsProps {
  chunkSize: number;
  overlap: number;
  totalChunks: number;
  onChunkSizeChange: (value: number) => void;
  onOverlapChange: (value: number) => void;
}

export const ChunkingSettings = ({
  chunkSize,
  overlap,
  totalChunks,
  onChunkSizeChange,
  onOverlapChange,
}: ChunkingSettingsProps) => {
  return (
    <div className="space-y-4">
      <Card title="Настройки чанкования" animate>
        <div className="space-y-4">
          <Slider
            label="Размер чанка"
            value={chunkSize}
            min={100}
            max={2000}
            step={50}
            leftLabel="100"
            rightLabel="2000"
            onChange={onChunkSizeChange}
          />
          <Slider
            label="Перекрытие"
            value={overlap}
            min={0}
            max={200}
            step={5}
            leftLabel="0"
            rightLabel="200"
            onChange={onOverlapChange}
          />
          <div className="flex items-start gap-2 rounded-card border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Параметры определяют, как документы делятся на чанки для поиска и ответа.
          </div>
        </div>
      </Card>

      <Card title="Предпросмотр чанков" description="Файл: Клинические рекомендации 2024" animate>
        <div className="space-y-2">
          {['1 - 500', '451 - 950', '901 - 1400'].map((range, index) => (
            <div key={range} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-accent-violet">Чанк {index + 1}</p>
              <p className="mt-1 text-xs text-slate-600">{range} токенов</p>
              <p className="mt-1 text-xs text-slate-500">
                Клинические рекомендации содержат структурированные указания для поддержки принятия решений...
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-card border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
          Всего чанков (оценка): {totalChunks}
        </div>
      </Card>
    </div>
  );
};
