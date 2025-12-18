import { Request, Response, NextFunction } from 'express';
import { chauffeurService } from '../services/chauffeur.service';

export class ChauffeurController {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const chauffeur = await chauffeurService.getChauffeurByUserId(req.user!.id);

      res.json({
        success: true,
        data: chauffeur,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAssignedTrips(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await chauffeurService.getAssignedTrips(req.user!.id, {
        status: req.query.status as any,
        upcoming: req.query.upcoming === 'true',
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

  async getTripDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const trip = await chauffeurService.getTripDetails(req.user!.id, id);

      res.json({
        success: true,
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTripStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const trip = await chauffeurService.updateTripStatus(req.user!.id, id, status);

      res.json({
        success: true,
        message: 'Trip status updated successfully',
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateGPSLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { latitude, longitude, timestamp } = req.body;

      const result = await chauffeurService.updateGPSLocation(req.user!.id, id, {
        latitude,
        longitude,
        timestamp,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async completeTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const trip = await chauffeurService.completeTrip(req.user!.id, id, req.body);

      res.json({
        success: true,
        message: 'Trip completed successfully',
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await chauffeurService.getChauffeurStatistics(
        req.user!.id,
        req.query.startDate as string,
        req.query.endDate as string
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const chauffeurController = new ChauffeurController();
