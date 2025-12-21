import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import prisma from './config/database';
import logger from './config/logger';
import { websocketService } from './services/websocket.service';

const PORT = env.PORT || 3000;

// Test database connection
async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  try {
    await connectDatabase();

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize WebSocket
    websocketService.initialize(httpServer);

    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📝 Environment: ${env.NODE_ENV}`);
      logger.info(`🌐 API Base URL: http://localhost:${PORT}/api/${env.API_VERSION}`);
      logger.info(`🔌 WebSocket available at: ws://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
