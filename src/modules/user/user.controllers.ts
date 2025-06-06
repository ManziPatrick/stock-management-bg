//@ts-nocheck
import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import userServices from './user.services';
import CustomError from '../../errors/customError';

class UserControllers {
  private services = userServices;

  // Get self profile
  getSelf = asyncHandler(async (req, res) => {
    const result = await this.services.getSelf(req.user._id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'User profile retrieved successfully!',
      data: result,
    });
  });

  // Super admin creates an owner/admin account
  createOwnerAccount = asyncHandler(async (req, res) => {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new CustomError(httpStatus.FORBIDDEN, 'Only super admins can create owner accounts');
    }

    const newOwner = { 
      ...req.body, 
      role: 'ADMIN', // Force role to be ADMIN
      createdBy: req.user._id 
    };
    
    const result = await this.services.createOwnerAccount(newOwner);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: 'Owner account created successfully!',
      data: result,
    });
  });

  // Get all users (super admin only)
  getAllUsersForSuperAdmin = asyncHandler(async (req, res) => {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new CustomError(httpStatus.FORBIDDEN, 'Only super admins can view all users');
    }

    const result = await this.services.getAllUsers();

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'All users retrieved successfully!',
      data: result,
    });
  });

  // Get users by business name
  getUsersByBusinessName = asyncHandler(async (req, res) => {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new CustomError(httpStatus.FORBIDDEN, 'Only super admins can filter users by business');
    }

    const { businessName } = req.params;
    const result = await this.services.getUsersByBusinessName(businessName);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Users retrieved successfully!',
      data: result,
    });
  });

  // Create user
  createUser = asyncHandler(async (req, res) => {
    // Super admin can create any type of user
    if (req.user.role === 'SUPER_ADMIN') {
      const newUser = { ...req.body, createdBy: req.user._id };
      const result = await this.services.createUser(newUser);
      
      sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: 'User created successfully!',
        data: result,
      });
      return;
    }
    
    // Admin can only create admin (of same company), keeper, accountant or user
    if (req.user.role === 'ADMIN') {
      // Get admin's business info
      const admin = await this.services.getSelf(req.user._id);
      
      // Admin can't create SUPER_ADMIN
      if (req.body.role === 'SUPER_ADMIN') {
        throw new CustomError(httpStatus.FORBIDDEN, 'Admins cannot create super admin accounts');
      }
      
      // If creating another admin, they must be in same business
      if (req.body.role === 'ADMIN' && admin && admin.businessInfo) {
        req.body.businessInfo = admin.businessInfo;
      }
      
      const newUser = { ...req.body, createdBy: req.user._id };
      const result = await this.services.createUser(newUser);
      
      sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: 'User created successfully!',
        data: result,
      });
      return;
    }
    
    // Other roles can't create users
    throw new CustomError(httpStatus.FORBIDDEN, 'Only admins and super admins can create users');
  });

  // Get all users - admins see users in their business, super admins see all
  getAllUsers = asyncHandler(async (req, res) => {
    if (req.user.role === 'SUPER_ADMIN') {
      const result = await this.services.getAllUsers();
      
      sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'Users retrieved successfully!',
        data: result,
      });
      return;
    }

    if (req.user.role === 'ADMIN') {
      // Admins can see users in their business
      const result = await this.services.getUsersByBusinessName(req.user.businessInfo?.businessName);
      
      sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'Users retrieved successfully!',
        data: result,
      });
      return;
    }

    throw new CustomError(httpStatus.FORBIDDEN, 'Only admins and super admins can view users');
  });

  // Update user role
  updateUserRole = asyncHandler(async (req, res) => {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      throw new CustomError(httpStatus.FORBIDDEN, 'Only admins can update user roles');
    }

    // Super admin can update any user role except another SUPER_ADMIN
    if (req.user.role === 'SUPER_ADMIN') {
      const user = await this.services.getUserById(req.params.userId);
      
      // Can't change another super admin's role
      if (user.role === 'SUPER_ADMIN') {
        throw new CustomError(httpStatus.FORBIDDEN, 'Cannot change super admin role');
      }
      
      const result = await this.services.updateUserRole(req.params.userId, req.body.role);
      
      sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'User role updated successfully!',
        data: result,
      });
      return;
    }

    // Regular admin can update users in their business
    const user = await this.services.getUserById(req.params.userId);
    
    // Check if user is in the same business as the admin
    if (user.businessInfo?.businessName !== req.user.businessInfo?.businessName) {
      throw new CustomError(httpStatus.FORBIDDEN, 'You can only update roles for users in your business');
    }
    
    // Regular admin can't set someone to SUPER_ADMIN
    if (req.body.role === 'SUPER_ADMIN') {
      throw new CustomError(httpStatus.FORBIDDEN, 'Cannot set user to super admin role');
    }

    const result = await this.services.updateUserRole(req.params.userId, req.body.role);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'User role updated successfully!',
      data: result,
    });
  });

  // Delete user 
  deleteUser = asyncHandler(async (req, res) => {
    // Super admin can delete any user except another super admin
    if (req.user.role === 'SUPER_ADMIN') {
      const user = await this.services.getUserById(req.params.id);
      
      if (user.role === 'SUPER_ADMIN') {
        throw new CustomError(httpStatus.FORBIDDEN, 'Cannot delete super admin accounts');
      }
    } 
    // Regular admin can delete users in their business
    else if (req.user.role === 'ADMIN') {
      const user = await this.services.getUserById(req.params.id);
      
      // Check if user is in the same business as the admin
      if (user.businessInfo?.businessName !== req.user.businessInfo?.businessName) {
        throw new CustomError(httpStatus.FORBIDDEN, 'You can only delete users in your business');
      }
      
      if (user.role === 'SUPER_ADMIN') {
        throw new CustomError(httpStatus.FORBIDDEN, 'Cannot delete super admin accounts');
      }
    }
    // Other roles can't delete users
    else {
      throw new CustomError(httpStatus.FORBIDDEN, 'You do not have permission to delete users');
    }

    await this.services.deleteUser(req.params.id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'User deleted successfully!',
    });
  });

  // Login into registered account
  login = asyncHandler(async (req, res) => {
    const result = await this.services.login(req.body);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'User logged in successfully!',
      data: result,
    });
  });

  // Update profile
  updateProfile = asyncHandler(async (req, res) => {
    const result = await this.services.updateProfile(req.user._id, req.body);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'User profile updated successfully!',
      data: result,
    });
  });

  // Change password
  changePassword = asyncHandler(async (req, res) => {
    const result = await this.services.changePassword(req.user._id, req.body);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Password changed successfully!',
      data: result,
    });
  });

  // Admin updates user information
  adminUpdateUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Check permissions
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      throw new CustomError(httpStatus.FORBIDDEN, 'Only admins can edit users');
    }

    // Super admin can edit any user except other super admins
    if (req.user.role === 'SUPER_ADMIN') {
      const user = await this.services.getUserById(userId);
      
      if (user.role === 'SUPER_ADMIN' && userId !== req.user._id.toString()) {
        throw new CustomError(httpStatus.FORBIDDEN, 'Cannot edit other super admin accounts');
      }
    } 
    // Admin can edit users in their business
    else if (req.user.role === 'ADMIN') {
      const user = await this.services.getUserById(userId);
      
      // Check if user is in the same business as the admin
      if (user.businessInfo?.businessName !== req.user.businessInfo?.businessName) {
        throw new CustomError(httpStatus.FORBIDDEN, 'You can only edit users in your business');
      }
      
      if (user.role === 'SUPER_ADMIN') {
        throw new CustomError(httpStatus.FORBIDDEN, 'Cannot edit super admin accounts');
      }
    }

    const result = await this.services.adminUpdateUser(userId, req.body);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'User information updated successfully!',
      data: result,
    });
  });

  // Admin updates user's password
  adminUpdatePassword = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { password } = req.body;

    // Check permissions
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      throw new CustomError(httpStatus.FORBIDDEN, 'Only admins can change user passwords');
    }

    // Super admin can edit any user's password except other super admins
    if (req.user.role === 'SUPER_ADMIN') {
      const user = await this.services.getUserById(userId);
      
      if (user.role === 'SUPER_ADMIN' && userId !== req.user._id.toString()) {
        throw new CustomError(httpStatus.FORBIDDEN, 'Cannot change other super admin passwords');
      }
    } 
    // Admin can change passwords for users in their business
    else if (req.user.role === 'ADMIN') {
      const user = await this.services.getUserById(userId);
      
      // Check if user is in the same business as the admin
      if (user.businessInfo?.businessName !== req.user.businessInfo?.businessName) {
        throw new CustomError(httpStatus.FORBIDDEN, 'You can only change passwords for users in your business');
      }
      
      if (user.role === 'SUPER_ADMIN') {
        throw new CustomError(httpStatus.FORBIDDEN, 'Cannot change super admin passwords');
      }
    }

    const result = await this.services.adminUpdatePassword(userId, password);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'User password updated successfully!',
    });
  });
}

const userControllers = new UserControllers();
export default userControllers;