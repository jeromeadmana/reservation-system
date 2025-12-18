import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

// ===== RESERVATION MANAGEMENT =====

/**
 * @swagger
 * /api/admin/reservations:
 *   get:
 *     summary: Get all reservations (Admin only)
 *     tags: [Admin - Reservations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/reservations', adminController.getAllReservations);

/**
 * @swagger
 * /api/admin/reservations/{id}/assign:
 *   post:
 *     summary: Assign chauffeur to reservation
 *     tags: [Admin - Reservations]
 *     security:
 *       - bearerAuth: []
 */
router.post('/reservations/:id/assign', adminController.assignChauffeur);

/**
 * @swagger
 * /api/admin/reservations/{id}/unassign:
 *   post:
 *     summary: Unassign chauffeur from reservation
 *     tags: [Admin - Reservations]
 *     security:
 *       - bearerAuth: []
 */
router.post('/reservations/:id/unassign', adminController.unassignChauffeur);

// ===== CHAUFFEUR MANAGEMENT =====

/**
 * @swagger
 * /api/admin/chauffeurs:
 *   get:
 *     summary: Get all chauffeurs
 *     tags: [Admin - Chauffeurs]
 *     security:
 *       - bearerAuth: []
 */
router.get('/chauffeurs', adminController.getAllChauffeurs);

/**
 * @swagger
 * /api/admin/chauffeurs/{id}:
 *   get:
 *     summary: Get chauffeur details
 *     tags: [Admin - Chauffeurs]
 *     security:
 *       - bearerAuth: []
 */
router.get('/chauffeurs/:id', adminController.getChauffeurDetails);

/**
 * @swagger
 * /api/admin/chauffeurs/{id}/status:
 *   patch:
 *     summary: Update chauffeur status
 *     tags: [Admin - Chauffeurs]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/chauffeurs/:id/status', adminController.updateChauffeurStatus);

// ===== VEHICLE MANAGEMENT =====

/**
 * @swagger
 * /api/admin/vehicles:
 *   get:
 *     summary: Get all vehicles
 *     tags: [Admin - Vehicles]
 *     security:
 *       - bearerAuth: []
 */
router.get('/vehicles', adminController.getAllVehicles);

/**
 * @swagger
 * /api/admin/vehicles:
 *   post:
 *     summary: Create new vehicle
 *     tags: [Admin - Vehicles]
 *     security:
 *       - bearerAuth: []
 */
router.post('/vehicles', adminController.createVehicle);

/**
 * @swagger
 * /api/admin/vehicles/{id}:
 *   patch:
 *     summary: Update vehicle
 *     tags: [Admin - Vehicles]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/vehicles/:id', adminController.updateVehicle);

/**
 * @swagger
 * /api/admin/vehicles/{id}:
 *   delete:
 *     summary: Delete vehicle
 *     tags: [Admin - Vehicles]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/vehicles/:id', adminController.deleteVehicle);

// ===== ANALYTICS & REPORTING =====

/**
 * @swagger
 * /api/admin/analytics:
 *   get:
 *     summary: Get dashboard analytics
 *     tags: [Admin - Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/analytics', adminController.getDashboardAnalytics);

/**
 * @swagger
 * /api/admin/reports/revenue:
 *   get:
 *     summary: Get revenue report
 *     tags: [Admin - Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/reports/revenue', adminController.getRevenueReport);

export default router;
