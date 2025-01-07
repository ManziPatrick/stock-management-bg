export const UserRole = {
  ADMIN: 'ADMIN',
  KEEPER: 'KEEPER',
  USER: 'USER'
} as const;

export const UserStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  BLOCK: 'BLOCK'
} as const;

export type TUserRole = 'ADMIN' | 'USER'|'KEEPER';
export type TUserStatus = 'PENDING' | 'ACTIVE' | 'BLOCK';
