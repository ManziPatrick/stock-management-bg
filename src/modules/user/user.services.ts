//@ts-nocheck

import CustomError from '../../errors/customError';
import httpStatus from 'http-status';
import generateToken from '../../utils/generateToken';
import { IUser } from './user.interface';
import User from './user.model';
import verifyPassword from '../../utils/verifyPassword';
import bcrypt from 'bcrypt';

class UserServices {
  private model = User;

  // Get self profile with createdBy populated
  async getSelf(userId: string) {
    return this.model.findById(userId).populate('createdBy', 'name email role');
  }

  // Delete user
  public async deleteUser(userId: string) {
    const result = await this.model.findByIdAndDelete(userId);
    
    if (!result) {
      throw new CustomError(httpStatus.NOT_FOUND, 'User not found');
    }
    
    return {
      message: 'User deleted successfully',
      user: result,
    };
  }

  // Register new user
  async createUser(payload: IUser) {
    const userExist = await this.model.findOne({ email: payload.email });
    
    if (userExist) {
      throw new CustomError(httpStatus.BAD_REQUEST, 'User already exists with this email');
    }
    
    // Create the user
    const user = await this.model.create(payload);
    return user;
  }

  // Create owner/admin account with business info
  async createOwnerAccount(payload: IUser) {
    const userExist = await this.model.findOne({ email: payload.email });
    
    if (userExist) {
      throw new CustomError(httpStatus.BAD_REQUEST, 'User already exists with this email');
    }
    
    const user = await this.model.create(payload);
    return user;
  }

  // Get all users for super admin with createdBy details
  async getAllUsers() {
    return this.model.find().select('-password').populate('createdBy', 'name email role');
  }

  // Get all users created by a specific admin
  async getAllUsersByAdmin(adminId: string) {
    return this.model.find({ createdBy: adminId }).select('-password').populate('createdBy', 'name email role');
  }

  // Get users by business name
  async getUsersByBusinessName(businessName: string) {
    return this.model.find({ 'businessInfo.businessName': businessName })
      .select('-password')
      .populate('createdBy', 'name email role');
  }

  // Get a single user by ID with createdBy details
  async getUserById(userId: string) {
    const user = await this.model.findById(userId).populate('createdBy', 'name email role');
    
    if (!user) {
      throw new CustomError(httpStatus.NOT_FOUND, 'User not found');
    }
    
    return user;
  }

  // Update user role
  async updateUserRole(userId: string, role: 'ADMIN' | 'KEEPER' | 'USER' | 'ACCOUNTANT') {
    const user = await this.model.findById(userId);
    
    if (!user) {
      throw new CustomError(httpStatus.NOT_FOUND, 'User not found');
    }
    
    return this.model.findByIdAndUpdate(userId, { role }, { new: true });
  }

  // Login existing user with createdBy details
  async login(payload: { email: string; password: string }) {
    const user = await this.model.findOne({ email: payload.email }).select('+password').populate('createdBy', 'name email role');
    
    if (!user) {
      throw new CustomError(httpStatus.BAD_REQUEST, 'Wrong Credentials');
    }

    await verifyPassword(payload.password, user.password);

    // Generate token including createdBy details
    const token = generateToken({
      _id: user._id,
      email: user.email,
      role: user.role,
      businessInfo: user.businessInfo,

      createdBy: user.createdBy ? { _id: user.createdBy._id, name: user.createdBy.name, email: user.createdBy.email, role: user.createdBy.role } : null,
    });

    return {
      token,
      role: user.role,
      businessInfo: user.businessInfo,
      createdBy: user.createdBy,
    };
  }

  // Update user profile
  async updateProfile(id: string, payload: Partial<IUser>) {
    return this.model.findByIdAndUpdate(id, payload, { new: true }).populate('createdBy', 'name email role');
  }

  // Change password
  async changePassword(userId: string, payload: { oldPassword: string; newPassword: string }) {
    const user = await this.model.findById(userId).select('+password');
    
    if (!user) throw new CustomError(httpStatus.NOT_FOUND, 'User not found');

    const matchedPassword = await bcrypt.compare(payload.oldPassword, user.password);
    
    if (!matchedPassword) {
      throw new CustomError(httpStatus.BAD_REQUEST, 'Old Password does not match!');
    }

    const hashedPassword = await bcrypt.hash(payload.newPassword, 10);
    const updatedUser = await this.model.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true });

    return updatedUser;
  }

  // New method: Admin update user's information
  async adminUpdateUser(userId: string, payload: Partial<IUser>) {
    const user = await this.model.findById(userId);
    
    if (!user) {
      throw new CustomError(httpStatus.NOT_FOUND, 'User not found');
    }
    
    return this.model.findByIdAndUpdate(userId, payload, { new: true })
      .populate('createdBy', 'name email role');
  }

  // New method: Admin update user's password
  async adminUpdatePassword(userId: string, newPassword: string) {
    const user = await this.model.findById(userId);
    console.log(userId, newPassword);
    
    if (!user) {
      throw new CustomError(httpStatus.NOT_FOUND, 'User not found');
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.model.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true });
  }
}

const userServices = new UserServices();
export default userServices;