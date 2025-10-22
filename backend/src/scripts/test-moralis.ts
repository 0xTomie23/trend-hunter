/**
 * 测试 Moralis API 连接
 * 运行: npx tsx src/scripts/test-moralis.ts
 */

import dotenv from 'dotenv';
import Moralis from 'moralis';

dotenv.config();

async function testMoralis() {
  console.log('🧪 测试 Moralis API 连接\n');
  console.log('═'.repeat(80));
  
  const apiKey = process.env.MORALIS_API_KEY;
  
  if (!apiKey) {
    console.log('❌ 错误: MORALIS_API_KEY 未设置');
    console.log('\n请在 backend/.env 文件中添加:');
    console.log('MORALIS_API_KEY=你的API密钥\n');
    console.log('获取地址: https://admin.moralis.io/');
    return;
  }
  
  console.log('✅ API Key 已配置');
  console.log('═'.repeat(80));
  
  try {
    // 初始化 Moralis
    await Moralis.start({
      apiKey: apiKey
    });
    
    console.log('\n✅ Moralis 初始化成功!');
    
    // ============================================
    // TODO: 在这里测试你的 Moralis API 调用
    // ============================================
    
    console.log('\n\n测试1: 获取代币元数据');
    console.log('─'.repeat(80));
    console.log('⚠️  待实现 - 在 moralis-token-service.ts 中实现 getTokenMetadata()');
    
    // 示例测试代码:
    // const testMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';  // USDC
    // const metadata = await Moralis.SolApi.token.getTokenMetadata({
    //   network: "mainnet",
    //   address: testMint
    // });
    // console.log('代币信息:', metadata);
    
    console.log('\n\n测试2: 获取代币价格');
    console.log('─'.repeat(80));
    console.log('⚠️  待实现 - 在 moralis-token-service.ts 中实现 getTokenPrice()');
    
    console.log('\n\n测试3: 获取持有人信息');
    console.log('─'.repeat(80));
    console.log('⚠️  待实现 - 在 moralis-token-service.ts 中实现 getHolderCount()');
    
    console.log('\n\n测试4: 获取最近创建的代币');
    console.log('─'.repeat(80));
    console.log('⚠️  待实现 - 在 moralis-token-service.ts 中实现 getRecentTokens()');
    
    console.log('\n\n═'.repeat(80));
    console.log('📊 测试完成\n');
    console.log('下一步:');
    console.log('  1. 查看 Moralis 文档: https://docs.moralis.io/web3-data-api/solana');
    console.log('  2. 实现 moralis-token-service.ts 中的方法');
    console.log('  3. 再次运行此测试验证');
    console.log('\n═'.repeat(80));
    
  } catch (error: any) {
    console.log('\n❌ Moralis 初始化失败:', error.message);
    console.log('\n可能的原因:');
    console.log('  1. API Key 无效');
    console.log('  2. 网络连接问题');
    console.log('  3. Moralis SDK 版本问题');
  }
}

testMoralis();

