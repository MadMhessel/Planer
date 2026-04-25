import { create } from 'zustand';
import { api, authToken, type BackendAssistant } from '../lib/api';
import type { Assistant, PersonalitySettings } from '../types';

interface AssistantState {
  assistants: Assistant[];
  backendAssistants: BackendAssistant[];
  selectedAssistantId: string;
  systemPrompt: string;
  personality: PersonalitySettings;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  loadAssistants: () => Promise<void>;
  saveSelectedAssistant: () => Promise<void>;
  setSelectedAssistant: (id: string) => void;
  setSystemPrompt: (prompt: string) => void;
  updatePersonality: (key: keyof PersonalitySettings, value: number) => void;
}

const системныйПромпт = `Ты ИИ-ассистент компании.\nПомогай пользователям чётко и по делу.\nОтвечай структурировано и поддерживай деловой тон.\nЕсли контекста недостаточно, запрашивай уточнение.`;

const initialAssistants: Assistant[] = [
  { id: '1', name: 'ЮристАссистент', role: 'Юридический ассистент', updatedAt: 'Обновлён 2м назад', status: 'online' },
];

const mapAssistant = (assistant: BackendAssistant): Assistant => ({
  id: String(assistant.id),
  name: assistant.name,
  role: assistant.description || 'ИИ-ассистент',
  updatedAt: 'Синхронизировано с сервером',
  status: assistant.status === 'archived' ? 'offline' : 'online',
});

export const useAssistantStore = create<AssistantState>((set, get) => ({
  assistants: initialAssistants,
  backendAssistants: [],
  selectedAssistantId: initialAssistants[0].id,
  systemPrompt: системныйПромпт,
  personality: {
    formality: 70,
    expertise: 80,
    tone: 62,
    creativity: 55,
    humor: 35,
    voiceSpeed: 58,
  },
  loading: false,
  loaded: false,
  error: null,
  loadAssistants: async () => {
    if (!authToken.isAuthenticated() || get().loading || get().loaded) {
      return;
    }

    set({ loading: true, error: null });
    try {
      let backendItems = await api.listAssistants();
      if (backendItems.length === 0) {
        const created = await api.createAssistant({
          name: 'ЮристАссистент',
          description: 'Юридический ассистент',
          system_prompt: системныйПромпт,
          welcome_message: 'Здравствуйте! Я помогу разобраться с вопросом.',
          model_provider: 'openai',
          model_name: 'gpt-4.1-mini',
          temperature: 0.3,
          max_tokens: 900,
          memory_enabled: true,
          is_public: false,
        });
        backendItems = [created];
      }

      const selected = backendItems[0];
      set({
        backendAssistants: backendItems,
        assistants: backendItems.map(mapAssistant),
        selectedAssistantId: String(selected.id),
        systemPrompt: selected.system_prompt || системныйПромпт,
        loading: false,
        loaded: true,
      });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'Не удалось загрузить ассистентов' });
    }
  },
  saveSelectedAssistant: async () => {
    const selectedId = get().selectedAssistantId;
    const selected = get().backendAssistants.find((assistant) => String(assistant.id) === selectedId);
    if (!selected) {
      return;
    }
    const updated = await api.updateAssistant(selected.id, {
      system_prompt: get().systemPrompt,
      description: selected.description,
      model_provider: selected.model_provider || 'openai',
      model_name: selected.model_name || 'gpt-4.1-mini',
      temperature: selected.temperature ?? 0.3,
      max_tokens: selected.max_tokens ?? 900,
      memory_enabled: true,
    });
    set((state) => ({
      backendAssistants: state.backendAssistants.map((assistant) => (assistant.id === updated.id ? updated : assistant)),
      assistants: state.backendAssistants.map((assistant) => (assistant.id === updated.id ? mapAssistant(updated) : mapAssistant(assistant))),
      systemPrompt: updated.system_prompt || state.systemPrompt,
    }));
  },
  setSelectedAssistant: (id) =>
    set((state) => {
      const selected = state.backendAssistants.find((assistant) => String(assistant.id) === id);
      return {
        selectedAssistantId: id,
        systemPrompt: selected?.system_prompt || state.systemPrompt,
      };
    }),
  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
  updatePersonality: (key, value) =>
    set((state) => ({
      personality: {
        ...state.personality,
        [key]: value,
      },
    })),
}));
