/**
 * Репозиторий для работы с задачами в Firestore
 * Инкапсулирует всю логику доступа к данным задач
 */
import { 
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Task } from '../../types';
import { logger } from '../../utils/logger';
import { getMoscowISOString } from '../../utils/dateUtils';

/**
 * Репозиторий для работы с задачами
 */
export class TaskRepository {
  /**
   * Подписывается на изменения задач в рабочем пространстве
   * @param workspaceId ID рабочего пространства
   * @param callback Функция обратного вызова, вызываемая при изменении списка задач
   * @returns Функция для отмены подписки
   */
  subscribeToTasks(workspaceId: string, callback: (tasks: Task[]) => void): () => void {
    const q = query(
      collection(db, 'tasks'),
      where('workspaceId', '==', workspaceId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const tasks: Task[] = snapshot.docs.map(docSnap => ({
        ...(docSnap.data() as Task),
        id: docSnap.id
      }));
      callback(tasks);
    });
  }

  /**
   * Создает новую задачу в Firestore
   * @param taskData Данные задачи (без id, createdAt, updatedAt)
   * @returns Созданная задача с id и временными метками
   */
  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    // Фильтруем undefined значения, так как Firestore их не принимает
    const data: any = {
      createdAt: getMoscowISOString(),
      updatedAt: getMoscowISOString()
    };
    
    // Копируем только определенные поля
    Object.keys(taskData).forEach(key => {
      const value = (taskData as any)[key];
      if (value !== undefined) {
        data[key] = value;
      }
    });

    const docRef = await addDoc(collection(db, 'tasks'), data);

