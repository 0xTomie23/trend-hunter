import { Helius } from 'helius-sdk';
import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';
import axios from 'axios';
import { io } from '../index';

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd?: string;
  liquidity?: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv?: number;
  marketCap?: number;
  volume?: {
    h24: number;
  };
  priceChange?: {
    h24: number;
  };
}

export class ChainDataService {
  private helius: Helius;
  
  constructor() {
    const apiKey = process.env.HELIUS_API_KEY;
    if (!apiKey) {
      throw new Error('HELIUS_API_KEY is required');
    }
    
    this.helius = new Helius(apiKey);
  }
  
  /**
   * Search tokens by keyword
   */
  async searchTokens(keyword: string): Promise<DexScreenerPair[]> {
    try {
      logger.info(`Searching tokens for keyword: ${keyword}`);
      
      const response = await axios.get(
        `${process.env.DEXSCREENER_API_URL || 'https://api.dexscreener.com/latest'}/dex/search`,
        {
          params: { q: keyword }
        }
      );
      
      const pairs = response.data.pairs || [];
      const solanaPairs = pairs.filter((p: DexScreenerPair) => p.chainId === 'solana');
      
      logger.info(`Found ${solanaPairs.length} Solana pairs for "${keyword}"`);
      
      return solanaPairs;
    } catch (error) {
      logger.error(`Failed to search tokens for "${keyword}":`, error);
      return [];
    }
  }
  
  /**
   * Get or create token in database
   */
  async getOrCreateToken(mintAddress: string): Promise<any> {
    let token = await prisma.token.findUnique({
      where: { mintAddress }
    });
    
    if (!token) {
      // Fetch token metadata from Helius
      const metadata = await this.getTokenMetadata(mintAddress);
      
      token = await prisma.token.create({
        data: {
          mintAddress,
          name: metadata.name || 'Unknown',
          symbol: metadata.symbol || 'UNKNOWN',
          decimals: metadata.decimals || 9,
          logoUri: metadata.logoUri,
          description: metadata.description,
          creatorAddress: metadata.creator,
          tokenCreatedAt: metadata.createdAt
        }
      });
      
      logger.info(`Created token: ${token.name} (${token.symbol})`);
    }
    
    return token;
  }
  
  /**
   * Get token metadata from Helius
   */
  private async getTokenMetadata(mintAddress: string) {
    try {
      const asset = await this.helius.rpc.getAsset({
        id: mintAddress
      });
      
      return {
        name: asset.content?.metadata?.name,
        symbol: asset.content?.metadata?.symbol,
        logoUri: asset.content?.files?.[0]?.uri || asset.content?.links?.image,
        description: asset.content?.metadata?.description,
        creator: asset.creators?.[0]?.address,
        createdAt: asset.created_at ? new Date(asset.created_at) : null
      };
    } catch (error) {
      logger.error(`Failed to get metadata for ${mintAddress}:`, error);
      return {
        name: null,
        symbol: null,
        logoUri: null,
        description: null,
        creator: null,
        createdAt: null
      };
    }
  }
  
  /**
   * Update market data for a token
   */
  async updateTokenMarketData(tokenId: number, mintAddress: string) {
    try {
      // Get data from DexScreener
      const response = await axios.get(
        `${process.env.DEXSCREENER_API_URL || 'https://api.dexscreener.com/latest'}/dex/tokens/${mintAddress}`
      );
      
      const pairs = response.data.pairs || [];
      if (pairs.length === 0) {
        logger.warn(`No pairs found for token ${mintAddress}`);
        return;
      }
      
      // Use the pair with highest liquidity
      const mainPair = pairs.sort((a: any, b: any) => 
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      )[0];
      
      // Get holder count from Helius
      const holderCount = await this.getHolderCount(mintAddress);
      
      // Save market data
      const marketData = await prisma.tokenMarketData.create({
        data: {
          tokenId,
          marketCap: mainPair.marketCap || null,
          price: mainPair.priceUsd || null,
          priceChange24h: mainPair.priceChange?.h24 || null,
          volume24h: mainPair.volume?.h24 || null,
          holderCount,
          liquidityUsd: mainPair.liquidity?.usd || null,
          fdv: mainPair.fdv || null
        }
      });
      
      // Update or create liquidity pool
      await prisma.liquidityPool.upsert({
        where: {
          poolAddress_dex: {
            poolAddress: mainPair.pairAddress,
            dex: mainPair.dexId
          }
        },
        create: {
          tokenId,
          poolAddress: mainPair.pairAddress,
          dex: mainPair.dexId,
          baseToken: mainPair.baseToken.address,
          quoteToken: mainPair.quoteToken.address,
          liquidityUsd: mainPair.liquidity?.usd || null,
          volume24h: mainPair.volume?.h24 || null
        },
        update: {
          liquidityUsd: mainPair.liquidity?.usd || null,
          volume24h: mainPair.volume?.h24 || null
        }
      });
      
      logger.info(`Updated market data for token ${mintAddress}`);
      
      // Broadcast update
      io.to(`token:${mintAddress}`).emit('market_update', marketData);
      
      return marketData;
    } catch (error) {
      logger.error(`Failed to update market data for ${mintAddress}:`, error);
    }
  }
  
  /**
   * Get holder count for a token
   */
  private async getHolderCount(mintAddress: string): Promise<number> {
    try {
      const accounts = await this.helius.rpc.getTokenAccounts({
        mint: mintAddress,
        limit: 1000
      });
      
      return accounts.token_accounts?.length || 0;
    } catch (error) {
      logger.error(`Failed to get holder count for ${mintAddress}:`, error);
      return 0;
    }
  }
  
  /**
   * Update all active tokens
   */
  async updateActiveTokens() {
    // Get tokens that have been matched in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const activeMatches = await prisma.topicTokenMatch.findMany({
      where: {
        matchedAt: {
          gte: oneDayAgo
        }
      },
      include: {
        token: true
      },
      orderBy: {
        matchScore: 'desc'
      },
      take: 50
    });
    
    logger.info(`Updating market data for ${activeMatches.length} active tokens`);
    
    for (const match of activeMatches) {
      try {
        await this.updateTokenMarketData(match.token.id, match.token.mintAddress);
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`Failed to update token ${match.token.mintAddress}:`, error);
      }
    }
  }
}

