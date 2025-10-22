/**
 * 测试组合数据获取（Birdeye + DexScreener）
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testCombined() {
  const mintAddress = 'CY1P83KnKwFYostvjQcoR2HJLyEJWRBRaVQmYyyD3cR8';
  const apiKey = process.env.BIRDEYE_API_KEY;
  
  console.log('🧪 测试组合数据获取');
  console.log('CA:', mintAddress);
  console.log('═'.repeat(80));
  
  // 1. Birdeye 价格 API（免费）
  console.log('\n📊 Birdeye 价格数据（免费API）');
  console.log('─'.repeat(80));
  
  let birdeyePrice = null;
  try {
    const res = await axios.get(
      'https://public-api.birdeye.so/defi/price',
      {
        headers: { 'X-API-KEY': apiKey },
        params: { address: mintAddress }
      }
    );
    
    if (res.data.success) {
      birdeyePrice = res.data.data;
      console.log('✅ Birdeye 价格:');
      console.log(`  价格: $${birdeyePrice.value}`);
      console.log(`  24h涨跌: ${birdeyePrice.priceChange24h >= 0 ? '+' : ''}${birdeyePrice.priceChange24h.toFixed(2)}%`);
      console.log(`  流动性: $${birdeyePrice.liquidity || 0}`);
    }
  } catch (error: any) {
    console.log('❌ Birdeye 失败:', error.message);
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 2. DexScreener 数据（免费）
  console.log('\n📊 DexScreener 市场数据（免费）');
  console.log('─'.repeat(80));
  
  let dexData = null;
  try {
    const res = await axios.get(
      `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`
    );
    
    const pairs = res.data?.pairs || [];
    if (pairs.length > 0) {
      const mainPair = pairs.sort((a: any, b: any) => 
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      )[0];
      
      dexData = mainPair;
      
      console.log('✅ DexScreener 数据:');
      console.log(`  名称: ${mainPair.baseToken?.name}`);
      console.log(`  Symbol: ${mainPair.baseToken?.symbol}`);
      console.log(`  价格: $${mainPair.priceUsd}`);
      console.log(`  市值: $${mainPair.marketCap?.toLocaleString()}`);
      console.log(`  流动性: $${mainPair.liquidity?.usd?.toLocaleString()}`);
      console.log(`  24h交易量: $${mainPair.volume?.h24?.toLocaleString()}`);
      console.log(`  24h涨跌: ${mainPair.priceChange?.h24 >= 0 ? '+' : ''}${mainPair.priceChange?.h24}%`);
      console.log(`  DEX: ${mainPair.dexId}`);
    }
  } catch (error: any) {
    console.log('❌ DexScreener 失败:', error.message);
  }
  
  // 3. 组合结果
  console.log('\n\n✨ 组合后的完整数据');
  console.log('═'.repeat(80));
  
  if (birdeyePrice || dexData) {
    console.log('基础信息:');
    console.log(`  名称: ${dexData?.baseToken?.name || 'Unknown'}`);
    console.log(`  Symbol: ${dexData?.baseToken?.symbol || '???'}`);
    console.log(`  CA: ${mintAddress}`);
    
    console.log('\n价格信息:');
    console.log(`  价格: $${birdeyePrice?.value || dexData?.priceUsd || 0} (Birdeye优先)`);
    console.log(`  24h涨跌: ${birdeyePrice?.priceChange24h || dexData?.priceChange?.h24 || 0}%`);
    
    console.log('\n市场数据:');
    console.log(`  市值: $${dexData?.marketCap?.toLocaleString() || 0}`);
    console.log(`  流动性: $${(birdeyePrice?.liquidity || dexData?.liquidity?.usd || 0).toLocaleString()}`);
    console.log(`  24h交易量: $${dexData?.volume?.h24?.toLocaleString() || 0}`);
    
    console.log('\n链上数据:');
    console.log(`  持有人数: 暂无（需要付费API）`);
    console.log(`  交易数: 暂无（需要付费API）`);
    
    console.log('\n数据来源:');
    console.log(`  ✅ Birdeye: 价格、24h涨跌`);
    console.log(`  ✅ DexScreener: 名称、市值、流动性、交易量`);
    console.log(`  ❌ 持有人、交易数: 需要 Birdeye 付费版或其他 RPC`);
  } else {
    console.log('❌ 无法获取任何数据');
  }
  
  console.log('\n═'.repeat(80));
  console.log('📋 结论\n');
  console.log('当前可用的免费数据源组合:');
  console.log('  • Birdeye /defi/price - 价格、涨跌');
  console.log('  • Birdeye /defi/v2/tokens/new_listing - 新代币列表');
  console.log('  • DexScreener - 市值、流动性、交易量、名称');
  console.log('\n✅ 这些数据足够展示基础的代币信息！');
  console.log('═'.repeat(80));
}

testCombined();