    const docSnap = await getDoc(docRef);
    return {
      ...(docSnap.data() as Task),
      id: docSnap.id
    };
  }

  /**
   * Обновляет задачу в Firestore
   * @param taskId ID задачи
   * @param updates Объект с обновлениями
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const taskRef = doc(db, 'tasks', taskId);
    
    logger.info('[TaskRepository.updateTask] Received updates', { 
      taskId, 
      updatesKeys: Object.keys(updates),
      assigneeIds: updates.assigneeIds,
      assigneeId: updates.assigneeId
    });
    
    // Дополнительная проверка: удаляем все undefined значения из updates перед обработкой
    const cleanUpdates: Partial<Task> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) {
        continue;
      }
      
      // Специальная обработка для массивов: фильтруем undefined элементы
      if (Array.isArray(value)) {
        const cleanArray = value.filter(item => item !== undefined && item !== null && item !== '');
        if (cleanArray.length > 0 || key === 'tags' || key === 'dependencies' || key === 'assigneeIds') {
          cleanUpdates[key as keyof Task] = cleanArray as any;
        }
      } else {
        cleanUpdates[key as keyof Task] = value as any;
      }
    }
    
    logger.info('[TaskRepository.updateTask] Clean updates', { 
      taskId, 
      cleanUpdatesKeys: Object.keys(cleanUpdates),
      assigneeIds: cleanUpdates.assigneeIds,
      assigneeId: cleanUpdates.assigneeId
    });
    
    // Фильтруем undefined, null и пустые строки, так как Firestore их не принимает
    const updateData: any = {
      updatedAt: getMoscowISOString()
    };

    // Обрабатываем assigneeIds отдельно, чтобы правильно синхронизировать с assigneeId
    let hasAssigneeIds = false;
    if (cleanUpdates.assigneeIds !== undefined) {
      if (Array.isArray(cleanUpdates.assigneeIds)) {
        if (cleanUpdates.assigneeIds.length > 0) {
          // Фильтруем undefined и null из массива
          const validAssigneeIds = cleanUpdates.assigneeIds.filter(id => id !== undefined && id !== null && id !== '');
          if (validAssigneeIds.length > 0) {
            updateData.assigneeIds = validAssigneeIds;
            // Устанавливаем assigneeId из первого элемента для обратной совместимости
            updateData.assigneeId = validAssigneeIds[0];
            logger.info('[TaskRepository.updateTask] Setting assigneeIds', { 
              taskId, 
              assigneeIds: validAssigneeIds,
              assigneeId: validAssigneeIds[0]
            });
          } else {
            // Если все элементы были невалидными, устанавливаем пустой массив
            updateData.assigneeIds = [];
            updateData.assigneeId = deleteField();
            logger.info('[TaskRepository.updateTask] All assigneeIds were invalid, clearing', { taskId });
          }
        } else {
          // Если массив пустой, устанавливаем пустой массив и удаляем assigneeId
          updateData.assigneeIds = [];
          updateData.assigneeId = deleteField();
          logger.info('[TaskRepository.updateTask] Clearing assigneeIds (empty array)', { taskId });
        }
        hasAssigneeIds = true;
      }
    }

    // Копируем только определенные поля (исключая assigneeIds и assigneeId, которые обработаны выше)
    for (const [key, value] of Object.entries(cleanUpdates)) {
      // Пропускаем assigneeIds и assigneeId, так как они обработаны выше
      if (key === 'assigneeIds' || (key === 'assigneeId' && hasAssigneeIds)) {
        continue;
      }
      
      // Пропускаем undefined и null
      if (value === undefined || value === null) {
        continue;
      }
      
      // Пропускаем пустые строки для опциональных полей
      if (value === '' && (key === 'projectId' || key === 'description' || key === 'assigneeId')) {
        continue;
      }
      
      // Для массивов проверяем, что они не пустые (или явно переданы)
      if (Array.isArray(value)) {
        // Пустые массивы не добавляем, если это не tags или dependencies
        if (value.length === 0 && key !== 'tags' && key !== 'dependencies') {
          continue;
        }
        updateData[key] = value;
        continue;
      }
      
      // Для всех остальных полей просто добавляем
      updateData[key] = value;
    }

    // Финальная проверка: удаляем все undefined значения из updateData перед отправкой
    const finalUpdateData: any = {};
    for (const [key, value] of Object.entries(updateData)) {
      // Пропускаем undefined значения
      if (value === undefined) {
        logger.warn('[TaskRepository.updateTask] Skipping undefined value', { key, taskId });
        continue;
      }
      
      // deleteField() возвращает специальный объект FieldValue, его нужно сохранить
      // Проверяем, является ли это FieldValue.delete
      if (value && typeof value === 'object' && '_methodName' in value) {
        const fieldValue = value as any;
        if (fieldValue._methodName === 'FieldValue.delete' || fieldValue._delegate?.methodName === 'delete') {
          finalUpdateData[key] = value;
          continue;
        }
      }
      
      // Проверяем вложенные объекты и массивы на наличие undefined
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
        // Если это объект, проверяем его поля
        const cleanObject: any = {};
        let hasValidFields = false;
        for (const [objKey, objValue] of Object.entries(value)) {
          if (objValue !== undefined) {
            cleanObject[objKey] = objValue;
            hasValidFields = true;
          }
        }
        if (hasValidFields) {
          finalUpdateData[key] = cleanObject;
        }
      } else if (Array.isArray(value)) {
        // Проверяем массив на наличие undefined элементов
        const cleanArray = value.filter(item => item !== undefined && item !== null && item !== '');
        // Для assigneeIds всегда сохраняем массив (даже если пустой)
        if (key === 'assigneeIds') {
          finalUpdateData[key] = cleanArray;
        } else if (cleanArray.length > 0 || key === 'tags' || key === 'dependencies') {
          finalUpdateData[key] = cleanArray;
        }
      } else {
        finalUpdateData[key] = value;
      }
    }

    // Дополнительная проверка: убеждаемся, что нет undefined в финальном объекте
    const hasUndefined = Object.values(finalUpdateData).some(v => v === undefined);
    if (hasUndefined) {
      logger.error('[TaskRepository.updateTask] Found undefined in finalUpdateData', { 
        taskId, 
        keys: Object.keys(finalUpdateData),
        values: Object.entries(finalUpdateData).map(([k, v]) => ({ key: k, value: v, type: typeof v }))
      });
      // Удаляем все undefined значения еще раз
      for (const key in finalUpdateData) {
        if (finalUpdateData[key] === undefined) {
          delete finalUpdateData[key];
        }
      }
    }

    // Последняя проверка: рекурсивно удаляем все undefined из всех уровней
    const deepClean = (obj: any): any => {
      if (obj === undefined || obj === null) {
        return undefined;
      }
      if (Array.isArray(obj)) {
        // Для массивов фильтруем undefined/null/пустые строки, но сохраняем сам массив
        const cleaned = obj.map(deepClean).filter(item => item !== undefined && item !== null && item !== '');
        return cleaned;
      }
      if (typeof obj === 'object' && !(obj instanceof Date)) {
        // Проверяем, является ли это FieldValue (deleteField)
        if ('_methodName' in obj || '_delegate' in obj) {
          return obj;
        }
        const cleaned: any = {};
        for (const [k, v] of Object.entries(obj)) {
          const cleanedValue = deepClean(v);
          if (cleanedValue !== undefined) {
            cleaned[k] = cleanedValue;
          }
        }
        return Object.keys(cleaned).length > 0 ? cleaned : undefined;
      }
      return obj;
    };

    const deeplyCleaned = deepClean(finalUpdateData);
    
    // Удаляем все ключи с undefined значениями
    for (const key in deeplyCleaned) {
      if (deeplyCleaned[key] === undefined) {
        delete deeplyCleaned[key];
      }
    }

    logger.info('[TaskRepository.updateTask] Sending update to Firestore', {
      taskId,
      keys: Object.keys(deeplyCleaned),
      hasUndefined: Object.values(deeplyCleaned).some(v => v === undefined),
      assigneeIds: deeplyCleaned.assigneeIds,
      assigneeId: deeplyCleaned.assigneeId
    });

    await updateDoc(taskRef, deeplyCleaned);
  }

  /**
   * Удаляет задачу из Firestore
   * @param taskId ID задачи
   */
  async deleteTask(taskId: string): Promise<void> {
    const taskRef = doc(db, 'tasks', taskId);
    await deleteDoc(taskRef);
  }
}

// Экспортируем единственный экземпляр репозитория
export const taskRepository = new TaskRepository();
