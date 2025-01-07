import { z } from 'zod';
import { UserRole } from '../../constant/userRole';

// Existing schemas
const registerSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(6, { message: 'password must have 6 characters' })
});

const updatedProfileSchema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  avatar: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, { message: 'password must have 6 characters' })
});

const changePasswordSchema = z.object({
  oldPassword: z
    .string({ required_error: 'Old Password is required!' })
    .min(6, { message: 'old password must have 6 characters' }),
  newPassword: z
    .string({ required_error: 'New Password is required!' })
    .min(6, { message: 'new password must have 6 characters' })
});

// New schemas for admin management
const createUserSchema = z.object({
  name: z.string({ required_error: 'Name is required!' }),
  email: z.string({ required_error: 'Email is required!' }).email('Invalid email format'),
  password: z.string({ required_error: 'Password is required!' })
    .min(6, { message: 'password must have 6 characters' }),
  role: z.enum(['ADMIN', 'USER'], {
    required_error: 'Role is required!',
    invalid_type_error: 'Role must be either ADMIN or USER'
  }),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  avatar: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
  instagram: z.string().optional()
});

const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'USER'], {
    required_error: 'Role is required!',
    invalid_type_error: 'Role must be either ADMIN or USER'
  })
});



const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'], {
    required_error: 'Status is required!',
    invalid_type_error: 'Status must be either ACTIVE or INACTIVE'
  })
});

const userValidator = {
  registerSchema,
  loginSchema,
  updatedProfileSchema,
  changePasswordSchema,
  createUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema
};

export default userValidator;