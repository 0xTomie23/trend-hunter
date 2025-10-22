import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Box,
  CircularProgress
} from '@mui/material';
import { getHotTopics } from '../api/backend';

/**
 * 代币列表组件
 * 展示从 Birdeye API 获取的代币信息
 */
export default function TokenList() {
  const [topics, setTopics] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadTopics();
    
    // 每30秒刷新一次
    const interval = setInterval(loadTopics, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadTopics() {
    try {
      const data = await getHotTopics({
        page: 1,
        limit: 20,
        timeRange: '24h',
        sortBy: 'hot_score'
      });
      
      setTopics(data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('加载失败:', error);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (topics.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6" color="text.secondary">
          暂无热点话题
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          系统每5分钟自动扫描新代币，请稍候...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        🔥 热点话题追踪
      </Typography>

      {topics.map((topic) => (
        <Paper key={topic.id} sx={{ mb: 3, p: 2 }}>
          {/* 话题标题 */}
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Chip 
              label={`#${topic.keyword}`} 
              color="primary" 
              size="medium"
              sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}
            />
            <Typography variant="body2" color="text.secondary">
              热度: {topic.hotScore} | {topic.totalMentions}个代币
            </Typography>
          </Box>

          {/* 代币表格 */}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>代币名称</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell align="right">价格</TableCell>
                  <TableCell align="right">市值</TableCell>
                  <TableCell align="right">流动性</TableCell>
                  <TableCell align="right">24h交易量</TableCell>
                  <TableCell align="right">24h涨跌</TableCell>
                  <TableCell align="right">持有人数</TableCell>
                  <TableCell align="right">交易数</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topic.matches?.map((match) => {
                  const token = match.token;
                  const marketData = token.marketData?.[0] || {};
                  
                  return (
                    <TableRow key={token.id} hover>
                      <TableCell>{token.name}</TableCell>
                      <TableCell>
                        <Chip label={token.symbol} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        ${marketData.price?.toFixed(6) || '0.00'}
                      </TableCell>
                      <TableCell align="right">
                        ${(marketData.marketCap || 0).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        ${(marketData.liquidityUsd || 0).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        ${(marketData.volume24h || 0).toLocaleString()}
                      </TableCell>
                      <TableCell 
                        align="right"
                        sx={{ 
                          color: (marketData.priceChange24h || 0) >= 0 ? 'success.main' : 'error.main',
                          fontWeight: 'bold'
                        }}
                      >
                        {(marketData.priceChange24h || 0) >= 0 ? '+' : ''}
                        {(marketData.priceChange24h || 0).toFixed(2)}%
                      </TableCell>
                      <TableCell align="right">
                        {(marketData.holderCount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        {(marketData.transactionCount24h || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}
    </Box>
  );
}

