import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// 全局 Prisma 客户端实例
let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  return prisma;
}

// 数据库连接管理
export async function connectDatabase() {
  try {
    const client = getPrismaClient();
    await client.$connect();
    logger.info('✅ Database connected successfully');
    return client;
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    if (prisma) {
      await prisma.$disconnect();
      logger.info('✅ Database disconnected successfully');
    }
  } catch (error) {
    logger.error('❌ Database disconnection failed:', error);
  }
}

// 数据库健康检查
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('❌ Database health check failed:', error);
    return false;
  }
}

export { prisma };
