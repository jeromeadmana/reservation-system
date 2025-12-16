import { ReservationStatus, UserRole } from '@prisma/client';
import prisma from '../config/database';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';
import {
  CreateReservationInput,
  UpdateReservationInput,
  PaginationInput,
} from '../utils/validators';
import { env } from '../config/env';

export class ReservationService {
  async getCustomerByUserId(userId: string) {
    const customer = await prisma.customer.findUnique({
      where: { userId },
    });
    if (!customer) {
      throw new NotFoundError('Customer profile not found');
    }
    return customer;
  }

  async createReservation(customerId: string, data: CreateReservationInput) {
    // Validate pickup datetime is in the future
    const pickupDate = new Date(data.pickupDatetime);
    if (pickupDate < new Date()) {
      throw new BadRequestError('Pickup date must be in the future');
    }

    // Get customer details
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Demo mode: Check reservation limit
    if (env.DEMO_MODE) {
      const existingReservations = await prisma.reservation.count({
        where: { customerId },
      });

      if (existingReservations >= env.DEMO_MAX_RESERVATIONS) {
        throw new BadRequestError(
          `Demo limit reached: Maximum ${env.DEMO_MAX_RESERVATIONS} reservations allowed. Please delete existing reservations to continue.`
        );
      }
    }

    // Calculate estimated price (simplified logic)
    const basePrice = 50; // Base fare
    const estimatedDistance = data.pickupLatitude && data.dropoffLatitude
      ? this.calculateDistance(
          data.pickupLatitude,
          data.pickupLongitude!,
          data.dropoffLatitude,
          data.dropoffLongitude!
        )
      : 10; // Default 10 miles

    const pricePerMile = 2.5;
    const totalPrice = basePrice + estimatedDistance * pricePerMile;

    const reservation = await prisma.reservation.create({
      data: {
        customerId,
        pickupLocation: data.pickupLocation,
        pickupLatitude: data.pickupLatitude,
        pickupLongitude: data.pickupLongitude,
        pickupDatetime: new Date(data.pickupDatetime),
        dropoffLocation: data.dropoffLocation,
        dropoffLatitude: data.dropoffLatitude,
        dropoffLongitude: data.dropoffLongitude,
        dropoffDatetime: data.dropoffDatetime ? new Date(data.dropoffDatetime) : null,
        passengerCount: data.passengerCount,
        specialInstructions: data.specialInstructions,
        estimatedDistance,
        basePrice,
        totalPrice,
        status: ReservationStatus.PENDING,
      },
      include: {
        customer: {
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        chauffeur: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            vehicle: true,
          },
        },
        vehicle: true,
      },
    });

