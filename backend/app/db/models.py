from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, utc_now


class UserRole(str, enum.Enum):
    user = 'user'
    admin = 'admin'


class OrganizationStatus(str, enum.Enum):
    active = 'active'
    suspended = 'suspended'


class OrganizationMemberRole(str, enum.Enum):
    owner = 'owner'
    admin = 'admin'
    member = 'member'
    viewer = 'viewer'


class AssistantStatus(str, enum.Enum):
    draft = 'draft'
    active = 'active'
    archived = 'archived'


class KnowledgeBaseStatus(str, enum.Enum):
    draft = 'draft'
    processing = 'processing'
    ready = 'ready'
    failed = 'failed'
    archived = 'archived'


class DocumentSourceType(str, enum.Enum):
    upload = 'upload'
    url = 'url'
    text = 'text'
    manual = 'manual'


class DocumentParseStatus(str, enum.Enum):
    pending = 'pending'
    processing = 'processing'
    ready = 'ready'
    failed = 'failed'


class DocumentIndexingStatus(str, enum.Enum):
    pending = 'pending'
    processing = 'processing'
    ready = 'ready'
    failed = 'failed'


class ConversationStatus(str, enum.Enum):
    active = 'active'
    closed = 'closed'


class ChannelType(str, enum.Enum):
    web = 'web'
    telegram = 'telegram'
    whatsapp = 'whatsapp'
    slack = 'slack'
    email = 'email'
    api = 'api'


class MessageRole(str, enum.Enum):
    system = 'system'
    user = 'user'
    assistant = 'assistant'
    tool = 'tool'


class UsageEventType(str, enum.Enum):
    message = 'message'
    embedding = 'embedding'
    upload = 'upload'
    deploy = 'deploy'
    api_call = 'api_call'


class IntegrationType(str, enum.Enum):
    telegram = 'telegram'
    notion = 'notion'
    slack = 'slack'
    google_sheets = 'google_sheets'
    webhook = 'webhook'
    email = 'email'
    crm = 'crm'


class IntegrationStatus(str, enum.Enum):
    connected = 'connected'
    disconnected = 'disconnected'
    error = 'error'


class DeploymentChannelType(str, enum.Enum):
    telegram = 'telegram'
    web_widget = 'web_widget'
    webhook = 'webhook'


class DeploymentStatus(str, enum.Enum):
    deployed = 'deployed'
    inactive = 'inactive'
    failed = 'failed'


class SubscriptionStatus(str, enum.Enum):
    trialing = 'trialing'
    active = 'active'
    canceled = 'canceled'
    past_due = 'past_due'


class InvoiceStatus(str, enum.Enum):
    pending = 'pending'
    paid = 'paid'
    failed = 'failed'
    void = 'void'


class PaymentMethodStatus(str, enum.Enum):
    active = 'active'
    inactive = 'inactive'
    revoked = 'revoked'


class ProcessingJobStatus(str, enum.Enum):
    pending = 'pending'
    processing = 'processing'
    ready = 'ready'
    failed = 'failed'


class IntegrationLogStatus(str, enum.Enum):
    info = 'info'
    success = 'success'
    error = 'error'


class EmailTokenPurpose(str, enum.Enum):
    verify_email = 'verify_email'
    reset_password = 'reset_password'
    invite = 'invite'


class User(Base, TimestampMixin):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name='user_role_enum'), default=UserRole.user, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    organizations_owned: Mapped[list[Organization]] = relationship('Organization', back_populates='owner')
    memberships: Mapped[list[OrganizationMember]] = relationship('OrganizationMember', back_populates='user', cascade='all, delete-orphan')
    assistants_created: Mapped[list[Assistant]] = relationship('Assistant', back_populates='creator')
    refresh_tokens: Mapped[list[RefreshToken]] = relationship('RefreshToken', back_populates='user', cascade='all, delete-orphan')
    email_tokens: Mapped[list[EmailToken]] = relationship('EmailToken', back_populates='user', cascade='all, delete-orphan')


