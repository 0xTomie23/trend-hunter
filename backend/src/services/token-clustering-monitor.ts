import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { io } from '../index';
import { birdeyeService, clusteringService, multiApiService } from './index';

/**
 * 代币聚类监控服务
 * 核心功能：
 * 1. 从 Birdeye 获取新代币
 * 2. 使用 Python 聚类算法分析
 * 3. 自动创建主题（如果有3个或以上代币属于同一聚类）
 * 4. 关联代币到主题
 */
export class TokenClusteringMonitor {
  private MIN_CLUSTER_SIZE = 3; // 最少3个代币才自动创建主题
  private readonly PROCESSING_INTERVAL = 5 * 60 * 1000; // 5分钟
  
  /**
   * 主函数：监控新代币并自动聚类
   */
  async monitorNewTokens() {
    logger.info('🔍 Starting new token monitoring and clustering...');
    
    try {
      // 1. 从 Birdeye 获取新代币（最近6小时）
      const newTokens = await birdeyeService.getRecentTokens(6);
      
      if (newTokens.length === 0) {
        logger.info('No new tokens found');
        return;
      }
      
      logger.info(`Found ${newTokens.length} new tokens from Birdeye`);
      
      // 2. 保存代币到数据库
      const savedTokens = await this.saveTokens(newTokens);
      
      if (savedTokens.length === 0) {
        logger.info('No new tokens to process');
        return;
      }
      
      logger.info(`Processing ${savedTokens.length} new tokens...`);
      
      // 3. 准备聚类数据（只需要 name 和 symbol）
      const tokensForClustering = savedTokens.map(token => ({
        name: token.name,
        symbol: token.symbol,
      }));
      
      // 4. 调用 Python 聚类算法
      logger.info('📊 Calling Python clustering algorithm...');
      const clusters = await clusteringService.clusterTokens(tokensForClustering);
      
      logger.info(`✅ Got ${clusters.length} clusters from Python`);
      
      // 5. 筛选出符合条件的聚类（>= 3个代币）
      const validClusters = clusters.filter(
        cluster => cluster.tokens.length >= this.MIN_CLUSTER_SIZE
      );
      
      if (validClusters.length === 0) {
        logger.info('No clusters meet the minimum size requirement');
        return;
      }
      
      logger.info(`Found ${validClusters.length} valid clusters (>= ${this.MIN_CLUSTER_SIZE} tokens)`);
      
      // 6. 为每个聚类创建主题
      const createdTopics = [];
      
      for (const cluster of validClusters) {
        try {
          const topic = await this.createTopicFromCluster(cluster, savedTokens);
          if (topic) {
            createdTopics.push(topic);
            logger.info(`✅ Created topic: ${topic.name} (${cluster.tokens.length} tokens)`);
          }
        } catch (error) {
          logger.error(`Failed to create topic for cluster ${cluster.topic_id}:`, error);
        }
      }
      
      // 7. 通知前端（通过 Socket.io）
      if (createdTopics.length > 0) {
        logger.info(`🎉 Created ${createdTopics.length} new topics!`);
        io.to('hot-topics').emit('new_topics', {
          count: createdTopics.length,
          topics: createdTopics,
        });
      }
      
      logger.info(`✅ Monitoring completed: ${savedTokens.length} tokens processed, ${createdTopics.length} topics created`);
      
    } catch (error) {
      logger.error('❌ Monitoring error:', error);
    }
  }
  
  /**
   * 保存代币到数据库
   */
  private async saveTokens(tokens: any[]): Promise<any[]> {
    const saved = [];
    
    for (const tokenData of tokens) {
      if (!tokenData.mintAddress) continue;
      
      try {
        // 检查是否已存在
        let token = await prisma.token.findUnique({
          where: { mintAddress: tokenData.mintAddress },
        });
        
        if (!token) {
          // 创建新代币
          token = await prisma.token.create({
            data: {
              mintAddress: tokenData.mintAddress,
              name: tokenData.name || 'Unknown',
              symbol: tokenData.symbol || '???',
              decimals: 9,
              logoUri: tokenData.logoUri || null,
            },
          });
          
          logger.info(`💎 New token saved: ${token.name} (${token.symbol})`);
        }
        
        // 保存市场数据（只有在有有效数据时才保存，避免用0覆盖之前的有效数据）
        const hasValidData = tokenData.price > 0 || tokenData.marketCap > 0 || tokenData.liquidity > 0;
        if (hasValidData) {
          await prisma.tokenMarketData.create({
            data: {
              tokenId: token.id,
              price: tokenData.price || 0,
              priceChange24h: tokenData.priceChange24h || 0,
              marketCap: tokenData.marketCap || 0,
              volume24h: tokenData.volume24h || 0,
              liquidity: tokenData.liquidity || 0,
              fdv: tokenData.fdv || 0,
            },
          });
          logger.info(`  💰 Market data saved: $${tokenData.price || 0}`);
        } else {
          logger.warn(`  ⚠️ Skipping market data (all zeros) for ${tokenData.symbol}`);
        }
        
        saved.push(token);
        
      } catch (error) {
        logger.error(`Failed to save token ${tokenData.symbol}:`, error);
      }
    }
    
    return saved;
  }
  
