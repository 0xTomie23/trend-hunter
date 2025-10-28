import axios from 'axios';
import { logger } from '../utils/logger';

/**
 * Solscan API 服务
 * 用于获取 Solana 代币信息
 * 
 * API 文档: https://pro-api.solscan.io/pro-api-docs/v2.0
 */
export class SolscanService {
  private apiKey: string;
  private baseUrl: string = 'https://pro-api.solscan.io/v2.0';  // 使用 v2.0
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5000; // 5秒缓存
  
  constructor() {
    const apiKey = process.env.SOLSCAN_API_KEY;
    
    if (!apiKey) {
      throw new Error('SOLSCAN_API_KEY is required');
    }
    
    this.apiKey = apiKey;
    logger.info('✅ Solscan API initialized');
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
   * 通用请求方法
   */
  private async request(endpoint: string, params: any = {}) {
    try {
      logger.info(`🔍 Solscan request: ${endpoint}`, { params });
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Token': this.apiKey,  // 尝试大写 Token
          'Accept': 'application/json'
        },
        params,
        timeout: 10000
      });
      
      logger.info(`✅ Solscan response [${endpoint}]: ${response.status}`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        logger.error(`Solscan API error [${endpoint}]: ${error.response.status} - ${error.response.statusText}`);
        logger.error(`Response data:`, error.response.data);
      } else {
        logger.error(`Solscan API error [${endpoint}]:`, error.message);
      }
      throw error;
    }
  }
  
  /**
   * 获取代币价格信息
   * Solscan API v2: /token/price?address=xxx
   */
  async getTokenPrice(mintAddress: string) {
    const cacheKey = `price_${mintAddress}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.request('/token/price', {
        address: mintAddress
      });
      
      if (!data || !data.data) return null;
      
      const result = {
        price: data.data?.price || 0,
        priceChange24h: data.data?.price_change_24h || 0,
        liquidity: data.data?.liquidity || 0,
        timestamp: Date.now()
      };
      
      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      logger.error(`Failed to get Solscan price for ${mintAddress}:`, error);
      return null;
    }
  }
  
  /**
   * 获取代币元数据
   * Solscan API v2: /token/meta?address=xxx
   */
  async getTokenMetadata(mintAddress: string) {
    const cacheKey = `metadata_${mintAddress}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.request('/token/meta', {
        address: mintAddress
      });
      
      if (!data || !data.data) return null;
      
      const tokenInfo = data.data;
      const result = {
        name: tokenInfo.name || 'Unknown',
        symbol: tokenInfo.symbol || '???',
        decimals: tokenInfo.decimals || 9,
        logoUri: tokenInfo.icon || null,
        supply: tokenInfo.supply || 0
      };
      
      this.setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      logger.error(`Failed to get Solscan metadata for ${mintAddress}:`, error);
      return null;
    }
  }
  
  /**
   * 获取代币完整信息（价格 + 元数据）
   */
  async getTokenFullInfo(mintAddress: string) {
    try {
      const [priceData, metadata] = await Promise.all([
        this.getTokenPrice(mintAddress),
        this.getTokenMetadata(mintAddress)
      ]);
      
      if (!priceData && !metadata) return null;
      
      return {
        mintAddress,
        name: metadata?.name || 'Unknown',
        symbol: metadata?.symbol || '???',
        decimals: metadata?.decimals || 9,
        logoUri: metadata?.logoUri || null,
        supply: metadata?.supply || 0,
        
        price: priceData?.price || 0,
        priceChange24h: priceData?.priceChange24h || 0,
        liquidity: priceData?.liquidity || 0,
        
        // Solscan 不直接提供这些
        marketCap: 0,
        volume24h: 0,
        holderCount: 0,
        transactionCount24h: 0,
        fdv: 0,
        source: 'solscan'
      };
    } catch (error) {
      logger.error(`Failed to get full Solscan info for ${mintAddress}:`, error);
      return null;
    }
  }
}

