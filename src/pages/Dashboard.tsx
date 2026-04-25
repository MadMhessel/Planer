import { motion } from 'framer-motion';
import { Eye, FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChatPreview } from '../components/builder/ChatPreview';
import { NodeFlowCanvas } from '../components/builder/NodeFlowCanvas';
import { PersonalityPanel } from '../components/builder/PersonalityPanel';
import { PromptEditor } from '../components/builder/PromptEditor';
import { Button } from '../components/ui/Button';
import { useAssistant } from '../hooks/useAssistant';
import { useToast } from '../hooks/useToast';

export const Dashboard = () => {
  const { успех, ошибка } = useToast();
  const { saveSelectedAssistant, loading } = useAssistant();

  const сохранить = async () => {
    try {
      await saveSelectedAssistant();
      успех('Изменения сохранены');
    } catch {
      ошибка('Не удалось сохранить. Попробуйте ещё раз.');
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Конструктор ассистентов</h2>
          <p className="text-sm text-slate-500">Настройка поведения, знаний и сценариев общения.</p>
        </div>
        <div className="grid w-full gap-2 sm:flex sm:w-auto sm:items-center">
          <Link to="/personality" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <Eye className="h-4 w-4" />
              Предпросмотр
            </Button>
          </Link>
          <Link to="/testing" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <FlaskConical className="h-4 w-4" />
              Тестировать
            </Button>
          </Link>
          <Button onClick={сохранить} loading={loading} aria-label="Сохранить изменения" className="w-full sm:w-auto">
            Сохранить
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <PromptEditor />
        <PersonalityPanel />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <ChatPreview />
        <NodeFlowCanvas />
      </div>
    </div>
  );
};
