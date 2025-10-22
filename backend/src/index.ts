import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { connectDatabase, disconnectDatabase } from './lib/database';
import { initializeServices } from './services';
import apiRoutes from './routes';
import triggerRoutes from './routes/manual-trigger';
import demoRoutes from './routes/demo';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', apiRoutes);
app.use('/api/trigger', triggerRoutes);
app.use('/api/demo', demoRoutes);  // 演示路由（无需数据库）

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('subscribe:topics', () => {
    socket.join('hot-topics');
    logger.info(`Client ${socket.id} subscribed to hot-topics`);
  });
  
  socket.on('subscribe:token', (mintAddress: string) => {
    socket.join(`token:${mintAddress}`);
    logger.info(`Client ${socket.id} subscribed to token:${mintAddress}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Export io for use in services
export { io };

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // 连接数据库
    try {
      await connectDatabase();
      logger.info('✅ Database connected successfully');
    } catch (dbError) {
      logger.warn('⚠️ Database connection failed, running in demo mode');
    }
    
    // Initialize services (即使数据库失败也继续)
    try {
      await initializeServices();
    } catch (serviceError) {
      logger.warn('Services initialization failed, some features may be limited');
    }
    
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`📊 Database API available at: http://localhost:${PORT}/api`);
      logger.info(`🎮 Demo API available at: http://localhost:${PORT}/api/demo`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await disconnectDatabase();
  process.exit(0);
});

start();

