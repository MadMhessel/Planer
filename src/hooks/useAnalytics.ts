import { useMemo } from 'react';
import type { IntentPoint, KPI, MetricPoint } from '../types';

export const useAnalytics = () => {
  const kpis = useMemo<KPI[]>(
    () => [
      { id: 'total', label: 'Всего диалогов', value: '1,247', delta: '+18.6%', trend: 'up', icon: 'messages' },
      { id: 'response', label: 'Среднее время ответа', value: '1,2 с', delta: '-12.4%', trend: 'down', icon: 'timer' },
      { id: 'messages', label: 'Сообщений за месяц', value: '8,943', delta: '+22.7%', trend: 'up', icon: 'send' },
      { id: 'satisfaction', label: 'Удовлетворённость', value: '4.7/5', delta: '+6.3%', trend: 'up', icon: 'star' },
    ],
    [],
  );

  const lineData = useMemo<MetricPoint[]>(
    () => [
      { name: '1 мая', value: 220 },
      { name: '3 мая', value: 310 },
      { name: '5 мая', value: 245 },
      { name: '7 мая', value: 295 },
      { name: '9 мая', value: 260 },
      { name: '11 мая', value: 380 },
      { name: '13 мая', value: 330 },
      { name: '15 мая', value: 470 },
      { name: '17 мая', value: 540 },
      { name: '19 мая', value: 460 },
      { name: '21 мая', value: 630 },
      { name: '23 мая', value: 520 },
      { name: '25 мая', value: 690 },
      { name: '27 мая', value: 760 },
      { name: '29 мая', value: 710 },
      { name: '31 мая', value: 912 },
    ],
    [],
  );

  const pieData = useMemo<IntentPoint[]>(
    () => [
      { name: 'Юридические вопросы', value: 34, color: '#8b5cf6' },
      { name: 'Общие вопросы', value: 28, color: '#3b82f6' },
      { name: 'Планирование', value: 22, color: '#14b8a6' },
      { name: 'Другое', value: 16, color: '#94a3b8' },
    ],
    [],
  );

  const flaggedConversations = useMemo(
    () => [
      { id: '1', title: 'Вопрос о политике возврата', confidence: 45, time: '2 мин назад' },
      { id: '2', title: 'Запрос на юридический документ', confidence: 38, time: '15 мин назад' },
      { id: '3', title: 'Налоговый вопрос', confidence: 41, time: '1 ч назад' },
      { id: '4', title: 'Проверка договора', confidence: 47, time: '2 ч назад' },
      { id: '5', title: 'Статус трудоустройства', confidence: 44, time: '3 ч назад' },
    ],
    [],
  );

  return {
    kpis,
    lineData,
    pieData,
    flaggedConversations,
  };
};
