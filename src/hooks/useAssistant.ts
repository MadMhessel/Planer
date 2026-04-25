import { useEffect, useMemo } from 'react';
import { useAssistantStore } from '../store/assistantStore';

export const useAssistant = () => {
  const assistants = useAssistantStore((state) => state.assistants);
  const selectedAssistantId = useAssistantStore((state) => state.selectedAssistantId);
  const setSelectedAssistant = useAssistantStore((state) => state.setSelectedAssistant);
  const systemPrompt = useAssistantStore((state) => state.systemPrompt);
  const setSystemPrompt = useAssistantStore((state) => state.setSystemPrompt);
  const personality = useAssistantStore((state) => state.personality);
  const updatePersonality = useAssistantStore((state) => state.updatePersonality);
  const loadAssistants = useAssistantStore((state) => state.loadAssistants);
  const saveSelectedAssistant = useAssistantStore((state) => state.saveSelectedAssistant);
  const loading = useAssistantStore((state) => state.loading);
  const error = useAssistantStore((state) => state.error);

  useEffect(() => {
    void loadAssistants();
  }, [loadAssistants]);

  const selectedAssistant = useMemo(
    () => assistants.find((assistant) => assistant.id === selectedAssistantId) ?? assistants[0],
    [assistants, selectedAssistantId],
  );

  return {
    assistants,
    selectedAssistant,
    selectedAssistantId,
    setSelectedAssistant,
    systemPrompt,
    setSystemPrompt,
    personality,
    updatePersonality,
    saveSelectedAssistant,
    loading,
    error,
  };
};
