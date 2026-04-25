import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useToastStore, type ТипУведомления } from '../../store/toastStore';

const иконки: Record<ТипУведомления, JSX.Element> = {
  успех: <CheckCircle2 className="h-5 w-5" />,
  ошибка: <AlertCircle className="h-5 w-5" />,
  предупреждение: <TriangleAlert className="h-5 w-5" />,
  инфо: <Info className="h-5 w-5" />,
};

const стили: Record<ТипУведомления, string> = {
  успех: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  ошибка: 'border-rose-200 bg-rose-50 text-rose-900',
  предупреждение: 'border-amber-200 bg-amber-50 text-amber-900',
  инфо: 'border-cyan-200 bg-cyan-50 text-cyan-900',
};

export const ToastViewport = () => {
  const уведомления = useToastStore((state) => state.уведомления);
  const убратьУведомление = useToastStore((state) => state.убратьУведомление);

  return (
    <section
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-6 sm:top-6"
    >
      <AnimatePresence initial={false}>
        {уведомления.map((уведомление) => (
          <motion.article
            key={уведомление.id}
            initial={{ opacity: 0, x: 88 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            role={уведомление.тип === 'ошибка' ? 'alert' : 'status'}
            className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-lg ${стили[уведомление.тип]}`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-current">{иконки[уведомление.тип]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{уведомление.заголовок}</p>
                {уведомление.описание ? <p className="mt-1 text-xs opacity-90">{уведомление.описание}</p> : null}
              </div>
              <button
                type="button"
                aria-label="Закрыть уведомление"
                onClick={() => убратьУведомление(уведомление.id)}
                className="rounded-md p-1 text-current/70 transition-colors hover:bg-white/60 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/35"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.article>
        ))}
      </AnimatePresence>
    </section>
  );
};
