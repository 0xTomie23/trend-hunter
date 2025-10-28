import axios from 'axios';
import { logger } from '../utils/logger';

/**
 * Birdeye API 服务
 * 用于获取 Solana 代币的完整信息
 * 
 * API 文档: https://docs.birdeye.so/
 */
export class BirdeyeService {
  private apiKey: string;
  private baseUrl: string = 'https://public-api.birdeye.so';
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5000; // 5秒缓存
  
  constructor() {
    const apiKey = process.env.BIRDEYE_API_KEY;
    
    if (!apiKey) {
      throw new Error('BIRDEYE_API_KEY is required');
    }
    
    this.apiKey = apiKey;
    logger.info('✅ Birdeye API initialized');
  }
  
  /**
   * 获取缓存数据
   */
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  /**
   * 设置缓存数据
   */
  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 通用请求方法（带限流和重试）
   */
  private async request(endpoint: string, params: any = {}) {
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: {
          'X-API-KEY': this.apiKey,
          'accept': 'application/json'
        },
        params,
        timeout: 10000
      });
      
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        logger.warn(`Birdeye rate limit hit [${endpoint}], retrying in 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 重试一次
        try {
          const response = await axios.get(`${this.baseUrl}${endpoint}`, {
            headers: { 'X-API-KEY': this.apiKey },
            params,
            timeout: 10000
          });
          return response.data;
        } catch (retryError) {
          logger.error(`Birdeye retry failed [${endpoint}]`);
          throw retryError;
        }
      }
      
      logger.error(`Birdeye API error [${endpoint}]:`, error.message);
      throw error;
    }
  }
  
  /**
   * ============================================
   * TODO: 填入你的 Birdeye API 端点
   * ============================================
   */
  
  /**
   * 获取代币价格信息
   * Birdeye API: /defi/price
   */
  async getTokenPrice(mintAddress: string) {
    try {
      const data = await this.request('/defi/price', {
        address: mintAddress
      });
      
      // 根据你提供的返回格式解析
      if (!data.success || !data.data) {
        return null;
      }
      
      return {
        price: data.data.value || 0,
        priceChange24h: data.data.priceChange24h || 0,
        liquidity: data.data.liquidity || 0,
        updateTime: data.data.updateUnixTime || Date.now() / 1000
      };
      
    } catch (error) {
      logger.error(`Failed to get token price for ${mintAddress}:`, error);
      return null;
    }
  }
  
  /**
   * 获取代币元数据
   * Birdeye API: /defi/v3/token/meta-data/single
   */
  async getTokenMetadata(mintAddress: string) {
    try {
      const data = await this.request('/defi/v3/token/meta-data/single', {
        address: mintAddress
      });
      
      if (!data.success || !data.data) return null;
      
      return {
        name: data.data.name || 'Unknown',
        symbol: data.data.symbol || '???',
        decimals: data.data.decimals || 9,
        logoUri: data.data.logoURI || data.data.logo || null,
        supply: data.data.supply || data.data.realSupply || 0
      };
      
    } catch (error) {
      logger.error(`Failed to get token metadata for ${mintAddress}:`, error);
      return null;
    }
  }
  
  /**
   * 获取代币市场数据
   * Birdeye API: /defi/token_overview
   */
  async getTokenMarketData(mintAddress: string) {
    try {
      const data = await this.request('/defi/token_overview', {
        address: mintAddress
      });
      
      if (!data.success || !data.data) return null;
      
      return {
        marketCap: data.data.mc || data.data.marketCap || 0,
        volume24h: data.data.v24h || data.data.v24hUSD || 0,
        fdv: data.data.fdv || 0
      };
      
    } catch (error) {
      logger.error(`Failed to get market data for ${mintAddress}:`, error);
      return null;
    }
  }
  
  /**
   * 获取持有人数量
   * Birdeye API: /defi/token_overview
   */
  async getHolderCount(mintAddress: string): Promise<number> {
    try {
      const data = await this.request('/defi/token_overview', {
        address: mintAddress
      });
      
      if (!data.success || !data.data) return 0;
      
      return data.data.holder || data.data.holders || data.data.uniqueWallet24h || 0;
      
    } catch (error) {
      logger.error(`Failed to get holder count for ${mintAddress}:`, error);
      return 0;
    }
  }
  
  /**
   * 获取交易数据
   * Birdeye API: /defi/token_overview
   */
  async getTransactionCount(mintAddress: string): Promise<number> {
    try {
      const data = await this.request('/defi/token_overview', {
        address: mintAddress
      });
      
      if (!data.success || !data.data) return 0;
      
      return data.data.trade24h || data.data.numberMarkets || 0;
      
    } catch (error) {
      logger.error(`Failed to get transaction count for ${mintAddress}:`, error);
      return 0;
    }
  }
  
  /**
   * 获取最近创建的代币
   * Birdeye API: /defi/v2/tokens/new_listing
   */
  async getRecentTokens(hours: number = 6) {
    try {
      const data = await this.request('/defi/v2/tokens/new_listing', {
        sort_by: 'listing_time',
        sort_type: 'desc',
        offset: 0,
        limit: 50  // 减少数量避免限流
      });
      
      if (!data.success || !data.data || !data.data.items) {
        logger.warn('Birdeye new_listing returned no data');
        return [];
      }
      
      const tokens = data.data.items || [];
      logger.info(`Birdeye returned ${tokens.length} new tokens`);
      
      // 过滤最近N小时的代币
      const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
      const recentTokens = tokens.filter((token: any) => {
        const createdAt = token.listing_time ? token.listing_time * 1000 : 0;
        return createdAt > cutoffTime;
      });
      
      logger.info(`Found ${recentTokens.length} tokens in last ${hours} hours`);
      
      // 转换为标准格式
      const result = recentTokens.map((token: any) => ({
        mintAddress: token.address,
        name: token.name || 'Unknown',
        symbol: token.symbol || '???',
        logoUri: token.logoURI || token.icon || null,
        price: token.price || 0,
        marketCap: token.mc || 0,
        liquidity: token.liquidity || 0,
        volume24h: token.v24hUSD || token.v24h || 0,
        priceChange24h: token.priceChange24hPercent || token.priceChange24h || 0,
        createdAt: token.listing_time ? token.listing_time * 1000 : Date.now()
      }));
      
      return result;
      
    } catch (error: any) {
      logger.error(`Failed to get recent tokens from Birdeye: ${error.message || error}`);
      return [];
    }
  }
  
  /**
   * 快速获取代币基本信息（名字、符号、图片）- 优先级最高
   * 用于快速显示代币基本信息
   */
  async getTokenBasicInfo(mintAddress: string) {
    try {
      logger.info(`Fetching basic info for ${mintAddress}...`);
      
      // 只调用 DexScreener 获取基本信息（速度快）
      const dexData = await this.getDexScreenerData(mintAddress);
      
      if (dexData) {
        return {
          mintAddress,
          name: dexData.name || 'Unknown',
          symbol: dexData.symbol || '???',
          decimals: 9,
          logoUri: dexData.logoUri || null
        };
      }
      
      return null;
    } catch (error) {
      logger.error(`Failed to get basic info for ${mintAddress}:`, error);
      return null;
    }
  }

  /**
   * 获取代币完整信息（整合所有数据）
   * 使用 Birdeye (免费API) + DexScreener (补充)
   */
  async getTokenFullInfo(mintAddress: string) {
    try {
      // 检查缓存
      const cacheKey = `full_${mintAddress}`;
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        logger.info(`📦 Using cached data for ${mintAddress}`);
        return cachedData;
      }

      logger.info(`Fetching full info for ${mintAddress}...`);
      
      // 方案1: 先尝试 Birdeye token_overview
      try {
        const overview = await this.request('/defi/token_overview', {
          address: mintAddress
        });
        
        if (overview?.success && overview.data) {
          const data = overview.data;
          logger.info(`✅ Got full data from Birdeye token_overview`);
          
          const result = {
            mintAddress,
            name: data.name || 'Unknown',
            symbol: data.symbol || '???',
            decimals: data.decimals || 9,
            logoUri: data.logoURI || data.logo || null,
            supply: data.supply || data.realSupply || 0,
            
            price: data.price || 0,
            priceChange24h: data.priceChange24h || 0,
            marketCap: data.mc || 0,
            volume24h: data.v24hUSD || 0,
            fdv: data.fdv || 0,
            liquidity: data.liquidity || 0,
            
            holderCount: data.holder || 0,
            transactionCount24h: data.trade24h || 0
          };
          
          // 缓存结果
          this.setCachedData(cacheKey, result);
          return result;
        }
      } catch (error: any) {
        if (error.response?.status === 401) {
          logger.warn('Birdeye token_overview requires paid plan, using fallback');
        }
      }
      
      // 方案2: 使用 Birdeye price (免费) + DexScreener (补充)
      logger.info('Using Birdeye price + DexScreener...');
      
      const [priceData, dexData] = await Promise.all([
        this.getTokenPrice(mintAddress),
        this.getDexScreenerData(mintAddress)
      ]);
      
      const result = {
        mintAddress,
        
        // 从 DexScreener 获取基础信息
        name: dexData?.name || 'Unknown',
        symbol: dexData?.symbol || '???',
        decimals: 9,
        logoUri: dexData?.logoUri || null,
        supply: 0,
        
        // 从 Birdeye 获取价格（更准确）
        price: priceData?.price || dexData?.price || 0,
        priceChange24h: priceData?.priceChange24h || dexData?.priceChange24h || 0,
        
        // 从 DexScreener 获取市场数据
        marketCap: dexData?.marketCap || 0,
        volume24h: dexData?.volume24h || 0,
        fdv: dexData?.fdv || 0,
        
        // 流动性优先用 Birdeye
        liquidity: priceData?.liquidity || dexData?.liquidity || 0,
        
        // DexScreener 不提供这些数据
        holderCount: 0,
        transactionCount24h: 0
      };
      
      // 缓存结果
      this.setCachedData(cacheKey, result);
      return result;
      
    } catch (error) {
      logger.error(`Failed to get full info for ${mintAddress}:`, error);
      return null;
    }
  }
  
  /**
   * 从 DexScreener 获取代币数据（补充）
   */
  private async getDexScreenerData(mintAddress: string) {
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
        price: mainPair.priceUsd ? parseFloat(mainPair.priceUsd) : 0,
        marketCap: mainPair.marketCap || 0,
        liquidity: mainPair.liquidity?.usd || 0,
        volume24h: mainPair.volume?.h24 || 0,
        priceChange24h: mainPair.priceChange?.h24 || 0,
        fdv: mainPair.fdv || 0
      };
    } catch (error) {
      logger.error('DexScreener fallback failed:', error);
      return null;
    }
  }
}

