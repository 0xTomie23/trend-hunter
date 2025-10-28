import { TokenClusteringMonitor } from './token-clustering-monitor';
import { HighFrequencyMonitor } from './high-frequency-monitor';
import { BirdeyeFetcher } from './birdeye-fetcher';
import { DexScreenerFetcher } from './dexscreener-fetcher';
import { BirdeyeService } from './birdeye-service';
import { MultiApiService } from './multi-api-service';
import { ClusteringService } from './clustering-service';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';
import cron from 'node-cron';

let tokenMonitor: TokenClusteringMonitor;
let highFrequencyMonitor: HighFrequencyMonitor;
let birdeyeFetcher: BirdeyeFetcher;
let dexscreenerFetcher: DexScreenerFetcher;
let birdeyeService: BirdeyeService;
let multiApiService: MultiApiService;
let clusteringService: ClusteringService;

export async function initializeServices() {
  logger.info('Initializing services...');
  
  multiApiService = new MultiApiService();
  birdeyeService = new BirdeyeService();
  clusteringService = new ClusteringService();
  
  const isHealthy = await clusteringService.healthCheck();
  if (!isHealthy) {
    logger.warn('⚠️ Clustering service is not available');
  }
  
  tokenMonitor = new TokenClusteringMonitor();
  dexscreenerFetcher = new DexScreenerFetcher();
  
  dexscreenerFetcher.setNewTokensCallback(async (newTokens) => {
    try {
      logger.info(`Real-time clustering triggered for ${newTokens.length} new tokens`);
      await tokenMonitor.monitorNewTokens();
    } catch (error) {
      logger.error('Real-time clustering failed:', error);
    }
  });
  
  await dexscreenerFetcher.start();
  
  highFrequencyMonitor = new HighFrequencyMonitor();
  await highFrequencyMonitor.start();
  
  scheduleJobs();
  logger.info('Services initialized successfully');
}

function scheduleJobs() {
  cron.schedule('*/10 * * * *', async () => {
    logger.info('Periodic clustering check');
    try {
      await tokenMonitor.monitorNewTokens();
    } catch (error) {
      logger.error('Periodic clustering check failed:', error);
    }
  });
  
  cron.schedule('*/30 * * * * *', async () => {
    logger.info('Refreshing topic tokens');
    try {
      await refreshAllTopicTokensData();
    } catch (error) {
      logger.error('Topic tokens refresh failed:', error);
    }
  });
  
  cron.schedule('*/30 * * * * *', async () => {
    logger.info('Market data update');
    try {
      await updateActiveTokensDataMultiApi();
    } catch (error) {
      logger.error('Market data update failed:', error);
    }
  });
  
  logger.info('Cron jobs scheduled');
}

/**
 * 计算代币的优先级分数（基于LP、市值等）
 */
function calculateTokenPriority(liquidity: number, marketCap: number, volume24h: number): number {
  // 流动性权重最高（40%）
  const liquidityScore = liquidity > 0 ? 1 : 0;
  
  // 市值权重（30%）
  const marketCapScore = marketCap > 100000 ? 1 : marketCap > 10000 ? 0.5 : 0;
  
  // 交易量权重（30%）
  const volumeScore = volume24h > 100000 ? 1 : volume24h > 10000 ? 0.5 : 0;
  
  return liquidityScore * 0.4 + marketCapScore * 0.3 + volumeScore * 0.3;
}

/**
 * 获取代币的价值等级（用于分配刷新频率）
 */
function getTokenRefreshRate(liquidity: number, marketCap: number, volume24h: number): 'high' | 'medium' | 'low' | 'skip' {
  const priority = calculateTokenPriority(liquidity, marketCap, volume24h);
  
  // 只要不是所有数据都是0，就至少给一个低优先级
  if (liquidity === 0 && marketCap === 0 && volume24h === 0) return 'low'; // 给所有代币至少一次刷新机会
  if (priority >= 0.8) return 'high';      // 高优先级：每秒刷新
  if (priority >= 0.4) return 'medium';     // 中优先级：每5秒刷新
  if (priority > 0) return 'low';          // 低优先级：每30秒刷新
  return 'low';                             // 给低优先级而不是跳过
}

/**
 * 使用多API服务更新活跃代币的市场数据（智能优先级策略）
 */
