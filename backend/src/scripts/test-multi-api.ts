#!/usr/bin/env ts-node

import { MultiApiService } from '../services/multi-api-service';
import { logger } from '../utils/logger';

/**
 * 测试多API服务
 */
async function testMultiApiService() {
  logger.info('🚀 Testing Multi-API Service...');
  
  const multiApi = new MultiApiService();
  
  // 测试代币地址
  const testToken = 'CY1P83KnKwFYostvjQcoR2HJLyEJWRBRaVQmYyyD3cR8';
  
  try {
    // 测试基本信息获取
    logger.info('📋 Testing basic info...');
    const basicInfo = await multiApi.getTokenBasicInfo(testToken);
    logger.info('Basic Info:', basicInfo);
    
    // 测试完整信息获取（轮询API）
    logger.info('📊 Testing full info (API rotation)...');
    
    for (let i = 0; i < 6; i++) {
      const fullInfo = await multiApi.getTokenFullInfo(testToken);
      logger.info(`Round ${i + 1} - Source: ${fullInfo?.source}`, {
        name: fullInfo?.name,
        symbol: fullInfo?.symbol,
        price: fullInfo?.price,
        marketCap: fullInfo?.marketCap,
        volume24h: fullInfo?.volume24h,
        liquidity: fullInfo?.liquidity
      });
      
      // 延迟1秒模拟真实使用
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 测试批量获取
    logger.info('📦 Testing batch info...');
    const batchTokens = [
      'CY1P83KnKwFYostvjQcoR2HJLyEJWRBRaVQmYyyD3cR8',
      'So11111111111111111111111111111111111111112', // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'  // USDC
    ];
    
    const batchResults = await multiApi.getBatchTokenInfo(batchTokens);
    logger.info('Batch Results:', batchResults.map(r => ({
      symbol: r?.symbol,
      source: r?.source,
      price: r?.price
    })));
    
    // 测试最新代币获取
    logger.info('🆕 Testing latest tokens...');
    const latestTokens = await multiApi.getLatestTokens(5);
    logger.info('Latest Tokens:', latestTokens.map((t: any) => ({
      symbol: t.symbol,
      name: t.name,
      price: t.price
    })));
    
    logger.info('✅ Multi-API Service test completed successfully!');
    
  } catch (error) {
    logger.error('❌ Multi-API Service test failed:', error);
  }
}

// 运行测试
if (require.main === module) {
  testMultiApiService()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Test failed:', error);
      process.exit(1);
    });
}

export { testMultiApiService };
