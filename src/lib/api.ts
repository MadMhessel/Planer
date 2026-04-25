const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    full_name: string;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
  };
  organization_id: number;
  organization_role: string;
  tokens: {
    access_token: string;
    refresh_token: string;
    access_expires_at: string;
    refresh_expires_at: string;
  };
}

export interface BackendAssistant {
  id: number;
  organization_id: number;
  name: string;
  slug: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  system_prompt: string | null;
  welcome_message: string | null;
  model_provider: string | null;
  model_name: string | null;
  temperature: number | null;
  max_tokens: number | null;
  memory_enabled: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseOut {
  id: number;
  assistant_id: number;
  name: string;
  description: string | null;
  status: 'draft' | 'processing' | 'ready' | 'failed' | 'archived';
  chunk_size: number;
  chunk_overlap: number;
}

export interface KnowledgeDocumentOut {
  id: number;
  filename: string;
  mime_type: string | null;
  file_size: number | null;
  source_type: 'upload' | 'url' | 'text' | 'manual';
  parse_status: 'pending' | 'processing' | 'ready' | 'failed';
  indexing_status: 'pending' | 'processing' | 'ready' | 'failed';
  chunks_count: number;
  created_at: string;
}

export interface ChatResponse {
  conversation: { id: number; status: string };
  assistant_message: {
    id: number;
    content: string;
    token_input: number | null;
    token_output: number | null;
    latency_ms: number | null;
  };
  retrieved_chunks: Array<{ chunk_id: number; document_id: number; score: number; snippet: string }>;
}

const tokenKey = 'ai_access_token';
const refreshKey = 'ai_refresh_token';

export const authToken = {
  get: () => window.sessionStorage.getItem(tokenKey),
  getRefresh: () => window.sessionStorage.getItem(refreshKey),
  set: (auth: AuthResponse) => {
    window.sessionStorage.setItem(tokenKey, auth.tokens.access_token);
    window.sessionStorage.setItem(refreshKey, auth.tokens.refresh_token);
    window.sessionStorage.setItem('ai_user_name', auth.user.full_name);
    window.sessionStorage.setItem('ai_user_email', auth.user.email);
  },
  clear: () => {
    window.sessionStorage.removeItem(tokenKey);
    window.sessionStorage.removeItem(refreshKey);
    window.sessionStorage.removeItem('ai_user_name');
    window.sessionStorage.removeItem('ai_user_email');
  },
  isAuthenticated: () => Boolean(window.sessionStorage.getItem(tokenKey)),
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  const bodyIsFormData = options.body instanceof FormData;

  if (!bodyIsFormData && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = authToken.get();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const errorPayload = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
    throw new ApiError(
      response.status,
      String(errorPayload.error_code || 'api_error'),
      String(errorPayload.message || 'Ошибка API'),
      errorPayload.details,
    );
  }

  return payload as T;
};

export const api = {
  register: (payload: { email: string; password: string; full_name: string; organization_name: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () =>
    request<{ status: string }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: authToken.getRefresh() }),
    }),
  me: () => request<AuthResponse['user'] & Record<string, unknown>>('/auth/me'),
  forgotPassword: (email: string) => request<{ status: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  listAssistants: () => request<BackendAssistant[]>('/assistants'),
  createAssistant: (payload: Partial<BackendAssistant> & { name: string }) =>
    request<BackendAssistant>('/assistants', { method: 'POST', body: JSON.stringify(payload) }),
  updateAssistant: (id: string | number, payload: Partial<BackendAssistant>) =>
    request<BackendAssistant>(`/assistants/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  listKnowledgeBases: (assistantId: string | number) => request<KnowledgeBaseOut[]>(`/assistants/${assistantId}/knowledge-bases`),
  createKnowledgeBase: (assistantId: string | number, payload: { name: string; chunk_size: number; chunk_overlap: number }) =>
    request<KnowledgeBaseOut>(`/assistants/${assistantId}/knowledge-bases`, { method: 'POST', body: JSON.stringify(payload) }),
  listDocuments: (knowledgeBaseId: string | number) => request<KnowledgeDocumentOut[]>(`/knowledge-bases/${knowledgeBaseId}/documents`),
  uploadDocument: (knowledgeBaseId: string | number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<KnowledgeDocumentOut>(`/knowledge-bases/${knowledgeBaseId}/documents/upload`, { method: 'POST', body: form });
  },

  chat: (assistantId: string | number, payload: { message: string; conversation_id?: number | null; user_external_id?: string; channel_type?: string }) =>
    request<ChatResponse>(`/assistants/${assistantId}/chat`, { method: 'POST', body: JSON.stringify(payload) }),

  checkout: (planCode: string) =>
    request<{ confirmation_url: string }>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan_code: planCode, return_url: `${window.location.origin}/dashboard?billing=success` }),
    }),
  billingLimits: () => request<{ limits: Record<string, unknown>; usage: Record<string, number> }>('/billing/limits'),
};
