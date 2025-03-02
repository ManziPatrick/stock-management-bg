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
  authorizeRoles('ADMIN'),
  validateRequest(userValidator.registerSchema),
  userControllers.createUser
);

userRoutes.post(
  '/login',
  validateRequest(userValidator.loginSchema),
  userControllers.login
);

userRoutes.delete(
  '/user/:id',
  verifyAuth,
  authorizeRoles('ADMIN'),
  userControllers.deleteUser
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

// Duplicate delete route (for demonstration as provided; consider removing duplicates)
userRoutes.delete(
  '/users/:id',
  verifyAuth,
  authorizeRoles('ADMIN'),
  userControllers.deleteUser
);

// Duplicate register route (as provided; consider consolidating if not needed)
userRoutes.post(
  '/register',
  verifyAuth,
  authorizeRoles('ADMIN'),
  validateRequest(userValidator.registerSchema),
  userControllers.createUser
);

/**
 * --- Admin Management Routes ---
 */
userRoutes.post(
  '/create',
  verifyAuth,
  authorizeRoles('ADMIN'),
  validateRequest(userValidator.createUserSchema),
  userControllers.createUser
);

userRoutes.get(
  '/all',
  verifyAuth,
  authorizeRoles('ADMIN'),
  userControllers.getAllUsers
);

userRoutes.patch(
  '/role/:userId',
  verifyAuth,
  authorizeRoles('ADMIN'),
  validateRequest(userValidator.updateUserRoleSchema),
  userControllers.updateUserRole
);

export default userRoutes;
