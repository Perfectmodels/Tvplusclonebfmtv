export const PERMISSIONS = {
  ARTICLES_READ: 'articles.read',
  ARTICLES_CREATE: 'articles.create',
  ARTICLES_UPDATE: 'articles.update',
  ARTICLES_PUBLISH: 'articles.publish',
  ARTICLES_DELETE: 'articles.delete',
  CATEGORIES_MANAGE: 'categories.manage',
  MEDIA_UPLOAD: 'media.upload',
  MEDIA_DELETE: 'media.delete',
  PROGRAMS_MANAGE: 'programs.manage',
  USERS_MANAGE: 'users.manage',
  SETTINGS_MANAGE: 'settings.manage',
  AUDIT_READ: 'audit.read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

export const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  reader: [],
  admin: ALL_PERMISSIONS,
};
