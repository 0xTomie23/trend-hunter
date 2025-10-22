import { Router } from 'express';
import { UserService, TopicService, TokenService } from '../services/database-service';
import { birdeyeService } from '../services';
import { logger } from '../utils/logger';

const router = Router();
const userService = new UserService();
const topicService = new TopicService();
const tokenService = new TokenService();

// ============================================
// 用户相关 API
// ============================================

/**
 * POST /api/user/login
 * 用户登录/注册
 */
router.post('/login', async (req, res) => {
  try {
    const { walletAddress, username } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const user = await userService.createOrGetUser(walletAddress, username);
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('User login failed:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

/**
 * GET /api/user/:walletAddress
 * 获取用户信息和所有主题
 */
router.get('/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const user = await userService.getUser(walletAddress);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Get user failed:', error);
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
});

// ============================================
// 主题相关 API
// ============================================

/**
 * POST /api/topics
 * 创建新主题
 */
router.post('/topics', async (req, res) => {
  try {
    const { userId, name, description } = req.body;
    
    if (!userId || !name) {
      return res.status(400).json({ error: 'User ID and topic name are required' });
    }

    const topic = await topicService.createTopic(userId, name, description);
    
    res.json({
      success: true,
      data: topic
    });
  } catch (error) {
    logger.error('Create topic failed:', error);
    res.status(500).json({ success: false, error: 'Failed to create topic' });
  }
});

/**
 * PUT /api/topics/:topicId
 * 更新主题
 */
router.put('/topics/:topicId', async (req, res) => {
  try {
    const { topicId } = req.params;
    const { name, description } = req.body;
    
    const topic = await topicService.updateTopic(parseInt(topicId), name, description);
    
    res.json({
      success: true,
      data: topic
    });
  } catch (error) {
    logger.error('Update topic failed:', error);
    res.status(500).json({ success: false, error: 'Failed to update topic' });
  }
});

/**
 * DELETE /api/topics/:topicId
 * 删除主题
 */
router.delete('/topics/:topicId', async (req, res) => {
  try {
    const { topicId } = req.params;
    
    await topicService.deleteTopic(parseInt(topicId));
    
    res.json({
      success: true,
      message: 'Topic deleted successfully'
    });
  } catch (error) {
    logger.error('Delete topic failed:', error);
    res.status(500).json({ success: false, error: 'Failed to delete topic' });
  }
});

/**
 * PUT /api/topics/reorder
 * 重新排序主题
 */
router.put('/topics/reorder', async (req, res) => {
  try {
    const { userId, topicIds } = req.body;
    
    if (!userId || !Array.isArray(topicIds)) {
      return res.status(400).json({ error: 'User ID and topic IDs array are required' });
    }

    await topicService.reorderTopics(userId, topicIds);
    
    res.json({
      success: true,
      message: 'Topics reordered successfully'
    });
  } catch (error) {
    logger.error('Reorder topics failed:', error);
    res.status(500).json({ success: false, error: 'Failed to reorder topics' });
  }
});

// ============================================
// 代币相关 API
// ============================================

/**
 * POST /api/tokens/add
 * 添加代币到主题
 */
router.post('/tokens/add', async (req, res) => {
  try {
    const { topicId, mintAddress } = req.body;
    
    if (!topicId || !mintAddress) {
      return res.status(400).json({ error: 'Topic ID and mint address are required' });
    }

    // 检查代币是否已存在于主题中
    const existingToken = await tokenService.checkTokenInTopic(parseInt(topicId), mintAddress);

    if (existingToken) {
      return res.status(400).json({ error: 'Token already exists in this topic' });
    }

    // 第一步：快速获取基本信息（名字、符号、图片）
    const basicInfo = await birdeyeService.getTokenBasicInfo(mintAddress);
    
    if (!basicInfo) {
      return res.status(404).json({ error: 'Token not found' });
    }

    // 立即创建或获取代币（只有基本信息）
    const token = await tokenService.createOrGetToken({
      mintAddress,
      name: basicInfo.name,
      symbol: basicInfo.symbol,
      decimals: basicInfo.decimals || 9,
      logoUri: basicInfo.logoUri
    });

    // 添加代币到主题
    const topicToken = await tokenService.addTokenToTopic(parseInt(topicId), token.id);

    // 第二步：异步获取完整市场数据（不阻塞响应）
    // 在后台异步更新市场数据
    setImmediate(async () => {
      try {
        logger.info(`📊 Fetching market data for ${token.symbol} in background...`);
        const fullInfo = await birdeyeService.getTokenFullInfo(mintAddress);
        
        if (fullInfo && (fullInfo.price || fullInfo.marketCap || fullInfo.volume24h)) {
          // 更新代币信息（可能包含更完整的logoUri）
          if (fullInfo.logoUri && !token.logoUri) {
            await tokenService.createOrGetToken({
              mintAddress,
              name: fullInfo.name,
              symbol: fullInfo.symbol,
              decimals: fullInfo.decimals,
              logoUri: fullInfo.logoUri
            });
          }
          
          // 更新市场数据
          await tokenService.updateTokenMarketData(token.id, {
            price: fullInfo.price,
            priceChange24h: fullInfo.priceChange24h,
            marketCap: fullInfo.marketCap,
            volume24h: fullInfo.volume24h,
            liquidity: fullInfo.liquidity,
            holderCount: fullInfo.holderCount || 0,
            transactionCount24h: fullInfo.transactionCount24h || 0,
            fdv: fullInfo.fdv
          });
          
          logger.info(`✅ Market data updated for ${token.symbol}`);
        }
      } catch (error) {
        logger.error(`Failed to update market data for ${token.symbol}:`, error);
      }
    });
    
    res.json({
      success: true,
      data: topicToken
    });
  } catch (error) {
    logger.error('Add token failed:', error);
    res.status(500).json({ success: false, error: 'Failed to add token' });
  }
});

/**
 * DELETE /api/tokens/:topicId/:tokenId
 * 从主题中移除代币
 */
router.delete('/tokens/:topicId/:tokenId', async (req, res) => {
  try {
    const { topicId, tokenId } = req.params;
    
    await tokenService.removeTokenFromTopic(parseInt(topicId), parseInt(tokenId));
    
    res.json({
      success: true,
      message: 'Token removed successfully'
    });
  } catch (error) {
    logger.error('Remove token failed:', error);
    res.status(500).json({ success: false, error: 'Failed to remove token' });
  }
});

export default router;
