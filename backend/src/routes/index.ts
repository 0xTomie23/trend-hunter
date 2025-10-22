import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { birdeyeService } from '../services';

const router = Router();

/**
 * GET /api/hot-topics
 * Get list of hot topics
 */
router.get('/hot-topics', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '20',
      timeRange = '24h',
      sortBy = 'hot_score'
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Calculate time filter
    const timeRanges: Record<string, number> = {
      '1h': 1,
      '6h': 6,
      '24h': 24,
      '7d': 168
    };
    const hours = timeRanges[timeRange as string] || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    // Sort field mapping
    const sortFields: Record<string, any> = {
      'hot_score': { hotScore: 'desc' },
      'latest': { lastSeenAt: 'desc' },
      'mentions': { totalMentions: 'desc' }
    };
    const orderBy = sortFields[sortBy as string] || sortFields.hot_score;
    
    const topics = await prisma.hotTopic.findMany({
      where: {
        lastSeenAt: {
          gte: since
        }
      },
      include: {
        matches: {
          include: {
            token: {
              include: {
                marketData: {
                  orderBy: { timestamp: 'desc' },
                  take: 1
                }
              }
            }
          },
          orderBy: {
            matchScore: 'desc'
          },
          take: 5
        },
        tweets: {
          include: {
            tweet: {
              include: {
                kol: true
              }
            }
          },
          orderBy: {
            tweet: {
              tweetCreatedAt: 'desc'
            }
          },
          take: 3
        }
      },
      orderBy,
      skip,
      take: limitNum
    });
    
    const total = await prisma.hotTopic.count({
      where: {
        lastSeenAt: {
          gte: since
        }
      }
    });
    
    res.json({
      data: topics,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching hot topics:', error);
    res.status(500).json({ error: 'Failed to fetch hot topics' });
  }
});

/**
 * GET /api/hot-topics/:id
 * Get hot topic details
 */
router.get('/hot-topics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const topic = await prisma.hotTopic.findUnique({
      where: { id: parseInt(id) },
      include: {
        matches: {
          include: {
            token: {
              include: {
                marketData: {
                  orderBy: { timestamp: 'desc' },
                  take: 1
                },
                pools: true
              }
            }
          },
          orderBy: {
            matchScore: 'desc'
          }
        },
        tweets: {
          include: {
            tweet: {
              include: {
                kol: true
              }
            }
          },
          orderBy: {
            tweet: {
              tweetCreatedAt: 'desc'
            }
          }
        }
      }
    });
    
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    res.json(topic);
  } catch (error) {
    console.error('Error fetching topic:', error);
    res.status(500).json({ error: 'Failed to fetch topic' });
  }
});

/**
 * GET /api/tokens/:mintAddress
 * Get token details
 */
router.get('/tokens/:mintAddress', async (req, res) => {
  try {
    const { mintAddress } = req.params;
    
    const token = await prisma.token.findUnique({
      where: { mintAddress },
      include: {
        marketData: {
          orderBy: { timestamp: 'desc' },
          take: 100
        },
        pools: true,
        holders: {
          orderBy: { snapshotAt: 'desc' },
          take: 1
        },
        matches: {
          include: {
            topic: {
              include: {
                tweets: {
                  include: {
                    tweet: {
                      include: {
                        kol: true
                      }
                    }
                  },
                  take: 3
                }
              }
            }
          },
          orderBy: {
            matchedAt: 'desc'
          }
        }
      }
    });
    
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    res.json(token);
  } catch (error) {
    console.error('Error fetching token:', error);
    res.status(500).json({ error: 'Failed to fetch token' });
  }
});

/**
 * GET /api/tokens/:mintAddress/full
 * 获取代币完整信息（包括实时Helius数据）
 */
router.get('/tokens/:mintAddress/full', async (req, res) => {
  try {
    const { mintAddress } = req.params;
    
    // 从数据库获取
    const token = await prisma.token.findUnique({
      where: { mintAddress },
      include: {
        marketData: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        pools: true,
        matches: {
          include: { topic: true }
        }
      }
    });
    
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    // 实时从 Birdeye 获取完整数据
    let birdeyeData = null;
    try {
      birdeyeData = await birdeyeService.getTokenFullInfo(mintAddress);
    } catch (error) {
      console.error('Failed to get Birdeye data:', error);
    }
    
    res.json({
      ...token,
      realtime: birdeyeData  // 实时 Birdeye 数据
    });
  } catch (error) {
    console.error('Error fetching token full info:', error);
    res.status(500).json({ error: 'Failed to fetch token' });
  }
});

export default router;

