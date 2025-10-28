import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import axios from 'axios';

/**
 * DexScreener 数据获取服务
 * 每秒从 DexScreener 获取新代币数据并保存到数据库
 * 替代 Birdeye API（因为 Birdeye 需要付费订阅）
 */
export class DexScreenerFetcher {
  private readonly FETCH_INTERVAL = 1000; // 1秒
  private isFetching = false;
  private lastFetchTime: number = 0;
  private processedTokens = new Set<string>(); // 记录已处理的代币
  private onNewTokensCallback: ((tokens: any[]) => void) | null = null;
  
  constructor() {
    logger.info('📥 DexScreener Fetcher initialized (1 req/sec)');
  }
  
  /**
   * 设置新代币回调函数（用于实时触发聚类）
   */
  setNewTokensCallback(callback: (tokens: any[]) => void) {
    this.onNewTokensCallback = callback;
    logger.info('✅ Real-time clustering callback registered');
  }
  
  /**
   * 启动定期获取
   */
  async start() {
    logger.info('🚀 Starting DexScreener fetcher (1 req/sec)...');
    
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
      
      logger.info('🔍 Fetching new tokens from DexScreener...');
      
      // DexScreener API: 搜索 Solana 链上的交易对
      // 使用搜索功能获取最新代币
      const response = await axios.get(
        'https://api.dexscreener.com/latest/dex/search/?q=solana',
        { timeout: 10000 }
      );
      
      if (!response.data || !response.data.pairs) {
        logger.info('📭 No data from DexScreener');
        this.isFetching = false;
        return;
      }
      
      const pairs = response.data.pairs || [];
      
      // 不按时间过滤，直接取前20个
      // DexScreener 返回的已经是按时间排序的最新代币
      const recentPairs = pairs.slice(0, 20);
      
      logger.info(`📦 Found ${recentPairs.length} recent pairs from DexScreener`);
      
      if (recentPairs.length === 0) {
        logger.info('📭 No new tokens in last 10 minutes');
        this.isFetching = false;
        return;
      }
      
      // 提取代币信息
      const newTokens = recentPairs
        .map((pair: any) => ({
          mintAddress: pair.baseToken?.address,
          name: pair.baseToken?.name || 'Unknown',
          symbol: pair.baseToken?.symbol || '???',
          logoUri: pair.info?.imageUrl || null,
        }))
        .filter((token: any) => token.mintAddress && !this.processedTokens.has(token.mintAddress));
      
      if (newTokens.length === 0) {
        logger.info('📭 No new unique tokens');
        this.isFetching = false;
        return;
      }
      
      logger.info(`💎 Found ${newTokens.length} new unique tokens`);
      
      // 保存到数据库
      const savedTokens = await this.saveTokensForClustering(newTokens);
      
      if (savedTokens.length > 0) {
        logger.info(`✅ Saved ${savedTokens.length} tokens for clustering`);
        
        // 显示部分代币信息
        savedTokens.slice(0, 3).forEach(token => {
          logger.info(`  💎 ${token.symbol}: ${token.name}`);
        });
        
        // 标记为已处理
        savedTokens.forEach(token => {
          this.processedTokens.add(token.mintAddress);
        });
        
        // 🚀 实时触发聚类回调
        if (this.onNewTokensCallback) {
          logger.info('🚀 Triggering real-time clustering...');
          this.onNewTokensCallback(savedTokens);
        }
      }
      
      this.lastFetchTime = now;
      
    } catch (error: any) {
      logger.error(`❌ Failed to fetch tokens from DexScreener: ${error.message || error}`);
    } finally {
      this.isFetching = false;
    }
  }
  
  /**
   * 保存代币到数据库（仅基本信息，用于聚类）
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
          
          logger.info(`  ✨ New token: ${token.symbol} (${token.name})`);
        }
        
        saved.push(token);
        
      } catch (error: any) {
        logger.error(`Failed to save token ${tokenData.symbol}: ${error.message}`);
      }
    }
    
    return saved;
  }
}

