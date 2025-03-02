export const UserRole = {
  SUPER_ADMIN:'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  KEEPER: 'KEEPER',
  USER: 'USER'
} as const;

export const UserStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  BLOCK: 'BLOCK'
} as const;

export type TUserRole = 'SUPER_ADMIN'|'ADMIN' | 'USER'|'KEEPER';
export type TUserStatus = 'PENDING' | 'ACTIVE' | 'BLOCK';
