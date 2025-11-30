import { TaskStatus, ViewMode } from '../types';

const STORAGE_KEYS = {
  VIEW_MODE: 'ctp_view_mode',
  SELECTED_WORKSPACE: 'ctp_selected_workspace',
  THEME: 'ctp_theme',
  BOARD_GROUP_BY: 'ctp_board_group_by'
} as const;

type BoardGroupBy = 'status' | 'assignee' | 'project';

export const StorageService = {
  getViewMode(): ViewMode {
    const raw = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
    if (!raw) return 'BOARD';
    if (['BOARD', 'CALENDAR', 'GANTT', 'LIST', 'DASHBOARD'].includes(raw)) {
      return raw as ViewMode;
    }
    return 'BOARD';
  },

  setViewMode(mode: ViewMode) {
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
  },

  getSelectedWorkspaceId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_WORKSPACE);
  },

  setSelectedWorkspaceId(id: string) {
    localStorage.setItem(STORAGE_KEYS.SELECTED_WORKSPACE, id);
  },

  getTheme(): 'light' | 'dark' | 'system' {
    const raw = localStorage.getItem(STORAGE_KEYS.THEME);
    if (!raw) return 'system';
    if (['light', 'dark', 'system'].includes(raw)) {
      return raw as 'light' | 'dark' | 'system';
    }
    return 'system';
  },

  setTheme(theme: 'light' | 'dark' | 'system') {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  getBoardGroupBy(): BoardGroupBy {
    const raw = localStorage.getItem(STORAGE_KEYS.BOARD_GROUP_BY);
    if (!raw) return 'status';
    if (['status', 'assignee', 'project'].includes(raw)) {
      return raw as BoardGroupBy;
    }
    return 'status';
  },

  setBoardGroupBy(groupBy: BoardGroupBy) {
    localStorage.setItem(STORAGE_KEYS.BOARD_GROUP_BY, groupBy);
  }
};
