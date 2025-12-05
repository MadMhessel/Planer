import { Task, Project, Notification, WorkspaceMember } from '../types';
import { NOTIFICATION_TYPES } from '../constants/notifications';
import { getStatusLabel, getPriorityLabel } from './taskHelpers';
import { getMoscowISOString, formatMoscowDate } from './dateUtils';

export const createTaskNotification = (
  workspaceId: string,
  type: 'TASK_ASSIGNED' | 'TASK_UPDATED',
  task: Task,
  changes?: Partial<Task>,
  recipients?: string[]
): Omit<Notification, 'id'> => {
  const assigneeName = changes?.assigneeId 
    ? 'назначена' 
    : task.assigneeId 
    ? 'назначена' 
    : 'создана';

  const notification: Omit<Notification, 'id'> = {
    workspaceId,
    type,
    title: type === 'TASK_ASSIGNED' ? 'Новая задача создана' : 'Задача обновлена',
    message: `Задача "${task.title}" ${assigneeName}`,
    createdAt: getMoscowISOString(),
    readBy: []
  };

  // Добавляем recipients только если они определены и не пусты
  if (recipients && recipients.length > 0) {
    notification.recipients = recipients;
  }

  return notification;
};

export const createTelegramMessage = (
  type: 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'TASK_DELETED' | 'PROJECT_CREATED' | 'PROJECT_UPDATED' | 'PROJECT_DELETED',
  taskOrProject: Task | Project,
  changes?: Partial<Task> | Partial<Project>,
  oldTask?: Task,
  projectName?: string
): string => {
  if (type === 'TASK_ASSIGNED') {
    const task = taskOrProject as Task;
    const projectText = projectName ? `\n📁 Проект: ${projectName}` : '';
    const dueDate = task.dueDate 
      ? `\n📅 Срок: ${formatMoscowDate(task.dueDate)}` 
      : '';
    const priorityText = getPriorityLabel(task.priority);
    
    let text = `🆕 <b>Новая задача</b>\n\n📝 <b>${task.title}</b>`;
    if (task.description) {
      text += `\n\n${task.description}`;
    }
    if (projectText) {
      text += projectText;
    }
    if (dueDate) {
      text += dueDate;
    }
    text += `\n⚡ Приоритет: ${priorityText}`;
    return text;
  }

  if (type === 'TASK_UPDATED' && oldTask) {
    const task = taskOrProject as Task;
    const changesTyped = changes as Partial<Task>;

    // Смена статуса
    if (changesTyped.status && changesTyped.status !== oldTask.status) {
      const oldStatusText = getStatusLabel(oldTask.status);
      const newStatusText = getStatusLabel(changesTyped.status);
      return `🔄 <b>Обновление статуса</b>\n\n📝 <b>${oldTask.title}</b>\n\n${oldStatusText} ➡️ <b>${newStatusText}</b>`;
    }

    // Смена дедлайна
    if (changesTyped.dueDate && changesTyped.dueDate !== oldTask.dueDate) {
      const newDueDate = formatMoscowDate(changesTyped.dueDate);
      return `📅 <b>Обновление сроков</b>\n\n📝 <b>${oldTask.title}</b>\n\nНовый дедлайн: <b>${newDueDate}</b>`;
    }

    // Назначение исполнителя
    if (changesTyped.assigneeId && changesTyped.assigneeId !== oldTask.assigneeId) {
      return `👉 <b>Вам назначена задача</b>\n\n📝 <b>${oldTask.title}</b>`;
    }

    // Смена приоритета
    if (changesTyped.priority && changesTyped.priority !== oldTask.priority) {
      const priorityText = getPriorityLabel(changesTyped.priority);
      return `⚡ <b>Изменен приоритет</b>\n\n📝 <b>${oldTask.title}</b>\n\nНовый приоритет: <b>${priorityText}</b>`;
    }

    // Обновление названия/описания
    if (changesTyped.title || changesTyped.description) {
      return `✏️ <b>Задача обновлена</b>\n\n📝 <b>${changesTyped.title || oldTask.title}</b>`;
    }
  }

  if (type === 'TASK_DELETED') {
    const task = taskOrProject as Task;
    return `🗑️ <b>Задача удалена</b>\n\n📝 <b>${task.title}</b>`;
  }

  if (type === 'PROJECT_CREATED') {
    const project = taskOrProject as Project;
    return `📁 <b>Новый проект</b>\n\n<b>${project.name}</b>${project.description ? `\n\n${project.description}` : ''}`;
  }

  if (type === 'PROJECT_UPDATED') {
    const project = taskOrProject as Project;
    const changesTyped = changes as Partial<Project>;
    let text = `📁 <b>Проект обновлен</b>\n\n<b>${changesTyped.name || project.name}</b>`;
    if (changesTyped.status) {
      text += `\n\nСтатус: <b>${changesTyped.status}</b>`;
    }
    return text;
  }

  if (type === 'PROJECT_DELETED') {
    const project = taskOrProject as Project;
    return `🗑️ <b>Проект удален</b>\n\n<b>${project.name}</b>`;
  }

  return '';
};

export const getRecipientsForTask = (
  task: Partial<Task>,
  allMembers: WorkspaceMember[],
  creatorId?: string
): string[] => {
  const recipients: string[] = [];
  
  if (task.assigneeId) {
    const assignee = allMembers.find(m => m.userId === task.assigneeId);
    if (assignee?.telegramChatId) {
      recipients.push(assignee.telegramChatId);
    }
  }
  
  if (creatorId && creatorId !== task.assigneeId) {
    const creator = allMembers.find(m => m.userId === creatorId);
    if (creator?.telegramChatId && !recipients.includes(creator.telegramChatId)) {
      recipients.push(creator.telegramChatId);
    }
  }
  
  return recipients;
};

export const getAllTelegramRecipients = (allMembers: WorkspaceMember[]): string[] => {
  return allMembers
    .filter(m => m.telegramChatId && m.status === 'ACTIVE')
    .map(m => m.telegramChatId!)
    .filter((id, index, self) => self.indexOf(id) === index);
};

