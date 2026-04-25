import { Rocket } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../ui/Button';

export const DeployButton = () => {
  const deployLoading = useUIStore((state) => state.deployLoading);
  const setDeployLoading = useUIStore((state) => state.setDeployLoading);
  const { предупреждение, успех } = useToast();
  const [progress, setProgress] = useState(0);

  const steps = useMemo(
    () => ['Подготовка сборки', 'Проверка конфигурации', 'Деплой на серверы', 'Проверка здоровья', 'Готово'],
    [],
  );

  const startDeploy = () => {
    if (deployLoading) {
      предупреждение('Публикация уже выполняется');
      return;
    }

    setDeployLoading(true);
    setProgress(0);

    const interval = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + 20;
        if (next >= 100) {
          window.clearInterval(interval);
          setDeployLoading(false);
          успех('Публикация завершена');
          return 100;
        }
        return next;
      });
    }, 500);
  };

  const activeStep = Math.min(Math.floor(progress / 20), steps.length - 1);

  return (
    <div className="space-y-3 rounded-card border border-slate-200 bg-white p-4 shadow-soft">
      <Button variant="secondary" className="w-full" loading={deployLoading} onClick={startDeploy}>
        <Rocket className="h-4 w-4" />
        Развернуть ассистента
      </Button>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>Прогресс деплоя</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-accent-teal transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">{steps[activeStep]}</p>
      </div>
    </div>
  );
};
