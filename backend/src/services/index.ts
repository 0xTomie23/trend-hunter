import { SimpleTokenMonitor } from './simple-token-monitor';
import { BirdeyeService } from './birdeye-service';
import { logger } from '../utils/logger';
import cron from 'node-cron';

let tokenMonitor: SimpleTokenMonitor;
let birdeyeService: BirdeyeService;

/**
 * 初始化所有服务
 */
export async function initializeServices() {
  logger.info('Initializing services...');
  
  // 初始化 Birdeye API 服务
  birdeyeService = new BirdeyeService();
  
  // 初始化代币监控服务
  tokenMonitor = new SimpleTokenMonitor();
  
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
  
  // 更新活跃代币数据 - 每2分钟（使用 Birdeye）
  cron.schedule('*/2 * * * *', async () => {
    logger.info('📊 Running market data update job');
    try {
      await updateActiveTokensData();
    } catch (error) {
      logger.error('Market data update job failed:', error);
    }
  });
  
  logger.info('Cron jobs scheduled');
}

/**
 * 更新活跃代币的市场数据
 */
async function updateActiveTokensData() {
  const { prisma } = await import('../lib/prisma');
  
  // 获取最近24小时的活跃代币
  const activeMatches = await prisma.topicTokenMatch.findMany({
    where: {
      matchedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    },
    include: { token: true },
    orderBy: { matchedAt: 'desc' },
    take: 20  // 限制数量
  });
  
  for (const match of activeMatches) {
    try {
      // 使用 Birdeye 获取完整信息
      const fullInfo = await birdeyeService.getTokenFullInfo(match.token.mintAddress);
      
      if (!fullInfo) continue;
      
      // 更新市场数据
      await prisma.tokenMarketData.create({
        data: {
          tokenId: match.token.id,
          price: fullInfo.price,
          marketCap: fullInfo.marketCap,
          liquidityUsd: fullInfo.liquidity,
          volume24h: fullInfo.volume24h,
          priceChange24h: fullInfo.priceChange24h,
          holderCount: fullInfo.holderCount,
          transactionCount24h: fullInfo.transactionCount24h,
          fdv: fullInfo.fdv
        }
      });
      
      logger.info(
        `Updated ${match.token.symbol}: $${fullInfo.price}, MC: $${fullInfo.marketCap}, holders: ${fullInfo.holderCount}`
      );
      
      // 限流：Birdeye 免费版有限制
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      logger.error(`Failed to update ${match.token.symbol}:`, error);
    }
  }
}

export { tokenMonitor, birdeyeService };

