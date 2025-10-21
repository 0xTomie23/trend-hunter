import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { io } from '../index';
import { ChineseSimilarityV2 } from '../utils/chinese-similarity-v2';
import stringSimilarity from 'string-similarity';
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
      
      // 3. 聚类分析 - 找出相似代币（至少3个）
      const clusters = this.findSimilarTokens(savedTokens);
      
      if (clusters.length === 0) {
        logger.info('No clusters with 3+ tokens found');
        return;
      }
      
      logger.info(`Found ${clusters.length} clusters with ${this.MIN_CLUSTER_SIZE}+ tokens`);
      
      // 4. 生成热点话题
      await this.createHotTopics(clusters);
      
      logger.info(`✅ Created ${clusters.length} hot topics`);
      
    } catch (error) {
      logger.error('❌ Monitor error:', error);
    }
  }
  
  /**
   * 从 DexScreener 获取最近的代币
   */
  private async fetchRecentTokens(): Promise<any[]> {
    try {
      // 方案1: 获取最新交易对
      const response = await axios.get(
        'https://api.dexscreener.com/latest/dex/pairs/solana',
        { timeout: 10000 }
      );
      
      const pairs = response.data?.pairs || [];
      
      // 只要最近6小时创建的（增加时间范围以获取更多代币）
      const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
      const recentPairs = pairs
        .filter((pair: any) => {
          const createdAt = pair.pairCreatedAt || 0;
          return createdAt > sixHoursAgo;
        })
        .filter((pair: any) => {
          // 过滤掉质量太低的代币
          const liquidity = pair.liquidity?.usd || 0;
          return liquidity > 1000;  // 至少$1000流动性
        })
        .slice(0, 100); // 增加数量限制
      
      return recentPairs.map((pair: any) => ({
        mintAddress: pair.baseToken?.address,
        name: pair.baseToken?.name || 'Unknown',
        symbol: pair.baseToken?.symbol || '???',
        logoUri: pair.info?.imageUrl,
        price: pair.priceUsd,
        marketCap: pair.marketCap,
        liquidity: pair.liquidity?.usd,
        volume24h: pair.volume?.h24,
        priceChange24h: pair.priceChange?.h24,
        createdAt: pair.pairCreatedAt || Date.now()
      }));
      
    } catch (error) {
      logger.error('Failed to fetch from DexScreener:', error);
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
  
  /**
   * 核心算法：找出相似的代币并分组
   */
  private findSimilarTokens(tokens: any[]): any[][] {
    if (tokens.length < 2) return [];
    
    const clusters: any[][] = [];
    const processed = new Set<number>();
    
    for (let i = 0; i < tokens.length; i++) {
      if (processed.has(tokens[i].id)) continue;
      
      const cluster = [tokens[i]];
      processed.add(tokens[i].id);
      
      for (let j = i + 1; j < tokens.length; j++) {
        if (processed.has(tokens[j].id)) continue;
        
        // 计算相似度
        const similarity = this.calculateSimilarity(tokens[i], tokens[j]);
        
        // 相似度阈值
        if (similarity > 0.55) {
          cluster.push(tokens[j]);
          processed.add(tokens[j].id);
          
          logger.info(
            `🔗 Matched: ${tokens[i].symbol} <-> ${tokens[j].symbol} (${similarity.toFixed(2)})`
          );
        }
      }
      
      // 只保留有3个以上代币的聚类（确认是热点）
      if (cluster.length >= this.MIN_CLUSTER_SIZE) {
        clusters.push(cluster);
        logger.info(`📦 Found cluster with ${cluster.length} tokens`);
      }
    }
    
    return clusters;
  }
  
  /**
   * 计算两个代币的相似度
   * 支持中文音近字识别
   */
  private calculateSimilarity(token1: any, token2: any): number {
    const name1 = token1.name;
    const name2 = token2.name;
    
    // 检测是否包含中文
    const hasChinese1 = /[\u4e00-\u9fa5]/.test(name1);
    const hasChinese2 = /[\u4e00-\u9fa5]/.test(name2);
    
    // 如果都包含中文，使用中文优化算法
    if (hasChinese1 && hasChinese2) {
      return ChineseSimilarityV2.calculate(name1, name2);
    }
    
    // 否则使用标准算法
    const symbolSim = stringSimilarity.compareTwoStrings(
      this.normalize(token1.symbol),
      this.normalize(token2.symbol)
    );
    
    const nameSim = stringSimilarity.compareTwoStrings(
      this.normalize(token1.name),
      this.normalize(token2.name)
    );
    
    const keywords1 = this.extractKeywords(token1);
    const keywords2 = this.extractKeywords(token2);
    const commonKeywords = keywords1.filter(k => keywords2.includes(k));
    const keywordScore = commonKeywords.length > 0 ? 0.4 : 0;
    
    const name1Norm = this.normalize(token1.name);
    const name2Norm = this.normalize(token2.name);
    
    let containsBonus = 0;
    if (name1Norm.includes(name2Norm) || name2Norm.includes(name1Norm)) {
      containsBonus = 0.2;
    }
    
    return symbolSim * 0.5 + nameSim * 0.3 + keywordScore * 0.15 + containsBonus * 0.05;
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
  
  /**
   * 为聚类创建热点话题
   */
  private async createHotTopics(clusters: any[][]) {
    for (const cluster of clusters) {
      try {
        // 1. 找出最具代表性的关键词
        const keyword = this.findBestKeyword(cluster);
        
        if (!keyword) continue;
        
        // 2. 计算热度分数
        const hotScore = this.calculateHotScore(cluster);
        
        // 3. 创建或更新话题
        const now = new Date();
        let topic = await prisma.hotTopic.findFirst({
          where: { keyword }
        });
        
        if (!topic) {
          topic = await prisma.hotTopic.create({
            data: {
              keyword,
              totalMentions: cluster.length,
              hotScore,
              firstSeenAt: now,
              lastSeenAt: now
            }
          });
          
          logger.info(`🔥 New hot topic: ${keyword} (${cluster.length} tokens)`);
        } else {
          topic = await prisma.hotTopic.update({
            where: { id: topic.id },
            data: {
              totalMentions: Math.max(topic.totalMentions, cluster.length),
              hotScore: Math.max(topic.hotScore, hotScore),
              lastSeenAt: now
            }
          });
        }
        
        // 4. 关联代币
        for (const token of cluster) {
          await prisma.topicTokenMatch.upsert({
            where: {
              topicId_tokenId: {
                topicId: topic.id,
                tokenId: token.id
              }
            },
            create: {
              topicId: topic.id,
              tokenId: token.id,
              matchScore: 0.85,
              matchType: 'cluster'
            },
            update: {
              matchScore: 0.85
            }
          });
        }
        
        // 5. 计算聚类的总体数据
        const totalMarketCap = cluster.reduce((sum, t) => 
          sum + (t.marketData?.[0]?.marketCap ? Number(t.marketData[0].marketCap) : 0), 0
        );
        const totalLiquidity = cluster.reduce((sum, t) => 
          sum + (t.marketData?.[0]?.liquidityUsd ? Number(t.marketData[0].liquidityUsd) : 0), 0
        );
        const totalVolume = cluster.reduce((sum, t) => 
          sum + (t.marketData?.[0]?.volume24h ? Number(t.marketData[0].volume24h) : 0), 0
        );
        
        logger.info(
          `🔥 Topic "${keyword}": ${cluster.length} tokens, MC: $${this.formatNumber(totalMarketCap)}, Liquidity: $${this.formatNumber(totalLiquidity)}`
        );
        
        // 6. 广播更新
        io.to('hot-topics').emit('new_topic', {
          topic,
          tokenCount: cluster.length,
          totalMarketCap,
          totalLiquidity,
          totalVolume,
          tokens: cluster.map(t => ({
            id: t.id,
            symbol: t.symbol,
            name: t.name,
            mintAddress: t.mintAddress,
            price: t.marketData?.[0]?.price,
            marketCap: t.marketData?.[0]?.marketCap,
            liquidity: t.marketData?.[0]?.liquidityUsd,
            volume24h: t.marketData?.[0]?.volume24h,
            priceChange24h: t.marketData?.[0]?.priceChange24h,
            holderCount: t.marketData?.[0]?.holderCount
          }))
        });
        
      } catch (error) {
        logger.error('Failed to create hot topic:', error);
      }
    }
  }
  
  /**
   * 从聚类中找出最佳关键词作为话题名
   */
  private findBestKeyword(cluster: any[]): string {
    // 收集所有关键词
    const allKeywords: string[] = [];
    cluster.forEach(token => {
      allKeywords.push(...this.extractKeywords(token));
    });
    
    // 统计频率
    const freq: Record<string, number> = {};
    allKeywords.forEach(kw => {
      freq[kw] = (freq[kw] || 0) + 1;
    });
    
    // 找出最高频的关键词
    let bestKeyword = '';
    let maxFreq = 0;
    
    for (const [kw, count] of Object.entries(freq)) {
      // 过滤掉太短或太常见的词
      if (kw.length < 2 || ['coin', 'token', '币'].includes(kw)) {
        continue;
      }
      
      if (count > maxFreq) {
        maxFreq = count;
        bestKeyword = kw;
      }
    }
    
    // 如果没找到，用第一个代币的symbol
    return bestKeyword || cluster[0].symbol.toLowerCase();
  }
  
  /**
   * 计算聚类的热度分数
   */
  private calculateHotScore(cluster: any[]): number {
    // 1. 代币数量分数
    const quantityScore = cluster.length * 15;
    
    // 2. 市值分数（对数缩放）
    const totalMarketCap = cluster.reduce(
      (sum, token) => sum + (token.marketData?.[0]?.marketCap || 0),
      0
    );
    const marketCapScore = Math.log10(Math.max(totalMarketCap, 1)) * 8;
    
    // 3. 流动性分数
    const totalLiquidity = cluster.reduce(
      (sum, token) => sum + (token.marketData?.[0]?.liquidityUsd || 0),
      0
    );
    const liquidityScore = Math.log10(Math.max(totalLiquidity, 1)) * 5;
    
    // 4. 时间因素（越新越热）
    const avgAge = cluster.reduce((sum, token) => {
      const age = Date.now() - (token.tokenCreatedAt?.getTime() || Date.now());
      return sum + age;
    }, 0) / cluster.length;
    
    const hoursSinceCreation = avgAge / (60 * 60 * 1000);
    const timeScore = Math.max(0, 50 - hoursSinceCreation * 2);
    
    return Math.round(quantityScore + marketCapScore + liquidityScore + timeScore);
  }
}

