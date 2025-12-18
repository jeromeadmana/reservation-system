import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';

export class AdminController {
  // ===== RESERVATION MANAGEMENT =====

  async getAllReservations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getAllReservations({
        status: req.query.status as any,
        chauffeurId: req.query.chauffeurId as string,
        customerId: req.query.customerId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async assignChauffeur(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { chauffeurId, vehicleId } = req.body;

      const result = await adminService.assignChauffeur(id, chauffeurId, vehicleId);

      res.json({
        success: true,
        message: 'Chauffeur assigned successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async unassignChauffeur(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await adminService.unassignChauffeur(id);

      res.json({
        success: true,
        message: 'Chauffeur unassigned successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ===== CHAUFFEUR MANAGEMENT =====

  async getAllChauffeurs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getAllChauffeurs({
        status: req.query.status as string,
        available: req.query.available === 'true',
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

  async getChauffeurDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const chauffeur = await adminService.getChauffeurDetails(id);

      res.json({
        success: true,
        data: chauffeur,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateChauffeurStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const chauffeur = await adminService.updateChauffeurStatus(id, status);

      res.json({
        success: true,
        message: 'Chauffeur status updated successfully',
        data: chauffeur,
      });
    } catch (error) {
      next(error);
    }
  }

  // ===== VEHICLE MANAGEMENT =====

  async getAllVehicles(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.getAllVehicles({
        status: req.query.status as any,
        type: req.query.type as any,
        available: req.query.available === 'true',
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

  async createVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const vehicle = await adminService.createVehicle(req.body);

      res.status(201).json({
        success: true,
        message: 'Vehicle created successfully',
        data: vehicle,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const vehicle = await adminService.updateVehicle(id, req.body);

      res.json({
        success: true,
        message: 'Vehicle updated successfully',
        data: vehicle,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteVehicle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await adminService.deleteVehicle(id);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ===== ANALYTICS & REPORTING =====

  async getDashboardAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const analytics = await adminService.getDashboardAnalytics(
        req.query.startDate as string,
        req.query.endDate as string
      );

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRevenueReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required',
        });
      }

      const report = await adminService.getRevenueReport(
        startDate as string,
        endDate as string
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
