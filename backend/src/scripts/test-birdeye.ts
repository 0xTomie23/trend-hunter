/**
 * 测试 Birdeye API 连接
 */
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testBirdeye() {
  console.log('🧪 测试 Birdeye API\n');
  
  const apiKey = process.env.BIRDEYE_API_KEY;
  
  if (!apiKey) {
    console.log('❌ BIRDEYE_API_KEY 未设置');
    return;
  }
  
  console.log('✅ API Key:', apiKey.substring(0, 10) + '...');
  
  const testMint = 'So11111111111111111111111111111111111111112';  // Wrapped SOL
  
  // 测试1: 获取价格
  console.log('\n测试1: 获取代币价格');
  console.log('─'.repeat(60));
  
  try {
    const response = await axios.get(
      `https://public-api.birdeye.so/defi/price`,
      {
        headers: { 'X-API-KEY': apiKey },
        params: { address: testMint }
      }
    );
    
    console.log('✅ 价格API调用成功!');
    console.log('返回数据:', JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('❌ 失败:', error.message);
  }
  
  // 测试2: 获取代币概览
  console.log('\n测试2: 获取代币概览');
  console.log('─'.repeat(60));
  
  try {
    const response = await axios.get(
      `https://public-api.birdeye.so/defi/token_overview`,
      {
        headers: { 'X-API-KEY': apiKey },
        params: { address: testMint }
      }
    );
    
    console.log('✅ 概览API调用成功!');
    const data = response.data.data;
    console.log(`名称: ${data.name}`);
    console.log(`Symbol: ${data.symbol}`);
    console.log(`市值: $${data.mc?.toLocaleString()}`);
    console.log(`流动性: $${data.liquidity?.toLocaleString()}`);
    console.log(`24h交易量: $${data.v24hUSD?.toLocaleString()}`);
  } catch (error: any) {
    console.log('❌ 失败:', error.message);
  }
  
  // 测试3: 获取新代币列表
  console.log('\n测试3: 获取新代币列表');
  console.log('─'.repeat(60));
  
  try {
    const response = await axios.get(
      `https://public-api.birdeye.so/defi/v2/tokens/new_listing`,
      {
        headers: { 'X-API-KEY': apiKey },
        params: {
          sort_by: 'listing_time',
          sort_type: 'desc',
          offset: 0,
          limit: 10
        }
      }
    );
    
    console.log('✅ 新代币列表调用成功!');
    const tokens = response.data.data.items || [];
    console.log(`找到 ${tokens.length} 个新代币`);
    
    tokens.slice(0, 3).forEach((token: any, idx: number) => {
      console.log(`\n  ${idx + 1}. ${token.name} (${token.symbol})`);
      console.log(`     地址: ${token.address}`);
      console.log(`     价格: $${token.price}`);
      console.log(`     市值: $${token.mc?.toLocaleString()}`);
    });
  } catch (error: any) {
    console.log('❌ 失败:', error.message);
  }
  
  console.log('\n\n✅ 测试完成!');
}

testBirdeye();
