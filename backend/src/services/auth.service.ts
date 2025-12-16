import { UserRole } from '@prisma/client';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { BadRequestError, UnauthorizedError, ConflictError } from '../utils/errors';
import { RegisterInput, LoginInput } from '../utils/validators';

export class AuthService {
  async register(data: RegisterInput) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user with role-specific data
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        ...(data.role === UserRole.CUSTOMER && {
          customer: {
            create: {
              companyName: data.companyName,
              billingAddress: data.billingAddress,
            },
          },
        }),
        ...(data.role === UserRole.CHAUFFEUR && {
          chauffeur: {
            create: {
              licenseNumber: data.licenseNumber || `LIC-${Date.now()}`,
            },
          },
        }),
      },
      include: {
        customer: true,
        chauffeur: true,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        customer: user.customer,
        chauffeur: user.chauffeur,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(data: LoginInput) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        customer: true,
        chauffeur: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await comparePassword(data.password, user.passwordHash);

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        customer: user.customer,
        chauffeur: user.chauffeur,
      },
      accessToken,
      refreshToken,
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customer: true,
        chauffeur: {
          include: {
            vehicle: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      customer: user.customer,
      chauffeur: user.chauffeur,
    };
  }
}

export const authService = new AuthService();
