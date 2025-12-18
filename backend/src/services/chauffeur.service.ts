import { TripStatus, ReservationStatus } from '@prisma/client';
import prisma from '../config/database';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';

export class ChauffeurService {
  async getChauffeurByUserId(userId: string) {
    const chauffeur = await prisma.chauffeur.findUnique({
      where: { userId },
      include: {
        user: true,
        vehicle: true,
      },
    });

    if (!chauffeur) {
      throw new NotFoundError('Chauffeur profile not found');
    }

    return chauffeur;
  }

  async getAssignedTrips(userId: string, filters?: {
    status?: TripStatus;
    upcoming?: boolean;
    page?: number;
    limit?: number;
  }) {
    const chauffeur = await this.getChauffeurByUserId(userId);
    const { status, upcoming, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    const where: any = { chauffeurId: chauffeur.id };

    if (status) {
      where.status = status;
    }

    if (upcoming) {
      where.reservation = {
        pickupDatetime: { gte: new Date() },
      };
    }

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reservation: {
            include: {
              customer: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      phone: true,
                      email: true,
                    },
                  },
                },
              },
              vehicle: true,
            },
          },
        },
      }),
      prisma.trip.count({ where }),
    ]);

    return {
      trips,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTripDetails(userId: string, tripId: string) {
    const chauffeur = await this.getChauffeurByUserId(userId);

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        reservation: {
          include: {
            customer: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true,
                    email: true,
                  },
                },
              },
            },
            vehicle: true,
            payment: true,
          },
        },
        chauffeur: {
          include: {
            user: true,
            vehicle: true,
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundError('Trip not found');
    }

    if (trip.chauffeurId !== chauffeur.id) {
      throw new ForbiddenError('You do not have access to this trip');
    }

    return trip;
  }

  async updateTripStatus(userId: string, tripId: string, newStatus: TripStatus) {
    const trip = await this.getTripDetails(userId, tripId);

    // Validate status transitions
    const validTransitions: Record<TripStatus, TripStatus[]> = {
      [TripStatus.ASSIGNED]: [TripStatus.EN_ROUTE_PICKUP],
      [TripStatus.EN_ROUTE_PICKUP]: [TripStatus.ON_LOCATION],
      [TripStatus.ON_LOCATION]: [TripStatus.EN_ROUTE_DROPOFF],
      [TripStatus.EN_ROUTE_DROPOFF]: [TripStatus.COMPLETED],
      [TripStatus.COMPLETED]: [],
    };

    if (!validTransitions[trip.status].includes(newStatus)) {
      throw new BadRequestError(
        `Invalid status transition from ${trip.status} to ${newStatus}`
      );
    }

    // Update trip and potentially reservation status
    const updateData: any = { status: newStatus };

    if (newStatus === TripStatus.ON_LOCATION && !trip.actualPickupTime) {
      updateData.actualPickupTime = new Date();
    }

    if (newStatus === TripStatus.COMPLETED && !trip.actualDropoffTime) {
      updateData.actualDropoffTime = new Date();
    }

    const [updatedTrip] = await prisma.$transaction([
      prisma.trip.update({
        where: { id: tripId },
        data: updateData,
        include: {
          reservation: {
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
            },
          },
        },
      }),
      // Update reservation status based on trip status
      prisma.reservation.update({
        where: { id: trip.reservationId },
        data: {
          status:
            newStatus === TripStatus.COMPLETED
              ? ReservationStatus.COMPLETED
              : newStatus === TripStatus.ON_LOCATION ||
                newStatus === TripStatus.EN_ROUTE_DROPOFF
              ? ReservationStatus.IN_PROGRESS
              : ReservationStatus.CONFIRMED,
        },
      }),
    ]);

    return updatedTrip;
  }

  async updateGPSLocation(userId: string, tripId: string, coordinates: {
    latitude: number;
    longitude: number;
    timestamp?: string;
  }) {
    const trip = await this.getTripDetails(userId, tripId);

    if (trip.status === TripStatus.COMPLETED) {
      throw new BadRequestError('Cannot update location for completed trip');
    }

    // Parse existing GPS coordinates
    const existingCoordinates = trip.gpsCoordinates
      ? JSON.parse(trip.gpsCoordinates)
      : [];

    // Add new coordinates
    const newCoordinate = {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      timestamp: coordinates.timestamp || new Date().toISOString(),
    };

    existingCoordinates.push(newCoordinate);

    // Keep only last 100 coordinates to prevent excessive data storage
    const limitedCoordinates =
      existingCoordinates.length > 100
        ? existingCoordinates.slice(-100)
        : existingCoordinates;

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        gpsCoordinates: JSON.stringify(limitedCoordinates),
      },
    });

    return {
      success: true,
      message: 'GPS location updated',
      currentLocation: newCoordinate,
    };
  }

  async completeTrip(userId: string, tripId: string, completionData: {
    actualDistance?: number;
    actualDuration?: number;
    notes?: string;
  }) {
    const trip = await this.getTripDetails(userId, tripId);

    if (trip.status === TripStatus.COMPLETED) {
      throw new BadRequestError('Trip is already completed');
    }

    if (trip.status !== TripStatus.EN_ROUTE_DROPOFF) {
      throw new BadRequestError('Trip must be en route to dropoff before completion');
    }

    const actualDropoffTime = new Date();
    const actualDuration = trip.actualPickupTime
      ? Math.floor(
          (actualDropoffTime.getTime() - trip.actualPickupTime.getTime()) / 60000
        )
      : completionData.actualDuration;

    const [updatedTrip] = await prisma.$transaction([
      prisma.trip.update({
        where: { id: tripId },
        data: {
          status: TripStatus.COMPLETED,
          actualDropoffTime,
          actualDistance: completionData.actualDistance,
          actualDuration,
          notes: completionData.notes,
        },
        include: {
          reservation: {
            include: {
              customer: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      }),
      prisma.reservation.update({
        where: { id: trip.reservationId },
        data: { status: ReservationStatus.COMPLETED },
      }),
    ]);

    return updatedTrip;
  }

  async getChauffeurStatistics(userId: string, startDate?: string, endDate?: string) {
    const chauffeur = await this.getChauffeurByUserId(userId);

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const where: any = { chauffeurId: chauffeur.id };
    if (startDate || endDate) {
      where.createdAt = dateFilter;
    }

    const [totalTrips, completedTrips, totalDistance, totalDuration, totalEarnings] =
      await Promise.all([
        prisma.trip.count({ where }),
        prisma.trip.count({ where: { ...where, status: TripStatus.COMPLETED } }),
        prisma.trip.aggregate({
          where: { ...where, status: TripStatus.COMPLETED },
          _sum: { actualDistance: true },
        }),
        prisma.trip.aggregate({
          where: { ...where, status: TripStatus.COMPLETED },
          _sum: { actualDuration: true },
        }),
        prisma.payment.aggregate({
          where: {
            status: 'COMPLETED',
            reservation: {
              chauffeurId: chauffeur.id,
              ...(startDate || endDate ? { createdAt: dateFilter } : {}),
            },
          },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalTrips,
      completedTrips,
      activeTrips: totalTrips - completedTrips,
      totalDistance: totalDistance._sum.actualDistance || 0,
      totalDuration: totalDuration._sum.actualDuration || 0,
      totalEarnings: totalEarnings._sum.amount || 0,
      averageEarningsPerTrip:
        completedTrips > 0 ? (totalEarnings._sum.amount || 0) / completedTrips : 0,
      rating: chauffeur.rating || 5.0,
    };
  }
}

export const chauffeurService = new ChauffeurService();
