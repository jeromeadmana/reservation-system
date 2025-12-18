import { ReservationStatus, UserRole, VehicleStatus, VehicleType } from '@prisma/client';
import prisma from '../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';

export class AdminService {
  // ===== RESERVATION MANAGEMENT =====

  async getAllReservations(filters?: {
    status?: ReservationStatus;
    chauffeurId?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      status,
      chauffeurId,
      customerId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'pickupDatetime',
      sortOrder = 'desc',
    } = filters || {};

    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) where.status = status;
    if (chauffeurId) where.chauffeurId = chauffeurId;
    if (customerId) where.customerId = customerId;

    if (startDate || endDate) {
      where.pickupDatetime = {};
      if (startDate) where.pickupDatetime.gte = new Date(startDate);
      if (endDate) where.pickupDatetime.lte = new Date(endDate);
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

  async assignChauffeur(reservationId: string, chauffeurId: string, vehicleId?: string) {
    // Verify reservation exists
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    // Verify chauffeur exists and is available
    const chauffeur = await prisma.chauffeur.findUnique({
      where: { id: chauffeurId },
      include: { vehicle: true },
    });

    if (!chauffeur) {
      throw new NotFoundError('Chauffeur not found');
    }

    // Use provided vehicle or chauffeur's default vehicle
    const assignedVehicleId = vehicleId || chauffeur.vehicleId;

    if (!assignedVehicleId) {
      throw new BadRequestError('No vehicle available for assignment');
    }

    // Verify vehicle exists and is available
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: assignedVehicleId },
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (vehicle.status !== VehicleStatus.AVAILABLE) {
      throw new BadRequestError('Vehicle is not available');
    }

    // Update reservation and create trip
    const [updatedReservation, trip] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id: reservationId },
        data: {
          chauffeurId,
          vehicleId: assignedVehicleId,
          status: ReservationStatus.CONFIRMED,
        },
        include: {
          customer: { include: { user: true } },
          chauffeur: { include: { user: true, vehicle: true } },
          vehicle: true,
        },
      }),
      prisma.trip.create({
        data: {
          reservationId,
          chauffeurId,
          status: 'ASSIGNED',
        },
      }),
    ]);

    return { reservation: updatedReservation, trip };
  }

  async unassignChauffeur(reservationId: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { trip: true },
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    if (reservation.status === ReservationStatus.COMPLETED) {
      throw new BadRequestError('Cannot unassign chauffeur from completed reservation');
    }

    // Delete trip if exists
    if (reservation.trip) {
      await prisma.trip.delete({
        where: { id: reservation.trip.id },
      });
    }

    // Update reservation
    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        chauffeurId: null,
        vehicleId: null,
        status: ReservationStatus.PENDING,
      },
      include: {
        customer: { include: { user: true } },
      },
    });

    return updated;
  }

  // ===== CHAUFFEUR MANAGEMENT =====

  async getAllChauffeurs(filters?: {
    status?: string;
    available?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { status, available, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) where.status = status;
    if (available !== undefined) {
      where.status = available ? 'available' : { not: 'available' };
    }

    const [chauffeurs, total] = await Promise.all([
      prisma.chauffeur.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              isActive: true,
            },
          },
          vehicle: true,
          reservations: {
            where: {
              status: {
                in: [ReservationStatus.CONFIRMED, ReservationStatus.IN_PROGRESS],
              },
            },
            select: {
              id: true,
              pickupDatetime: true,
              pickupLocation: true,
              dropoffLocation: true,
              status: true,
            },
          },
        },
      }),
      prisma.chauffeur.count({ where }),
    ]);

    return {
      chauffeurs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getChauffeurDetails(chauffeurId: string) {
    const chauffeur = await prisma.chauffeur.findUnique({
      where: { id: chauffeurId },
      include: {
        user: true,
        vehicle: true,
        reservations: {
          orderBy: { pickupDatetime: 'desc' },
          take: 10,
          include: {
            customer: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        trips: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            reservation: {
              include: {
                customer: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!chauffeur) {
      throw new NotFoundError('Chauffeur not found');
    }

    return chauffeur;
  }

  async updateChauffeurStatus(chauffeurId: string, status: string) {
    const validStatuses = ['available', 'busy', 'offline', 'on_break'];

    if (!validStatuses.includes(status)) {
      throw new BadRequestError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const chauffeur = await prisma.chauffeur.update({
      where: { id: chauffeurId },
      data: { status },
      include: {
        user: true,
        vehicle: true,
      },
    });

    return chauffeur;
  }

  // ===== VEHICLE MANAGEMENT =====

  async getAllVehicles(filters?: {
    status?: VehicleStatus;
    type?: VehicleType;
    available?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { status, type, available, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (available) where.status = VehicleStatus.AVAILABLE;

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        include: {
          chauffeurs: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          reservations: {
            where: {
              status: {
                in: [ReservationStatus.CONFIRMED, ReservationStatus.IN_PROGRESS],
              },
            },
            select: {
              id: true,
              pickupDatetime: true,
              status: true,
            },
          },
        },
      }),
      prisma.vehicle.count({ where }),
    ]);

    return {
      vehicles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createVehicle(data: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    capacity: number;
    type: VehicleType;
    amenities?: string[];
    imageUrl?: string;
  }) {
    const vehicle = await prisma.vehicle.create({
      data: {
        ...data,
        amenities: data.amenities ? JSON.stringify(data.amenities) : '[]',
      },
    });

    return vehicle;
  }

  async updateVehicle(
    vehicleId: string,
    data: {
      make?: string;
      model?: string;
      year?: number;
      licensePlate?: string;
      capacity?: number;
      type?: VehicleType;
      status?: VehicleStatus;
      amenities?: string[];
      imageUrl?: string;
    }
  ) {
    const vehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        ...data,
        amenities: data.amenities ? JSON.stringify(data.amenities) : undefined,
      },
    });

    return vehicle;
  }

  async deleteVehicle(vehicleId: string) {
    // Check if vehicle is assigned to any chauffeur
    const chauffeurs = await prisma.chauffeur.findMany({
      where: { vehicleId },
    });

    if (chauffeurs.length > 0) {
      throw new BadRequestError('Cannot delete vehicle assigned to chauffeurs');
    }

    // Check if vehicle has active reservations
    const activeReservations = await prisma.reservation.count({
      where: {
        vehicleId,
        status: {
          in: [ReservationStatus.CONFIRMED, ReservationStatus.IN_PROGRESS],
        },
      },
    });

    if (activeReservations > 0) {
      throw new BadRequestError('Cannot delete vehicle with active reservations');
    }

    await prisma.vehicle.delete({
      where: { id: vehicleId },
    });

    return { message: 'Vehicle deleted successfully' };
  }

  // ===== ANALYTICS & REPORTING =====

  async getDashboardAnalytics(startDate?: string, endDate?: string) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const where = startDate || endDate ? { createdAt: dateFilter } : {};

    const [
      totalReservations,
      pendingReservations,
      confirmedReservations,
      inProgressReservations,
      completedReservations,
      cancelledReservations,
      totalRevenue,
      totalCustomers,
      totalChauffeurs,
      totalVehicles,
      availableVehicles,
      availableChauffeurs,
    ] = await Promise.all([
      prisma.reservation.count({ where }),
      prisma.reservation.count({ where: { ...where, status: ReservationStatus.PENDING } }),
      prisma.reservation.count({ where: { ...where, status: ReservationStatus.CONFIRMED } }),
      prisma.reservation.count({ where: { ...where, status: ReservationStatus.IN_PROGRESS } }),
      prisma.reservation.count({ where: { ...where, status: ReservationStatus.COMPLETED } }),
      prisma.reservation.count({ where: { ...where, status: ReservationStatus.CANCELLED } }),
      prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          ...(startDate || endDate ? { createdAt: dateFilter } : {}),
        },
        _sum: { amount: true },
      }),
      prisma.customer.count(),
      prisma.chauffeur.count(),
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: VehicleStatus.AVAILABLE } }),
      prisma.chauffeur.count({ where: { status: 'available' } }),
    ]);

    // Get reservations by day (last 7 days or custom range)
    const reservationsByDay = await prisma.$queryRaw<
      Array<{ date: Date; count: bigint }>
    >`
      SELECT DATE(pickup_datetime) as date, COUNT(*) as count
      FROM reservations
      ${startDate || endDate ? 'WHERE pickup_datetime BETWEEN ' + (startDate || '1970-01-01') + ' AND ' + (endDate || '9999-12-31') : ''}
      GROUP BY DATE(pickup_datetime)
      ORDER BY date DESC
      LIMIT 7
    `;

    // Get top customers
    const topCustomers = await prisma.customer.findMany({
      take: 5,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { reservations: true },
        },
      },
      orderBy: {
        reservations: {
          _count: 'desc',
        },
      },
    });

    return {
      overview: {
        totalReservations,
        pendingReservations,
        confirmedReservations,
        inProgressReservations,
        completedReservations,
        cancelledReservations,
        totalRevenue: totalRevenue._sum.amount || 0,
        totalCustomers,
        totalChauffeurs,
        totalVehicles,
        availableVehicles,
        availableChauffeurs,
      },
      reservationsByDay: reservationsByDay.map((r) => ({
        date: r.date,
        count: Number(r.count),
      })),
      topCustomers: topCustomers.map((c) => ({
        id: c.id,
        name: `${c.user.firstName} ${c.user.lastName}`,
        email: c.user.email,
        totalReservations: c._count.reservations,
      })),
    };
  }

  async getRevenueReport(startDate: string, endDate: string) {
    const payments = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        reservation: {
          include: {
            customer: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
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
              },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const averageRevenue = totalRevenue / (payments.length || 1);

    return {
      totalRevenue,
      averageRevenue,
      totalTransactions: payments.length,
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        completedAt: p.completedAt,
        customer: {
          name: `${p.reservation.customer.user.firstName} ${p.reservation.customer.user.lastName}`,
        },
        chauffeur: p.reservation.chauffeur
          ? {
              name: `${p.reservation.chauffeur.user.firstName} ${p.reservation.chauffeur.user.lastName}`,
            }
          : null,
        reservation: {
          id: p.reservation.id,
          pickupLocation: p.reservation.pickupLocation,
          dropoffLocation: p.reservation.dropoffLocation,
        },
      })),
    };
  }
}

export const adminService = new AdminService();
