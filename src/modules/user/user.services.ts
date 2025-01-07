import httpStatus from 'http-status';
import CustomError from '../../errors/customError';
import generateToken from '../../utils/generateToken';
import { IUser } from './user.interface';
import User from './user.model';
import verifyPassword from '../../utils/verifyPassword';
import bcrypt from 'bcrypt';

class UserServices {
  private model = User;

  // Get self profile
  async getSelf(userId: string) {
    return this.model.findById(userId);
  }
  public async deleteUser(userId: string) {
    const result = await this.model.findByIdAndDelete(userId);
  
    if (!result) {
      throw new Error('User not found');
    }
  
    return {
      message: 'User deleted successfully',
      user: result,
    };
  }
  

  // Register new user
  async createUser(payload: IUser) {
    const user = await this.model.create(payload);
    return user;
  }

  // Get all users created by a specific admin or keeper
  async getAllUsersByAdminOrKeeper(adminOrKeeperId: string) {
    return this.model.find({ createdBy: adminOrKeeperId }).select('-password');
  }
  
  async getAllUsersByAdmin(adminId: string) {
    return this.model.find({ createdBy: adminId }).select('-password');
  }
  

  // Get a single user by ID
  async getUserById(userId: string) {
    const user = await this.model.findById(userId);
    if (!user) {
      throw new CustomError(httpStatus.NOT_FOUND, 'User not found');
    }
    return user;
  }

  

  // Update user role
  async updateUserRole(userId: string, role: 'ADMIN' | 'USER' | 'KEEPER') {
    const user = await this.model.findById(userId);
    if (!user) {
      throw new CustomError(httpStatus.NOT_FOUND, 'User not found');
    }

    return this.model.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    );
  }

  // Login existing user
  async login(payload: { email: string; password: string }) {
    const user = await this.model.findOne({ email: payload.email }).select('+password');

    if (user) {
      await verifyPassword(payload.password, user.password);

      const token = generateToken({ _id: user._id, email: user.email, role: user.role });
      return { token, role: user.role };
    } else {
      throw new CustomError(httpStatus.BAD_REQUEST, 'Wrong Credentials');
    }
  }

  // Update user profile
  async updateProfile(id: string, payload: Partial<IUser>) {
    return this.model.findByIdAndUpdate(id, payload);
  }

  // Change password
  async changePassword(userId: string, payload: { oldPassword: string; newPassword: string }) {
    const user = await this.model.findById(userId).select('+password');
    if (!user) throw new CustomError(httpStatus.NOT_FOUND, 'User not found');

    const matchedPassword = await bcrypt.compare(payload.oldPassword, user.password);

    if (!matchedPassword) {
      throw new CustomError(400, 'Old Password does not match!');
    }

    const hashedPassword = await bcrypt.hash(payload.newPassword, 10);
    const updatedUser = await this.model.findByIdAndUpdate(userId, { password: hashedPassword });

    return updatedUser;
  }
}

const userServices = new UserServices();
export default userServices;
