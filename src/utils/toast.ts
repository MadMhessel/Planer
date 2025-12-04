// КРИТИЧЕСКИ ВАЖНО: Динамическая загрузка toast из react-hot-toast,
// чтобы избежать ошибки "Cannot access 'It' before initialization" в production сборке.
// toast загружается только при первом использовании, а не на верхнем уровне модуля.

let toastInstance: typeof import('react-hot-toast').default | null = null;
let loadingPromise: Promise<typeof import('react-hot-toast').default> | null = null;

// Ленивая загрузка toast модуля
const loadToast = (): Promise<typeof import('react-hot-toast').default> => {
  if (toastInstance) {
    return Promise.resolve(toastInstance);
  }
  
  if (loadingPromise) {
    return loadingPromise;
  }
  
  loadingPromise = import('react-hot-toast').then((module) => {
    toastInstance = module.default;
    return toastInstance;
  }).catch((error) => {
    console.error('[toast] Failed to load react-hot-toast:', error);
    loadingPromise = null;
    throw error;
  });
  
  return loadingPromise;
};

// Предзагружаем toast в фоне при первом импорте модуля
// Это гарантирует, что toast будет доступен при первом использовании
if (typeof window !== 'undefined') {
  // Загружаем асинхронно в фоне, не блокируя инициализацию
  loadToast().catch(() => {
    // Игнорируем ошибки при предзагрузке
  });
}

// Экспортируем обёртку для toast
// Все методы используют кэшированный toast или загружают его при первом использовании
export const toast = {
  success: (message: string, opts?: any) => {
    if (toastInstance) {
      return toastInstance.success(message, opts);
    }
    loadToast().then((instance) => instance.success(message, opts));
  },
  error: (message: string, opts?: any) => {
    if (toastInstance) {
      return toastInstance.error(message, opts);
    }
    loadToast().then((instance) => instance.error(message, opts));
  },
  loading: (message: string, opts?: any) => {
    if (toastInstance) {
      return toastInstance.loading(message, opts);
    }
    return loadToast().then((instance) => instance.loading(message, opts));
  },
  custom: (message: string, opts?: any) => {
    if (toastInstance) {
      return toastInstance.custom(message, opts);
    }
    return loadToast().then((instance) => instance.custom(message, opts));
  },
  dismiss: (toastId?: string) => {
    if (toastInstance) {
      return toastInstance.dismiss(toastId);
    }
    loadToast().then((instance) => instance.dismiss(toastId));
  },
  remove: (toastId?: string) => {
    if (toastInstance) {
      return toastInstance.remove(toastId);
    }
    loadToast().then((instance) => instance.remove(toastId));
  },
  promise: (promise: Promise<any>, msgs: any, opts?: any) => {
    if (toastInstance) {
      return toastInstance.promise(promise, msgs, opts);
    }
    return loadToast().then((instance) => instance.promise(promise, msgs, opts));
  },
  dismissAll: (toasterId?: string) => {
    if (toastInstance) {
      return toastInstance.dismissAll(toasterId);
    }
    loadToast().then((instance) => instance.dismissAll(toasterId));
  },
  removeAll: (toasterId?: string) => {
    if (toastInstance) {
      return toastInstance.removeAll(toasterId);
    }
    loadToast().then((instance) => instance.removeAll(toasterId));
  }
};

