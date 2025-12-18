import { Request, Response, NextFunction } from 'express';
import { mapsService } from '../services/maps.service';

export class MapsController {
  async calculateRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const { origin, destination, mode, alternatives } = req.body;

      if (!origin || !destination) {
        return res.status(400).json({
          success: false,
          message: 'Origin and destination are required',
        });
      }

      const route = await mapsService.calculateRoute(origin, destination, {
        mode,
        alternatives,
      });

      // Calculate estimated price
      const pricing = mapsService.calculateEstimatedPrice(route.distance, route.duration);

      res.json({
        success: true,
        data: {
          ...route,
          pricing,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async geocodeAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const { address } = req.body;

      if (!address) {
        return res.status(400).json({
          success: false,
          message: 'Address is required',
        });
      }

      const result = await mapsService.geocodeAddress(address);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async reverseGeocode(req: Request, res: Response, next: NextFunction) {
    try {
      const { latitude, longitude } = req.body;

      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
      }

      const result = await mapsService.reverseGeocode(
        parseFloat(latitude),
        parseFloat(longitude)
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPlaceAutocomplete(req: Request, res: Response, next: NextFunction) {
    try {
      const { input, latitude, longitude } = req.query;

      if (!input) {
        return res.status(400).json({
          success: false,
          message: 'Input is required',
        });
      }

      const location =
        latitude && longitude
          ? {
              latitude: parseFloat(latitude as string),
              longitude: parseFloat(longitude as string),
            }
          : undefined;

      const results = await mapsService.getPlaceAutocomplete(input as string, location);

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPlaceDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { placeId } = req.params;

      if (!placeId) {
        return res.status(400).json({
          success: false,
          message: 'Place ID is required',
        });
      }

      const result = await mapsService.getPlaceDetails(placeId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const mapsController = new MapsController();
