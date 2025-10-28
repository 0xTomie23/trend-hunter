import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { birdeyeService, multiApiService } from './index';

/**
 * Birdeye 数据获取服务
 * 每秒从 Birdeye 获取新代币数据并保存到数据库
 */
export class BirdeyeFetcher {
  private readonly FETCH_INTERVAL = 1000; // 1秒
  private isFetching = false;
  private lastFetchTime: number = 0;
  
  constructor() {
    logger.info('📥 Birdeye Fetcher initialized (1 req/sec)');
  }
  
  /**
   * 启动定期获取
   */
  async start() {
    logger.info('🚀 Starting Birdeye fetcher (1 req/sec)...');
    
    // 立即执行一次
    this.fetchNewTokens();
    
    // 每秒执行一次
    setInterval(() => {
      this.fetchNewTokens();
    }, this.FETCH_INTERVAL);
  }
  
  /**
   * 获取新代币
   */
  private async fetchNewTokens() {
    if (this.isFetching) {
      logger.warn('⏭️ Skipping fetch - previous fetch still processing');
      return;
    }
    
    this.isFetching = true;
    
    try {
      const now = Date.now();
      const hours = 0.1; // 最近 6 分钟（0.1 小时）
      
      logger.info('🔍 Fetching new tokens from Birdeye...');
      
      // 1. 从 Birdeye 获取新代币（最近几分钟）
      const newTokens = await birdeyeService.getRecentTokens(hours);
      
      if (newTokens.length === 0) {
        logger.info('📭 No new tokens from Birdeye');
        this.isFetching = false;
        return;
      }
      
      logger.info(`📦 Found ${newTokens.length} new tokens from Birdeye`);
      
      // 只保存基本信息：name, symbol, mintAddress
      // 用于聚类算法，不需要完整数据
      const savedTokens = await this.saveTokensForClustering(newTokens);
      
      if (savedTokens.length > 0) {
        logger.info(`✅ Saved ${savedTokens.length} tokens for clustering`);
        
        // 显示部分代币信息
        savedTokens.slice(0, 3).forEach(token => {
          logger.info(`  💎 ${token.symbol}: ${token.name}`);
        });
      }
      
      this.lastFetchTime = now;
      
    } catch (error) {
      logger.error('❌ Failed to fetch tokens from Birdeye:', error);
    } finally {
      this.isFetching = false;
    }
  }
  
  /**
   * 保存代币到数据库（仅基本信息，用于聚类）
   * 只保存 name 和 symbol，不需要其他市场数据
   */
  private async saveTokensForClustering(tokens: any[]): Promise<any[]> {
    const saved = [];
    
    for (const tokenData of tokens) {
      if (!tokenData.mintAddress) continue;
      
      try {
        // 检查是否已存在
        let token = await prisma.token.findUnique({
          where: { mintAddress: tokenData.mintAddress },
        });
        
        if (!token) {
          // 创建新代币（只保存基本信息）
          token = await prisma.token.create({
            data: {
              mintAddress: tokenData.mintAddress,
              name: tokenData.name || 'Unknown',
              symbol: tokenData.symbol || '???',
              decimals: 9,
              logoUri: tokenData.logoUri || null,
            },
          });
        }
        
        saved.push(token);
        
      } catch (error) {
        logger.error(`Failed to save token ${tokenData.symbol}:`, error);
      }
    }
    
    return saved;
  }
}

