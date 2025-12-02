import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  arrayUnion,
  writeBatch,
  getDocs,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Notification, WorkspaceMember } from '../types';
import { logger } from '../utils/logger';

export class NotificationsService {
  static workspaceCollection(workspaceId: string) {
    return collection(db, 'workspaces', workspaceId, 'notifications');
  }

  /**
   * Add a new notification to Firestore
   */
  static async add(workspaceId: string, notification: Omit<Notification, 'id'>) {
    try {
      // Фильтруем undefined значения, так как Firestore их не принимает
      const notificationData: any = {
        workspaceId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        readBy: notification.readBy || [],
        createdAt: notification.createdAt || new Date().toISOString()
      };

      // Добавляем recipients только если они определены
      if (notification.recipients && notification.recipients.length > 0) {
        notificationData.recipients = notification.recipients;
      }

      const docRef = await addDoc(this.workspaceCollection(workspaceId), notificationData);
      logger.info('Notification added', { id: docRef.id, workspaceId });
      return docRef.id;
    } catch (error) {
      logger.error('Failed to add notification', error);
      throw error;
    }
  }

  /**
   * Subscribe to notifications for a workspace
   */
  static subscribe(
    workspaceId: string, 
    userId: string | null,
    cb: (notifications: Notification[]) => void
  ) {
    const q = query(this.workspaceCollection(workspaceId), orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, snap => {
      const list: Notification[] = snap.docs.map(d => ({ 
        id: d.id, 
        ...(d.data() as Omit<Notification, 'id'>) 
      }));
      
      // Filter by recipients if specified
      const filtered = userId ? list.filter(n => {
        // If no recipients specified, show to everyone
        if (!n.recipients || n.recipients.length === 0) return true;
        // Otherwise only show if user is in recipients list
        return n.recipients.includes(userId);
      }) : list;
      
      cb(filtered);
    }, error => {
      logger.error('Notification subscription error', error);
    });
  }

  /**
   * Mark notification as read by a user
   */
  static async markAsRead(workspaceId: string, notificationId: string, userId: string) {
    try {
      const notificationRef = doc(this.workspaceCollection(workspaceId), notificationId);
      const notificationDoc = await getDoc(notificationRef);
      
      if (!notificationDoc.exists()) {
        logger.warn('Notification not found', { notificationId, workspaceId });
        return;
      }
      
      const data = notificationDoc.data() as Notification;
      // Проверяем, не помечено ли уже как прочитанное
      if (data.readBy?.includes(userId)) {
        logger.info('Notification already marked as read', { notificationId, userId });
        return;
      }
      
      await updateDoc(notificationRef, {
        readBy: arrayUnion(userId)
      });
      logger.info('Notification marked as read', { notificationId, userId });
    } catch (error) {
      logger.error('Failed to mark notification as read', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(workspaceId: string, userId: string) {
    try {
      const q = query(this.workspaceCollection(workspaceId));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as Notification;
        if (!data.readBy?.includes(userId)) {
          batch.update(docSnap.ref, {
            readBy: arrayUnion(userId)
          });
        }
      });
      
      await batch.commit();
      logger.info('All notifications marked as read', { workspaceId, userId });
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  static async delete(workspaceId: string, notificationId: string) {
    try {
      await deleteDoc(doc(this.workspaceCollection(workspaceId), notificationId));
      logger.info('Notification deleted', { notificationId, workspaceId });
    } catch (error) {
      logger.error('Failed to delete notification', error);
      throw error;
    }
  }

  /**
   * Delete all notifications for a user (only those visible to the user)
   * Uses the same filtering logic as subscribe()
   */
  static async clearAll(workspaceId: string, userId: string) {
    try {
      const q = query(this.workspaceCollection(workspaceId), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      let hasDeletions = false;
      
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as Notification;
        // Используем ту же логику фильтрации, что и в subscribe()
        // If no recipients specified, show to everyone (delete it)
        // Otherwise only delete if user is in recipients list
        const shouldDelete = !data.recipients || data.recipients.length === 0 || data.recipients.includes(userId);
        
        if (shouldDelete) {
          batch.delete(docSnap.ref);
          hasDeletions = true;
        }
      });
      
      if (hasDeletions) {
        await batch.commit();
        logger.info('All notifications cleared', { workspaceId, userId, count: hasDeletions });
      } else {
        logger.info('No notifications to clear', { workspaceId, userId });
      }
    } catch (error) {
      logger.error('Failed to clear notifications', error);
      throw error;
    }
  }

  /**
   * Get recipients for a notification based on @mentions and roles
   */
  static getRecipients(
    members: WorkspaceMember[],
    mentionedUserIds?: string[],
    notifyAdmins = false
  ): string[] {
    const recipients: string[] = [];
    
    // Add mentioned users
    if (mentionedUserIds && mentionedUserIds.length > 0) {
      recipients.push(...mentionedUserIds);
    }
    
    // Add admins if requested
    if (notifyAdmins) {
      const admins = members
        .filter(m => (m.role === 'ADMIN' || m.role === 'OWNER') && m.status === 'ACTIVE')
        .map(m => m.userId);
      recipients.push(...admins);
    }
    
    // Remove duplicates
    return [...new Set(recipients)];
  }
}
