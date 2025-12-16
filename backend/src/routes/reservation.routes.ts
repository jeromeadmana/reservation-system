import { Router } from 'express';
import { reservationController } from '../controllers/reservation.controller';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/reservations:
 *   post:
 *     summary: Create a new reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authorize(UserRole.CUSTOMER), reservationController.create);

/**
 * @swagger
 * /api/reservations:
 *   get:
 *     summary: Get all reservations for the authenticated user
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', reservationController.list);

/**
 * @swagger
 * /api/reservations/{id}:
 *   get:
 *     summary: Get a specific reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', reservationController.get);

/**
 * @swagger
 * /api/reservations/{id}:
 *   patch:
 *     summary: Update a reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', reservationController.update);

/**
 * @swagger
 * /api/reservations/{id}/cancel:
 *   post:
 *     summary: Cancel a reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/cancel', reservationController.cancel);

/**
 * @swagger
 * /api/reservations/{id}:
 *   delete:
 *     summary: Delete a reservation (Demo mode)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', reservationController.delete);

/**
 * @swagger
 * /api/reservations/demo/reset:
 *   post:
 *     summary: Delete all reservations (Demo mode only)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 */
router.post('/demo/reset', authorize(UserRole.CUSTOMER), reservationController.deleteAll);

export default router;
