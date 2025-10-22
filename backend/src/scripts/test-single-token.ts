/**
 * 测试单个代币的 Birdeye 数据获取
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testToken() {
  const mintAddress = 'CY1P83KnKwFYostvjQcoR2HJLyEJWRBRaVQmYyyD3cR8';
  const apiKey = process.env.BIRDEYE_API_KEY;
  
  console.log('🔍 测试代币数据获取');
  console.log('CA:', mintAddress);
  console.log('═'.repeat(80));
  
  if (!apiKey) {
    console.log('❌ BIRDEYE_API_KEY 未设置');
    return;
  }
  
  console.log('✅ API Key:', apiKey.substring(0, 10) + '...');
  
  // 测试1: 获取价格
  console.log('\n\n📊 测试1: 获取价格数据');
  console.log('API: /defi/price');
  console.log('─'.repeat(80));
  
  try {
    const priceRes = await axios.get(
      'https://public-api.birdeye.so/defi/price',
      {
        headers: { 'X-API-KEY': apiKey },
        params: { address: mintAddress }
      }
    );
    
    if (priceRes.data.success) {
      const data = priceRes.data.data;
      console.log('✅ 价格数据:');
      console.log(`  当前价格: $${data.value}`);
      console.log(`  24h涨跌: ${data.priceChange24h >= 0 ? '+' : ''}${data.priceChange24h}%`);
      console.log(`  流动性: $${data.liquidity?.toLocaleString()}`);
      console.log(`  更新时间: ${data.updateHumanTime}`);
    }
  } catch (error: any) {
    console.log('❌ 失败:', error.message);
  }
  
  // 等待1秒避免限流
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 测试2: 获取完整概览
  console.log('\n\n📊 测试2: 获取完整概览');
  console.log('API: /defi/token_overview');
  console.log('─'.repeat(80));
  
  try {
    const overviewRes = await axios.get(
      'https://public-api.birdeye.so/defi/token_overview',
      {
        headers: { 'X-API-KEY': apiKey },
        params: { address: mintAddress }
      }
    );
    
    if (overviewRes.data.success) {
      const data = overviewRes.data.data;
      console.log('✅ 完整数据:');
      console.log('\n基础信息:');
      console.log(`  名称: ${data.name}`);
      console.log(`  Symbol: ${data.symbol}`);
      console.log(`  Decimals: ${data.decimals}`);
      console.log(`  Logo: ${data.logoURI || '无'}`);
      
      console.log('\n价格数据:');
      console.log(`  价格: $${data.price}`);
      console.log(`  24h涨跌: ${data.priceChange24h >= 0 ? '+' : ''}${data.priceChange24h}%`);
      
      console.log('\n市场数据:');
      console.log(`  市值: $${data.mc?.toLocaleString()}`);
      console.log(`  流动性: $${data.liquidity?.toLocaleString()}`);
      console.log(`  24h交易量: $${data.v24hUSD?.toLocaleString()}`);
      console.log(`  FDV: $${data.fdv?.toLocaleString()}`);
      
      console.log('\n链上数据:');
      console.log(`  持有人数: ${data.holder || 0}`);
      console.log(`  24h交易数: ${data.trade24h || 0}`);
      console.log(`  交易对数量: ${data.numberMarkets || 0}`);
      
      console.log('\n其他信息:');
      console.log(`  创建时间: ${data.creationTime ? new Date(data.creationTime * 1000).toLocaleString() : '未知'}`);
      console.log(`  创建者: ${data.creator || '未知'}`);
    }
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.log('⚠️  遇到限流，等待2秒后重试...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const retryRes = await axios.get(
          'https://public-api.birdeye.so/defi/token_overview',
          {
            headers: { 'X-API-KEY': apiKey },
            params: { address: mintAddress }
          }
        );
        
        if (retryRes.data.success) {
          const data = retryRes.data.data;
          console.log('✅ 重试成功!');
          console.log(`  名称: ${data.name}`);
          console.log(`  市值: $${data.mc?.toLocaleString()}`);
          console.log(`  持有人: ${data.holder}`);
        }
      } catch (retryError: any) {
        console.log('❌ 重试也失败:', retryError.message);
      }
    } else {
      console.log('❌ 失败:', error.message);
    }
  }
  
  // 测试3: 获取元数据
  console.log('\n\n📊 测试3: 获取元数据');
  console.log('API: /defi/v3/token/meta-data/single');
  console.log('─'.repeat(80));
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    const metadataRes = await axios.get(
      'https://public-api.birdeye.so/defi/v3/token/meta-data/single',
      {
        headers: { 'X-API-KEY': apiKey },
        params: { address: mintAddress }
      }
    );
    
    if (metadataRes.data.success) {
      const data = metadataRes.data.data;
      console.log('✅ 元数据:');
      console.log(`  名称: ${data.name}`);
      console.log(`  Symbol: ${data.symbol}`);
      console.log(`  Logo: ${data.logoURI || '无'}`);
    }
  } catch (error: any) {
    console.log('⚠️  元数据获取失败:', error.message);
  }
  
  console.log('\n\n═'.repeat(80));
  console.log('📋 总结\n');
  console.log('这个代币的完整信息已经从 Birdeye 获取到了！');
  console.log('\n如果要保存到数据库，需要:');
  console.log('  1. 启动 PostgreSQL');
  console.log('  2. 运行: npx tsx src/scripts/import-token.ts');
  console.log('\n或者直接启动应用，系统会自动扫描新代币。');
  console.log('═'.repeat(80));
}

testToken();

