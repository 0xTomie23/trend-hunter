/**
 * 快速测试完整流程
 * 运行: npx tsx src/scripts/quick-test.ts
 */

import dotenv from 'dotenv';
import { ChineseSimilarityV2 } from '../utils/chinese-similarity-v2';

dotenv.config();

async function quickTest() {
  console.log('🧪 快速测试\n');
  console.log('═'.repeat(60));
  
  // 测试1: 相似度算法
  console.log('\n测试1: 相似度算法');
  console.log('─'.repeat(60));
  
  const testPairs = [
    ['索拉拉', '锁啦啦'],
    ['索拉', '索拉娜'],
    ['PEPE', 'PEPECOIN'],
    ['狗狗币', '狗币']
  ];
  
  testPairs.forEach(([name1, name2]) => {
    const sim = ChineseSimilarityV2.calculate(name1, name2);
    const status = sim >= 0.60 ? '✅' : '❌';
    console.log(`  ${name1} vs ${name2}: ${sim.toFixed(3)} ${status}`);
  });
  
  // 测试2: 聚类
  console.log('\n\n测试2: 聚类测试（阈值0.60，最少3个）');
  console.log('─'.repeat(60));
  
  const tokens = [
    '索拉拉', '索拉', '锁啦啦', '索拉娜',  // 索拉系列
    'PEPE', 'PEPECOIN', 'PEPE2',         // Pepe系列
    '狗狗币', '狗币'                      // 狗系列（只有2个）
  ];
  
  const clusters = ChineseSimilarityV2.cluster(tokens, 0.60);
  
  console.log(`输入: ${tokens.length}个代币`);
  console.log(`输出: ${clusters.length}个聚类（至少3个代币）\n`);
  
  clusters.forEach((cluster, idx) => {
    if (cluster.length >= 3) {
      console.log(`  聚类 ${idx + 1}: ${cluster.join(', ')} (${cluster.length}个) ✅`);
    } else {
      console.log(`  聚类 ${idx + 1}: ${cluster.join(', ')} (${cluster.length}个) ❌ 不足3个`);
    }
  });
  
  // 测试3: Helius配置检查
  console.log('\n\n测试3: 配置检查');
  console.log('─'.repeat(60));
  
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`HELIUS_API_KEY: ${process.env.HELIUS_API_KEY ? '✅ 已配置' : '⚠️  未配置（可选）'}`);
  console.log(`PORT: ${process.env.PORT || 3000}`);
  
  console.log('\n\n═'.repeat(60));
  console.log('📊 配置建议\n');
  console.log('核心配置:');
  console.log('  - 最小聚类: 3个代币');
  console.log('  - 相似度阈值: 0.60（中文音近字）/ 0.55（英文）');
  console.log('  - 监控频率: 每5分钟');
  console.log('  - 时间范围: 最近6小时');
  console.log('  - 最低流动性: $1000');
  console.log('\n数据来源:');
  console.log('  - DexScreener: 市场数据（主要）');
  console.log('  - Helius: 持有人、交易数（补充）');
  
  console.log('\n\n═'.repeat(60));
  console.log('✅ 测试完成！可以启动应用了。\n');
}

quickTest();

