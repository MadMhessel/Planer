import { motion } from 'framer-motion';
import { ChatPreview } from '../components/builder/ChatPreview';
import { PersonalityPanel } from '../components/builder/PersonalityPanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export const Personality = () => {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center justify-end gap-2"
      >
        <Button variant="outline">Отменить</Button>
        <Button variant="outline">Сохранить черновик</Button>
        <Button>Сохранить</Button>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <PersonalityPanel />
        <div className="space-y-4">
          <ChatPreview />
          <Card title="Примечания предпросмотра" description="Предпросмотр обновляется при каждом изменении слайдера." animate>
            <p className="text-sm text-slate-600">
              Меняйте формальность, экспертизу и креативность, чтобы настроить стиль ответов ассистента в диалогах.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
