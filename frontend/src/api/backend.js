/**
 * 后端 API 客户端
 * 调用后端的 Birdeye 数据接口
 */

const API_BASE = 'http://localhost:3000/api';

/**
 * 获取热点话题列表
 */
export async function getHotTopics(params = {}) {
  const {
    page = 1,
    limit = 20,
    timeRange = '24h',
    sortBy = 'hot_score'
  } = params;
  
  try {
    const url = new URL(`${API_BASE}/hot-topics`);
    url.searchParams.append('page', page);
    url.searchParams.append('limit', limit);
    url.searchParams.append('timeRange', timeRange);
    url.searchParams.append('sortBy', sortBy);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    /*
     * 返回格式:
     * {
     *   data: [
     *     {
     *       id: 1,
     *       keyword: "索拉",
     *       totalMentions: 3,
     *       hotScore: 285,
     *       matches: [
     *         {
     *           token: {
     *             name: "索拉拉",
     *             symbol: "SOLA",
     *             mintAddress: "ABC...",
     *             marketData: [{
     *               price: 0.001,
     *               marketCap: 50000,
     *               liquidity: 25000,
     *               volume24h: 10000,
     *               priceChange24h: 15.5,
     *               holderCount: 150,
     *               transactionCount24h: 500
     *             }]
     *           }
     *         }
     *       ]
     *     }
     *   ],
     *   pagination: { page: 1, total: 50 }
     * }
     */
    return data;
  } catch (error) {
    console.error('获取热点失败:', error);
    return { data: [], pagination: { page: 1, total: 0 } };
  }
}

/**
 * 获取代币详情
 */
export async function getToken(mintAddress) {
  try {
    const response = await fetch(`${API_BASE}/tokens/${mintAddress}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('获取代币失败:', error);
    return null;
  }
}

/**
 * 获取代币完整信息（含实时 Birdeye 数据）
 */
export async function getTokenFull(mintAddress) {
  try {
    const response = await fetch(`${API_BASE}/tokens/${mintAddress}/full`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    /*
     * 返回格式:
     * {
     *   ...数据库数据,
     *   realtime: {  // 实时 Birdeye 数据
     *     price: 0.001,
     *     priceChange24h: 15.5,
     *     marketCap: 50000,
     *     liquidity: 25000,
     *     volume24h: 10000,
     *     holderCount: 150,
     *     transactionCount24h: 500
     *   }
     * }
     */
    return data;
  } catch (error) {
    console.error('获取代币完整信息失败:', error);
    return null;
  }
}

/**
 * 手动触发扫描新代币
 */
export async function triggerScan() {
  try {
    const response = await fetch(`${API_BASE}/trigger/scan`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('触发扫描失败:', error);
    return { success: false };
  }
}

/**
 * 健康检查
 */
export async function healthCheck() {
  try {
    const response = await fetch('http://localhost:3000/health');
    return await response.json();
  } catch (error) {
    console.error('健康检查失败:', error);
    return { status: 'error' };
  }
}

