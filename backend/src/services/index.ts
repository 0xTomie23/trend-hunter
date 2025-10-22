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
  
  // 更新活跃代币数据 - 每10秒（使用 Birdeye）
  cron.schedule('*/10 * * * * *', async () => {
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
  const { prisma } = await import('../lib/database');
  
  try {
    // 获取所有有代币的主题（限制数量避免API过载）
    const topicsWithTokens = await prisma.topic.findMany({
      where: {
        tokens: {
          some: {}
        }
      },
      include: {
        tokens: {
          include: {
            token: true
          },
          take: 3, // 每个主题最多3个代币
          orderBy: {
            addedAt: 'desc'
          }
        }
      },
      take: 5 // 最多5个主题
    });
    
    const tokensToUpdate = [];
    for (const topic of topicsWithTokens) {
      for (const topicToken of topic.tokens) {
        tokensToUpdate.push(topicToken.token);
      }
    }
    
    // 去重
    const uniqueTokens = tokensToUpdate.filter((token, index, self) => 
      index === self.findIndex(t => t.id === token.id)
    );
    
    logger.info(`📊 Updating ${uniqueTokens.length} tokens...`);
    
    for (const token of uniqueTokens) {
      try {
        // 使用 Birdeye 获取完整信息
        const fullInfo = await birdeyeService.getTokenFullInfo(token.mintAddress);
        
        if (!fullInfo) continue;
        
        // 更新市场数据
        await prisma.tokenMarketData.create({
          data: {
            tokenId: token.id,
            price: fullInfo.price,
            priceChange24h: fullInfo.priceChange24h,
            marketCap: fullInfo.marketCap,
            volume24h: fullInfo.volume24h,
            liquidity: fullInfo.liquidity,
            holderCount: fullInfo.holderCount || 0,
            transactionCount24h: fullInfo.transactionCount24h || 0,
            fdv: fullInfo.fdv
          }
        });
        
        logger.info(`✅ Updated ${token.symbol}: $${fullInfo.price?.toFixed(6)} (${fullInfo.priceChange24h?.toFixed(2)}%)`);
        
        // 限流：避免API过载
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        logger.error(`❌ Failed to update ${token.symbol}:`, error);
      }
    }
  } catch (error) {
    logger.error('Failed to update active tokens data:', error);
  }
}

export { tokenMonitor, birdeyeService };

