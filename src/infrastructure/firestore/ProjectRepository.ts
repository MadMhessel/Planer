/**
 * Репозиторий для работы с проектами в Firestore
 * Инкапсулирует всю логику доступа к данным проектов
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
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Project } from '../../types';
import { logger } from '../../utils/logger';
import { getMoscowISOString } from '../../utils/dateUtils';

/**
 * Репозиторий для работы с проектами
 */
export class ProjectRepository {
  /**
   * Подписывается на изменения проектов в рабочем пространстве
   * @param workspaceId ID рабочего пространства
   * @param callback Функция обратного вызова, вызываемая при изменении списка проектов
   * @returns Функция для отмены подписки
   */
  subscribeToProjects(workspaceId: string, callback: (projects: Project[]) => void): () => void {
    const q = query(
      collection(db, 'projects'),
      where('workspaceId', '==', workspaceId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const projects: Project[] = snapshot.docs.map(docSnap => ({
        ...(docSnap.data() as Project),
        id: docSnap.id
      }));
      callback(projects);
    });
  }

  /**
   * Создает новый проект в Firestore
   * @param projectData Данные проекта (без id, createdAt, updatedAt)
   * @returns Созданный проект с id и временными метками
   */
  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    // Фильтруем undefined значения, так как Firestore их не принимает
    const data: any = {
      createdAt: getMoscowISOString(),
      updatedAt: getMoscowISOString()
    };

    // Копируем только определенные поля
    Object.keys(projectData).forEach(key => {
      const value = (projectData as any)[key];
      if (value !== undefined && value !== null && value !== '') {
        data[key] = value;
      }
    });

    // Убеждаемся, что обязательные поля присутствуют
    if (!data.workspaceId) {
      throw new Error('workspaceId is required');
    }
    if (!data.name) {
      throw new Error('name is required');
    }
    if (!data.ownerId) {
      throw new Error('ownerId is required');
    }

    logger.info('[ProjectRepository.createProject] Creating project', {
      workspaceId: data.workspaceId,
      name: data.name,
      ownerId: data.ownerId,
      hasDescription: !!data.description,
      hasColor: !!data.color
    });

    const docRef = await addDoc(collection(db, 'projects'), data);

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Failed to create project document');
    }
    
    return {
      ...(docSnap.data() as Project),
      id: docSnap.id
    };
  }

  /**
   * Обновляет проект в Firestore
   * @param projectId ID проекта
   * @param updates Объект с обновлениями
   */
  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    const projectRef = doc(db, 'projects', projectId);
    
    // Фильтруем undefined значения, так как Firestore их не принимает
    const updateData: any = {
      updatedAt: getMoscowISOString()
    };

    // Копируем только определенные поля
    Object.keys(updates).forEach(key => {
      const value = (updates as any)[key];
      if (value !== undefined) {
        updateData[key] = value;
      }
    });

    await updateDoc(projectRef, updateData);
  }

  /**
   * Удаляет проект из Firestore
   * @param projectId ID проекта
   */
  async deleteProject(projectId: string): Promise<void> {
    const projectRef = doc(db, 'projects', projectId);
    await deleteDoc(projectRef);
  }
}

// Экспортируем единственный экземпляр репозитория
export const projectRepository = new ProjectRepository();
