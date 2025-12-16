import { Router } from 'express';
import authRoutes from './auth.routes';
import reservationRoutes from './reservation.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/reservations', reservationRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
