import { Brain, Palette, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { useAssistant } from '../../hooks/useAssistant';
import { Card } from '../ui/Card';
import { Slider } from '../ui/Slider';
import { Toggle } from '../ui/Toggle';

export const PersonalityPanel = () => {
  const { personality, updatePersonality } = useAssistant();
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  return (
    <Card title="Настройка личности" description="Управляйте стилем общения ассистента." animate>
      <div className="space-y-4">
        <Slider
          label="Формальность"
          value={personality.formality}
          onChange={(value) => updatePersonality('formality', value)}
          leftLabel="Неформально"
          rightLabel="Формально"
        />
        <Slider
          label="Уровень экспертизы"
          value={personality.expertise}
          onChange={(value) => updatePersonality('expertise', value)}
          leftLabel="Базовый"
          rightLabel="Экспертный"
        />
        <Slider
          label="Тон"
          value={personality.tone}
          onChange={(value) => updatePersonality('tone', value)}
          leftLabel="Сдержанный"
          rightLabel="Дружелюбный"
        />
        <Slider
          label="Креативность"
          value={personality.creativity}
          onChange={(value) => updatePersonality('creativity', value)}
          leftLabel="Точный"
          rightLabel="Творческий"
        />
      </div>

      <div className="mt-5 rounded-card border border-slate-200 bg-slate-50 p-3">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Palette className="h-4 w-4 text-accent-violet" />
          Цвета сообщений
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2">
            <span className="h-4 w-4 rounded-full bg-violet-100" />
            <span className="font-medium text-slate-600">Ассистент</span>
            <span className="ml-auto text-xs text-slate-500">#EDE9FE</span>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2">
            <span className="h-4 w-4 rounded-full bg-cyan-100" />
            <span className="font-medium text-slate-600">Пользователь</span>
            <span className="ml-auto text-xs text-slate-500">#DBEAFE</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-card border border-slate-200 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Volume2 className="h-4 w-4 text-accent-teal" />
            Голосовые настройки
          </div>
          <Toggle checked={voiceEnabled} onChange={setVoiceEnabled} ariaLabel="Включить или выключить голосовые настройки" />
        </div>
        <Slider
          label="Скорость речи"
          value={personality.voiceSpeed}
          onChange={(value) => updatePersonality('voiceSpeed', value)}
          leftLabel="Медленнее"
          rightLabel="Быстрее"
          disabled={!voiceEnabled}
        />
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-card border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-700">
        <Brain className="h-4 w-4" />
        Подсказка: высокий уровень экспертизы увеличивает глубину и длину ответа.
      </div>
    </Card>
  );
};
