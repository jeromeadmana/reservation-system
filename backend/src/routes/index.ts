import { Router } from 'express';
import authRoutes from './auth.routes';
import reservationRoutes from './reservation.routes';
import adminRoutes from './admin.routes';
import chauffeurRoutes from './chauffeur.routes';
import mapsRoutes from './maps.routes';
import paymentRoutes from './payment.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/reservations', reservationRoutes);
router.use('/admin', adminRoutes);
router.use('/chauffeur', chauffeurRoutes);
router.use('/maps', mapsRoutes);
router.use('/payments', paymentRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
