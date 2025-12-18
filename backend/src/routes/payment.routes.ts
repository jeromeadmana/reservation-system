import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * Stripe webhook endpoint (no authentication required)
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Handle Stripe webhook events
 *     tags: [Payments]
 */
router.post('/webhook', paymentController.handleWebhook);

// All other routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/payments/create-intent:
 *   post:
 *     summary: Create a payment intent for a reservation
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/create-intent', paymentController.createPaymentIntent);

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', paymentController.getPaymentStatus);

/**
 * @swagger
 * /api/payments/reservation/{reservationId}:
 *   get:
 *     summary: Get payment by reservation ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/reservation/:reservationId', paymentController.getPaymentByReservation);

/**
 * @swagger
 * /api/payments/{id}/refund:
 *   post:
 *     summary: Create a refund (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/refund',
  authorize(UserRole.ADMIN),
  paymentController.createRefund
);

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Get payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', paymentController.getPaymentHistory);

export default router;
