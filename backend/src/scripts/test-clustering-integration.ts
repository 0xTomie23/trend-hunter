/**
 * 测试聚类集成
 * 从 Birdeye 获取新币，然后调用 Python 聚类算法
 */

import axios from 'axios';
import { birdeyeService, clusteringService, multiApiService } from '../services';
import { logger } from '../utils/logger';

async function testClusteringWithNewTokens() {
  try {
    logger.info('🧪 Testing clustering with new tokens from Birdeye...\n');

    // 1. 从 Birdeye 获取最近6小时的代币
    logger.info('1️⃣ Fetching new tokens from Birdeye (last 6 hours)...');
    const recentTokens = await birdeyeService.getRecentTokens(6);

    if (recentTokens.length === 0) {
      logger.warn('No new tokens found in the last 6 hours');
      logger.info('\n💡 Tip: Try using specific mint addresses instead\n');
      return;
    }

    logger.info(`✅ Found ${recentTokens.length} new tokens\n`);

    // 显示获取的代币
    logger.info('📋 New tokens:');
    recentTokens.slice(0, 10).forEach((token: any, index: number) => {
      logger.info(`  ${index + 1}. ${token.name} (${token.symbol})`);
      logger.info(`     Mint: ${token.mintAddress}`);
    });
    logger.info('');

    // 2. 提取 name 和 symbol
    const tokensForClustering = recentTokens
      .map((token: any) => ({
        name: token.name || 'Unknown',
        symbol: token.symbol || '???',
      }))
      .filter((t: any) => t.name !== 'Unknown' && t.symbol !== '???')
      .slice(0, 20); // 限制数量，避免API过载

    logger.info(`📊 Preparing ${tokensForClustering.length} tokens for clustering...\n`);

    // 3. 调用 Python 聚类算法
    logger.info('2️⃣ Calling Python clustering algorithm...\n');
    const clusters = await clusteringService.clusterTokens(tokensForClustering);

    // 4. 显示结果
    logger.info('3️⃣ Clustering Results:\n');
    logger.info('═══════════════════════════════════════════════════');

    for (const cluster of clusters) {
      logger.info(`\n🎯 Topic: ${cluster.topic_name}`);
      logger.info(`   ID: ${cluster.topic_id}`);
      logger.info(`   Tokens: ${cluster.tokens.length}`);
      logger.info(`   Confidence: ${cluster.confidence_score.toFixed(3)}`);
      logger.info(`   Keywords: ${cluster.keywords.slice(0, 5).join(', ')}`);

      if (cluster.cluster_info.themes && cluster.cluster_info.themes.length > 0) {
        logger.info(`   Themes: ${cluster.cluster_info.themes.join(', ')}`);
      }

      logger.info(`   Tokens in this cluster:`);
      cluster.tokens.slice(0, 5).forEach((token, i) => {
        logger.info(`     ${i + 1}. ${token.name} (${token.symbol})`);
      });
    }

    logger.info('\n═══════════════════════════════════════════════════');
    logger.info(`✅ Summary: ${tokensForClustering.length} tokens clustered into ${clusters.length} topics\n`);

  } catch (error) {
    logger.error('❌ Test failed:', error);
  }
}

async function testClusteringWithSpecificAddresses() {
  try {
    logger.info('🧪 Testing clustering with specific mint addresses...\n');

    // 测试用的 mint addresses（可以是任何 Solana 代币地址）
    const testAddresses = [
      'So11111111111111111111111111111111111111112', // SOL
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    ];

    logger.info('1️⃣ Fetching token info for test addresses...\n');

    const tokensData: { name: string; symbol: string; mintAddress: string }[] = [];

    for (const address of testAddresses) {
      const basicInfo = await multiApiService.getTokenBasicInfoForClustering(address);

      if (basicInfo) {
        logger.info(`  ✅ ${basicInfo.name} (${basicInfo.symbol})`);
        tokensData.push({
          name: basicInfo.name,
          symbol: basicInfo.symbol,
          mintAddress: address,
        });
      } else {
        logger.warn(`  ⚠️ Failed to get info for ${address}`);
      }
    }

    logger.info(`\n📦 Got info for ${tokensData.length} tokens\n`);

    if (tokensData.length === 0) {
      logger.error('No valid tokens found');
      return;
    }

    // 2. 调用聚类算法
    logger.info('2️⃣ Calling Python clustering algorithm...\n');
    const tokensForClustering = tokensData.map((t) => ({
      name: t.name,
      symbol: t.symbol,
    }));

    const clusters = await clusteringService.clusterTokens(tokensForClustering);

    // 3. 显示结果
    logger.info('3️⃣ Clustering Results:\n');
    logger.info('═══════════════════════════════════════════════════');

    for (const cluster of clusters) {
      logger.info(`\n🎯 Topic: ${cluster.topic_name}`);
      logger.info(`   Tokens: ${cluster.tokens.length}`);
      logger.info(`   Confidence: ${cluster.confidence_score.toFixed(3)}`);
      logger.info(`   Keywords: ${cluster.keywords.join(', ')}`);
      logger.info(`   Tokens in this cluster:`);
      cluster.tokens.forEach((token, i) => {
        logger.info(`     ${i + 1}. ${token.name} (${token.symbol})`);
      });
    }

    logger.info('\n═══════════════════════════════════════════════════');
    logger.info(`✅ Summary: ${tokensData.length} tokens clustered into ${clusters.length} topics\n`);

  } catch (error) {
    logger.error('❌ Test failed:', error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'new-tokens';

  if (testType === 'new-tokens') {
    await testClusteringWithNewTokens();
  } else if (testType === 'addresses') {
    await testClusteringWithSpecificAddresses();
  } else {
    logger.info('Usage:');
    logger.info('  npm run test:clustering new-tokens  # Test with new tokens from Birdeye');
    logger.info('  npm run test:clustering addresses   # Test with specific addresses');
  }
}

main()
  .then(() => {
    logger.info('Test completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Test failed:', error);
    process.exit(1);
  });

