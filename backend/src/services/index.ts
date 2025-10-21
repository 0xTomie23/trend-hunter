import { SimpleTokenMonitor } from './simple-token-monitor';
import { ChainDataService } from './chain-data';
import { HeliusTokenFetcher } from './helius-token-fetcher';
import { logger } from '../utils/logger';
import cron from 'node-cron';

let tokenMonitor: SimpleTokenMonitor;
let chainDataService: ChainDataService;
let heliusFetcher: HeliusTokenFetcher | null = null;

/**
 * 初始化所有服务
 */
export async function initializeServices() {
  logger.info('Initializing services...');
  
  // 初始化代币监控服务（基于链上数据）
  tokenMonitor = new SimpleTokenMonitor();
  
  // 初始化链上数据服务
  chainDataService = new ChainDataService();
  
  // 初始化 Helius Fetcher（如果有 API Key）
  if (process.env.HELIUS_API_KEY) {
    heliusFetcher = new HeliusTokenFetcher(process.env.HELIUS_API_KEY);
  }
  
  // 设置定时任务
  scheduleJobs();
  
  logger.info('Services initialized successfully');
}

/**
 * 设置定时任务
 */
function scheduleJobs() {
  // 监控新代币并聚类 - 每5分钟
  cron.schedule('*/5 * * * *', async () => {
    logger.info('🔍 Running token monitoring job');
    try {
      await tokenMonitor.monitorNewTokens();
    } catch (error) {
      logger.error('Token monitoring job failed:', error);
    }
  });
  
  // 更新活跃代币市场数据 - 每2分钟
  cron.schedule('*/2 * * * *', async () => {
    logger.info('📊 Running market data update job');
    try {
      await chainDataService.updateActiveTokens();
    } catch (error) {
      logger.error('Market data update job failed:', error);
    }
  });
  
  // 更新持有人数据 - 每30分钟（使用 Helius）
  if (heliusFetcher) {
    cron.schedule('*/30 * * * *', async () => {
      logger.info('👥 Running holder data update job');
      try {
        await updateHolderData();
      } catch (error) {
        logger.error('Holder data update job failed:', error);
      }
    });
  }
  
  logger.info('Cron jobs scheduled');
}

/**
 * 更新活跃代币的持有人数据
 */
async function updateHolderData() {
  if (!heliusFetcher) return;
  
  // 获取最近24小时的活跃代币
  const activeMatches = await import('../lib/prisma').then(m => m.prisma.topicTokenMatch.findMany({
    where: {
      matchedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    },
    include: { token: true },
    orderBy: { matchedAt: 'desc' },
    take: 20  // 限制数量，避免超配额
  }));
  
  for (const match of activeMatches) {
    try {
      const holderCount = await heliusFetcher.getHolderCount(match.token.mintAddress);
      const txCount = await heliusFetcher.getTransactionCount(match.token.mintAddress);
      
      // 更新到最新的市场数据
      await import('../lib/prisma').then(m => m.prisma.tokenMarketData.updateMany({
        where: {
          tokenId: match.token.id,
          timestamp: {
            gte: new Date(Date.now() - 5 * 60 * 1000)  // 最近5分钟的数据
          }
        },
        data: {
          holderCount,
          transactionCount24h: txCount
        }
      }));
      
      logger.info(`Updated ${match.token.symbol}: holders=${holderCount}, tx=${txCount}`);
      
      // 限流
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error(`Failed to update holder data for ${match.token.symbol}:`, error);
    }
  }
}

export { tokenMonitor, chainDataService, heliusFetcher };