async function updateActiveTokensDataMultiApi() {
  const { prisma } = await import('../lib/database');
  
  try {
    // 获取所有代币及其最新市场数据
    // 简化查询，不筛选
    const allTopicsWithTokens = await prisma.topic.findMany({
      include: {
        tokens: {
          include: {
            token: true
          }
        }
      }
    });
    
    // 收集所有代币及其最新市场数据
    const tokensWithData = [];
    for (const topic of allTopicsWithTokens) {
      for (const topicToken of topic.tokens) {
        const latestData = await prisma.tokenMarketData.findFirst({
          where: { tokenId: topicToken.token.id },
          orderBy: { timestamp: 'desc' }
        });
        
        if (latestData) {
          tokensWithData.push({
            token: topicToken.token,
            data: latestData,
            topicId: topic.id
          });
        }
      }
    }
    
    // 去重
    const uniqueTokens = tokensWithData.filter((item, index, self) => 
      index === self.findIndex(t => t.token.id === item.token.id)
    );
    
    if (uniqueTokens.length === 0) return;
    
    // 根据价值分配刷新频率
    const currentTime = Date.now();
    const tokensToUpdate = uniqueTokens.filter(item => {
      const liq = item.data.liquidity || 0;
      const mcap = item.data.marketCap || 0;
      const vol = item.data.volume24h || 0;
      
      const rate = getTokenRefreshRate(liq, mcap, vol);
      if (rate === 'skip') return false;
      
      const lastUpdate = new Date(item.data.timestamp).getTime();
      const timeSinceUpdate = currentTime - lastUpdate;
      
      // 如果流动性为0，减少刷新频率（每60秒一次）
      if (liq === 0) {
        return timeSinceUpdate >= 60000;
      }
      
      // 根据刷新频率决定是否更新
      switch (rate) {
        case 'high':
          return timeSinceUpdate >= 1000;    // 每秒刷新
        case 'medium':
          return timeSinceUpdate >= 5000;   // 每5秒刷新
        case 'low':
          return timeSinceUpdate >= 30000;  // 每30秒刷新
        default:
          return false;
      }
    });
    
    if (tokensToUpdate.length === 0) {
      logger.info('📊 No tokens need refreshing at this time');
      return;
    }
    
    // 按优先级排序，限制更新数量（每秒最多4个）
    tokensToUpdate.sort((a, b) => {
      const priorityA = calculateTokenPriority(a.data.liquidity || 0, a.data.marketCap || 0, a.data.volume24h || 0);
      const priorityB = calculateTokenPriority(b.data.liquidity || 0, b.data.marketCap || 0, b.data.volume24h || 0);
      return priorityB - priorityA;
    });
    
    const tokensToUpdateNow = tokensToUpdate.slice(0, 4); // 每秒最多4个
    
    logger.info(`📊 Multi-API updating ${tokensToUpdateNow.length} high-priority tokens (${tokensToUpdate.length} total need refresh)`);
    
    // 使用多API服务批量更新
    const results = await multiApiService.getBatchTokenInfo(
      tokensToUpdateNow.map(t => t.token.mintAddress)
    );
    
    for (let i = 0; i < results.length; i++) {
      const fullInfo = results[i];
      const item = tokensToUpdateNow[i];
      
      if (!fullInfo || !item) continue;
      
      try {
        // 获取最新数据
        const latestData = await prisma.tokenMarketData.findFirst({
          where: { tokenId: item.token.id },
          orderBy: { timestamp: 'desc' }
        });
        
        // 检查是否有有效的历史价格数据
        const hasValidPrice = latestData && latestData.price && latestData.price > 0;
        
        // 如果新价格为0，但有有效历史价格，保留历史价格
        if (fullInfo.price === 0 && hasValidPrice) {
          logger.info(`⏭️ Skipping update for ${item.token.symbol} (new price is 0, keeping existing: $${latestData.price})`);
          continue;
        }
        
        // 如果新数据全部为0，且没有有效历史数据，也不创建记录
        if (fullInfo.price === 0 && fullInfo.marketCap === 0 && fullInfo.volume24h === 0 && fullInfo.liquidity === 0) {
          logger.info(`⏭️ Skipping update for ${item.token.symbol} (all data is 0, no existing data)`);
          continue;
        }
        
        // 创建新记录，直接使用API返回的数据
        await prisma.tokenMarketData.create({
          data: {
            tokenId: item.token.id,
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
        
        const priority = getTokenRefreshRate(fullInfo.liquidity, fullInfo.marketCap, fullInfo.volume24h);
        logger.info(`✅ ${fullInfo.source} updated ${item.token.symbol}: $${fullInfo.price?.toFixed(6)} (${fullInfo.priceChange24h?.toFixed(2)}%) [${priority}]`);
        
      } catch (error) {
        logger.error(`❌ Failed to update ${item.token.symbol}:`, error);
      }
    }
    
    logger.info(`📊 Updated ${results.length} tokens (High: ${tokensToUpdate.filter(t => getTokenRefreshRate(t.data.liquidity || 0, t.data.marketCap || 0, t.data.volume24h || 0) === 'high').length}, Medium: ${tokensToUpdate.filter(t => getTokenRefreshRate(t.data.liquidity || 0, t.data.marketCap || 0, t.data.volume24h || 0) === 'medium').length}, Low: ${tokensToUpdate.filter(t => getTokenRefreshRate(t.data.liquidity || 0, t.data.marketCap || 0, t.data.volume24h || 0) === 'low').length})`);
  } catch (error) {
    logger.error('Failed to update active tokens data:', error);
  }
}

/**
 * 更新活跃代币的市场数据（备用方法）
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

/**
 * 刷新所有主题中代币的市场数据
 */
async function refreshAllTopicTokensData() {
  try {
    // 获取所有主题
    const allTopics = await prisma.topic.findMany({
      include: {
        tokens: {
          include: { token: true },
        },
      },
    });
    
    // 刷新所有主题（不区分自动/手动）
    if (allTopics.length === 0) {
      logger.info('No topics to refresh');
      return;
    }
    
    logger.info(`Refreshing ${allTopics.length} topics...`);
    
    for (const topic of allTopics) {
      await tokenMonitor.refreshTopicTokensData(topic.id);
    }
    
  } catch (error) {
    logger.error('Failed to refresh all topics:', error);
  }
}

export { tokenMonitor, highFrequencyMonitor, dexscreenerFetcher, birdeyeService, multiApiService, clusteringService };

