import { Router } from 'express';
import { chauffeurController } from '../controllers/chauffeur.controller';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require chauffeur authentication
router.use(authenticate);
router.use(authorize(UserRole.CHAUFFEUR));

/**
 * @swagger
 * /api/chauffeur/profile:
 *   get:
 *     summary: Get chauffeur profile
 *     tags: [Chauffeur]
 *     security:
 *       - bearerAuth: []
 */
router.get('/profile', chauffeurController.getProfile);

/**
 * @swagger
 * /api/chauffeur/trips:
 *   get:
 *     summary: Get assigned trips
 *     tags: [Chauffeur]
 *     security:
 *       - bearerAuth: []
 */
router.get('/trips', chauffeurController.getAssignedTrips);

/**
 * @swagger
 * /api/chauffeur/trips/{id}:
 *   get:
 *     summary: Get trip details
 *     tags: [Chauffeur]
 *     security:
 *       - bearerAuth: []
 */
router.get('/trips/:id', chauffeurController.getTripDetails);

/**
 * @swagger
 * /api/chauffeur/trips/{id}/status:
 *   patch:
 *     summary: Update trip status
 *     tags: [Chauffeur]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/trips/:id/status', chauffeurController.updateTripStatus);

/**
 * @swagger
 * /api/chauffeur/trips/{id}/location:
 *   post:
 *     summary: Update GPS location
 *     tags: [Chauffeur]
 *     security:
 *       - bearerAuth: []
 */
router.post('/trips/:id/location', chauffeurController.updateGPSLocation);

/**
 * @swagger
 * /api/chauffeur/trips/{id}/complete:
 *   post:
 *     summary: Complete trip
 *     tags: [Chauffeur]
 *     security:
 *       - bearerAuth: []
 */
router.post('/trips/:id/complete', chauffeurController.completeTrip);

/**
 * @swagger
 * /api/chauffeur/statistics:
 *   get:
 *     summary: Get chauffeur statistics
 *     tags: [Chauffeur]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', chauffeurController.getStatistics);

export default router;
