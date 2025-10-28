import { Router } from 'express';
import { birdeyeService, clusteringService, multiApiService } from '../services';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/new-tokens/analyze
 * 获取新代币并进行聚类分析
 */
router.post('/analyze', async (req, res) => {
  try {
    const { hours = 6 } = req.body;

    logger.info(`🔍 Fetching new tokens from last ${hours} hours...`);

    // 1. 从 Birdeye 获取最近的代币列表
    const recentTokens = await birdeyeService.getRecentTokens(hours);

    if (recentTokens.length === 0) {
      return res.json({
        success: true,
        message: 'No new tokens found',
        data: {
          recentTokens: [],
          clusters: [],
          totalTokens: 0,
          totalTopics: 0,
        },
      });
    }

    logger.info(`📦 Found ${recentTokens.length} new tokens`);

    // 2. 提取 name 和 symbol（聚类算法只需要这两个字段）
    const tokensForClustering = recentTokens
      .map((token: any) => ({
        name: token.name || 'Unknown',
        symbol: token.symbol || '???',
      }))
      .filter((t: any) => t.name !== 'Unknown' && t.symbol !== '???');

    if (tokensForClustering.length === 0) {
      return res.json({
        success: true,
        message: 'No valid tokens for clustering',
        data: {
          recentTokens,
          clusters: [],
          totalTokens: 0,
          totalTopics: 0,
        },
      });
    }

    logger.info(`📊 Sending ${tokensForClustering.length} tokens to clustering...`);

    // 3. 调用 Python 聚类算法
    const clusters = await clusteringService.clusterTokens(tokensForClustering);

    logger.info(`✅ Clustering completed: ${clusters.length} topics found`);

    // 4. 返回结果
    res.json({
      success: true,
      message: `Found ${recentTokens.length} new tokens, clustered into ${clusters.length} topics`,
      data: {
        recentTokens,
        clusters,
        totalTokens: recentTokens.length,
        totalTopics: clusters.length,
      },
    });
  } catch (error) {
    logger.error('Failed to analyze new tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze new tokens',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/new-tokens/analyze-by-addresses
 * 根据 mint addresses 获取代币信息并进行聚类分析
 */
router.post('/analyze-by-addresses', async (req, res) => {
  try {
    const { addresses } = req.body;

    if (!addresses || !Array.isArray(addresses)) {
      return res.status(400).json({
        success: false,
        error: 'addresses array is required',
      });
    }

    logger.info(`🔍 Fetching info for ${addresses.length} tokens...`);

    // 1. 批量获取代币的基本信息（name 和 symbol）
    const tokensData: { name: string; symbol: string; mintAddress: string }[] = [];

    for (const address of addresses) {
      const basicInfo = await multiApiService.getTokenBasicInfoForClustering(address);

      if (basicInfo) {
        tokensData.push({
          name: basicInfo.name,
          symbol: basicInfo.symbol,
          mintAddress: address,
        });
      }
    }

    if (tokensData.length === 0) {
      return res.json({
        success: false,
        message: 'No valid token info found',
        data: {
          tokens: [],
          clusters: [],
          totalTokens: 0,
          totalTopics: 0,
        },
      });
    }

    logger.info(`📦 Got info for ${tokensData.length} tokens`);
    logger.info(`Tokens: ${tokensData.map(t => `${t.name} (${t.symbol})`).join(', ')}`);

    // 2. 调用聚类算法
    const tokensForClustering = tokensData.map((t) => ({
      name: t.name,
      symbol: t.symbol,
    }));

    logger.info(`📊 Sending ${tokensForClustering.length} tokens to clustering...`);

    const clusters = await clusteringService.clusterTokens(tokensForClustering);

    logger.info(`✅ Clustering completed: ${clusters.length} topics found`);

    // 打印每个聚类的结果
    for (const cluster of clusters) {
      logger.info(`  Topic: ${cluster.topic_name} (${cluster.tokens.length} tokens)`);
      logger.info(`    Keywords: ${cluster.keywords.slice(0, 3).join(', ')}`);
      logger.info(`    Tokens: ${cluster.tokens.map(t => t.symbol).join(', ')}`);
    }

    // 3. 返回结果
    res.json({
      success: true,
      message: `Clustered ${tokensData.length} tokens into ${clusters.length} topics`,
      data: {
        tokens: tokensData,
        clusters,
        totalTokens: tokensData.length,
        totalTopics: clusters.length,
      },
    });
  } catch (error) {
    logger.error('Failed to analyze tokens by addresses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze tokens',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

