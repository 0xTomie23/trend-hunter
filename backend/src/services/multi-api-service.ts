import axios from 'axios';
import { logger } from '../utils/logger';
import { SolscanService } from './solscan-service';

/**
 * 多API服务 - 整合 Birdeye, DexScreener, Helius, Solscan
 * 最大化利用每个API的免费额度，实现每秒4次请求
 */
export class MultiApiService {
  private birdeyeApiKey: string;
  private heliusApiKey: string;
  private solscanService: SolscanService | null = null;
  private birdeyeBaseUrl: string = 'https://public-api.birdeye.so';
  private dexScreenerBaseUrl: string = 'https://api.dexscreener.com';
  private heliusBaseUrl: string = 'https://api.helius.xyz';
  
  // 缓存系统
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 1000; // 1秒缓存，配合1秒刷新
  
  // API调用计数器（用于轮询）
  private apiCallCounter: number = 0;
  
  constructor() {
    this.birdeyeApiKey = process.env.BIRDEYE_API_KEY || '';
    this.heliusApiKey = process.env.HELIUS_API_KEY || '';
    
    // 初始化 Solscan 服务
    try {
      if (process.env.SOLSCAN_API_KEY) {
        this.solscanService = new SolscanService();
        logger.info('✅ Solscan API initialized');
      }
    } catch (error: any) {
      logger.warn('⚠️ Solscan API initialization failed:', error.message);
    }
    
    if (!this.birdeyeApiKey) {
      logger.warn('⚠️ BIRDEYE_API_KEY not found, using other APIs');
    }
    if (!this.heliusApiKey) {
      logger.warn('⚠️ HELIUS_API_KEY not found, using other APIs');
    }
    
    const apiCount = this.solscanService ? 4 : 3;
    logger.info(`✅ Multi-API Service initialized (${apiCount} APIs available)`);
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
   * 轮询API调用 - 每秒4次请求分配到不同API
   */
  private getNextApi(): 'birdeye' | 'dexscreener' | 'helius' | 'solscan' {
    this.apiCallCounter++;
    const apiCount = this.solscanService ? 4 : 3;
    const apiIndex = this.apiCallCounter % apiCount;
    
    switch (apiIndex) {
      case 0: return 'birdeye';
      case 1: return 'dexscreener';
      case 2: return 'helius';
      case 3: return 'solscan';
      default: return 'birdeye';
    }
  }

  /**
   * Birdeye API 请求
   */
  private async birdeyeRequest(endpoint: string, params: any = {}): Promise<any> {
    if (!this.birdeyeApiKey) return null;
    
    try {
      const response = await axios.get(`${this.birdeyeBaseUrl}${endpoint}`, {
        headers: {
          'X-API-KEY': this.birdeyeApiKey,
          'Content-Type': 'application/json'
        },
        params,
        timeout: 5000
      });
      return response.data;
    } catch (error: any) {
      logger.error(`Birdeye API error: ${error.message}`);
      return null;
    }
  }

  /**
   * DexScreener API 请求
   */
  private async dexScreenerRequest(endpoint: string): Promise<any> {
    try {
      const response = await axios.get(`${this.dexScreenerBaseUrl}${endpoint}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'TrendHunter/1.0'
        }
      });
      return response.data;
    } catch (error: any) {
      logger.error(`DexScreener API error: ${error.message}`);
      return null;
    }
  }

  /**
   * Helius API 请求
   */
  private async heliusRequest(endpoint: string, params: any = {}): Promise<any> {
    if (!this.heliusApiKey) return null;
    
    try {
      const response = await axios.get(`${this.heliusBaseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.heliusApiKey}`,
          'Content-Type': 'application/json'
        },
        params,
        timeout: 5000
      });
      return response.data;
    } catch (error: any) {
      logger.error(`Helius API error: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取代币基本信息（快速）
   */
  async getTokenBasicInfo(mintAddress: string) {
    const cacheKey = `basic_${mintAddress}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      // 优先使用 DexScreener（最快）
      const dexData = await this.dexScreenerRequest(`/latest/dex/tokens/${mintAddress}`);
      
      if (dexData?.pairs?.length > 0) {
        const mainPair = dexData.pairs.sort((a: any, b: any) => 
          (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )[0];
        
        const result = {
          mintAddress,
          name: mainPair.baseToken?.name || 'Unknown',
          symbol: mainPair.baseToken?.symbol || '???',
          decimals: 9,
          logoUri: mainPair.info?.imageUrl || null
        };
        
        this.setCachedData(cacheKey, result);
        return result;
      }
      
      return null;
    } catch (error) {
      logger.error(`Failed to get basic info for ${mintAddress}:`, error);
      return null;
    }
  }

  /**
   * 获取代币完整信息（轮询API）
   */
  async getTokenFullInfo(mintAddress: string) {
    const cacheKey = `full_${mintAddress}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const nextApi = this.getNextApi();
      logger.info(`🔄 Using ${nextApi} API for ${mintAddress}`);
      
      let result = null;
      
      switch (nextApi) {
        case 'birdeye':
          result = await this.getBirdeyeData(mintAddress);
          break;
        case 'dexscreener':
          result = await this.getDexScreenerData(mintAddress);
          break;
        case 'helius':
          result = await this.getHeliusData(mintAddress);
          break;
        case 'solscan':
          result = await this.getSolscanData(mintAddress);
          break;
      }
      
      if (result) {
        this.setCachedData(cacheKey, result);
        return result;
      }
      
      // 如果主要API失败，使用备用API
      logger.warn(`⚠️ ${nextApi} failed, trying fallback...`);
      return await this.getFallbackData(mintAddress);
      
    } catch (error) {
      logger.error(`Failed to get full info for ${mintAddress}:`, error);
      return null;
    }
  }

  /**
   * 从 Birdeye 获取数据
   */
  private async getBirdeyeData(mintAddress: string) {
    try {
      // 尝试 token_overview (付费版)
      const overview = await this.birdeyeRequest('/defi/token_overview', {
        address: mintAddress
      });
      
      if (overview?.success && overview.data) {
        const data = overview.data;
        return {
          mintAddress,
          name: data.name || 'Unknown',
          symbol: data.symbol || '???',
          decimals: data.decimals || 9,
          logoUri: data.logoURI || data.logo || null,
          price: data.price || 0,
          priceChange24h: data.priceChange24h || 0,
          marketCap: data.mc || 0,
          volume24h: data.v24hUSD || 0,
          liquidity: data.liquidity || 0,
          holderCount: data.holder || 0,
          transactionCount24h: data.trade24h || 0,
          fdv: data.fdv || 0,
          source: 'birdeye'
        };
      }
      
      // 使用免费版 price API
      const priceData = await this.birdeyeRequest('/defi/price', {
        address: mintAddress
      });
      
      if (priceData?.success && priceData.data) {
        const data = priceData.data;
        return {
          mintAddress,
          name: 'Unknown',
          symbol: '???',
          decimals: 9,
          logoUri: null,
          price: data.value || 0,
          priceChange24h: data.priceChange24h || 0,
          liquidity: data.liquidity || 0,
          marketCap: 0,
          volume24h: 0,
          holderCount: 0,
          transactionCount24h: 0,
          fdv: 0,
          source: 'birdeye_price'
        };
      }
      
      return null;
    } catch (error) {
      logger.error(`Birdeye data fetch failed: ${error}`);
      return null;
    }
  }

  /**
   * 从 DexScreener 获取数据
   */
  private async getDexScreenerData(mintAddress: string) {
    try {
      const response = await this.dexScreenerRequest(`/latest/dex/tokens/${mintAddress}`);
      
      if (!response?.pairs?.length) return null;
      
      const mainPair = response.pairs.sort((a: any, b: any) => 
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      )[0];
      
      return {
        mintAddress,
        name: mainPair.baseToken?.name || 'Unknown',
        symbol: mainPair.baseToken?.symbol || '???',
        decimals: 9,
        logoUri: mainPair.info?.imageUrl || null,
        price: mainPair.priceUsd ? parseFloat(mainPair.priceUsd) : 0,
        priceChange24h: mainPair.priceChange?.h24 || 0,
        marketCap: mainPair.marketCap || 0,
        volume24h: mainPair.volume?.h24 || 0,
        liquidity: mainPair.liquidity?.usd || 0,
        fdv: mainPair.fdv || 0,
        holderCount: 0, // DexScreener 不提供
        transactionCount24h: 0, // DexScreener 不提供
        source: 'dexscreener'
      };
    } catch (error) {
      logger.error(`DexScreener data fetch failed: ${error}`);
      return null;
    }
  }

  /**
   * 从 Helius 获取数据
   */
  private async getHeliusData(mintAddress: string) {
    try {
      // Helius 获取代币元数据
      const metadata = await this.heliusRequest('/v0/token-metadata', {
        mintAccounts: [mintAddress]
      });
      
      // Helius 获取代币账户信息
      const accounts = await this.heliusRequest('/v0/token-accounts', {
        mint: mintAddress
      });
      
      const tokenData = metadata?.[0];
      const accountData = accounts?.[0];
      
      return {
        mintAddress,
        name: tokenData?.name || 'Unknown',
        symbol: tokenData?.symbol || '???',
        decimals: tokenData?.decimals || 9,
        logoUri: tokenData?.image || null,
        price: 0, // Helius 不直接提供价格
        priceChange24h: 0,
        marketCap: 0,
        volume24h: 0,
        liquidity: 0,
        holderCount: accountData?.holderCount || 0,
        transactionCount24h: 0,
        fdv: 0,
        source: 'helius'
      };
    } catch (error) {
      logger.error(`Helius data fetch failed: ${error}`);
      return null;
    }
  }

  /**
   * 从 Solscan 获取数据
   */
  private async getSolscanData(mintAddress: string) {
    if (!this.solscanService) return null;
    
    try {
      const solscanData = await this.solscanService.getTokenFullInfo(mintAddress);
      
      if (solscanData) {
        return {
          mintAddress,
          name: solscanData.name || 'Unknown',
          symbol: solscanData.symbol || '???',
          decimals: solscanData.decimals || 9,
          logoUri: solscanData.logoUri || null,
          price: solscanData.price || 0,
          priceChange24h: solscanData.priceChange24h || 0,
          marketCap: solscanData.marketCap || 0,
          volume24h: solscanData.volume24h || 0,
          liquidity: solscanData.liquidity || 0,
          holderCount: solscanData.holderCount || 0,
          transactionCount24h: solscanData.transactionCount24h || 0,
          fdv: solscanData.fdv || 0,
          source: 'solscan'
        };
      }
      
      return null;
    } catch (error) {
      logger.error(`Solscan data fetch failed: ${error}`);
      return null;
    }
  }

  /**
   * 备用数据获取（当主要API失败时）
   */
  private async getFallbackData(mintAddress: string) {
    try {
      // 尝试 DexScreener 作为备用
      const dexData = await this.getDexScreenerData(mintAddress);
      if (dexData) return dexData;
      
      // 尝试 Birdeye price 作为备用
      const birdeyeData = await this.getBirdeyeData(mintAddress);
      if (birdeyeData) return birdeyeData;
      
      // 尝试 Solscan 作为备用
      const solscanData = await this.getSolscanData(mintAddress);
      if (solscanData) return solscanData;
      
      // 最后尝试 Helius
      return await this.getHeliusData(mintAddress);
    } catch (error) {
      logger.error(`Fallback data fetch failed: ${error}`);
      return null;
    }
  }

  /**
   * 获取最新代币列表（用于发现新代币）
   */
  async getLatestTokens(limit: number = 10) {
    try {
      // 使用 DexScreener 获取最新代币
      const response = await this.dexScreenerRequest('/latest/dex/search/?q=solana');
      
      if (response?.pairs) {
        return response.pairs
          .slice(0, limit)
          .map((pair: any) => ({
            mintAddress: pair.baseToken?.address,
            name: pair.baseToken?.name,
            symbol: pair.baseToken?.symbol,
            logoUri: pair.info?.imageUrl,
            price: pair.priceUsd ? parseFloat(pair.priceUsd) : 0,
            marketCap: pair.marketCap || 0,
            volume24h: pair.volume?.h24 || 0,
            liquidity: pair.liquidity?.usd || 0,
            priceChange24h: pair.priceChange?.h24 || 0
          }))
          .filter((token: any) => token.mintAddress);
      }
      
      return [];
    } catch (error) {
      logger.error('Failed to get latest tokens:', error);
      return [];
    }
  }

  /**
   * 批量获取代币信息（优化API调用）
   */
  async getBatchTokenInfo(mintAddresses: string[]) {
    const results = [];
    const apiCount = this.solscanService ? 4 : 3;
    const batchSize = apiCount; // 每批对应API数量
    
    for (let i = 0; i < mintAddresses.length; i += batchSize) {
      const batch = mintAddresses.slice(i, i + batchSize);
      const promises = batch.map(address => this.getTokenFullInfo(address));
      
      try {
        const batchResults = await Promise.all(promises);
        results.push(...batchResults.filter(result => result !== null));
        
        // 批次间延迟，避免API限制
        if (i + batchSize < mintAddresses.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        logger.error(`Batch ${i}-${i + batchSize} failed:`, error);
      }
    }
    
    return results;
  }

  /**
   * 获取代币的基本信息（只需要 name 和 symbol）
   */
  async getTokenBasicInfoForClustering(mintAddress: string): Promise<{ name: string; symbol: string } | null> {
    try {
      const cacheKey = `basic_${mintAddress}`;
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        return { name: cachedData.name, symbol: cachedData.symbol };
      }

      // 优先使用 DexScreener（最快）
      const dexData = await this.dexScreenerRequest(`/latest/dex/tokens/${mintAddress}`);
      
      if (dexData?.pairs?.length > 0) {
        const mainPair = dexData.pairs.sort((a: any, b: any) => 
          (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )[0];
        
        const result = {
          name: mainPair.baseToken?.name || 'Unknown',
          symbol: mainPair.baseToken?.symbol || '???'
        };
        
        this.setCachedData(cacheKey, result);
        return result;
      }
      
      // 备用：使用 Birdeye
      const birdeyeData = await this.getBirdeyeData(mintAddress);
      if (birdeyeData && birdeyeData.name && birdeyeData.symbol) {
        return { name: birdeyeData.name, symbol: birdeyeData.symbol };
      }
      
      return null;
    } catch (error) {
      logger.error(`Failed to get basic info for clustering ${mintAddress}:`, error);
      return null;
    }
  }
}
