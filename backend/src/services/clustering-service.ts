import axios from 'axios';
import { logger } from '../utils/logger';

interface TokenData {
  mintAddress: string;
  name: string;
  symbol: string;
  decimals: number;
}

interface ClusterInfo {
  themes: string[];
  common_words: string[];
  size: number;
}

interface Prediction {
  cluster_id: number;
  cluster_name: string;
  keywords: string[];
  confidence: number;
  themes: string[];
  description: string;
}

interface ClusterResult {
  topic_id: string;
  topic_name: string;
  keywords: string[];
  tokens: TokenData[];
  similarity_threshold: number;
  confidence_score: number;
  cluster_info: ClusterInfo;
}

interface ClusterResponse {
  total_topics: number;
  clusters: ClusterResult[];
}

export class ClusteringService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.PYTHON_CLUSTERING_API_URL || 'http://localhost:8000';
    logger.info(`🔗 Clustering service initialized: ${this.apiUrl}`);
  }

  /**
   * 调用 Python 聚类算法
   * @param tokens 代币列表 (只需要 name 和 symbol)
   * @returns 聚类结果
   */
  async clusterTokens(tokens: { name: string; symbol: string }[]): Promise<ClusterResult[]> {
    try {
      const request = { tokens };

      logger.info(`📊 Sending ${tokens.length} tokens to clustering service...`);

      const response = await axios.post<ClusterResponse>(
        `${this.apiUrl}/cluster`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 秒超时
        }
      );

      logger.info(
        `✅ Clustering completed: ${response.data.total_topics} topics found`
      );

      // 打印每个聚类的结果
      for (const cluster of response.data.clusters) {
        logger.info(`  Topic: ${cluster.topic_name} (${cluster.tokens.length} tokens, confidence: ${cluster.confidence_score.toFixed(2)})`);
        logger.info(`    Keywords: ${cluster.keywords.slice(0, 3).join(', ')}`);
      }

      return response.data.clusters;
    } catch (error: any) {
      logger.error('Clustering service error:', error.message);
      throw new Error(`Failed to cluster tokens: ${error.message}`);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test with a minimal clustering request instead of GET /
      const response = await axios.post(`${this.apiUrl}/cluster`, {
        tokens: []
      }, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      logger.error('Clustering service health check failed');
      return false;
    }
  }
}

