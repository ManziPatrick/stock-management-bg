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

  // Register a new account by admin
  createUser = asyncHandler(async (req, res) => {
    if (req.user.role !== 'ADMIN') {
      throw new CustomError(httpStatus.FORBIDDEN, 'Only admins can create users');
    }

    const newUser = { ...req.body, createdBy: req.user._id }; // Add admin ID
    const result = await this.services.createUser(newUser);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: 'User created successfully!',
      data: result,
    });
  });

  // Get all users created by the admin
  getAllUsers = asyncHandler(async (req, res) => {
    if (req.user.role !== 'ADMIN') {
      throw new CustomError(httpStatus.FORBIDDEN, 'Only admins can view all users');
    }

    const result = await this.services.getAllUsersByAdmin(req.user._id); // Filter by admin ID

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Users retrieved successfully!',
      data: result,
    });
  });

  // Update user role (admin only for their users)
  updateUserRole = asyncHandler(async (req, res) => {
    if (req.user.role !== 'ADMIN') {
      throw new CustomError(httpStatus.FORBIDDEN, 'Only admins can update user roles');
    }

    // Ensure admin can only update their created users
    const user = await this.services.getUserById(req.params.userId);
    if (!user.createdBy || user.createdBy.toString() !== req.user._id.toString()) {
      throw new CustomError(httpStatus.FORBIDDEN, 'You can only update roles for users you created');
    }

    const result = await this.services.updateUserRole(req.params.userId, req.body.role);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'User role updated successfully!',
      data: result,
    });
  });
  //delect user 
  deleteUser = asyncHandler(async (req, res) => {
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
}

const userControllers = new UserControllers();
export default userControllers;
