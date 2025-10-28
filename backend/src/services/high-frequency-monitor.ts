import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { io } from '../index';
import { birdeyeService, clusteringService, multiApiService } from './index';

/**
 * 高频监控服务
 * 每秒从 Birdeye 获取新 meme 代币数据，并投喂给聚类算法
 * 如果有 >= 3 个代币属于同一聚类，自动创建主题
 */
export class HighFrequencyMonitor {
  private readonly CHECK_INTERVAL = 1000; // 1秒
  private readonly MIN_CLUSTER_SIZE = 3; // 最少3个代币才创建主题
  private lastCheckTime: number = 0;
  private processingQueue: any[] = [];
  private isProcessing = false;
  
  constructor() {
    logger.info('📊 High Frequency Monitor initialized (1 second interval)');
  }
  
  /**
   * 启动高频监控
   */
  async start() {
    logger.info('🚀 Starting high frequency monitoring (1 req/sec)...');
    
    // 立即执行一次
    this.checkNewMemes();
    
    // 每秒执行一次
    setInterval(() => {
      this.checkNewMemes();
    }, this.CHECK_INTERVAL);
  }
  
  /**
   * 检查新 meme 代币
   */
  private async checkNewMemes() {
    if (this.isProcessing) {
      logger.warn('⏭️ Skipping check - previous check still processing');
      return;
    }
    
    this.isProcessing = true;
    
    try {
      const now = Date.now();
      const since = now - 300000; // 最近5分钟的新代币
      
      logger.info('🔍 Checking for new meme tokens...');
      
      // 1. 从数据库获取最近未处理的代币
      const recentTokens = await this.getUnprocessedTokens(since);
      
      if (recentTokens.length === 0) {
        logger.info('📭 No new tokens to process');
        this.isProcessing = false;
        return;
      }
      
      logger.info(`📦 Found ${recentTokens.length} new tokens, preparing for clustering...`);
      
      // 2. 准备聚类数据
      const tokensForClustering = recentTokens.map(token => ({
        name: token.name,
        symbol: token.symbol,
      }));
      
      // 3. 投喂给聚类算法
      logger.info('📊 Feeding tokens to clustering algorithm...');
      const clusters = await clusteringService.clusterTokens(tokensForClustering);
      
      logger.info(`✅ Got ${clusters.length} clusters from Python`);
      
      // 4. 筛选有效聚类（>= 3个代币）
      const validClusters = clusters.filter(
        cluster => cluster.tokens.length >= this.MIN_CLUSTER_SIZE
      );
      
      if (validClusters.length === 0) {
        logger.info('No valid clusters (minimum 3 tokens)');
        this.isProcessing = false;
        return;
      }
      
      logger.info(`🎯 Found ${validClusters.length} valid clusters`);
      
      // 5. 为每个有效聚类创建主题
      const createdTopics = [];
      
      for (const cluster of validClusters) {
        try {
          const topic = await this.createOrUpdateTopic(cluster, recentTokens);
          if (topic) {
            createdTopics.push(topic);
            logger.info(`✅ Topic: ${topic.name} (${cluster.tokens.length} tokens, confidence: ${cluster.confidence_score.toFixed(2)})`);
          }
        } catch (error) {
          logger.error(`Failed to create topic for cluster ${cluster.topic_id}:`, error);
        }
      }
      
      // 6. 标记代币已处理
      await this.markTokensAsProcessed(recentTokens.map(t => t.id));
      
      // 7. 通知前端
      if (createdTopics.length > 0) {
        io.to('hot-topics').emit('new_topics', {
          count: createdTopics.length,
          topics: createdTopics,
        });
        
        logger.info(`🎉 ${createdTopics.length} new topics created!`);
      }
      
    } catch (error) {
      logger.error('❌ High frequency monitoring error:', error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * 获取未处理的代币（最近5分钟，且没有被处理过）
   */
  private async getUnprocessedTokens(since: number): Promise<any[]> {
    try {
      // 获取最近创建的所有代币
      const allRecentTokens = await prisma.token.findMany({
        where: {
          createdAt: {
            gte: new Date(since),
          },
        },
        include: {
          topicTokens: true,
        },
      });
      
      // 筛选出还没有被分配到任何主题的代币
      const unprocessedTokens = allRecentTokens.filter(
        token => token.topicTokens.length === 0
      );
      
      return unprocessedTokens;
      
    } catch (error) {
      logger.error('Failed to get unprocessed tokens:', error);
      return [];
    }
  }
  
  /**
   * 创建或更新主题
   */
  private async createOrUpdateTopic(cluster: any, allTokens: any[]): Promise<any | null> {
    try {
      // 检查主题是否已存在
      const existingTopic = await prisma.topic.findFirst({
        where: {
          clusterId: cluster.topic_id,
          userId: null, // 自动生成的主题
        },
      });
      
      if (existingTopic) {
        logger.info(`Topic ${cluster.topic_name} already exists, updating...`);
        
        // 更新现有主题
        const updatedTopic = await prisma.topic.update({
          where: { id: existingTopic.id },
          data: {
            keywords: cluster.keywords.join(', '),
            confidenceScore: cluster.confidence_score,
            updatedAt: new Date(),
          },
        });
        
        // 添加新代币到主题
        await this.addTokensToTopic(updatedTopic.id, cluster, allTokens);
        
        return updatedTopic;
      }
      
      // 需要先创建一个系统用户用于自动主题
      // 这里简化处理，使用 userId = 0 或创建一个占位用户
      // 先尝试找一个用户，如果没有就创建默认用户
      let systemUser = await prisma.user.findFirst({
        where: { walletAddress: 'system' },
      });
      
      if (!systemUser) {
        systemUser = await prisma.user.create({
          data: {
            walletAddress: 'system',
            username: 'System',
          },
        });
      }
      
      // 创建新主题
      const topic = await prisma.topic.create({
        data: {
          name: cluster.topic_name,
          description: `Auto-generated topic. Keywords: ${cluster.keywords.join(', ')}`,
          userId: systemUser.id,
          order: 0,
        },
      });
      
      // 关联代币到主题
      await this.addTokensToTopic(topic.id, cluster, allTokens);
      
      return topic;
      
    } catch (error) {
      logger.error('Failed to create or update topic:', error);
      return null;
    }
  }
  
  /**
   * 将代币添加到主题
   */
  private async addTokensToTopic(topicId: number, cluster: any, allTokens: any[]): Promise<void> {
    try {
      for (const tokenInfo of cluster.tokens) {
        // 在数据库中找到对应的代币
        const token = await prisma.token.findFirst({
          where: {
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
          },
        });
        
        if (token) {
          // 检查是否已关联
          const existing = await prisma.topicToken.findUnique({
            where: {
              topicId_tokenId: {
                topicId: topicId,
                tokenId: token.id,
              },
            },
          });
          
          if (!existing) {
            await prisma.topicToken.create({
              data: {
                topicId: topicId,
                tokenId: token.id,
              },
            });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to add tokens to topic:', error);
    }
  }
  
  /**
   * 标记代币为已处理（通过创建关联记录）
   * 实际上在 addTokensToTopic 中已经处理了
   */
  private async markTokensAsProcessed(tokenIds: number[]): Promise<void> {
    // 不需要额外操作，因为代币已经被关联到主题
  }
}

