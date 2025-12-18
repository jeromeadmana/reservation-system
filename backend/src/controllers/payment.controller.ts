import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';

export class PaymentController {
  async createPaymentIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const { reservationId } = req.body;

      if (!reservationId) {
        return res.status(400).json({
          success: false,
          message: 'Reservation ID is required',
        });
      }

      const result = await paymentService.createPaymentIntent(
        reservationId,
        req.user!.id
      );

      res.json({
        success: true,
        message: 'Payment intent created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing stripe-signature header',
        });
      }

      const result = await paymentService.handleWebhook(req.body, signature);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getPaymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const payment = await paymentService.getPaymentStatus(id, req.user!.id);

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentByReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const { reservationId } = req.params;
      const payment = await paymentService.getPaymentByReservation(
        reservationId,
        req.user!.id
      );

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  async createRefund(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;

      const result = await paymentService.createRefund(id, amount, reason);

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.getPaymentHistory(req.user!.id, {
        status: req.query.status as any,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
