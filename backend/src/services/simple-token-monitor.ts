import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { io } from '../index';
// import { ChineseSimilarityV2 } from '../utils/chinese-similarity-v2';  // TODO: 实现时取消注释
// import stringSimilarity from 'string-similarity';  // TODO: 实现时取消注释
import axios from 'axios';

/**
 * 代币监控服务
 * 核心功能：监控新代币 -> 聚类相似代币 -> 生成热点话题（至少3个代币）
 */
export class SimpleTokenMonitor {
  private MIN_CLUSTER_SIZE = 3;  // 最少3个代币才形成主题
  
  /**
   * 主函数：监控并处理新代币
   */
  async monitorNewTokens() {
    logger.info('🔍 Scanning for new tokens...');
    
    try {
      // 1. 获取最近的代币对
      const newTokens = await this.fetchRecentTokens();
      
      if (newTokens.length === 0) {
        logger.info('No new tokens found');
        return;
      }
      
      logger.info(`Found ${newTokens.length} tokens to process`);
      
      // 2. 保存到数据库并获取完整信息
      const savedTokens = await this.saveTokensWithFullInfo(newTokens);
      
      // ============================================
      // TODO: 主题匹配算法 
      // ============================================
      // 3. 聚类分析 - 找出相似代币（至少3个）
      // const clusters = this.findSimilarTokens(savedTokens);
      
      // 4. 生成热点话题
      // await this.createHotTopics(clusters);
      
      logger.info(`✅ Processed ${savedTokens.length} tokens (主题匹配待实现)`);
      
    } catch (error) {
      logger.error('❌ Monitor error:', error);
    }
  }
  
  /**
   * 获取最近的代币（使用 Birdeye）
   */
  private async fetchRecentTokens(): Promise<any[]> {
    try {
      // ============================================
      // TODO: 调用 Birdeye API 获取新代币
      // ============================================
      const { birdeyeService } = await import('./index');
      const tokens = await birdeyeService.getRecentTokens(6);  // 最近6小时
      
      if (tokens && tokens.length > 0) {
        logger.info(`Fetched ${tokens.length} tokens from Birdeye`);
        return tokens;
      }
      
      // 降级方案：如果 Birdeye 失败，使用 DexScreener
      logger.warn('Birdeye failed, falling back to DexScreener');
      
      const response = await axios.get(
        'https://api.dexscreener.com/latest/dex/pairs/solana',
        { timeout: 10000 }
      );
      
      const pairs = response.data?.pairs || [];
      const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
      
      const recentPairs = pairs
        .filter((pair: any) => {
          const createdAt = pair.pairCreatedAt || 0;
          const liquidity = pair.liquidity?.usd || 0;
          return createdAt > sixHoursAgo && liquidity > 1000;
        })
        .slice(0, 100);
      
      return recentPairs.map((pair: any) => ({
        mintAddress: pair.baseToken?.address,
        name: pair.baseToken?.name || 'Unknown',
        symbol: pair.baseToken?.symbol || '???',
        logoUri: pair.info?.imageUrl,
        price: parseFloat(pair.priceUsd) || 0,
        marketCap: pair.marketCap || 0,
        liquidity: pair.liquidity?.usd || 0,
        volume24h: pair.volume?.h24 || 0,
        priceChange24h: pair.priceChange?.h24 || 0,
        createdAt: pair.pairCreatedAt || Date.now()
      }));
      
    } catch (error) {
      logger.error('Failed to fetch tokens:', error);
      return [];
    }
  }
  
  /**
   * 保存代币到数据库（带完整信息）
   */
  private async saveTokensWithFullInfo(tokens: any[]): Promise<any[]> {
    const saved = [];
    
    for (const tokenData of tokens) {
      if (!tokenData.mintAddress) continue;
      
      try {
        // 检查是否已存在
        let token = await prisma.token.findUnique({
          where: { mintAddress: tokenData.mintAddress },
          include: {
            marketData: {
              orderBy: { timestamp: 'desc' },
              take: 1
            }
          }
        });
        
        if (!token) {
          // 创建新代币
          token = await prisma.token.create({
            data: {
              mintAddress: tokenData.mintAddress,
              name: tokenData.name,
              symbol: tokenData.symbol,
              decimals: 9,
              logoUri: tokenData.logoUri,
              tokenCreatedAt: new Date(tokenData.createdAt)
            }
          });
          
          // 创建初始市场数据
          const marketData = await prisma.tokenMarketData.create({
            data: {
              tokenId: token.id,
              price: tokenData.price,
              marketCap: tokenData.marketCap,
              liquidityUsd: tokenData.liquidity,
              volume24h: tokenData.volume24h,
              priceChange24h: tokenData.priceChange24h,
              holderCount: 0  // 后续更新
            }
          });
          
          // 添加市场数据到返回对象
          token.marketData = [marketData];
          
          logger.info(`💎 New token: ${token.symbol} - ${token.name} (MC: $${this.formatNumber(tokenData.marketCap)})`);
        }
        
        saved.push(token);
        
      } catch (error) {
        logger.error(`Failed to save token ${tokenData.symbol}:`, error);
      }
    }
    
    return saved;
  }
  
