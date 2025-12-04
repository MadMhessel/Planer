import React, { useState, useEffect, useRef } from 'react';
import { TaskComment } from '../types';
import { FirestoreService } from '../services/firestore';
import { formatMoscowDate } from '../utils/dateUtils';
import { Send } from 'lucide-react';

interface TaskCommentsProps {
  taskId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail?: string;
  currentUserAvatar?: string;
}

export const TaskComments: React.FC<TaskCommentsProps> = ({
  taskId,
  currentUserId,
  currentUserName,
  currentUserEmail,
  currentUserAvatar
}) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Подписка на комментарии
  useEffect(() => {
    if (!taskId) return;

    const unsubscribe = FirestoreService.subscribeToTaskComments(taskId, (newComments) => {
      setComments(newComments);
    });

    return () => unsubscribe();
  }, [taskId]);

  // Автопрокрутка к последнему комментарию
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    const commentText = newComment.trim();
    setNewComment('');
    setIsSubmitting(true);

    try {
      await FirestoreService.createTaskComment(taskId, {
        taskId,
        authorId: currentUserId,
        authorName: currentUserName,
        authorEmail: currentUserEmail,
        authorAvatar: currentUserAvatar,
        text: commentText
      });
    } catch (error) {
      console.error('Failed to create comment:', error);
      // Возвращаем текст обратно при ошибке
      setNewComment(commentText);
    } finally {
      setIsSubmitting(false);
      // Фокус обратно на textarea
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Заголовок */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
          Комментарии
          {comments.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-slate-400">
              ({comments.length})
            </span>
          )}
        </h3>
      </div>

      {/* Список комментариев */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Пока нет комментариев. Начните обсуждение!
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              {/* Аватар автора */}
              <div className="flex-shrink-0">
                {comment.authorAvatar ? (
                  <img
                    src={comment.authorAvatar}
                    alt={comment.authorName}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                    {comment.authorName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Содержимое комментария */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {comment.authorName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {formatMoscowDate(new Date(comment.createdAt), {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                  {comment.text}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Форма ввода нового комментария */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите комментарий... (Ctrl+Enter для отправки)"
              className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              rows={2}
              disabled={isSubmitting}
            />
          </div>
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="flex-shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            aria-label="Отправить комментарий"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
          Нажмите Ctrl+Enter для отправки
        </p>
      </div>
    </div>
  );
};

