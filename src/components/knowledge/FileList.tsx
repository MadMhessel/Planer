import { File, FileSpreadsheet, FileText, Globe, MoreVertical } from 'lucide-react';
import type { KnowledgeFile } from '../../types';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

interface FileListProps {
  files: KnowledgeFile[];
  usage: string;
}

const statusMap: Record<KnowledgeFile['status'], { label: string; variant: 'success' | 'info' | 'warning' | 'danger' }> = {
  indexed: { label: 'Проиндексировано', variant: 'success' },
  processing: { label: 'Обработка', variant: 'info' },
  queued: { label: 'В очереди', variant: 'warning' },
  failed: { label: 'Ошибка', variant: 'danger' },
};

const iconMap: Record<KnowledgeFile['type'], JSX.Element> = {
  PDF: <File className="h-4 w-4 text-rose-500" />,
  DOCX: <FileText className="h-4 w-4 text-blue-500" />,
  TXT: <FileText className="h-4 w-4 text-slate-500" />,
  CSV: <FileSpreadsheet className="h-4 w-4 text-emerald-500" />,
  URL: <Globe className="h-4 w-4 text-accent-violet" />,
};

export const FileList = ({ files, usage }: FileListProps) => {
  return (
    <Card title="Загруженные файлы" description="Очередь индексации и текущий статус обработки." animate>
      <div className="mb-4 flex items-center justify-between rounded-card border border-slate-200 bg-slate-50 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Использование хранилища</span>
        <span className="text-sm font-semibold text-slate-700">{usage}</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {files.map((file) => {
          const status = statusMap[file.status];
          return (
            <div
              key={file.id}
              className="flex h-full flex-col gap-3 rounded-card border border-slate-200 px-3 py-3 transition-colors hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100">{iconMap[file.type]}</span>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {file.size} • {file.pages} • {file.uploadedAt}
                </p>
              </div>
              <button
                type="button"
                className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/35"
                aria-label={`Открыть действия для файла ${file.name}`}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