class Organization(Base, TimestampMixin):
    __tablename__ = 'organizations'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    owner_user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    plan_id: Mapped[int | None] = mapped_column(ForeignKey('plans.id', ondelete='SET NULL'), nullable=True)
    status: Mapped[OrganizationStatus] = mapped_column(
        Enum(OrganizationStatus, name='organization_status_enum'),
        default=OrganizationStatus.active,
        nullable=False,
    )

    owner: Mapped[User] = relationship('User', back_populates='organizations_owned')
    members: Mapped[list[OrganizationMember]] = relationship('OrganizationMember', back_populates='organization', cascade='all, delete-orphan')
    assistants: Mapped[list[Assistant]] = relationship('Assistant', back_populates='organization', cascade='all, delete-orphan')
    usage_events: Mapped[list[UsageEvent]] = relationship('UsageEvent', back_populates='organization', cascade='all, delete-orphan')
    invoices: Mapped[list[Invoice]] = relationship('Invoice', back_populates='organization', cascade='all, delete-orphan')
    payment_methods: Mapped[list[PaymentMethod]] = relationship('PaymentMethod', back_populates='organization', cascade='all, delete-orphan')


class OrganizationMember(Base):
    __tablename__ = 'organization_members'
    __table_args__ = (UniqueConstraint('organization_id', 'user_id', name='uq_organization_member'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role: Mapped[OrganizationMemberRole] = mapped_column(
        Enum(OrganizationMemberRole, name='organization_member_role_enum'),
        default=OrganizationMemberRole.member,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    organization: Mapped[Organization] = relationship('Organization', back_populates='members')
    user: Mapped[User] = relationship('User', back_populates='memberships')


class Assistant(Base, TimestampMixin):
    __tablename__ = 'assistants'
    __table_args__ = (UniqueConstraint('organization_id', 'slug', name='uq_assistant_org_slug'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    status: Mapped[AssistantStatus] = mapped_column(Enum(AssistantStatus, name='assistant_status_enum'), default=AssistantStatus.draft, nullable=False)
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    welcome_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_provider: Mapped[str | None] = mapped_column(String(64), nullable=True)
    model_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    temperature: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    max_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    memory_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)

    organization: Mapped[Organization] = relationship('Organization', back_populates='assistants')
    creator: Mapped[User] = relationship('User', back_populates='assistants_created')
    knowledge_bases: Mapped[list[KnowledgeBase]] = relationship('KnowledgeBase', back_populates='assistant', cascade='all, delete-orphan')
    conversations: Mapped[list[Conversation]] = relationship('Conversation', back_populates='assistant', cascade='all, delete-orphan')
    usage_events: Mapped[list[UsageEvent]] = relationship('UsageEvent', back_populates='assistant')
    integrations: Mapped[list[Integration]] = relationship('Integration', back_populates='assistant', cascade='all, delete-orphan')
    deployment_channels: Mapped[list[DeploymentChannel]] = relationship(
        'DeploymentChannel',
        back_populates='assistant',
        cascade='all, delete-orphan',
    )
    sources: Mapped[list[AssistantSource]] = relationship('AssistantSource', back_populates='assistant', cascade='all, delete-orphan')


class KnowledgeBase(Base, TimestampMixin):
    __tablename__ = 'knowledge_bases'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assistant_id: Mapped[int] = mapped_column(ForeignKey('assistants.id', ondelete='CASCADE'), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[KnowledgeBaseStatus] = mapped_column(
        Enum(KnowledgeBaseStatus, name='knowledge_base_status_enum'),
        default=KnowledgeBaseStatus.draft,
        nullable=False,
    )
    chunk_size: Mapped[int] = mapped_column(Integer, default=500, nullable=False)
    chunk_overlap: Mapped[int] = mapped_column(Integer, default=50, nullable=False)

    assistant: Mapped[Assistant] = relationship('Assistant', back_populates='knowledge_bases')
    documents: Mapped[list[KnowledgeDocument]] = relationship(
        'KnowledgeDocument',
        back_populates='knowledge_base',
        cascade='all, delete-orphan',
    )


class KnowledgeDocument(Base, TimestampMixin):
    __tablename__ = 'knowledge_documents'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    knowledge_base_id: Mapped[int] = mapped_column(ForeignKey('knowledge_bases.id', ondelete='CASCADE'), nullable=False)
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    original_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    storage_key: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_type: Mapped[DocumentSourceType] = mapped_column(
        Enum(DocumentSourceType, name='document_source_type_enum'),
        default=DocumentSourceType.upload,
        nullable=False,
    )
    parse_status: Mapped[DocumentParseStatus] = mapped_column(
        Enum(DocumentParseStatus, name='document_parse_status_enum'),
        default=DocumentParseStatus.pending,
        nullable=False,
    )
    indexing_status: Mapped[DocumentIndexingStatus] = mapped_column(
        Enum(DocumentIndexingStatus, name='document_indexing_status_enum'),
        default=DocumentIndexingStatus.pending,
        nullable=False,
    )
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    knowledge_base: Mapped[KnowledgeBase] = relationship('KnowledgeBase', back_populates='documents')
    chunks: Mapped[list[DocumentChunk]] = relationship(
        'DocumentChunk',
        back_populates='document',
        cascade='all, delete-orphan',
    )
    processing_jobs: Mapped[list[DocumentProcessingJob]] = relationship(
        'DocumentProcessingJob',
        back_populates='document',
        cascade='all, delete-orphan',
    )


class DocumentChunk(Base):
    __tablename__ = 'document_chunks'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey('knowledge_documents.id', ondelete='CASCADE'), nullable=False, index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False)
    embedding_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    document: Mapped[KnowledgeDocument] = relationship('KnowledgeDocument', back_populates='chunks')


class Conversation(Base):
    __tablename__ = 'conversations'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assistant_id: Mapped[int] = mapped_column(ForeignKey('assistants.id', ondelete='CASCADE'), nullable=False, index=True)
    user_external_id: Mapped[str] = mapped_column(String(255), nullable=False, default='anonymous')
    channel_type: Mapped[ChannelType] = mapped_column(
        Enum(ChannelType, name='channel_type_enum'),
        default=ChannelType.web,
        nullable=False,
    )
    channel_conversation_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_message_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    status: Mapped[ConversationStatus] = mapped_column(
        Enum(ConversationStatus, name='conversation_status_enum'),
        default=ConversationStatus.active,
        nullable=False,
    )

    assistant: Mapped[Assistant] = relationship('Assistant', back_populates='conversations')
    messages: Mapped[list[Message]] = relationship('Message', back_populates='conversation', cascade='all, delete-orphan')
    usage_events: Mapped[list[UsageEvent]] = relationship('UsageEvent', back_populates='conversation')


class Message(Base):
    __tablename__ = 'messages'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False, index=True)
    role: Mapped[MessageRole] = mapped_column(Enum(MessageRole, name='message_role_enum'), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_input: Mapped[int | None] = mapped_column(Integer, nullable=True)
    token_output: Mapped[int | None] = mapped_column(Integer, nullable=True)
    model_used: Mapped[str | None] = mapped_column(String(128), nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    conversation: Mapped[Conversation] = relationship('Conversation', back_populates='messages')


class UsageEvent(Base):
    __tablename__ = 'usage_events'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True)
    assistant_id: Mapped[int | None] = mapped_column(ForeignKey('assistants.id', ondelete='SET NULL'), nullable=True, index=True)
    conversation_id: Mapped[int | None] = mapped_column(ForeignKey('conversations.id', ondelete='SET NULL'), nullable=True, index=True)
    type: Mapped[UsageEventType] = mapped_column(
        Enum(UsageEventType, name='usage_event_type_enum'),
        nullable=False,
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)
    cost: Mapped[float] = mapped_column(Numeric(12, 4), default=0, nullable=False)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    organization: Mapped[Organization] = relationship('Organization', back_populates='usage_events')
    assistant: Mapped[Assistant | None] = relationship('Assistant', back_populates='usage_events')
    conversation: Mapped[Conversation | None] = relationship('Conversation', back_populates='usage_events')


class Integration(Base, TimestampMixin):
    __tablename__ = 'integrations'
    __table_args__ = (UniqueConstraint('assistant_id', 'type', name='uq_integration_assistant_type'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assistant_id: Mapped[int] = mapped_column(ForeignKey('assistants.id', ondelete='CASCADE'), nullable=False, index=True)
    type: Mapped[IntegrationType] = mapped_column(
        Enum(IntegrationType, name='integration_type_enum'),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[IntegrationStatus] = mapped_column(
        Enum(IntegrationStatus, name='integration_status_enum'),
        default=IntegrationStatus.disconnected,
        nullable=False,
    )
    config_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    assistant: Mapped[Assistant] = relationship('Assistant', back_populates='integrations')
    logs: Mapped[list[IntegrationLog]] = relationship('IntegrationLog', back_populates='integration', cascade='all, delete-orphan')


class DeploymentChannel(Base, TimestampMixin):
    __tablename__ = 'deployment_channels'
    __table_args__ = (UniqueConstraint('assistant_id', 'channel_type', name='uq_deploy_assistant_channel_type'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assistant_id: Mapped[int] = mapped_column(ForeignKey('assistants.id', ondelete='CASCADE'), nullable=False, index=True)
    channel_type: Mapped[DeploymentChannelType] = mapped_column(
        Enum(DeploymentChannelType, name='deployment_channel_type_enum'),
        nullable=False,
    )
    status: Mapped[DeploymentStatus] = mapped_column(
        Enum(DeploymentStatus, name='deployment_status_enum'),
        default=DeploymentStatus.inactive,
        nullable=False,
    )
    public_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    embed_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    config_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    deployed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    assistant: Mapped[Assistant] = relationship('Assistant', back_populates='deployment_channels')
    logs: Mapped[list[DeploymentLog]] = relationship('DeploymentLog', back_populates='deployment', cascade='all, delete-orphan')


class Plan(Base):
    __tablename__ = 'plans'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    monthly_price: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    limits_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    features_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    subscriptions: Mapped[list[Subscription]] = relationship('Subscription', back_populates='plan')


class Subscription(Base):
    __tablename__ = 'subscriptions'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    plan_id: Mapped[int] = mapped_column(ForeignKey('plans.id', ondelete='RESTRICT'), nullable=False)
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, name='subscription_status_enum'),
        default=SubscriptionStatus.trialing,
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    provider: Mapped[str | None] = mapped_column(String(64), nullable=True)
    provider_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    plan: Mapped[Plan] = relationship('Plan', back_populates='subscriptions')
    invoices: Mapped[list[Invoice]] = relationship('Invoice', back_populates='subscription')


class Invoice(Base):
    __tablename__ = 'invoices'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True)
    subscription_id: Mapped[int] = mapped_column(ForeignKey('subscriptions.id', ondelete='CASCADE'), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default='RUB', nullable=False)
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, name='invoice_status_enum'),
        default=InvoiceStatus.pending,
        nullable=False,
    )
    provider: Mapped[str | None] = mapped_column(String(64), nullable=True)
    provider_invoice_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    organization: Mapped[Organization] = relationship('Organization', back_populates='invoices')
    subscription: Mapped[Subscription] = relationship('Subscription', back_populates='invoices')


class PaymentMethod(Base, TimestampMixin):
    __tablename__ = 'payment_methods'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(64), nullable=False, default='yookassa')
    provider_payment_method_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[PaymentMethodStatus] = mapped_column(
        Enum(PaymentMethodStatus, name='payment_method_status_enum'),
        default=PaymentMethodStatus.active,
        nullable=False,
    )
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    organization: Mapped[Organization] = relationship('Organization', back_populates='payment_methods')


class IntegrationLog(Base):
    __tablename__ = 'integration_logs'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    integration_id: Mapped[int | None] = mapped_column(ForeignKey('integrations.id', ondelete='SET NULL'), nullable=True, index=True)
    assistant_id: Mapped[int | None] = mapped_column(ForeignKey('assistants.id', ondelete='SET NULL'), nullable=True, index=True)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[IntegrationLogStatus] = mapped_column(
        Enum(IntegrationLogStatus, name='integration_log_status_enum'),
        default=IntegrationLogStatus.info,
        nullable=False,
    )
    event: Mapped[str] = mapped_column(String(120), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    integration: Mapped[Integration | None] = relationship('Integration', back_populates='logs')


class DeploymentLog(Base):
    __tablename__ = 'deployment_logs'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    deployment_id: Mapped[int | None] = mapped_column(ForeignKey('deployment_channels.id', ondelete='SET NULL'), nullable=True, index=True)
    assistant_id: Mapped[int | None] = mapped_column(ForeignKey('assistants.id', ondelete='SET NULL'), nullable=True, index=True)
    channel_type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[IntegrationLogStatus] = mapped_column(
        Enum(IntegrationLogStatus, name='integration_log_status_enum'),
        default=IntegrationLogStatus.info,
        nullable=False,
    )
    event: Mapped[str] = mapped_column(String(120), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    deployment: Mapped[DeploymentChannel | None] = relationship('DeploymentChannel', back_populates='logs')


class DocumentProcessingJob(Base, TimestampMixin):
    __tablename__ = 'document_processing_jobs'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey('knowledge_documents.id', ondelete='CASCADE'), nullable=False, index=True)
    job_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    status: Mapped[ProcessingJobStatus] = mapped_column(
        Enum(ProcessingJobStatus, name='processing_job_status_enum'),
        default=ProcessingJobStatus.pending,
        nullable=False,
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    document: Mapped[KnowledgeDocument] = relationship('KnowledgeDocument', back_populates='processing_jobs')


class AssistantSource(Base):
    __tablename__ = 'assistant_sources'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assistant_id: Mapped[int] = mapped_column(ForeignKey('assistants.id', ondelete='CASCADE'), nullable=False, index=True)
    document_id: Mapped[int | None] = mapped_column(ForeignKey('knowledge_documents.id', ondelete='SET NULL'), nullable=True, index=True)
    chunk_id: Mapped[int | None] = mapped_column(ForeignKey('document_chunks.id', ondelete='SET NULL'), nullable=True, index=True)
    conversation_id: Mapped[int | None] = mapped_column(ForeignKey('conversations.id', ondelete='SET NULL'), nullable=True, index=True)
    message_id: Mapped[int | None] = mapped_column(ForeignKey('messages.id', ondelete='SET NULL'), nullable=True, index=True)
    score: Mapped[float | None] = mapped_column(Numeric(8, 4), nullable=True)
    snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    assistant: Mapped[Assistant] = relationship('Assistant', back_populates='sources')


class LimitCounter(Base):
    __tablename__ = 'limit_counters'
    __table_args__ = (UniqueConstraint('organization_id', 'metric', 'period_key', name='uq_limit_counter_period'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True)
    metric: Mapped[str] = mapped_column(String(80), nullable=False)
    period_key: Mapped[str] = mapped_column(String(32), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class AdminAuditLog(Base):
    __tablename__ = 'admin_audit_logs'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    organization_id: Mapped[int | None] = mapped_column(ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    target_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    target_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)


class EmailToken(Base):
    __tablename__ = 'email_tokens'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    purpose: Mapped[EmailTokenPurpose] = mapped_column(
        Enum(EmailTokenPurpose, name='email_token_purpose_enum'),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    user: Mapped[User | None] = relationship('User', back_populates='email_tokens')


class RefreshToken(Base):
    __tablename__ = 'refresh_tokens'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    token_jti: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    user: Mapped[User] = relationship('User', back_populates='refresh_tokens')