    return reservation;
  }

  async getReservation(reservationId: string, userId: string, userRole: UserRole) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        customer: {
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        chauffeur: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            vehicle: true,
          },
        },
        vehicle: true,
        trip: true,
        payment: true,
      },
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    // Check authorization
    if (userRole === UserRole.CUSTOMER && reservation.customer.userId !== userId) {
      throw new ForbiddenError('You do not have access to this reservation');
    }

    if (userRole === UserRole.CHAUFFEUR) {
      const chauffeur = await prisma.chauffeur.findUnique({
        where: { userId },
      });
      if (!chauffeur || reservation.chauffeurId !== chauffeur.id) {
        throw new ForbiddenError('You do not have access to this reservation');
      }
    }

    return reservation;
  }

  async getReservations(
    userId: string,
    userRole: UserRole,
    pagination: PaginationInput,
    filters?: {
      status?: ReservationStatus;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const { page, limit, sortBy = 'pickupDatetime', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Apply role-based filtering
    if (userRole === UserRole.CUSTOMER) {
      const customer = await prisma.customer.findUnique({
        where: { userId },
      });
      where.customerId = customer?.id;
    } else if (userRole === UserRole.CHAUFFEUR) {
      const chauffeur = await prisma.chauffeur.findUnique({
        where: { userId },
      });
      where.chauffeurId = chauffeur?.id;
    }

    // Apply filters
    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      where.pickupDatetime = {};
      if (filters.startDate) {
        where.pickupDatetime.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.pickupDatetime.lte = new Date(filters.endDate);
      }
    }

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          customer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
          chauffeur: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
              vehicle: true,
            },
          },
          vehicle: true,
        },
      }),
      prisma.reservation.count({ where }),
    ]);

    return {
      reservations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateReservation(
    reservationId: string,
    userId: string,
    userRole: UserRole,
    data: UpdateReservationInput
  ) {
    const reservation = await this.getReservation(reservationId, userId, userRole);

    // Only allow updates if reservation is pending or confirmed
    if (
      reservation.status !== ReservationStatus.PENDING &&
      reservation.status !== ReservationStatus.CONFIRMED
    ) {
      throw new BadRequestError('Cannot update reservation in current status');
    }

    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        ...(data.pickupLocation && { pickupLocation: data.pickupLocation }),
        ...(data.pickupDatetime && { pickupDatetime: new Date(data.pickupDatetime) }),
        ...(data.dropoffLocation && { dropoffLocation: data.dropoffLocation }),
        ...(data.dropoffDatetime && { dropoffDatetime: new Date(data.dropoffDatetime) }),
        ...(data.passengerCount && { passengerCount: data.passengerCount }),
        ...(data.specialInstructions !== undefined && {
          specialInstructions: data.specialInstructions,
        }),
        ...(data.status && { status: data.status }),
      },
      include: {
        customer: {
          include: {
            user: true,
          },
        },
        chauffeur: {
          include: {
            user: true,
            vehicle: true,
          },
        },
        vehicle: true,
      },
    });

    return updated;
  }

  async cancelReservation(reservationId: string, userId: string, userRole: UserRole) {
    const reservation = await this.getReservation(reservationId, userId, userRole);

    if (
      reservation.status === ReservationStatus.COMPLETED ||
      reservation.status === ReservationStatus.CANCELLED
    ) {
      throw new BadRequestError('Cannot cancel reservation in current status');
    }

    const cancelled = await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.CANCELLED },
    });

    return cancelled;
  }

  async deleteReservation(reservationId: string, userId: string, userRole: UserRole) {
    const reservation = await this.getReservation(reservationId, userId, userRole);

    // Delete related records first
    await prisma.trip.deleteMany({
      where: { reservationId },
    });

    await prisma.payment.deleteMany({
      where: { reservationId },
    });

    // Delete the reservation
    await prisma.reservation.delete({
      where: { id: reservationId },
    });

    return { message: 'Reservation deleted successfully' };
  }

  async deleteAllReservations(userId: string, userRole: UserRole) {
    if (!env.DEMO_MODE) {
      throw new ForbiddenError('This feature is only available in demo mode');
    }

    let customerId: string | undefined;

    if (userRole === UserRole.CUSTOMER) {
      const customer = await prisma.customer.findUnique({
        where: { userId },
      });
      customerId = customer?.id;
    }

    if (!customerId) {
      throw new NotFoundError('Customer not found');
    }

    // Get all reservation IDs for this customer
    const reservations = await prisma.reservation.findMany({
      where: { customerId },
      select: { id: true },
    });

    const reservationIds = reservations.map((r) => r.id);

    // Delete all related records
    await prisma.trip.deleteMany({
      where: { reservationId: { in: reservationIds } },
    });

    await prisma.payment.deleteMany({
      where: { reservationId: { in: reservationIds } },
    });

    // Delete all reservations
    const result = await prisma.reservation.deleteMany({
      where: { customerId },
    });

    return {
      message: 'All reservations deleted successfully',
      deletedCount: result.count,
    };
  }

  // Helper method to calculate distance (simplified Haversine formula)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const reservationService = new ReservationService();
