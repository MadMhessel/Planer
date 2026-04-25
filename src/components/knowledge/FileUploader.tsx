import { FileText, FileType2, FileUp, FileSpreadsheet, Link2, UploadCloud } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface FileUploaderProps {
  loading?: boolean;
  onUpload?: (file: File) => void | Promise<void>;
}

export const FileUploader = ({ loading = false, onUpload }: FileUploaderProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const выбратьФайл = () => {
    inputRef.current?.click();
  };

  return (
    <Card
      title="Загрузка базы знаний"
      description="Добавьте документы, ссылки или текстовые файлы для базы знаний."
      animate
    >
      <div className="rounded-card border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
        <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-accent-violet shadow-soft">
          <UploadCloud className="h-7 w-7" />
        </span>
        <h4 className="text-lg font-semibold text-slate-800">Перетащите файлы сюда</h4>
        <p className="mt-2 text-sm text-slate-500">Загрузите файлы документов...</p>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.docx,.txt,.csv,text/plain,application/pdf"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void onUpload?.(file);
            }
            event.currentTarget.value = '';
          }}
        />
        <Button className="mt-5" loading={loading} onClick={выбратьФайл} type="button">
          <FileUp className="h-4 w-4" />
          Загрузить
        </Button>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1">
            <FileType2 className="h-3.5 w-3.5 text-rose-500" /> ПДФ
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1">
            <FileText className="h-3.5 w-3.5 text-blue-500" /> Документ
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1">
            <FileText className="h-3.5 w-3.5 text-slate-500" /> Текст
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1">
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" /> Таблица
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1">
            <Link2 className="h-3.5 w-3.5 text-accent-violet" /> Ссылка
          </span>
        </div>
      </div>
    </Card>
  );
};
