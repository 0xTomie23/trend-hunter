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
  private helius?: Helius;
  private hasHelius: boolean;
  
  constructor() {
    const apiKey = process.env.HELIUS_API_KEY;
    
    if (apiKey) {
      this.helius = new Helius(apiKey);
      this.hasHelius = true;
      logger.info('✅ Helius RPC initialized');
    } else {
      this.hasHelius = false;
      logger.warn('⚠️  HELIUS_API_KEY not set - using DexScreener only');
    }
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
   * 获取代币完整信息（从 DexScreener + Helius）
   */
  async getTokenFullInfo(mintAddress: string) {
    try {
      // 1. 从 DexScreener 获取市场数据
      const dexData = await this.getTokenFromDexScreener(mintAddress);
      
      // 2. 从 Helius 获取链上数据（如果可用）
      let heliusData = null;
      if (this.hasHelius) {
        heliusData = await this.getTokenMetadata(mintAddress);
      }
      
      // 3. 合并数据
      return {
        mintAddress,
        name: heliusData?.name || dexData?.name || 'Unknown',
        symbol: heliusData?.symbol || dexData?.symbol || '???',
        decimals: heliusData?.decimals || 9,
        logoUri: heliusData?.logoUri || dexData?.logoUri,
        description: heliusData?.description,
        creatorAddress: heliusData?.creator,
        
        // 市场数据（来自 DexScreener）
        price: dexData?.price,
        marketCap: dexData?.marketCap,
        liquidity: dexData?.liquidity,
        volume24h: dexData?.volume24h,
        priceChange24h: dexData?.priceChange24h,
        
        // 持有人数据（来自 Helius）
        holderCount: this.hasHelius ? await this.getHolderCount(mintAddress) : 0,
        
        tokenCreatedAt: heliusData?.createdAt || new Date()
      };
    } catch (error) {
      logger.error(`Failed to get full token info for ${mintAddress}:`, error);
      return null;
    }
  }
  
  /**
   * 从 DexScreener 获取代币数据
   */
  private async getTokenFromDexScreener(mintAddress: string) {
    try {
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`
      );
      
      const pairs = response.data?.pairs || [];
      if (pairs.length === 0) return null;
      
      // 使用流动性最高的交易对
      const mainPair = pairs.sort((a: any, b: any) => 
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      )[0];
      
      return {
        name: mainPair.baseToken?.name,
        symbol: mainPair.baseToken?.symbol,
        logoUri: mainPair.info?.imageUrl,
        price: mainPair.priceUsd ? parseFloat(mainPair.priceUsd) : null,
        marketCap: mainPair.marketCap,
        liquidity: mainPair.liquidity?.usd,
        volume24h: mainPair.volume?.h24,
        priceChange24h: mainPair.priceChange?.h24,
        pairAddress: mainPair.pairAddress,
        dex: mainPair.dexId
      };
    } catch (error) {
      logger.error(`Failed to get DexScreener data for ${mintAddress}:`, error);
      return null;
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
      // 获取完整信息
      const fullInfo = await this.getTokenFullInfo(mintAddress);
      
      if (!fullInfo) {
        logger.warn(`Cannot get info for ${mintAddress}`);
        return null;
      }
      
      token = await prisma.token.create({
        data: {
          mintAddress,
          name: fullInfo.name,
          symbol: fullInfo.symbol,
          decimals: fullInfo.decimals,
          logoUri: fullInfo.logoUri,
          description: fullInfo.description,
          creatorAddress: fullInfo.creatorAddress,
          tokenCreatedAt: fullInfo.tokenCreatedAt
        }
      });
      
      logger.info(`Created token: ${token.name} (${token.symbol})`);
    }
    
    return token;
  }
  
  /**
   * Get token metadata from Helius
   * 如果没有 Helius API Key，返回 null
   */
  async getTokenMetadata(mintAddress: string) {
    if (!this.hasHelius || !this.helius) {
      logger.debug('Helius not available, skipping metadata fetch');
      return null;
    }
    
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
      return null;
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
   * 如果没有 Helius，返回 0
   */
  async getHolderCount(mintAddress: string): Promise<number> {
    if (!this.hasHelius || !this.helius) {
      return 0;
    }
    
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

