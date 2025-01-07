import { Router } from 'express';
import userControllers from './user.controllers';
import validateRequest from '../../middlewares/validateRequest';
import userValidator from './user.validator';
import { authorizeRoles, verifyAuth } from '../../middlewares/verifyAuth';

const userRoutes = Router();

// Auth routes
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

// Profile routes
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
userRoutes.delete('/users/:id', 
  verifyAuth, authorizeRoles('ADMIN'),
   userControllers.deleteUser);

userRoutes.post(
  '/register', 
  verifyAuth,
  authorizeRoles('ADMIN'), 
  validateRequest(userValidator.registerSchema,), 
  userControllers.createUser
);


// Admin management routes
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