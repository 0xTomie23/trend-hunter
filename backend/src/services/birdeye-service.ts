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
  
  constructor() {
    const apiKey = process.env.BIRDEYE_API_KEY;
    
    if (!apiKey) {
      throw new Error('BIRDEYE_API_KEY is required');
    }
    
    this.apiKey = apiKey;
    logger.info('✅ Birdeye API initialized');
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
      
    } catch (error) {
      logger.error('Failed to get recent tokens from Birdeye:', error);
      return [];
    }
  }
  
  /**
   * 获取代币完整信息（整合所有数据）
   */
  async getTokenFullInfo(mintAddress: string) {
    try {
      logger.info(`Fetching full info for ${mintAddress} from Birdeye...`);
      
      // 优先使用 token_overview（一次调用获取大部分数据）
      let overview = null;
      try {
        overview = await this.request('/defi/token_overview', {
          address: mintAddress
        });
      } catch (error: any) {
        if (error.response?.status !== 429) {
          logger.warn('token_overview failed, using separate APIs');
        }
      }
      
      // 如果 overview 成功，优先使用它的数据
      if (overview?.success && overview.data) {
        const data = overview.data;
        
        return {
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
      }
      
      // 如果 overview 失败，降级使用价格 API（更稳定）
      const priceData = await this.getTokenPrice(mintAddress);
      
      if (priceData) {
        return {
          mintAddress,
          name: 'Unknown',
          symbol: '???',
          decimals: 9,
          logoUri: null,
          supply: 0,
          
          price: priceData.price,
          priceChange24h: priceData.priceChange24h,
          marketCap: 0,
          volume24h: 0,
          fdv: 0,
          liquidity: priceData.liquidity,
          
          holderCount: 0,
          transactionCount24h: 0
        };
      }
      
      return null;
      
    } catch (error) {
      logger.error(`Failed to get full info from Birdeye for ${mintAddress}:`, error);
      return null;
    }
  }
}

