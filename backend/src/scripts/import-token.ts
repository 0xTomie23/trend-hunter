/**
 * 手动导入代币并查看 Birdeye 数据
 * 运行: npx tsx src/scripts/import-token.ts
 */

import dotenv from 'dotenv';
import { BirdeyeService } from '../services/birdeye-service';
import { prisma } from '../lib/prisma';

dotenv.config();

async function importToken() {
  const mintAddress = 'CY1P83KnKwFYostvjQcoR2HJLyEJWRBRaVQmYyyD3cR8';
  
  console.log('🔍 开始导入代币...');
  console.log('CA:', mintAddress);
  console.log('═'.repeat(80));
  
  try {
    // 初始化 Birdeye 服务
    const birdeyeService = new BirdeyeService();
    
    // 1. 从 Birdeye 获取完整信息
    console.log('\n📡 从 Birdeye API 获取数据...');
    const fullInfo = await birdeyeService.getTokenFullInfo(mintAddress);
    
    if (!fullInfo) {
      console.log('❌ 无法从 Birdeye 获取代币信息');
      return;
    }
    
    console.log('\n✅ Birdeye 数据获取成功!');
    console.log('─'.repeat(80));
    console.log('基础信息:');
    console.log(`  名称: ${fullInfo.name}`);
    console.log(`  Symbol: ${fullInfo.symbol}`);
    console.log(`  Decimals: ${fullInfo.decimals}`);
    console.log(`  Logo: ${fullInfo.logoUri || '无'}`);
    console.log(`  供应量: ${fullInfo.supply?.toLocaleString()}`);
    
    console.log('\n价格信息:');
    console.log(`  价格: $${fullInfo.price}`);
    console.log(`  24h涨跌: ${fullInfo.priceChange24h >= 0 ? '+' : ''}${fullInfo.priceChange24h.toFixed(2)}%`);
    
    console.log('\n市场数据:');
    console.log(`  市值: $${fullInfo.marketCap?.toLocaleString()}`);
    console.log(`  流动性: $${fullInfo.liquidity?.toLocaleString()}`);
    console.log(`  24h交易量: $${fullInfo.volume24h?.toLocaleString()}`);
    console.log(`  FDV: $${fullInfo.fdv?.toLocaleString()}`);
    
    console.log('\n链上数据:');
    console.log(`  持有人数: ${fullInfo.holderCount?.toLocaleString()}`);
    console.log(`  24h交易数: ${fullInfo.transactionCount24h?.toLocaleString()}`);
    
    // 2. 保存到数据库
    console.log('\n💾 保存到数据库...');
    
    // 检查是否已存在
    let token = await prisma.token.findUnique({
      where: { mintAddress }
    });
    
    if (token) {
      console.log('⚠️  代币已存在，更新数据...');
      
      // 只添加新的市场数据
      await prisma.tokenMarketData.create({
        data: {
          tokenId: token.id,
          price: fullInfo.price,
          marketCap: fullInfo.marketCap,
          liquidityUsd: fullInfo.liquidity,
          volume24h: fullInfo.volume24h,
          priceChange24h: fullInfo.priceChange24h,
          holderCount: fullInfo.holderCount,
          transactionCount24h: fullInfo.transactionCount24h,
          fdv: fullInfo.fdv
        }
      });
      
      console.log('✅ 市场数据已更新');
      
    } else {
      console.log('✨ 创建新代币...');
      
      // 创建代币
      token = await prisma.token.create({
        data: {
          mintAddress,
          name: fullInfo.name,
          symbol: fullInfo.symbol,
          decimals: fullInfo.decimals,
          logoUri: fullInfo.logoUri,
          tokenCreatedAt: new Date()
        }
      });
      
      // 创建初始市场数据
      await prisma.tokenMarketData.create({
        data: {
          tokenId: token.id,
          price: fullInfo.price,
          marketCap: fullInfo.marketCap,
          liquidityUsd: fullInfo.liquidity,
          volume24h: fullInfo.volume24h,
          priceChange24h: fullInfo.priceChange24h,
          holderCount: fullInfo.holderCount,
          transactionCount24h: fullInfo.transactionCount24h,
          fdv: fullInfo.fdv
        }
      });
      
      console.log('✅ 代币已创建，ID:', token.id);
    }
    
    // 3. 查询并展示保存的数据
    console.log('\n📊 数据库中的数据:');
    console.log('─'.repeat(80));
    
    const savedToken = await prisma.token.findUnique({
      where: { mintAddress },
      include: {
        marketData: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });
    
    if (savedToken?.marketData?.[0]) {
      const data = savedToken.marketData[0];
      console.log('Token ID:', savedToken.id);
      console.log('名称:', savedToken.name);
      console.log('Symbol:', savedToken.symbol);
      console.log('\n最新市场数据:');
      console.log(`  价格: $${data.price}`);
      console.log(`  市值: $${Number(data.marketCap || 0).toLocaleString()}`);
      console.log(`  流动性: $${Number(data.liquidityUsd || 0).toLocaleString()}`);
      console.log(`  24h交易量: $${Number(data.volume24h || 0).toLocaleString()}`);
      console.log(`  持有人: ${data.holderCount}`);
      console.log(`  交易数: ${data.transactionCount24h}`);
      console.log(`  更新时间: ${data.timestamp}`);
    }
    
    console.log('\n═'.repeat(80));
    console.log('✅ 导入完成！\n');
    console.log('可以通过以下方式查看:');
    console.log(`  API: curl http://localhost:3000/api/tokens/${mintAddress}`);
    console.log(`  前端: http://localhost:5173`);
    console.log('═'.repeat(80));
    
  } catch (error) {
    console.error('❌ 导入失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importToken();

