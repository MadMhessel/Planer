from __future__ import annotations

import os
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

# Must be set before importing app settings/session.
TEST_DB_PATH = Path(__file__).resolve().parent / 'test.db'
TEST_STORAGE_PATH = Path(__file__).resolve().parent / 'test_storage'
os.environ.setdefault('DATABASE_URL', f'sqlite:///{TEST_DB_PATH}')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret-key')
os.environ.setdefault('REDIS_URL', 'redis://localhost:6379/0')
os.environ.setdefault('STORAGE_ROOT', str(TEST_STORAGE_PATH))

from app.db.base import Base
from app.db.models import (
    Assistant,
    AssistantSource,
    AdminAuditLog,
    Conversation,
    DeploymentChannel,
    DeploymentLog,
    DocumentChunk,
    DocumentProcessingJob,
    EmailToken,
    Integration,
    IntegrationLog,
    Invoice,
    KnowledgeBase,
    KnowledgeDocument,
    LimitCounter,
    Message,
    Organization,
    OrganizationMember,
    PaymentMethod,
    Plan,
    RefreshToken,
    Subscription,
    UsageEvent,
    User,
)
from app.db.session import SessionLocal, engine
from app.main import app


@pytest.fixture(scope='session', autouse=True)
def prepare_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    TEST_STORAGE_PATH.mkdir(parents=True, exist_ok=True)
    yield
    Base.metadata.drop_all(bind=engine)
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    if TEST_STORAGE_PATH.exists():
        shutil.rmtree(TEST_STORAGE_PATH)


@pytest.fixture(autouse=True)
def clean_database() -> None:
    with SessionLocal() as session:
        for model in [
            RefreshToken,
            EmailToken,
            AdminAuditLog,
            LimitCounter,
            DocumentProcessingJob,
            DeploymentLog,
            IntegrationLog,
            PaymentMethod,
            Invoice,
            Subscription,
            AssistantSource,
            UsageEvent,
            Message,
            Conversation,
            DocumentChunk,
            KnowledgeDocument,
            KnowledgeBase,
            DeploymentChannel,
            Integration,
            Assistant,
            OrganizationMember,
            Organization,
            Plan,
            User,
        ]:
            session.execute(delete(model))
        session.commit()
    if TEST_STORAGE_PATH.exists():
        shutil.rmtree(TEST_STORAGE_PATH)
    TEST_STORAGE_PATH.mkdir(parents=True, exist_ok=True)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
