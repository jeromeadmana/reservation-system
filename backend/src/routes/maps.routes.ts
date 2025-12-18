import { Router } from 'express';
import { mapsController } from '../controllers/maps.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/maps/route:
 *   post:
 *     summary: Calculate route between two points
 *     tags: [Maps]
 *     security:
 *       - bearerAuth: []
 */
router.post('/route', mapsController.calculateRoute);

/**
 * @swagger
 * /api/maps/geocode:
 *   post:
 *     summary: Geocode an address to coordinates
 *     tags: [Maps]
 *     security:
 *       - bearerAuth: []
 */
router.post('/geocode', mapsController.geocodeAddress);

/**
 * @swagger
 * /api/maps/reverse-geocode:
 *   post:
 *     summary: Reverse geocode coordinates to address
 *     tags: [Maps]
 *     security:
 *       - bearerAuth: []
 */
router.post('/reverse-geocode', mapsController.reverseGeocode);

/**
 * @swagger
 * /api/maps/autocomplete:
 *   get:
 *     summary: Get place autocomplete suggestions
 *     tags: [Maps]
 *     security:
 *       - bearerAuth: []
 */
router.get('/autocomplete', mapsController.getPlaceAutocomplete);

/**
 * @swagger
 * /api/maps/place/{placeId}:
 *   get:
 *     summary: Get place details by place ID
 *     tags: [Maps]
 *     security:
 *       - bearerAuth: []
 */
router.get('/place/:placeId', mapsController.getPlaceDetails);

export default router;
