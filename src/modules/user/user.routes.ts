import { Router } from 'express';
import userControllers from './user.controllers';
import validateRequest from '../../middlewares/validateRequest';
import userValidator from './user.validator';
import { authorizeRoles, verifyAuth } from '../../middlewares/verifyAuth';

const userRoutes = Router();

/**
 * --- SUPER ADMIN Routes ---
 */
userRoutes.post(
  '/create-owner',
  verifyAuth,
  authorizeRoles('SUPER_ADMIN'),
  validateRequest(userValidator.createOwnerSchema),
  userControllers.createOwnerAccount
);

userRoutes.get(
  '/all-users',
  verifyAuth,
  authorizeRoles('SUPER_ADMIN'),
  userControllers.getAllUsersForSuperAdmin
);

userRoutes.get(
  '/business/:businessName',
  verifyAuth,
  authorizeRoles('SUPER_ADMIN'),
  userControllers.getUsersByBusinessName
);

/**
 * --- Auth Routes ---
 */
userRoutes.post(
  '/register',
  verifyAuth,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validateRequest(userValidator.registerSchema),
  userControllers.createUser
);

userRoutes.post(
  '/login',
  validateRequest(userValidator.loginSchema),
  userControllers.login
);

/**
 * --- Profile Routes ---
 */
userRoutes.get(
  '/self',
  verifyAuth,
  userControllers.getSelf
);

userRoutes.patch(
  '/',
  verifyAuth,
  validateRequest(userValidator.updatedProfileSchema),
  userControllers.updateProfile
);

userRoutes.post(
  '/change-password',
  verifyAuth,
  validateRequest(userValidator.changePasswordSchema),
  userControllers.changePassword
);

/**
 * --- User Management Routes ---
 */
userRoutes.post(
  '/create',
  verifyAuth,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validateRequest(userValidator.createUserSchema),
  userControllers.createUser
);

userRoutes.get(
  '/all',
  verifyAuth,
  authorizeRoles('ADMIN','SUPER_ADMIN'),
  userControllers.getAllUsers
);

userRoutes.patch(
  '/role/:userId',
  verifyAuth,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validateRequest(userValidator.updateUserRoleSchema),
  userControllers.updateUserRole
);

userRoutes.delete(
  '/user/:id',
  verifyAuth,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  userControllers.deleteUser
);

/**
 * --- NEW: Admin Edit User Routes ---
 */
userRoutes.patch(
  '/admin/user/:userId',
  verifyAuth,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validateRequest(userValidator.adminUpdateUserSchema),
  userControllers.adminUpdateUser
);

userRoutes.patch(
  '/admin/password/:userId',
  verifyAuth,
  authorizeRoles('ADMIN', 'SUPER_ADMIN'),
  validateRequest(userValidator.adminUpdatePasswordSchema),
  userControllers.adminUpdatePassword
);

export default userRoutes;