  /**
   * 从聚类创建主题
   */
  private async createTopicFromCluster(cluster: any, allTokens: any[]): Promise<any | null> {
    try {
      // 检查是否已存在相同名称的系统主题
      const systemUser = await prisma.user.findFirst({
        where: { walletAddress: 'system' },
      });
      
      if (!systemUser) {
        logger.error('System user not found');
        return null;
      }
      
      const existingTopic = await prisma.topic.findFirst({
        where: {
          name: cluster.topic_name,
          userId: systemUser.id,
        },
      });
      
      if (existingTopic) {
        logger.info(`Topic ${cluster.topic_name} already exists, updating...`);
        
        // 更新现有主题
        const updatedTopic = await prisma.topic.update({
          where: { id: existingTopic.id },
          data: {
            description: `Auto-generated topic. Keywords: ${cluster.keywords.join(', ')}`,
            updatedAt: new Date(),
          },
          include: {
            tokens: {
              include: { token: true },
            },
          },
        });
        
        // 添加新的代币到主题（如果还没有）
        for (const tokenInfo of cluster.tokens) {
          const token = await prisma.token.findFirst({
            where: {
              name: tokenInfo.name,
              symbol: tokenInfo.symbol,
            },
          });
          
          if (token) {
            await prisma.topicToken.upsert({
              where: {
                topicId_tokenId: {
                  topicId: updatedTopic.id,
                  tokenId: token.id,
                },
              },
              create: {
                topicId: updatedTopic.id,
                tokenId: token.id,
              },
              update: {},
            });
          }
        }
        
        return updatedTopic;
      }
      
      // 创建新主题（系统用户已在上面获取）
      const topic = await prisma.topic.create({
        data: {
          name: cluster.topic_name,
          description: `Auto-generated topic. Keywords: ${cluster.keywords.join(', ')}`,
          userId: systemUser.id, // 使用系统用户
          order: 0,
        },
      });
      
      logger.info(`Created new topic: ${topic.name}`);
      
      // 关联代币到主题
      for (const tokenInfo of cluster.tokens) {
        const token = await prisma.token.findFirst({
          where: {
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
          },
        });
        
        if (token) {
          await prisma.topicToken.create({
            data: {
              topicId: topic.id,
              tokenId: token.id,
            },
          });
        }
      }
      
      return topic;
      
    } catch (error) {
      logger.error('Failed to create topic from cluster:', error);
      return null;
    }
  }
  
  /**
   * 刷新主题中代币的市场数据
   */
  async refreshTopicTokensData(topicId: number) {
    try {
      const topic = await prisma.topic.findUnique({
        where: { id: topicId },
        include: {
          tokens: {
            include: { token: true },
          },
        },
      });
      
      if (!topic) {
        logger.error(`Topic ${topicId} not found`);
        return;
      }
      
      logger.info(`Refreshing market data for topic: ${topic.name} (${topic.tokens.length} tokens)`);
      
      for (const topicToken of topic.tokens) {
        try {
          // 使用 multi API 服务获取最新数据
          const latestData = await multiApiService.getTokenFullInfo(
            topicToken.token.mintAddress
          );
          
          if (latestData) {
            await prisma.tokenMarketData.create({
              data: {
                tokenId: topicToken.token.id,
                price: latestData.price,
                priceChange24h: latestData.priceChange24h,
                marketCap: latestData.marketCap,
                volume24h: latestData.volume24h,
                liquidity: latestData.liquidity,
                holderCount: latestData.holderCount || 0,
                transactionCount24h: latestData.transactionCount24h || 0,
                fdv: latestData.fdv,
              },
            });
            
            logger.info(`✅ Updated ${topicToken.token.symbol}: $${latestData.price?.toFixed(6)}`);
          }
          
          // 限流
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          logger.error(`Failed to refresh ${topicToken.token.symbol}:`, error);
        }
      }
      
    } catch (error) {
      logger.error('Failed to refresh topic tokens data:', error);
    }
  }
}

