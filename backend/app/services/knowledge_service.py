from __future__ import annotations

import re
import uuid
from pathlib import Path

from app.adapters.openai_adapter import OpenAIAdapter
from app.adapters.qdrant_adapter import QdrantAdapter
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import APIError
from app.core.queue import enqueue_job
from app.db.models import (
    Assistant,
    DocumentIndexingStatus,
    DocumentParseStatus,
    DocumentSourceType,
    DocumentProcessingJob,
    ProcessingJobStatus,
    KnowledgeBase,
    KnowledgeBaseStatus,
    KnowledgeDocument,
    UsageEvent,
    UsageEventType,
)
from app.repositories.assistants import AssistantRepository
from app.repositories.knowledge import KnowledgeRepository
from app.schemas.knowledge import (
    DocumentFromUrlRequest,
    KnowledgeBaseCreate,
    KnowledgeBaseUpdate,
)
from app.services.knowledge_processing import (
    build_chunks_payload,
    extract_text_from_file,
    fetch_text_from_url,
    split_into_chunks,
)
from app.services.limit_service import LimitService
from app.services.storage_service import StorageService


class KnowledgeService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.assistants = AssistantRepository(db)
        self.repo = KnowledgeRepository(db)
        self.settings = get_settings()
        self.storage = StorageService()

    def list_bases(self, *, assistant_id: int, organization_id: int) -> list[KnowledgeBase]:
        self._get_assistant_in_org(assistant_id, organization_id)
        return self.repo.list_bases_by_assistant(assistant_id)

    def create_base(self, *, assistant_id: int, organization_id: int, payload: KnowledgeBaseCreate) -> KnowledgeBase:
        self._get_assistant_in_org(assistant_id, organization_id)
        base = self.repo.create_base(
            assistant_id=assistant_id,
            name=payload.name,
            description=payload.description,
            status=KnowledgeBaseStatus.draft,
            chunk_size=payload.chunk_size,
            chunk_overlap=payload.chunk_overlap,
        )
        self.db.commit()
        self.db.refresh(base)
        return base

    def get_base_in_org(self, *, knowledge_base_id: int, organization_id: int) -> KnowledgeBase:
        base = self.repo.get_base_with_assistant(knowledge_base_id)
        if base is None or base.assistant is None or base.assistant.organization_id != organization_id:
            raise APIError(status_code=404, error_code='knowledge_base_not_found', message='База знаний не найдена')
        return base

    def update_base(self, base: KnowledgeBase, payload: KnowledgeBaseUpdate) -> KnowledgeBase:
        data = payload.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(base, key, value)

        self.db.commit()
        self.db.refresh(base)
        return base

    def delete_base(self, base: KnowledgeBase) -> None:
        for document in list(base.documents):
            self._delete_stored_file(document.storage_key)
        self.repo.delete_base(base)
        self.db.commit()

    def list_documents(self, base: KnowledgeBase) -> list[KnowledgeDocument]:
        return self.repo.list_documents(base.id)

    def upload_document(
        self,
        *,
        base: KnowledgeBase,
        filename: str,
        mime_type: str | None,
        data: bytes,
    ) -> KnowledgeDocument:
        if not data:
            raise APIError(status_code=400, error_code='empty_file', message='Файл пустой')
        LimitService(self.db).assert_allowed(base.assistant.organization_id, 'storage_mb', len(data) / 1024 / 1024)

        storage_key, path = self._save_file(base.id, filename, data)
        document = self.repo.create_document(
            knowledge_base_id=base.id,
            filename=filename,
            storage_key=storage_key,
            mime_type=mime_type,
            file_size=len(data),
            source_type=DocumentSourceType.upload,
            parse_status=DocumentParseStatus.pending,
            indexing_status=DocumentIndexingStatus.pending,
        )
        self.db.commit()
        self.db.refresh(document)

        if self.settings.process_documents_async:
            self._enqueue_document_processing(document)
        else:
            self._process_document(document, text_hint=extract_text_from_file(path, mime_type, filename))
        self.db.refresh(document)
        return document

    def create_document_from_url(self, *, base: KnowledgeBase, payload: DocumentFromUrlRequest) -> KnowledgeDocument:
        try:
            text, mime_type, fetched_filename = fetch_text_from_url(str(payload.url))
        except Exception as exc:
            raise APIError(status_code=400, error_code='url_fetch_failed', message='Не удалось загрузить данные по URL') from exc

        filename = payload.filename or fetched_filename or 'url-content.txt'
        data = text.encode('utf-8', errors='ignore')
        LimitService(self.db).assert_allowed(base.assistant.organization_id, 'storage_mb', len(data) / 1024 / 1024)
        storage_key, _ = self._save_file(base.id, filename, data)

        document = self.repo.create_document(
            knowledge_base_id=base.id,
            filename=filename,
            original_url=str(payload.url),
            storage_key=storage_key,
            mime_type=mime_type,
            file_size=len(data),
            source_type=DocumentSourceType.url,
            parse_status=DocumentParseStatus.pending,
            indexing_status=DocumentIndexingStatus.pending,
        )
        self.db.commit()
        self.db.refresh(document)

        if self.settings.process_documents_async:
            self._enqueue_document_processing(document)
        else:
            self._process_document(document, text_hint=text)
        self.db.refresh(document)
        return document

    def get_document_in_org(self, *, document_id: int, organization_id: int) -> KnowledgeDocument:
        document = self.repo.get_document_with_base(document_id)
        if (
            document is None
            or document.knowledge_base is None
            or document.knowledge_base.assistant is None
            or document.knowledge_base.assistant.organization_id != organization_id
        ):
            raise APIError(status_code=404, error_code='document_not_found', message='Документ не найден')
        return document

    def reindex_document(self, document: KnowledgeDocument, *, chunk_size: int | None = None, chunk_overlap: int | None = None) -> KnowledgeDocument:
        base = document.knowledge_base
        if base is None:
            raise APIError(status_code=404, error_code='knowledge_base_not_found', message='База знаний не найдена')

        if chunk_size is not None:
            base.chunk_size = chunk_size
        if chunk_overlap is not None:
            base.chunk_overlap = chunk_overlap

        text = document.extracted_text
        if not text and document.storage_key:
            path = self._storage_path(document.storage_key)
            if path.exists():
                text = extract_text_from_file(path, document.mime_type, document.filename)

        self._process_document(document, text_hint=text or '')
        self.db.refresh(document)
        return document

    def delete_document(self, document: KnowledgeDocument) -> None:
        self._delete_stored_file(document.storage_key)
        base = document.knowledge_base
        self.repo.delete_document(document)
        self.db.commit()

        if base is not None:
            refreshed = self.repo.get_base(base.id)
            if refreshed is not None:
                self._recompute_base_status(refreshed)
                self.db.commit()

    def _process_document(self, document: KnowledgeDocument, *, text_hint: str) -> None:
        base = document.knowledge_base
        if base is None:
            raise APIError(status_code=404, error_code='knowledge_base_not_found', message='База знаний не найдена')

        document.parse_status = DocumentParseStatus.processing
        document.indexing_status = DocumentIndexingStatus.processing
        base.status = KnowledgeBaseStatus.processing
        self.db.flush()

        text = (text_hint or '').strip()
        if not text and document.storage_key:
            path = self._storage_path(document.storage_key)
            if path.exists():
                text = extract_text_from_file(path, document.mime_type, document.filename)

        if not text:
            document.parse_status = DocumentParseStatus.failed
            document.indexing_status = DocumentIndexingStatus.failed
            document.extracted_text = None
            self.repo.replace_chunks(document.id, [])
            self._recompute_base_status(base)
            self.db.commit()
            return

        chunks = split_into_chunks(text, base.chunk_size, base.chunk_overlap)
        if not chunks:
            document.parse_status = DocumentParseStatus.failed
            document.indexing_status = DocumentIndexingStatus.failed
            document.extracted_text = text
            self.repo.replace_chunks(document.id, [])
            self._recompute_base_status(base)
            self.db.commit()
            return

        document.extracted_text = text
        document.parse_status = DocumentParseStatus.ready
        document.indexing_status = DocumentIndexingStatus.ready
        self.repo.replace_chunks(document.id, build_chunks_payload(chunks))
        self._index_chunks(document)
        self._track_upload_usage(base.assistant.organization_id, base.assistant_id, document.file_size or 0)
        self._recompute_base_status(base)
        self.db.commit()

    def _recompute_base_status(self, base: KnowledgeBase) -> None:
        documents = self.repo.list_documents(base.id)
        if not documents:
            base.status = KnowledgeBaseStatus.draft
            self.db.flush()
            return

        statuses = {(doc.parse_status.value, doc.indexing_status.value) for doc in documents}
        if any(parse == 'failed' or index == 'failed' for parse, index in statuses):
            base.status = KnowledgeBaseStatus.failed
        elif all(parse == 'ready' and index == 'ready' for parse, index in statuses):
            base.status = KnowledgeBaseStatus.ready
        elif any(parse == 'processing' or index == 'processing' for parse, index in statuses):
            base.status = KnowledgeBaseStatus.processing
        else:
            base.status = KnowledgeBaseStatus.draft

        self.db.flush()

    def _save_file(self, knowledge_base_id: int, filename: str, data: bytes) -> tuple[str, Path]:
        safe_name = self._safe_filename(filename)
        unique_name = f'{uuid.uuid4().hex}_{safe_name}'
        stored = self.storage.save_bytes(namespace=f'kb_{knowledge_base_id}', filename=unique_name, data=data)
        return stored.key, stored.local_path

    def _storage_path(self, storage_key: str) -> Path:
        return self.storage.local_path(storage_key)

    def _delete_stored_file(self, storage_key: str | None) -> None:
        self.storage.delete(storage_key)

    def _get_assistant_in_org(self, assistant_id: int, organization_id: int) -> Assistant:
        assistant = self.assistants.get_in_org(assistant_id, organization_id)
        if assistant is None:
            raise APIError(status_code=404, error_code='assistant_not_found', message='Ассистент не найден')
        return assistant

    @staticmethod
    def _safe_filename(filename: str) -> str:
        name = filename.strip()
        if not name:
            return 'document.txt'
        name = re.sub(r'[^a-zA-Z0-9а-яА-ЯёЁ._-]+', '_', name)
        return name[:200]

    def _enqueue_document_processing(self, document: KnowledgeDocument) -> None:
        job = DocumentProcessingJob(document_id=document.id, status=ProcessingJobStatus.pending)
        self.db.add(job)
        self.db.commit()
        try:
            from app.jobs.documents import process_document_job

            queued = enqueue_job(process_document_job, document.id, queue_name='documents')
            job.job_id = queued.id
            self.db.commit()
        except Exception:
            self._process_document(document, text_hint=document.extracted_text or '')

    def _index_chunks(self, document: KnowledgeDocument) -> None:
        base = document.knowledge_base
        if base is None or base.assistant is None:
            return
        openai = OpenAIAdapter()
        if not openai.enabled:
            return

        qdrant = QdrantAdapter()
        for chunk in self.repo.list_chunks(document.id):
            try:
                embedding = openai.create_embedding(chunk.content)
                if not embedding:
                    continue
                chunk.embedding_id = f'qdrant:{chunk.id}'
                qdrant.upsert_chunk(
                    point_id=chunk.id,
                    vector=embedding,
                    organization_id=base.assistant.organization_id,
                    assistant_id=base.assistant_id,
                    document_id=document.id,
                    chunk_id=chunk.id,
                    content=chunk.content,
                )
            except Exception:
                continue
        self.db.flush()

    def _track_upload_usage(self, organization_id: int, assistant_id: int, file_size: int) -> None:
        self.db.add(
            UsageEvent(
                organization_id=organization_id,
                assistant_id=assistant_id,
                conversation_id=None,
                type=UsageEventType.upload,
                amount=round(file_size / 1024 / 1024, 4),
                unit='mb',
                cost=0,
            )
        )
        self.db.flush()
