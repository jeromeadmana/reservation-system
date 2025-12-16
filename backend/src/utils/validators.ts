import { z } from 'zod';
import { UserRole, VehicleType, ReservationStatus, TripStatus } from '@prisma/client';

// Auth validators
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().optional(),
  role: z.nativeEnum(UserRole).default(UserRole.CUSTOMER),
  // Customer-specific fields
  companyName: z.string().optional(),
  billingAddress: z.string().optional(),
  // Chauffeur-specific fields
  licenseNumber: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Reservation validators
export const createReservationSchema = z.object({
  pickupLocation: z.string().min(1),
  pickupLatitude: z.number().optional(),
  pickupLongitude: z.number().optional(),
  pickupDatetime: z.string().datetime(),
  dropoffLocation: z.string().min(1),
  dropoffLatitude: z.number().optional(),
  dropoffLongitude: z.number().optional(),
  dropoffDatetime: z.string().datetime().optional(),
  vehicleType: z.nativeEnum(VehicleType).optional(),
  passengerCount: z.number().int().min(1).default(1),
  specialInstructions: z.string().optional(),
});

export const updateReservationSchema = z.object({
  pickupLocation: z.string().min(1).optional(),
  pickupDatetime: z.string().datetime().optional(),
  dropoffLocation: z.string().min(1).optional(),
  dropoffDatetime: z.string().datetime().optional(),
  passengerCount: z.number().int().min(1).optional(),
  specialInstructions: z.string().optional(),
  status: z.nativeEnum(ReservationStatus).optional(),
});

// Quote validators
export const createQuoteSchema = z.object({
  pickupLocation: z.string().min(1),
  pickupLatitude: z.number().optional(),
  pickupLongitude: z.number().optional(),
  dropoffLocation: z.string().min(1),
  dropoffLatitude: z.number().optional(),
  dropoffLongitude: z.number().optional(),
  requestedDatetime: z.string().datetime(),
  vehicleType: z.nativeEnum(VehicleType),
  passengerCount: z.number().int().min(1).default(1),
  notes: z.string().optional(),
});

// Trip validators
export const updateTripStatusSchema = z.object({
  status: z.nativeEnum(TripStatus),
  actualPickupTime: z.string().datetime().optional(),
  actualDropoffTime: z.string().datetime().optional(),
  actualDistance: z.number().optional(),
  actualDuration: z.number().int().optional(),
  notes: z.string().optional(),
});

export const updateTripLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.string().datetime(),
});

// Vehicle validators
export const createVehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  licensePlate: z.string().min(1),
  capacity: z.number().int().min(1),
  type: z.nativeEnum(VehicleType),
  amenities: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional(),
});

// Admin validators
export const assignChauffeurSchema = z.object({
  chauffeurId: z.string().cuid(),
  vehicleId: z.string().cuid().optional(),
});

// Pagination
export const paginationSchema = z.object({
  page: z.string().default('1').transform(Number),
  limit: z.string().default('10').transform(Number),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateTripStatusInput = z.infer<typeof updateTripStatusSchema>;
export type UpdateTripLocationInput = z.infer<typeof updateTripLocationSchema>;
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type AssignChauffeurInput = z.infer<typeof assignChauffeurSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
