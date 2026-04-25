from __future__ import annotations

from sqlalchemy import select

from app.db.models import DocumentProcessingJob, KnowledgeDocument, ProcessingJobStatus
from app.db.session import SessionLocal
from app.services.knowledge_service import KnowledgeService


def process_document_job(document_id: int) -> dict:
    with SessionLocal() as db:
        job = db.execute(
            select(DocumentProcessingJob)
            .where(DocumentProcessingJob.document_id == document_id)
            .order_by(DocumentProcessingJob.created_at.desc())
        ).scalars().first()
        if job is not None:
            job.status = ProcessingJobStatus.processing
            db.commit()

        document = db.get(KnowledgeDocument, document_id)
        if document is None:
            if job is not None:
                job.status = ProcessingJobStatus.failed
                job.error_message = 'Документ не найден'
                db.commit()
            return {'status': 'failed', 'reason': 'document_not_found'}

        try:
            KnowledgeService(db).reindex_document(document)
            if job is not None:
                job.status = ProcessingJobStatus.ready
                db.commit()
            return {'status': 'ready', 'document_id': document_id}
        except Exception as exc:
            if job is not None:
                job.status = ProcessingJobStatus.failed
                job.error_message = str(exc)
                db.commit()
            raise
