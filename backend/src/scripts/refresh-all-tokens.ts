/**
 * 手动刷新所有代币信息的脚本
 */
import { MultiApiService } from '../services/multi-api-service';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function refreshAllTokens() {
  try {
    const multiApiService = new MultiApiService();
    
    logger.info('🔄 Starting manual refresh of all tokens...');
    
    // 获取所有代币（直接从Token表获取）
    const allTopicTokens = await prisma.topicToken.findMany({
      include: {
        token: true
      }
    });
    
    if (!allTopicTokens || allTopicTokens.length === 0) {
      logger.info('No tokens found to refresh');
      return;
    }
    
    // 收集所有唯一代币
    const tokensMap = new Map();
    for (const tt of allTopicTokens) {
      if (tt.token && !tokensMap.has(tt.token.id)) {
        tokensMap.set(tt.token.id, tt.token);
      }
    }
    
    const uniqueTokens = Array.from(tokensMap.values());
    logger.info(`📊 Found ${uniqueTokens.length} unique tokens to refresh`);
    
    if (uniqueTokens.length === 0) {
      logger.info('No tokens found to refresh');
      return;
    }
    
    // 逐个刷新代币信息
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < uniqueTokens.length; i++) {
      const token = uniqueTokens[i];
      try {
        logger.info(`[${i + 1}/${uniqueTokens.length}] Refreshing ${token.symbol} (${token.mintAddress})...`);
        
        // 获取完整信息
        const fullInfo = await multiApiService.getTokenFullInfo(token.mintAddress);
        
        if (fullInfo) {
          // 获取最新数据
          const latestData = await prisma.tokenMarketData.findFirst({
            where: { tokenId: token.id },
            orderBy: { timestamp: 'desc' }
          });
          
          // 如果新数据全部为0或无效，且已有数据，则不创建新记录
          if (latestData && fullInfo.price === 0 && fullInfo.marketCap === 0 && fullInfo.volume24h === 0 && fullInfo.liquidity === 0) {
            logger.info(`⏭️ Skipping update for ${token.symbol} (all data is 0)`);
            continue;
          }
          
          // 使用有效的数据，如果新数据是0且已有数据，保留旧数据
          const price = (fullInfo.price && fullInfo.price !== 0) ? fullInfo.price : (latestData?.price || fullInfo.price);
          const marketCap = (fullInfo.marketCap && fullInfo.marketCap !== 0) ? fullInfo.marketCap : (latestData?.marketCap || fullInfo.marketCap);
          
          // 更新市场数据
          await prisma.tokenMarketData.create({
            data: {
              tokenId: token.id,
              price: price,
              priceChange24h: fullInfo.priceChange24h,
              marketCap: marketCap,
              volume24h: fullInfo.volume24h,
              liquidity: fullInfo.liquidity,
              holderCount: fullInfo.holderCount || 0,
              transactionCount24h: fullInfo.transactionCount24h || 0,
              fdv: fullInfo.fdv
            }
          });
          
          // 如果API提供了新图片，更新token信息
          if (fullInfo.logoUri && fullInfo.logoUri !== token.logoUri) {
            await prisma.token.update({
              where: { id: token.id },
              data: { logoUri: fullInfo.logoUri }
            });
          }
          
          logger.info(`✅ ${token.symbol} updated: $${fullInfo.price?.toFixed(6)} (${fullInfo.priceChange24h?.toFixed(2)}%) via ${fullInfo.source}`);
          successCount++;
        } else {
          logger.warn(`⚠️ No data available for ${token.symbol}`);
          failCount++;
        }
        
        // 控制API调用频率，避免过快
        await new Promise(resolve => setTimeout(resolve, 250)); // 每250ms刷新一个
      } catch (error) {
        logger.error(`❌ Failed to refresh ${token.symbol}:`, error);
        failCount++;
      }
    }
    
    logger.info(`✅ Manual refresh completed! Success: ${successCount}, Failed: ${failCount}`);
  } catch (error) {
    logger.error('Manual refresh failed:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

// 运行脚本
refreshAllTokens();

