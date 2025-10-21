/**
 * 测试相似度算法
 * 运行: npx tsx src/scripts/test-similarity.ts
 */

import stringSimilarity from 'string-similarity';

// 模拟代币数据
const testTokens = [
  { symbol: 'PEPE', name: 'Pepe Coin' },
  { symbol: 'PEPECOIN', name: 'Pepe Token' },
  { symbol: 'PEPE2', name: 'Pepe 2.0' },
  { symbol: 'BONK', name: 'Bonk Inu' },
  { symbol: 'BONKCOIN', name: 'Bonk Coin' },
  { symbol: 'DOGE', name: 'Doge Coin' },
  { symbol: 'SHIB', name: 'Shiba Inu' },
];

// 标准化函数
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '')
    .trim();
}

// 提取关键词
function extractKeywords(token: any): string[] {
  const keywords = new Set<string>();
  
  if (token.symbol) {
    keywords.add(normalize(token.symbol));
  }
  
  const cleanName = normalize(token.name);
  const words = cleanName.split(/(?=[A-Z])|[\s_-]+/).filter((w: string) => w.length >= 2);
  words.forEach((w: string) => keywords.add(w));
  
  return Array.from(keywords);
}

// 计算相似度
function calculateSimilarity(token1: any, token2: any): number {
  const symbolSim = stringSimilarity.compareTwoStrings(
    normalize(token1.symbol),
    normalize(token2.symbol)
  );
  
  const nameSim = stringSimilarity.compareTwoStrings(
    normalize(token1.name),
    normalize(token2.name)
  );
  
  const keywords1 = extractKeywords(token1);
  const keywords2 = extractKeywords(token2);
  const commonKeywords = keywords1.filter(k => keywords2.includes(k));
  const keywordScore = commonKeywords.length > 0 ? 0.4 : 0;
  
  const name1 = normalize(token1.name);
  const name2 = normalize(token2.name);
  const containsBonus = (name1.includes(name2) || name2.includes(name1)) ? 0.2 : 0;
  
  return symbolSim * 0.5 + nameSim * 0.3 + keywordScore * 0.15 + containsBonus * 0.05;
}

// 聚类算法
function clusterTokens(tokens: any[], threshold: number = 0.55): any[][] {
  const clusters: any[][] = [];
  const processed = new Set<number>();
  
  for (let i = 0; i < tokens.length; i++) {
    if (processed.has(i)) continue;
    
    const cluster = [tokens[i]];
    processed.add(i);
    
    for (let j = i + 1; j < tokens.length; j++) {
      if (processed.has(j)) continue;
      
      const similarity = calculateSimilarity(tokens[i], tokens[j]);
      
      if (similarity > threshold) {
        cluster.push(tokens[j]);
        processed.add(j);
        console.log(`  🔗 ${tokens[i].symbol} <-> ${tokens[j].symbol}: ${similarity.toFixed(3)}`);
      }
    }
    
    if (cluster.length >= 2) {
      clusters.push(cluster);
    }
  }
  
  return clusters;
}

// 运行测试
console.log('🧪 测试相似度算法\n');
console.log('━'.repeat(60));
console.log('测试代币:');
testTokens.forEach(t => console.log(`  ${t.symbol.padEnd(12)} - ${t.name}`));
console.log('━'.repeat(60));

console.log('\n📊 相似度矩阵:');
console.log('');

for (let i = 0; i < testTokens.length; i++) {
  for (let j = i + 1; j < testTokens.length; j++) {
    const sim = calculateSimilarity(testTokens[i], testTokens[j]);
    if (sim > 0.3) {
      console.log(
        `${testTokens[i].symbol.padEnd(12)} <-> ${testTokens[j].symbol.padEnd(12)}: ${sim.toFixed(3)} ${sim > 0.55 ? '✅' : '⚠️'}`
      );
    }
  }
}

console.log('\n━'.repeat(60));
console.log('🎯 聚类结果 (阈值 0.55):\n');

const clusters = clusterTokens(testTokens);

clusters.forEach((cluster, idx) => {
  console.log(`📦 聚类 ${idx + 1}: ${cluster.length} 个代币`);
  cluster.forEach(token => {
    console.log(`   - ${token.symbol}: ${token.name}`);
  });
  console.log('');
});

console.log('━'.repeat(60));
console.log(`✨ 总共发现 ${clusters.length} 个热点话题\n`);

