import { Request, Response, NextFunction } from 'express';
import { reservationService } from '../services/reservation.service';

export class ReservationController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const customer = await reservationService['getCustomerByUserId'](userId);
      const reservation = await reservationService.createReservation(
        customer.id,
        req.body
      );

      res.status(201).json({
        success: true,
        message: 'Reservation created successfully',
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const reservation = await reservationService.getReservation(
        id,
        req.user!.id,
        req.user!.role
      );

      res.json({
        success: true,
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await reservationService.getReservations(
        req.user!.id,
        req.user!.role,
        req.query,
        {
          status: req.query.status as any,
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
        }
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const reservation = await reservationService.updateReservation(
        id,
        req.user!.id,
        req.user!.role,
        req.body
      );

      res.json({
        success: true,
        message: 'Reservation updated successfully',
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const reservation = await reservationService.cancelReservation(
        id,
        req.user!.id,
        req.user!.role
      );

      res.json({
        success: true,
        message: 'Reservation cancelled successfully',
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await reservationService.deleteReservation(
        id,
        req.user!.id,
        req.user!.role
      );

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await reservationService.deleteAllReservations(
        req.user!.id,
        req.user!.role
      );

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reservationController = new ReservationController();
