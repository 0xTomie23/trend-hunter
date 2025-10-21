import { Helius } from 'helius-sdk';
import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from '../utils/logger';

/**
 * Helius 代币数据获取服务
 * 专门用于通过 Helius RPC 获取新发射代币的完整信息
 */
export class HeliusTokenFetcher {
  private helius: Helius;
  private connection: Connection;
  
  constructor(apiKey: string) {
    this.helius = new Helius(apiKey);
    this.connection = new Connection(
      `https://mainnet.helius-rpc.com/?api-key=736bbadc-cf3a-4f0e-a9fa-ddf31193a688`
    );
    logger.info('✅ HeliusTokenFetcher initialized');
  }
  
  /**
   * 获取代币完整信息
   */
  async getTokenInfo(mintAddress: string) {
    try {
      const [metadata, holderCount, supply] = await Promise.all([
        this.getMetadata(mintAddress),
        this.getHolderCount(mintAddress),
        this.getSupply(mintAddress)
      ]);
      
      return {
        mintAddress,
        ...metadata,
        holderCount,
        supply
      };
    } catch (error) {
      logger.error(`Failed to get token info for ${mintAddress}:`, error);
      return null;
    }
  }
  
  /**
   * 获取代币元数据
   */
  private async getMetadata(mintAddress: string) {
    try {
      const asset = await this.helius.rpc.getAsset({
        id: mintAddress
      });
      
      return {
        name: asset.content?.metadata?.name || 'Unknown',
        symbol: asset.content?.metadata?.symbol || '???',
        decimals: asset.token_info?.decimals || 9,
        logoUri: asset.content?.files?.[0]?.uri || asset.content?.links?.image,
        description: asset.content?.metadata?.description,
        creatorAddress: asset.creators?.[0]?.address
      };
    } catch (error) {
      logger.error('Failed to get metadata:', error);
      return {
        name: 'Unknown',
        symbol: '???',
        decimals: 9,
        logoUri: null,
        description: null,
        creatorAddress: null
      };
    }
  }
  
  /**
   * 获取持有人数量
   */
  async getHolderCount(mintAddress: string): Promise<number> {
    try {
      const accounts = await this.helius.rpc.getTokenAccounts({
        mint: mintAddress,
        limit: 1000
      });
      
      return accounts.token_accounts?.length || 0;
    } catch (error) {
      logger.error('Failed to get holder count:', error);
      return 0;
    }
  }
  
  /**
   * 获取代币总供应量
   */
  private async getSupply(mintAddress: string): Promise<number> {
    try {
      const pubkey = new PublicKey(mintAddress);
      const supply = await this.connection.getTokenSupply(pubkey);
      
      return supply.value.uiAmount || 0;
    } catch (error) {
      logger.error('Failed to get supply:', error);
      return 0;
    }
  }
  
  /**
   * 获取代币交易数量（最近24小时）
   */
  async getTransactionCount(mintAddress: string, hours: number = 24): Promise<number> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(mintAddress),
        { limit: 1000 }
      );
      
      const cutoffTime = Date.now() / 1000 - hours * 3600;
      const recentTxs = signatures.filter(sig => 
        (sig.blockTime || 0) > cutoffTime
      );
      
      return recentTxs.length;
    } catch (error) {
      logger.error('Failed to get transaction count:', error);
      return 0;
    }
  }
  
  /**
   * 批量获取代币信息
   */
  async batchGetTokenInfo(mintAddresses: string[]) {
    const results = [];
    
    for (const mint of mintAddresses) {
      const info = await this.getTokenInfo(mint);
      if (info) {
        results.push(info);
      }
      
      // 限流：每次间隔200ms
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return results;
  }
}

