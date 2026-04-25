from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import RequestContext, get_request_context, require_roles
from app.db.models import KnowledgeDocument, OrganizationMemberRole
from app.db.session import get_db
from app.repositories.knowledge import KnowledgeRepository
from app.schemas.knowledge import (
    DocumentFromUrlRequest,
    KnowledgeBaseCreate,
    KnowledgeBaseOut,
    KnowledgeBaseUpdate,
    KnowledgeDocumentOut,
    ReindexDocumentRequest,
)
from app.services.knowledge_service import KnowledgeService

router = APIRouter(tags=['knowledge'])


def _document_out(db: Session, document: KnowledgeDocument) -> KnowledgeDocumentOut:
    chunks_count = KnowledgeRepository(db).count_chunks(document.id)
    return KnowledgeDocumentOut(
        id=document.id,
        knowledge_base_id=document.knowledge_base_id,
        filename=document.filename,
        original_url=document.original_url,
        storage_key=document.storage_key,
        mime_type=document.mime_type,
        file_size=document.file_size,
        source_type=document.source_type.value,
        parse_status=document.parse_status.value,
        indexing_status=document.indexing_status.value,
        chunks_count=chunks_count,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


@router.get('/assistants/{assistant_id}/knowledge-bases', response_model=list[KnowledgeBaseOut])
def list_knowledge_bases(
    assistant_id: int,
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> list[KnowledgeBaseOut]:
    service = KnowledgeService(db)
    bases = service.list_bases(assistant_id=assistant_id, organization_id=context.organization.id)
    return [KnowledgeBaseOut.model_validate(item) for item in bases]


@router.post('/assistants/{assistant_id}/knowledge-bases', response_model=KnowledgeBaseOut)
def create_knowledge_base(
    assistant_id: int,
    payload: KnowledgeBaseCreate,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> KnowledgeBaseOut:
    service = KnowledgeService(db)
    base = service.create_base(assistant_id=assistant_id, organization_id=context.organization.id, payload=payload)
    return KnowledgeBaseOut.model_validate(base)


@router.get('/knowledge-bases/{knowledge_base_id}', response_model=KnowledgeBaseOut)
def get_knowledge_base(
    knowledge_base_id: int,
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> KnowledgeBaseOut:
    service = KnowledgeService(db)
    base = service.get_base_in_org(knowledge_base_id=knowledge_base_id, organization_id=context.organization.id)
    return KnowledgeBaseOut.model_validate(base)


@router.patch('/knowledge-bases/{knowledge_base_id}', response_model=KnowledgeBaseOut)
def update_knowledge_base(
    knowledge_base_id: int,
    payload: KnowledgeBaseUpdate,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> KnowledgeBaseOut:
    service = KnowledgeService(db)
    base = service.get_base_in_org(knowledge_base_id=knowledge_base_id, organization_id=context.organization.id)
    updated = service.update_base(base, payload)
    return KnowledgeBaseOut.model_validate(updated)


@router.delete('/knowledge-bases/{knowledge_base_id}')
def delete_knowledge_base(
    knowledge_base_id: int,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> dict:
    service = KnowledgeService(db)
    base = service.get_base_in_org(knowledge_base_id=knowledge_base_id, organization_id=context.organization.id)
    service.delete_base(base)
    return {'status': 'ok'}


@router.post('/knowledge-bases/{knowledge_base_id}/documents/upload', response_model=KnowledgeDocumentOut)
def upload_document(
    knowledge_base_id: int,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
) -> KnowledgeDocumentOut:
    service = KnowledgeService(db)
    base = service.get_base_in_org(knowledge_base_id=knowledge_base_id, organization_id=context.organization.id)

    data = file.file.read()
    document = service.upload_document(base=base, filename=file.filename or 'document.txt', mime_type=file.content_type, data=data)
    return _document_out(db, document)


@router.post('/knowledge-bases/{knowledge_base_id}/documents/from-url', response_model=KnowledgeDocumentOut)
def create_document_from_url(
    knowledge_base_id: int,
    payload: DocumentFromUrlRequest,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> KnowledgeDocumentOut:
    service = KnowledgeService(db)
    base = service.get_base_in_org(knowledge_base_id=knowledge_base_id, organization_id=context.organization.id)
    document = service.create_document_from_url(base=base, payload=payload)
    return _document_out(db, document)


@router.get('/knowledge-bases/{knowledge_base_id}/documents', response_model=list[KnowledgeDocumentOut])
def list_documents(
    knowledge_base_id: int,
    context: Annotated[RequestContext, Depends(get_request_context)],
    db: Session = Depends(get_db),
) -> list[KnowledgeDocumentOut]:
    service = KnowledgeService(db)
    base = service.get_base_in_org(knowledge_base_id=knowledge_base_id, organization_id=context.organization.id)
    documents = service.list_documents(base)
    return [_document_out(db, item) for item in documents]


@router.post('/documents/{document_id}/reindex', response_model=KnowledgeDocumentOut)
def reindex_document(
    document_id: int,
    payload: ReindexDocumentRequest,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> KnowledgeDocumentOut:
    service = KnowledgeService(db)
    document = service.get_document_in_org(document_id=document_id, organization_id=context.organization.id)
    updated = service.reindex_document(document, chunk_size=payload.chunk_size, chunk_overlap=payload.chunk_overlap)
    return _document_out(db, updated)


@router.delete('/documents/{document_id}')
def delete_document(
    document_id: int,
    context: Annotated[
        RequestContext,
        Depends(require_roles(OrganizationMemberRole.owner, OrganizationMemberRole.admin, OrganizationMemberRole.member)),
    ],
    db: Session = Depends(get_db),
) -> dict:
    service = KnowledgeService(db)
    document = service.get_document_in_org(document_id=document_id, organization_id=context.organization.id)
    service.delete_document(document)
    return {'status': 'ok'}
