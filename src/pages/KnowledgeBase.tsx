import { motion } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { ChunkingSettings } from '../components/knowledge/ChunkingSettings';
import { FileList } from '../components/knowledge/FileList';
import { FileUploader } from '../components/knowledge/FileUploader';
import { Card } from '../components/ui/Card';
import { useKnowledgeBase } from '../hooks/useKnowledgeBase';

export const KnowledgeBase = () => {
  const { files, chunkSettings, setChunkSize, setOverlap, indexedCount, totalChunks, usage, loading, uploadFile } = useKnowledgeBase();

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Card>
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xl font-semibold text-slate-900">{totalChunks} чанков проиндексировано</p>
              <p className="text-sm text-slate-500">247 чанков проиндексировано</p>
              <div className="mt-3 h-2 rounded-full bg-slate-200">
                <div className="h-full w-[76%] rounded-full bg-accent-violet" />
              </div>
            </div>
            <div className="rounded-card border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Loader2 className="h-4 w-4 animate-spin text-accent-teal" />
                Индексация в процессе
              </p>
              <p className="mt-1 text-xs text-slate-500">Осталось примерно: 2 минуты</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <FileUploader loading={loading} onUpload={uploadFile} />
          <FileList files={files} usage={usage} />
        </div>

        <div className="space-y-4">
          <ChunkingSettings
            chunkSize={chunkSettings.chunkSize}
            overlap={chunkSettings.overlap}
            totalChunks={totalChunks}
            onChunkSizeChange={setChunkSize}
            onOverlapChange={setOverlap}
          />
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Проиндексированные файлы</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                {indexedCount}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
