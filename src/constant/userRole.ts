export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  KEEPER: 'KEEPER',
  USER: 'USER',
  ACCOUNTANT: 'ACCOUNTANT'
} as const;

export const UserStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  BLOCK: 'BLOCK'
} as const;

export type TUserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'KEEPER' | 'ACCOUNTANT';
export type TUserStatus = 'PENDING' | 'ACTIVE' | 'BLOCK';
