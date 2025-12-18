import Stripe from 'stripe';
import { PaymentStatus } from '@prisma/client';
import prisma from '../config/database';
import { env } from '../config/env';
import { NotFoundError, BadRequestError } from '../utils/errors';

export class PaymentService {
  private stripe: Stripe | null = null;

  constructor() {
    if (env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-02-24.acacia',
      });
    }
  }

  private checkStripeEnabled() {
    if (!this.stripe) {
      throw new BadRequestError(
        'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.'
      );
    }
  }

  /**
   * Create a payment intent for a reservation
   */
  async createPaymentIntent(reservationId: string, userId: string) {
    this.checkStripeEnabled();

    // Get reservation details
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        customer: {
          include: {
            user: true,
          },
        },
        payment: true,
      },
    });

    if (!reservation) {
      throw new NotFoundError('Reservation not found');
    }

    // Verify user owns this reservation
    if (reservation.customer.userId !== userId) {
      throw new BadRequestError('You do not have access to this reservation');
    }

    // Check if payment already exists
    if (reservation.payment) {
      if (reservation.payment.status === PaymentStatus.COMPLETED) {
        throw new BadRequestError('Reservation is already paid');
      }

      // If payment intent exists but not completed, return existing client secret
      if (reservation.payment.stripeClientSecret) {
        return {
          paymentIntentId: reservation.payment.stripePaymentIntentId,
          clientSecret: reservation.payment.stripeClientSecret,
          amount: reservation.payment.amount,
        };
      }
    }

    if (!reservation.totalPrice) {
      throw new BadRequestError('Reservation does not have a price');
    }

    // Create payment intent with Stripe
    const paymentIntent = await this.stripe!.paymentIntents.create({
      amount: Math.round(reservation.totalPrice * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        reservationId: reservation.id,
        customerId: reservation.customerId,
        userId: userId,
      },
    });

    // Create or update payment record
    const payment = await prisma.payment.upsert({
      where: { reservationId },
      create: {
        reservationId,
        amount: reservation.totalPrice,
        status: PaymentStatus.PENDING,
        stripePaymentIntentId: paymentIntent.id,
        stripeClientSecret: paymentIntent.client_secret,
      },
      update: {
        stripePaymentIntentId: paymentIntent.id,
        stripeClientSecret: paymentIntent.client_secret,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: reservation.totalPrice,
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(payload: Buffer, signature: string) {
    this.checkStripeEnabled();

    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new BadRequestError('Stripe webhook secret is not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe!.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error: any) {
      throw new BadRequestError(`Webhook signature verification failed: ${error.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.canceled':
        await this.handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: { reservation: true },
    });

    if (!payment) {
      console.error(`Payment not found for PaymentIntent: ${paymentIntent.id}`);
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        completedAt: new Date(),
        paymentMethod: paymentIntent.payment_method as string,
        transactionId: paymentIntent.id,
      },
    });

    console.log(`Payment succeeded for reservation: ${payment.reservationId}`);
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!payment) {
      console.error(`Payment not found for PaymentIntent: ${paymentIntent.id}`);
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
      },
    });

    console.log(`Payment failed for reservation: ${payment.reservationId}`);
  }

  private async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!payment) {
      console.error(`Payment not found for PaymentIntent: ${paymentIntent.id}`);
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
      },
    });

    console.log(`Payment canceled for reservation: ${payment.reservationId}`);
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string, userId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        reservation: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Verify user owns this payment
    if (payment.reservation.customer.userId !== userId) {
      throw new BadRequestError('You do not have access to this payment');
    }

    return payment;
  }

  /**
   * Get payment by reservation ID
   */
  async getPaymentByReservation(reservationId: string, userId: string) {
    const payment = await prisma.payment.findUnique({
      where: { reservationId },
      include: {
        reservation: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found for this reservation');
    }

    // Verify user owns this payment
    if (payment.reservation.customer.userId !== userId) {
      throw new BadRequestError('You do not have access to this payment');
    }

    return payment;
  }

  /**
   * Initiate a refund
   */
  async createRefund(paymentId: string, amount?: number, reason?: string) {
    this.checkStripeEnabled();

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { reservation: true },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestError('Can only refund completed payments');
    }

    if (!payment.stripePaymentIntentId) {
      throw new BadRequestError('No Stripe payment intent found');
    }

    // Create refund with Stripe
    const refund = await this.stripe!.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Partial or full refund
      reason: 'requested_by_customer',
    });

    // Update payment status
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
        metadata: JSON.stringify({
          refundId: refund.id,
          refundAmount: refund.amount / 100,
          refundReason: reason,
          refundedAt: new Date().toISOString(),
        }),
      },
    });

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
    };
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(userId: string, filters?: {
    status?: PaymentStatus;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    const where: any = {
      reservation: {
        customer: {
          userId,
        },
      },
    };

    if (status) {
      where.status = status;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reservation: {
            select: {
              id: true,
              pickupLocation: true,
              dropoffLocation: true,
              pickupDatetime: true,
              status: true,
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const paymentService = new PaymentService();
