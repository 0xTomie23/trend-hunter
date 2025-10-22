import { Router } from 'express';
import { birdeyeService } from '../services';
import axios from 'axios';

const router = Router();

/**
 * GET /api/demo/token/:mintAddress
 * 获取单个代币的实时数据（无需数据库）
 */
router.get('/token/:mintAddress', async (req, res) => {
  try {
    const { mintAddress } = req.params;
    
    // 从 Birdeye + DexScreener 获取实时数据
    const fullInfo = await birdeyeService.getTokenFullInfo(mintAddress);
    
    if (!fullInfo) {
      return res.status(404).json({ error: 'Token not found' });
    }
    
    res.json({
      success: true,
      data: fullInfo
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch token' });
  }
});

/**
 * GET /api/demo/recent-tokens
 * 获取最近创建的代币（无需数据库）
 */
router.get('/recent-tokens', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 6;
    
    // 从 Birdeye 获取新代币列表
    const tokens = await birdeyeService.getRecentTokens(hours);
    
    res.json({
      success: true,
      data: tokens,
      count: tokens.length
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

/**
 * GET /api/demo/test-token
 * 测试特定代币（索拉拉）
 */
router.get('/test-token', async (req, res) => {
  try {
    const testMint = 'CY1P83KnKwFYostvjQcoR2HJLyEJWRBRaVQmYyyD3cR8';
    
    // 从 DexScreener 获取数据
    const dexRes = await axios.get(
      `https://api.dexscreener.com/latest/dex/tokens/${testMint}`
    );
    
    const pairs = dexRes.data?.pairs || [];
    if (pairs.length === 0) {
      return res.json({ success: false, error: 'No data' });
    }
    
    const mainPair = pairs[0];
    
    res.json({
      success: true,
      data: {
        mintAddress: testMint,
        name: mainPair.baseToken?.name,
        symbol: mainPair.baseToken?.symbol,
        logoUri: mainPair.info?.imageUrl,
        
        price: parseFloat(mainPair.priceUsd) || 0,
        priceChange24h: mainPair.priceChange?.h24 || 0,
        marketCap: mainPair.marketCap || 0,
        liquidity: mainPair.liquidity?.usd || 0,
        volume24h: mainPair.volume?.h24 || 0,
        fdv: mainPair.fdv || 0,
        
        dex: mainPair.dexId,
        pairAddress: mainPair.pairAddress
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

export default router;

