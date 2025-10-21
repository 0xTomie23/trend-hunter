import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import { ChainDataService } from './chain-data';
import stringSimilarity from 'string-similarity';
import { io } from '../index';

export class MatchingEngine {
  private chainDataService: ChainDataService;
  
  constructor(chainDataService: ChainDataService) {
    this.chainDataService = chainDataService;
  }
  
  /**
   * Match a hot topic with tokens
   */
  async matchTopic(topicId: number) {
    const topic = await prisma.hotTopic.findUnique({
      where: { id: topicId }
    });
    
    if (!topic) {
      logger.error(`Topic ${topicId} not found`);
      return;
    }
    
    logger.info(`Matching topic: ${topic.keyword}`);
    
    // Search for tokens
    const pairs = await this.chainDataService.searchTokens(topic.keyword);
    
    if (pairs.length === 0) {
      logger.info(`No tokens found for topic: ${topic.keyword}`);
      return;
    }
    
    logger.info(`Found ${pairs.length} potential token matches`);
    
    // Process each pair
    for (const pair of pairs) {
      try {
        await this.processMatch(topic, pair);
      } catch (error) {
        logger.error(`Failed to process match for ${pair.baseToken.address}:`, error);
      }
    }
  }
  
  /**
   * Process a single match
   */
  private async processMatch(topic: any, pair: any) {
    const mintAddress = pair.baseToken.address;
    
    // Get or create token
    const token = await this.chainDataService.getOrCreateToken(mintAddress);
    
    // Calculate match score
    const matchScore = this.calculateMatchScore(
      topic.keyword,
      token.name,
      token.symbol,
      pair
    );
    
    // Only save matches with score > 0.3
    if (matchScore < 0.3) {
      logger.debug(`Low match score (${matchScore}) for ${token.symbol}, skipping`);
      return;
    }
    
    // Determine match type
    const matchType = this.determineMatchType(topic.keyword, token.name, token.symbol);
    
    // Save or update match
    const match = await prisma.topicTokenMatch.upsert({
      where: {
        topicId_tokenId: {
          topicId: topic.id,
          tokenId: token.id
        }
      },
      create: {
        topicId: topic.id,
        tokenId: token.id,
        matchScore,
        matchType
      },
      update: {
        matchScore,
        matchType
      }
    });
    
    logger.info(
      `Matched topic "${topic.keyword}" with token ${token.symbol} (score: ${matchScore})`
    );
    
    // Update market data
    await this.chainDataService.updateTokenMarketData(token.id, mintAddress);
    
    // Broadcast match
    io.to('hot-topics').emit('token_matched', {
      topic,
      token,
      match
    });
  }
  
  /**
   * Calculate match score
   */
  private calculateMatchScore(
    keyword: string,
    tokenName: string,
    tokenSymbol: string,
    pairData: any
  ): number {
    // Text similarity
    const nameScore = stringSimilarity.compareTwoStrings(
      keyword.toLowerCase(),
      tokenName.toLowerCase()
    );
    
    const symbolScore = stringSimilarity.compareTwoStrings(
      keyword.toLowerCase(),
      tokenSymbol.toLowerCase()
    );
    
    const textSimilarity = Math.max(nameScore, symbolScore);
    
    // Check for exact match or containment
    const keywordLower = keyword.toLowerCase();
    const nameLower = tokenName.toLowerCase();
    const symbolLower = tokenSymbol.toLowerCase();
    
    let exactnessBonus = 0;
    if (keywordLower === nameLower || keywordLower === symbolLower) {
      exactnessBonus = 0.3;
    } else if (nameLower.includes(keywordLower) || symbolLower.includes(keywordLower)) {
      exactnessBonus = 0.15;
    }
    
    // Market quality score (0-1)
    const qualityScore = this.calculateQualityScore(pairData);
    
    // Weighted final score
    const finalScore = (
      textSimilarity * 0.4 +
      exactnessBonus +
      qualityScore * 0.3
    );
    
    return Math.min(finalScore, 1);
  }
  
  /**
   * Calculate quality score based on market metrics
   */
  private calculateQualityScore(pairData: any): number {
    let score = 0;
    
    // Liquidity (20%)
    const liquidity = pairData.liquidity?.usd || 0;
    if (liquidity > 100000) score += 0.2;
    else if (liquidity > 50000) score += 0.15;
    else if (liquidity > 10000) score += 0.1;
    else if (liquidity > 5000) score += 0.05;
    
    // Volume (10%)
    const volume24h = pairData.volume?.h24 || 0;
    if (volume24h > 50000) score += 0.1;
    else if (volume24h > 10000) score += 0.05;
    
    // Market cap (10%)
    const marketCap = pairData.marketCap || 0;
    if (marketCap > 1000000) score += 0.1;
    else if (marketCap > 100000) score += 0.05;
    
    return Math.min(score, 0.4);
  }
  
  /**
   * Determine match type
   */
  private determineMatchType(keyword: string, name: string, symbol: string): string {
    const keywordLower = keyword.toLowerCase();
    const nameLower = name.toLowerCase();
    const symbolLower = symbol.toLowerCase();
    
    if (keywordLower === nameLower || keywordLower === symbolLower) {
      return 'exact';
    } else if (nameLower.includes(keywordLower) || symbolLower.includes(keywordLower)) {
      return 'contains';
    } else {
      return 'fuzzy';
    }
  }
}

