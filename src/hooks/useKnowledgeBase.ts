import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type KnowledgeBaseOut, type KnowledgeDocumentOut } from '../lib/api';
import { useAssistantStore } from '../store/assistantStore';
import type { ChunkSettings, KnowledgeFile, KnowledgeFileStatus, KnowledgeFileType } from '../types';

const начальныеНастройки: ChunkSettings = {
  chunkSize: 500,
  overlap: 50,
};

const типФайла = (document: KnowledgeDocumentOut): KnowledgeFileType => {
  const name = document.filename.toLowerCase();
  if (name.endsWith('.pdf')) return 'PDF';
  if (name.endsWith('.docx')) return 'DOCX';
  if (name.endsWith('.csv')) return 'CSV';
  if (document.source_type === 'url') return 'URL';
  return 'TXT';
};

const статусФайла = (document: KnowledgeDocumentOut): KnowledgeFileStatus => {
  if (document.parse_status === 'failed' || document.indexing_status === 'failed') return 'failed';
  if (document.parse_status === 'ready' && document.indexing_status === 'ready') return 'indexed';
  if (document.parse_status === 'processing' || document.indexing_status === 'processing') return 'processing';
  return 'queued';
};

const размер = (bytes: number | null): string => {
  if (!bytes) return '0 МБ';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
};

const mapDocument = (document: KnowledgeDocumentOut): KnowledgeFile => ({
  id: String(document.id),
  name: document.filename,
  type: типФайла(document),
  size: размер(document.file_size),
  pages: `${document.chunks_count} чанков`,
  uploadedAt: new Date(document.created_at).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
  status: статусФайла(document),
});

export const useKnowledgeBase = () => {
  const selectedAssistantId = useAssistantStore((state) => state.selectedAssistantId);
  const loadAssistants = useAssistantStore((state) => state.loadAssistants);
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [base, setBase] = useState<KnowledgeBaseOut | null>(null);
  const [chunkSettings, setChunkSettings] = useState<ChunkSettings>(начальныеНастройки);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    await loadAssistants();
    if (!selectedAssistantId) return;

    setLoading(true);
    try {
      let bases = await api.listKnowledgeBases(selectedAssistantId);
      if (bases.length === 0) {
        const created = await api.createKnowledgeBase(selectedAssistantId, {
          name: 'Основная база знаний',
          chunk_size: начальныеНастройки.chunkSize,
          chunk_overlap: начальныеНастройки.overlap,
        });
        bases = [created];
      }
      const activeBase = bases[0];
      setBase(activeBase);
      setChunkSettings({ chunkSize: activeBase.chunk_size, overlap: activeBase.chunk_overlap });
      const documents = await api.listDocuments(activeBase.id);
      setFiles(documents.map(mapDocument));
    } finally {
      setLoading(false);
    }
  }, [loadAssistants, selectedAssistantId]);

  useEffect(() => {
    const таймер = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(таймер);
  }, [load]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!base) return;
      setLoading(true);
      try {
        await api.uploadDocument(base.id, file);
        const documents = await api.listDocuments(base.id);
        setFiles(documents.map(mapDocument));
      } finally {
        setLoading(false);
      }
    },
    [base],
  );

  const indexedCount = useMemo(() => files.filter((file) => file.status === 'indexed').length, [files]);
  const totalChunks = useMemo(
    () =>
      files.reduce((sum, file) => {
        const match = file.pages.match(/\d+/);
        return sum + (match ? Number(match[0]) : 0);
      }, 0),
    [files],
  );

  const usage = useMemo(() => {
    const totalMb = files.reduce((sum, file) => {
      const value = Number.parseFloat(file.size.replace(',', '.'));
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
    return `${Math.round(totalMb)} / 500 МБ`;
  }, [files]);

  return {
    files,
    chunkSettings,
    setChunkSize: (chunkSize: number) => setChunkSettings((prev) => ({ ...prev, chunkSize })),
    setOverlap: (overlap: number) => setChunkSettings((prev) => ({ ...prev, overlap })),
    indexedCount,
    totalChunks,
    usage,
    loading,
    uploadFile,
    reload: load,
  };
};
