import { AuthResponse, LoginCredentials, RegisterData } from '@agentic-commerce/shared-types';
import { UserRepository } from '../repositories/user.repository';
import { comparePassword, hashPassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { passwordResetRepository } from '../repositories/password-reset.repository';
import { sendEmail } from '../utils/email';
import { config } from '../config/env';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError(409, 'User with this email already exists', 'USER_EXISTS');
    }

    // Create user
    const user = await this.userRepository.create(data);

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      token,
    };
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Find user
    const user = await this.userRepository.findByEmail(credentials.email);
    if (!user) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Verify password
    const passwordHash = await this.userRepository.getPasswordHash(credentials.email);
    if (!passwordHash) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const isValidPassword = await comparePassword(credentials.password, passwordHash);
    if (!isValidPassword) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      token,
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return; // Silent success to prevent email enumeration
    }

    await passwordResetRepository.invalidateAllForUser(user.id);

    const rawToken = await passwordResetRepository.create(
      user.id,
      config.passwordReset.tokenExpiryMinutes
    );

    const resetUrl = `${config.passwordReset.adminPortalUrl}?reset_token=${rawToken}`;

    await sendEmail({
      to: user.email,
      subject: 'AgenticCommerce Admin - Password Reset',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hello ${user.firstName},</p>
        <p>You requested a password reset for your AgenticCommerce admin account.</p>
        <p>Click the link below to reset your password. This link expires in ${config.passwordReset.tokenExpiryMinutes} minutes.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#667eea;color:white;text-decoration:none;border-radius:8px;">Reset Password</a></p>
        <p>Or copy this link: ${resetUrl}</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenRow = await passwordResetRepository.findValidByToken(token);
    if (!tokenRow) {
      throw new AppError(400, 'Invalid or expired reset token', 'INVALID_RESET_TOKEN');
    }

    const newHash = await hashPassword(newPassword);
    await this.userRepository.updatePasswordHash(tokenRow.user_id, newHash);
    await passwordResetRepository.markUsed(tokenRow.id);
    await passwordResetRepository.invalidateAllForUser(tokenRow.user_id);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const currentHash = await this.userRepository.getPasswordHashById(userId);
    if (!currentHash) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }

    const isValid = await comparePassword(currentPassword, currentHash);
    if (!isValid) {
      throw new AppError(401, 'Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
    }

    const isSame = await comparePassword(newPassword, currentHash);
    if (isSame) {
      throw new AppError(400, 'New password must be different from current password', 'SAME_PASSWORD');
    }

    const newHash = await hashPassword(newPassword);
    await this.userRepository.updatePasswordHash(userId, newHash);
    await passwordResetRepository.invalidateAllForUser(userId);
  }
}
