import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Button
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RefreshIcon from '@mui/icons-material/Refresh';

/**
 * 演示组件：展示单个代币的实时数据
 * 直接调用后端 API，无需数据库
 */
export default function DemoTokenView() {
  const [tokenData, setTokenData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [lastUpdate, setLastUpdate] = React.useState(null);

  const loadTokenData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/demo/test-token');
      const result = await response.json();
      
      if (result.success) {
        setTokenData(result.data);
        setLastUpdate(new Date());
      }
      setLoading(false);
    } catch (error) {
      console.error('加载失败:', error);
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadTokenData();
    
    // 每30秒自动刷新
    const interval = setInterval(loadTokenData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !tokenData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!tokenData) {
    return (
      <Box textAlign="center" p={4}>
        <Typography color="error">无法加载代币数据</Typography>
      </Box>
    );
  }

  const priceChangeColor = tokenData.priceChange24h >= 0 ? 'success.main' : 'error.main';
  const TrendIcon = tokenData.priceChange24h >= 0 ? TrendingUpIcon : TrendingDownIcon;

  return (
    <Box>
      {/* 标题 */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" sx={{ fontFamily: "'Silkscreen', monospace" }}>
          🎯 实时代币数据测试
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          {lastUpdate && (
            <Typography variant="caption" color="text.secondary">
              最后更新: {lastUpdate.toLocaleTimeString()}
            </Typography>
          )}
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={loadTokenData}
            disabled={loading}
            variant="outlined"
          >
            {loading ? '刷新中...' : '刷新'}
          </Button>
        </Box>
      </Box>

      {/* 代币卡片 */}
      <Card sx={{ mb: 3, bgcolor: '#1e1e1e', border: '1px solid #2a2a2a' }}>
        <CardContent>
          <Grid container spacing={3}>
            {/* 基础信息 */}
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                {tokenData.logoUri && (
                  <img 
                    src={tokenData.logoUri} 
                    alt={tokenData.symbol}
                    style={{ width: 48, height: 48, borderRadius: '50%' }}
                  />
                )}
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {tokenData.name}
                  </Typography>
                  <Box display="flex" gap={1} alignItems="center">
                    <Chip 
                      label={tokenData.symbol} 
                      size="small" 
                      color="primary"
                      sx={{ fontWeight: 'bold' }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {tokenData.dex?.toUpperCase()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  display: 'block',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all'
                }}
              >
                CA: {tokenData.mintAddress}
              </Typography>
            </Grid>

            {/* 价格信息 */}
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: '#2a2a2a', height: '100%' }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    当前价格
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                    ${tokenData.price?.toFixed(6)}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TrendIcon sx={{ color: priceChangeColor, fontSize: 20 }} />
                    <Typography 
                      variant="h6" 
                      sx={{ color: priceChangeColor, fontWeight: 'bold' }}
                    >
                      {tokenData.priceChange24h >= 0 ? '+' : ''}
                      {tokenData.priceChange24h?.toFixed(2)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      24小时
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* 市值 */}
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: '#2a2a2a', height: '100%' }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    市值
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    ${tokenData.marketCap?.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 流动性 */}
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: '#2a2a2a', height: '100%' }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    流动性
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    ${tokenData.liquidity?.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 24h交易量 */}
            <Grid item xs={6} md={4}>
              <Card sx={{ bgcolor: '#2a2a2a', height: '100%' }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    24小时交易量
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    ${tokenData.volume24h?.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* FDV */}
            <Grid item xs={6} md={4}>
              <Card sx={{ bgcolor: '#2a2a2a', height: '100%' }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    FDV
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    ${tokenData.fdv?.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 交易对地址 */}
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: '#2a2a2a', height: '100%' }}>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    交易对
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontFamily: 'monospace',
                      wordBreak: 'break-all'
                    }}
                  >
                    {tokenData.pairAddress?.substring(0, 20)}...
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 数据来源说明 */}
          <Box mt={3} p={2} bgcolor="#0f0f0f" borderRadius={1}>
            <Typography variant="caption" color="text.secondary">
              📡 数据来源: Birdeye API (价格、涨跌) + DexScreener API (市值、流动性、交易量) | 
              实时更新，每30秒自动刷新
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

