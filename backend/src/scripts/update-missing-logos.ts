import { PrismaClient } from '@prisma/client';
import { BirdeyeService } from '../services/birdeye-service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const birdeyeService = new BirdeyeService();

/**
 * 批量更新没有 logo 的代币
 */
async function updateMissingLogos() {
  try {
    logger.info('🔍 Finding tokens without logos...');
    
    // 查找所有没有 logoUri 的代币
    const tokensWithoutLogo = await prisma.token.findMany({
      where: {
        OR: [
          { logoUri: null },
          { logoUri: '' }
        ]
      },
      select: {
        id: true,
        mintAddress: true,
        symbol: true
      }
    });
    
    logger.info(`Found ${tokensWithoutLogo.length} tokens without logos`);
    
    if (tokensWithoutLogo.length === 0) {
      logger.info('✅ All tokens have logos!');
      return;
    }
    
    // 逐个更新
    let updated = 0;
    let failed = 0;
    
    for (const token of tokensWithoutLogo) {
      try {
        logger.info(`Updating logo for ${token.symbol} (${token.mintAddress})...`);
        
        // 从 Birdeye 和 DexScreener 重新获取完整信息
        const fullInfo = await birdeyeService.getTokenFullInfo(token.mintAddress);
        
        if (fullInfo && fullInfo.logoUri) {
          // 更新代币信息
          await prisma.token.update({
            where: { id: token.id },
            data: {
              logoUri: fullInfo.logoUri,
              name: fullInfo.name,
              symbol: fullInfo.symbol
            }
          });
          
          logger.info(`✅ Updated logo for ${token.symbol}`);
          updated++;
        } else {
          logger.warn(`⚠️ No logo found for ${token.symbol}`);
          failed++;
        }
        
        // 等待一小段时间避免 API 限流
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        logger.error(`Failed to update logo for ${token.symbol}:`, error);
        failed++;
      }
    }
    
    logger.info(`✅ Logo update complete: ${updated} updated, ${failed} failed`);
    
  } catch (error) {
    logger.error('Failed to update logos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
updateMissingLogos();