  /**
   * 格式化数字
   */
  private formatNumber(num: number | null | undefined): string {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  }
  
  // ============================================
  // TODO: 主题匹配算法 
  // ============================================
  
  /**
   * TODO: 找出相似的代币并分组
   * 
   * 参数: tokens - 代币列表
   * 返回: 聚类数组，每个聚类至少3个代币
   * 
   * 实现思路：
   * 1. 两两计算相似度
   * 2. 相似度 > 阈值的归为一组
   * 3. 只保留 >= 3个代币的聚类
   */
  private findSimilarTokens(tokens: any[]): any[][] {
    // TODO: 实现聚类算法
    return [];
  }
  
  /**
   * TODO: 计算两个代币的相似度
   * 
   * 参数: token1, token2 - 代币对象
   * 返回: 0-1之间的相似度分数
   * 
   * 实现思路：
   * 1. 检测是否中文代币
   * 2. 中文：使用拼音匹配（ChineseSimilarityV2）
   * 3. 英文：使用 Symbol + Name 相似度
   */
  private calculateSimilarity(token1: any, token2: any): number {
    // TODO: 实现相似度计算
    return 0;
  }
  
  /**
   * 标准化字符串（处理大小写、特殊字符等）
   */
  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '')  // 只保留字母数字和中文
      .trim();
  }
  
  /**
   * 从代币信息中提取关键词
   */
  private extractKeywords(token: any): string[] {
    const keywords = new Set<string>();
    
    // 1. Symbol 本身
    if (token.symbol && token.symbol !== '???') {
      keywords.add(this.normalize(token.symbol));
    }
    
    // 2. 从 Name 中提取单词
    const cleanName = this.normalize(token.name);
    
    // 按常见分隔模式拆分
    const words = cleanName
      .split(/(?=[A-Z])|[\s_-]+/)  // 驼峰或空格/下划线分隔
      .filter(w => w.length >= 2);
    
    words.forEach(w => keywords.add(w));
    
    // 3. 提取常见 meme 关键词
    const memePatterns = [
      'pepe', 'doge', 'shib', 'inu', 'cat', 'frog', 'moon',
      'rocket', 'bonk', 'wojak', 'chad', 'giga', 'based'
    ];
    
    for (const pattern of memePatterns) {
      if (cleanName.includes(pattern)) {
        keywords.add(pattern);
      }
    }
    
    // 4. 提取中文关键词（2-4个字）
    const chineseWords = cleanName.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
    chineseWords.forEach(w => keywords.add(w));
    
    return Array.from(keywords);
  }
  
  // ============================================
  // TODO: 主题匹配算法 - 明天实现
  // ============================================
  
  /**
   * TODO: 为聚类创建热点话题
   * 
   * 参数: clusters - 聚类数组，每个聚类是代币数组
   * 
   * 实现步骤：
   * 1. 提取主题关键词（从代币名称中找最高频词）
   * 2. 计算热度分数（代币数 + 市值 + 流动性 + 时间）
   * 3. 创建 HotTopic 记录
   * 4. 创建 TopicTokenMatch 关联
   * 5. 推送到前端（Socket.io）
   * 
   * 数据示例：
   * cluster = [
   *   { name: "索拉拉", marketData: [{ marketCap: 50000 }] },
   *   { name: "锁啦啦", marketData: [{ marketCap: 60000 }] },
   *   { name: "索拉币", marketData: [{ marketCap: 40000 }] }
   * ]
   * 
   * 应该创建：
   * topic = {
   *   keyword: "索拉",
   *   totalMentions: 3,
   *   hotScore: 285
   * }
   */
  private async createHotTopics(clusters: any[][]) {
    // TODO: 实现热点话题生成
    logger.warn('⚠️  createHotTopics() 待实现');
  }
  
  /**
   * TODO: 提取主题关键词
   */
  private findBestKeyword(cluster: any[]): string {
    // TODO: 从聚类中提取最具代表性的关键词
    return '';
  }
  
  /**
   * TODO: 计算热度分数
   */
  private calculateHotScore(cluster: any[]): number {
    // TODO: 综合代币数、市值、流动性、时间等因素
    return 0;
  }
}

