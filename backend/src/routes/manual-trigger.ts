import { Router } from 'express';
import { tokenMonitor } from '../services';
import { logger } from '../utils/logger';

const router = Router();

/**
 * 手动触发扫描
 * POST /api/trigger/scan
 */
router.post('/scan', async (req, res) => {
  try {
    logger.info('Manual scan triggered');
    
    // 异步执行扫描
    tokenMonitor.monitorNewTokens().catch(error => {
      logger.error('Manual scan failed:', error);
    });
    
    res.json({ 
      success: true, 
      message: 'Scan started in background' 
    });
  } catch (error) {
    logger.error('Failed to trigger scan:', error);
    res.status(500).json({ error: 'Failed to trigger scan' });
  }
});

export default router;

