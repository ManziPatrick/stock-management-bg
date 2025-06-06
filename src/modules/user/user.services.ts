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

  // Get self profile - simplified without createdBy population
  async getSelf(userId: string) {
    return this.model.findById(userId);
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

  // Get all users - simplified without createdBy population
  async getAllUsers() {
    return this.model.find().select('-password');
  }

  // Get users by business name - simplified without createdBy population
  async getUsersByBusinessName(businessName: string) {
    return this.model.find({ 'businessInfo.businessName': businessName })
      .select('-password');
  }

  // Get a single user by ID - simplified without createdBy population
  async getUserById(userId: string) {
    const user = await this.model.findById(userId);
    
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

  // Login existing user - simplified without createdBy details
  async login(payload: { email: string; password: string }) {
    const user = await this.model.findOne({ email: payload.email }).select('+password');
    
    if (!user) {
      throw new CustomError(httpStatus.BAD_REQUEST, 'Wrong Credentials');
    }

    await verifyPassword(payload.password, user.password);

    // Generate token - simplified without createdBy details
    const token = generateToken({
      _id: user._id,
      email: user.email,
      role: user.role,
      businessInfo: user.businessInfo,
    });

    return {
      token,
      role: user.role,
      businessInfo: user.businessInfo,
    };
  }

  // Update user profile - simplified without createdBy population
  async updateProfile(id: string, payload: Partial<IUser>) {
    return this.model.findByIdAndUpdate(id, payload, { new: true });
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

  // Admin update user's information - simplified without createdBy population
  async adminUpdateUser(userId: string, payload: Partial<IUser>) {
    const user = await this.model.findById(userId);
    
    if (!user) {
      throw new CustomError(httpStatus.NOT_FOUND, 'User not found');
    }
    
    return this.model.findByIdAndUpdate(userId, payload, { new: true });
  }

  // Admin update user's password
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