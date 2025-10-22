import { getPrismaClient } from '../lib/database';
import { logger } from '../utils/logger';

export class UserService {
  private prisma = getPrismaClient();

  // 创建或获取用户
  async createOrGetUser(walletAddress: string, username?: string) {
    try {
      const user = await this.prisma.user.upsert({
        where: { walletAddress },
        update: { 
          username: username || undefined,
          updatedAt: new Date()
        },
        create: {
          walletAddress,
          username
        }
      });
      
      logger.info(`User ${walletAddress} created/updated`);
      return user;
    } catch (error) {
      logger.error('Failed to create/get user:', error);
      throw error;
    }
  }

  // 获取用户信息
  async getUser(walletAddress: string) {
    try {
      return await this.prisma.user.findUnique({
        where: { walletAddress },
        include: {
          topics: {
            include: {
              tokens: {
                include: {
                  token: {
                    include: {
                      marketData: {
                        orderBy: { timestamp: 'desc' },
                        take: 1
                      }
                    }
                  }
                }
              }
            },
            orderBy: { order: 'asc' }
          }
        }
      });
    } catch (error) {
      logger.error('Failed to get user:', error);
      throw error;
    }
  }
}

export class TopicService {
  private prisma = getPrismaClient();

  // 创建主题
  async createTopic(userId: number, name: string, description?: string) {
    try {
      // 获取当前用户的最大 order 值
      const maxOrder = await this.prisma.topic.findFirst({
        where: { userId },
        orderBy: { order: 'desc' },
        select: { order: true }
      });

      const topic = await this.prisma.topic.create({
        data: {
          name,
          description,
          userId,
          order: (maxOrder?.order || 0) + 1
        },
        include: {
          tokens: {
            include: {
              token: {
                include: {
                  marketData: {
                    orderBy: { timestamp: 'desc' },
                    take: 1
                  }
                }
              }
            }
          }
        }
      });

      logger.info(`Topic "${name}" created for user ${userId}`);
      return topic;
    } catch (error) {
      logger.error('Failed to create topic:', error);
      throw error;
    }
  }

  // 更新主题
  async updateTopic(topicId: number, name?: string, description?: string) {
    try {
      const topic = await this.prisma.topic.update({
        where: { id: topicId },
        data: {
          name,
          description,
          updatedAt: new Date()
        },
        include: {
          tokens: {
            include: {
              token: {
                include: {
                  marketData: {
                    orderBy: { timestamp: 'desc' },
                    take: 1
                  }
                }
              }
            }
          }
        }
      });

      logger.info(`Topic ${topicId} updated`);
      return topic;
    } catch (error) {
      logger.error('Failed to update topic:', error);
      throw error;
    }
  }

  // 删除主题
  async deleteTopic(topicId: number) {
    try {
      await this.prisma.topic.delete({
        where: { id: topicId }
      });

      logger.info(`Topic ${topicId} deleted`);
      return true;
    } catch (error) {
      logger.error('Failed to delete topic:', error);
      throw error;
    }
  }

  // 更新主题顺序
  async updateTopicOrder(topicId: number, newOrder: number) {
    try {
      const topic = await this.prisma.topic.update({
        where: { id: topicId },
        data: { order: newOrder }
      });

      logger.info(`Topic ${topicId} order updated to ${newOrder}`);
      return topic;
    } catch (error) {
      logger.error('Failed to update topic order:', error);
      throw error;
    }
  }

  // 重新排序主题
  async reorderTopics(userId: number, topicIds: number[]) {
    try {
      const updates = topicIds.map((topicId, index) => 
        this.prisma.topic.update({
          where: { id: topicId },
          data: { order: index + 1 }
        })
      );

      await Promise.all(updates);
      logger.info(`Topics reordered for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Failed to reorder topics:', error);
      throw error;
    }
  }
}

export class TokenService {
  private prisma = getPrismaClient();

  // 创建或获取代币
  async createOrGetToken(tokenData: {
    mintAddress: string;
    name: string;
    symbol: string;
    decimals?: number;
    logoUri?: string;
    description?: string;
  }) {
    try {
      const token = await this.prisma.token.upsert({
        where: { mintAddress: tokenData.mintAddress },
        update: {
          name: tokenData.name,
          symbol: tokenData.symbol,
          logoUri: tokenData.logoUri,
          description: tokenData.description,
          updatedAt: new Date()
        },
        create: {
          mintAddress: tokenData.mintAddress,
          name: tokenData.name,
          symbol: tokenData.symbol,
          decimals: tokenData.decimals || 9,
          logoUri: tokenData.logoUri,
          description: tokenData.description
        }
      });

      logger.info(`Token ${tokenData.symbol} created/updated`);
      return token;
    } catch (error) {
      logger.error('Failed to create/get token:', error);
      throw error;
    }
  }

  // 添加代币到主题
  async addTokenToTopic(topicId: number, tokenId: number) {
    try {
      const topicToken = await this.prisma.topicToken.create({
        data: {
          topicId,
          tokenId
        },
        include: {
          token: {
            include: {
              marketData: {
                orderBy: { timestamp: 'desc' },
                take: 1
              }
            }
          }
        }
      });

      logger.info(`Token ${tokenId} added to topic ${topicId}`);
      return topicToken;
    } catch (error) {
      logger.error('Failed to add token to topic:', error);
      throw error;
    }
  }

  // 从主题中移除代币
  async removeTokenFromTopic(topicId: number, tokenId: number) {
    try {
      await this.prisma.topicToken.deleteMany({
        where: {
          topicId,
          tokenId
        }
      });

      logger.info(`Token ${tokenId} removed from topic ${topicId}`);
      return true;
    } catch (error) {
      logger.error('Failed to remove token from topic:', error);
      throw error;
    }
  }

  // 检查代币是否已存在于主题中
  async checkTokenInTopic(topicId: number, mintAddress: string) {
    try {
      const existingToken = await this.prisma.topicToken.findFirst({
        where: {
          topicId,
          token: { mintAddress }
        }
      });
      return !!existingToken;
    } catch (error) {
      logger.error('Failed to check token in topic:', error);
      throw error;
    }
  }

  // 更新代币市场数据
  async updateTokenMarketData(tokenId: number, marketData: {
    price?: number;
    priceChange24h?: number;
    marketCap?: number;
    volume24h?: number;
    liquidity?: number;
    holderCount?: number;
    transactionCount24h?: number;
    fdv?: number;
  }) {
    try {
      const data = await this.prisma.tokenMarketData.create({
        data: {
          tokenId,
          ...marketData
        }
      });

      logger.info(`Market data updated for token ${tokenId}`);
      return data;
    } catch (error) {
      logger.error('Failed to update token market data:', error);
      throw error;
    }
  }
}
