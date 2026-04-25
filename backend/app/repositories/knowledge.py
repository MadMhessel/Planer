from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, joinedload

from app.db.models import DocumentChunk, KnowledgeBase, KnowledgeDocument


class KnowledgeRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_bases_by_assistant(self, assistant_id: int) -> list[KnowledgeBase]:
        stmt = select(KnowledgeBase).where(KnowledgeBase.assistant_id == assistant_id).order_by(KnowledgeBase.created_at.desc())
        return list(self.db.execute(stmt).scalars().all())

    def create_base(self, **data) -> KnowledgeBase:
        base = KnowledgeBase(**data)
        self.db.add(base)
        self.db.flush()
        return base

    def get_base(self, knowledge_base_id: int) -> KnowledgeBase | None:
        return self.db.get(KnowledgeBase, knowledge_base_id)

    def get_base_with_assistant(self, knowledge_base_id: int) -> KnowledgeBase | None:
        stmt = (
            select(KnowledgeBase)
            .options(joinedload(KnowledgeBase.assistant))
            .where(KnowledgeBase.id == knowledge_base_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def delete_base(self, base: KnowledgeBase) -> None:
        self.db.delete(base)

    def list_documents(self, knowledge_base_id: int) -> list[KnowledgeDocument]:
        stmt = (
            select(KnowledgeDocument)
            .where(KnowledgeDocument.knowledge_base_id == knowledge_base_id)
            .order_by(KnowledgeDocument.created_at.desc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def create_document(self, **data) -> KnowledgeDocument:
        document = KnowledgeDocument(**data)
        self.db.add(document)
        self.db.flush()
        return document

    def get_document(self, document_id: int) -> KnowledgeDocument | None:
        return self.db.get(KnowledgeDocument, document_id)

    def get_document_with_base(self, document_id: int) -> KnowledgeDocument | None:
        stmt = (
            select(KnowledgeDocument)
            .options(joinedload(KnowledgeDocument.knowledge_base).joinedload(KnowledgeBase.assistant))
            .where(KnowledgeDocument.id == document_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def delete_document(self, document: KnowledgeDocument) -> None:
        self.db.delete(document)

    def replace_chunks(self, document_id: int, chunks: Sequence[dict]) -> None:
        self.db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document_id))
        for item in chunks:
            self.db.add(DocumentChunk(document_id=document_id, **item))
        self.db.flush()

    def count_chunks(self, document_id: int) -> int:
        stmt = select(func.count(DocumentChunk.id)).where(DocumentChunk.document_id == document_id)
        result = self.db.execute(stmt).scalar_one()
        return int(result)

    def list_chunks(self, document_id: int) -> list[DocumentChunk]:
        stmt = select(DocumentChunk).where(DocumentChunk.document_id == document_id).order_by(DocumentChunk.chunk_index.asc())
        return list(self.db.execute(stmt).scalars().all())
