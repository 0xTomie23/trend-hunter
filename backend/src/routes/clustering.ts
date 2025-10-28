import { Router } from 'express';
import { clusteringService } from '../services';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/clustering/analyze
 * 分析代币并返回聚类结果
 */
router.post('/analyze', async (req, res) => {
  try {
    const { tokens } = req.body;

    if (!tokens || !Array.isArray(tokens)) {
      return res.status(400).json({ error: 'tokens array is required' });
    }

    // 验证数据格式
    const validTokens = tokens.filter((t: any) => t.name && t.symbol);
    
    if (validTokens.length === 0) {
      return res.status(400).json({ error: 'Valid tokens (name and symbol) are required' });
    }

    logger.info(`📊 Analyzing ${validTokens.length} tokens...`);

    // 调用 Python 聚类服务
    const clusters = await clusteringService.clusterTokens(validTokens);

    res.json({
      success: true,
      data: {
        clusters,
        totalTokens: validTokens.length,
        totalTopics: clusters.length,
      },
    });
  } catch (error) {
    logger.error('Clustering analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze tokens',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/clustering/health
 * 检查聚类服务健康状态
 */
router.get('/health', async (req, res) => {
  try {
    const isHealthy = await clusteringService.healthCheck();
    
    res.json({
      success: true,
      data: {
        healthy: isHealthy,
        serviceUrl: process.env.PYTHON_CLUSTERING_API_URL || 'http://localhost:8000',
      },
    });
  } catch (error) {
    res.json({
      success: false,
      data: {
        healthy: false,
        error: 'Health check failed',
      },
    });
  }
});

export default router;

