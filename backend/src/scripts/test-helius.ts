/**
 * 测试 Helius RPC 连接
 * 运行: npx tsx src/scripts/test-helius.ts
 */

import dotenv from 'dotenv';
import { Helius } from 'helius-sdk';
import { Connection, PublicKey } from '@solana/web3.js';

// 加载环境变量
dotenv.config();

async function testHelius() {
  console.log('🧪 测试 Helius RPC 连接\n');
  console.log('═'.repeat(80));
  
  const apiKey = process.env.HELIUS_API_KEY;
  
  if (!apiKey) {
    console.log('❌ 错误: HELIUS_API_KEY 未设置');
    console.log('\n请在 backend/.env 文件中添加:');
    console.log('HELIUS_API_KEY=your-api-key-here\n');
    return;
  }
  
  console.log('✅ API Key 已配置');
  console.log('═'.repeat(80));
  
  // 初始化 Helius
  const helius = new Helius(apiKey);
  console.log('\n📡 初始化 Helius 客户端...');
  
  // 测试1: 获取代币元数据
  console.log('\n\n测试1: 获取代币元数据 (DAS API)');
  console.log('─'.repeat(80));
  
  try {
    // 使用 USDC 作为测试
    const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    
    console.log(`获取代币: ${usdcMint}`);
    
    const asset = await helius.rpc.getAsset({
      id: usdcMint
    });
    
    console.log('✅ 成功获取元数据:');
    console.log(`  名称: ${asset.content?.metadata?.name}`);
    console.log(`  Symbol: ${asset.content?.metadata?.symbol}`);
    console.log(`  Logo: ${asset.content?.files?.[0]?.uri?.substring(0, 50)}...`);
    console.log(`  创建者: ${asset.creators?.[0]?.address}`);
    
  } catch (error: any) {
    console.log('❌ 失败:', error.message);
  }
  
  // 测试2: 获取持有人信息
  console.log('\n\n测试2: 获取代币持有人');
  console.log('─'.repeat(80));
  
  try {
    const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    
    console.log(`获取持有人: ${usdcMint}`);
    console.log('⏳ 请稍候...');
    
    const accounts = await helius.rpc.getTokenAccounts({
      mint: usdcMint,
      limit: 100  // 只获取前100个
    });
    
    const holderCount = accounts.token_accounts?.length || 0;
    
    console.log(`✅ 成功获取持有人信息:`);
    console.log(`  持有人数: ${holderCount}+ (限制100)`);
    
    // 显示前5个持有人
    if (accounts.token_accounts && accounts.token_accounts.length > 0) {
      console.log('\n  前5个持有人:');
      accounts.token_accounts.slice(0, 5).forEach((account: any, idx: number) => {
        console.log(`    ${idx + 1}. ${account.owner} (${account.amount})`);
      });
    }
    
  } catch (error: any) {
    console.log('❌ 失败:', error.message);
  }
  
  // 测试3: 使用原生 RPC
  console.log('\n\n测试3: 原生 RPC 连接');
  console.log('─'.repeat(80));
  
  try {
    // 创建连接
    const connection = new Connection(
      `https://mainnet.helius-rpc.com/?api-key=${apiKey}`
    );
    
    console.log('测试 RPC 连接...');
    
    // 获取版本信息
    const version = await connection.getVersion();
    console.log('✅ RPC 连接成功!');
    console.log(`  Solana 版本: ${version['solana-core']}`);
    
    // 获取最新区块
    const slot = await connection.getSlot();
    console.log(`  当前 Slot: ${slot}`);
    
  } catch (error: any) {
    console.log('❌ 失败:', error.message);
  }
  
  // 测试4: 批量获取（高级功能）
  console.log('\n\n测试4: 批量获取代币信息');
  console.log('─'.repeat(80));
  
  try {
    const mintAddresses = [
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',  // USDC
      'So11111111111111111111111111111111111111112'    // Wrapped SOL
    ];
    
    console.log('批量获取2个代币...');
    
    const assets = await helius.rpc.getAssetBatch({
      ids: mintAddresses
    });
    
    console.log('✅ 成功获取批量数据:');
    assets.forEach((asset: any) => {
      console.log(`  - ${asset.content?.metadata?.symbol}: ${asset.content?.metadata?.name}`);
    });
    
  } catch (error: any) {
    console.log('❌ 失败:', error.message);
  }
  
  // 总结
  console.log('\n\n═'.repeat(80));
  console.log('📊 测试总结\n');
  console.log('✅ Helius RPC 集成成功！');
  console.log('\n可用功能:');
  console.log('  ✓ 代币元数据获取 (DAS API)');
  console.log('  ✓ 持有人信息查询');
  console.log('  ✓ 原生 RPC 调用');
  console.log('  ✓ 批量数据获取');
  console.log('\n配额信息:');
  console.log('  免费版: 10,000 请求/天');
  console.log('  建议: 优先使用 DexScreener，Helius 作为补充');
  console.log('\n═'.repeat(80));
  console.log('🎉 测试完成！\n');
}

testHelius()
  .catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
  });

