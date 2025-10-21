
import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Chip,
  IconButton,
  LinearProgress,
  Tabs,
  Tab
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { cryptoData, marketCategories } from '../data/cryptoData';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const CryptoTable = () => {
  const [data, setData] = useState([]);
  const [activeTopic, setActiveTopic] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sortMode, setSortMode] = useState('default'); // default | desc | asc
  const [sortBy, setSortBy] = useState(null); // 当前排序列 key

  // 初始化数据并从localStorage加载收藏状态
  useEffect(() => {
    // 从localStorage获取收藏状态
    const savedFavorites = JSON.parse(localStorage.getItem('cryptoFavorites')) || {};
    
    // 将收藏状态应用到数据上
    const initialData = cryptoData.map(item => ({
      ...item,
      starred: savedFavorites[item.id] === true
    }));
    
    // 对数据进行排序，收藏项置顶
    const sortedData = [...initialData].sort((a, b) => {
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      return a.id - b.id;
    });
    
    setData(sortedData);
  }, []);
  
  // 处理收藏星标点击
  const handleStarClick = (id) => {
    const newData = data.map(item => 
      item.id === id ? { ...item, starred: !item.starred } : item
    );
    
    // 对数据进行排序，收藏项置顶
    const sortedData = [...newData].sort((a, b) => {
      // 首先按照收藏状态排序
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      // 如果收藏状态相同，则按照原始顺序排序
      return a.id - b.id;
    });
    
    // 保存收藏状态到localStorage
    const savedFavorites = JSON.parse(localStorage.getItem('cryptoFavorites')) || {};
    const updatedItem = newData.find(item => item.id === id);
    
    if (updatedItem.starred) {
      savedFavorites[id] = true;
    } else {
      delete savedFavorites[id];
    }
    
    localStorage.setItem('cryptoFavorites', JSON.stringify(savedFavorites));
    
    setData(sortedData);
  };
  
  // 处理话题切换
  const handleTopicChange = (event, newValue) => {
    setActiveTopic(newValue);
    
    // 模拟从后端获取数据的过程
    setLoading(true);
    
    // 这里是后端接口调用的位置
    // 实际项目中应该替换为真实的API调用
    // fetchDataByTopic(marketCategories[newValue])
    //   .then(response => {
    //     setData(response.data);
    //     setLoading(false);
    //   })
    //   .catch(error => {
    //     console.error('获取数据失败:', error);
    //     setLoading(false);
    //   });
    
    // 模拟API调用延迟
    setTimeout(() => {
      // 根据选中的话题过滤数据（模拟后端返回的数据）
      const filteredData = cryptoData.filter((_, index) => {
        if (newValue === 0) return true; // 热门显示所有数据
        if (newValue === 1) return index % 2 === 0; // 飙升显示部分数据
        if (newValue === 2) return index % 3 === 0; // 美股显示部分数据
        if (newValue === 3) return index < 3; // 下个蓝筹显示前3条数据
        return true;
      });
      
      setData(filteredData);
      // 切换话题时重置排序状态
      setSortBy(null);
      setSortMode('default');
      setLoading(false);
    }, 500);
  };

  // 排序与解析工具（组件内部）
  const toNumber = (str) => {
    if (!str) return 0;
    const cleaned = String(str).replace(/[^0-9KM.$,]/g, '');
    let base = parseFloat(cleaned.replace(/[$,]/g, ''));
    if (isNaN(base)) base = 0;
    if (/K$/i.test(cleaned)) return base * 1_000;
    if (/M$/i.test(cleaned)) return base * 1_000_000;
    return base;
  };

  const parseTime = (str) => {
    if (!str) return 0;
    const m = String(str).trim().match(/^(\d+(?:\.\d+)?)([mhd])$/i);
    if (!m) return 0;
    const val = parseFloat(m[1]);
    const unit = m[2].toLowerCase();
    const factor = unit === 'm' ? 1 : unit === 'h' ? 60 : 1440;
    return val * factor; // 统一换算为分钟
  };

  const favoriteSort = (a, b) => {
    if (a.starred && !b.starred) return -1;
    if (!a.starred && b.starred) return 1;
    return a.id - b.id;
  };

  const valueByKey = (row, key) => {
    switch (key) {
      case 'time': return parseTime(row.time);
      case 'volume': return toNumber(row.volume);
      case 'price': return toNumber(row.price);
      case 'change': return Number(row.change) || 0;
      case 'holders': return toNumber(row.holders);
      case 'buy': return toNumber(row.buyRatio);
      case 'marketCap': return toNumber(row.marketCap);
      default: return row.id;
    }
  };

  const sortDataBy = (arr, key, mode) => {
    if (!key || mode === 'default') {
      return [...arr].sort(favoriteSort);
    }
    return [...arr].sort((a, b) => {
      const va = valueByKey(a, key);
      const vb = valueByKey(b, key);
      return mode === 'asc' ? va - vb : vb - va;
    });
  };



  const renderSortIcon = (key) => {
    if (sortBy === key) {
      return sortMode === 'asc' 
        ? <KeyboardArrowUpIcon fontSize="inherit" sx={{ ml: 0.5, color: '#f6c549' }} />
        : <KeyboardArrowDownIcon fontSize="inherit" sx={{ ml: 0.5, color: '#f6c549' }} />
    }
    return <UnfoldMoreIcon fontSize="inherit" sx={{ ml: 0.5, color: 'rgba(255,255,255,0.45)' }} />
  };

  const handleSortClick = (key) => {
    const isSame = sortBy === key;
    const nextMode = isSame ? (sortMode === 'default' ? 'desc' : sortMode === 'desc' ? 'asc' : 'default') : 'desc';
    const nextSortBy = nextMode === 'default' ? null : key;
    setSortBy(nextSortBy);
    setSortMode(nextMode);
    setData(curr => sortDataBy(curr, nextSortBy, nextMode));
  };

  return (
    <TableContainer component={Paper} sx={{ backgroundColor: '#000' }}>
      <Box sx={{ p: 1, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', bgcolor: '#121212' }}>
        <Tabs 
          value={activeTopic}
          onChange={handleTopicChange}
          variant="scrollable"
          scrollButtons="auto"
          textColor="inherit"
          TabIndicatorProps={{
            style: {
              backgroundColor: '#f6c549'
            }
          }}
          sx={{ minHeight: 36 }}
        >
          {marketCategories.map((category, index) => (
            <Tab 
              key={index} 
              label={category} 
              sx={{ 
                color: activeTopic === index ? '#f6c549' : 'inherit',
                fontWeight: activeTopic === index ? 'bold' : 'normal',
                fontSize: 16,
                minHeight: 36,
                lineHeight: '36px',
                py: 0
              }}
            />
          ))}
        </Tabs>
      </Box>
      {loading && (
        <Box sx={{ width: '100%' }}>
          <LinearProgress color="warning" />
        </Box>
      )}
      <Table size="small">
        <TableHead sx={{ '& .MuiTableCell-root': { fontSize: 12, color: 'rgba(255,255,255,0.6)', py: 0.25, lineHeight: '18px' } }}>
          <TableRow sx={{ height: 22 }}>
            <TableCell padding="checkbox" align="center" sx={{ width: 40, minWidth: 40, p: 0 }}>#</TableCell>
            <TableCell>市场</TableCell>
            <TableCell onClick={() => handleSortClick('time')} align="right" sx={{ cursor: 'pointer', userSelect: 'none' }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                时间
                {renderSortIcon('time')}
              </Box>
            </TableCell>
            <TableCell onClick={() => handleSortClick('volume')} align="right" sx={{ cursor: 'pointer', userSelect: 'none' }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                池子
                {renderSortIcon('volume')}
              </Box>
            </TableCell>
            <TableCell onClick={() => handleSortClick('price')} align="right" sx={{ cursor: 'pointer', userSelect: 'none' }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                市值
                {renderSortIcon('price')}
              </Box>
            </TableCell>
            <TableCell onClick={() => handleSortClick('change')} align="right" sx={{ cursor: 'pointer', userSelect: 'none' }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                涨幅比较
                {renderSortIcon('change')}
              </Box>
            </TableCell>
            <TableCell onClick={() => handleSortClick('holders')} align="right" sx={{ cursor: 'pointer', userSelect: 'none' }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                持有者
                {renderSortIcon('holders')}
              </Box>
            </TableCell>
            <TableCell onClick={() => handleSortClick('buy')} align="right" sx={{ cursor: 'pointer', userSelect: 'none' }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                买入/卖出
                {renderSortIcon('buy')}
              </Box>
            </TableCell>
            <TableCell onClick={() => handleSortClick('marketCap')} align="right" sx={{ cursor: 'pointer', userSelect: 'none' }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                市值
                {renderSortIcon('marketCap')}
              </Box>
            </TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid rgba(255,255,255,0.12)' } }}>
          {data.map((row) => (
            <TableRow
              key={row.id}
              sx={{
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
                transition: 'background-color 0.15s ease-out',
                borderLeft: row.starred ? '3px solid #f6c549' : 'none'
              }}
            >
              <TableCell align="center">
                <IconButton 
                  size="small" 
                  sx={{ color: row.starred ? '#f6c549' : 'inherit', m: 0, p: 0 }}
                  onClick={() => handleStarClick(row.id)}
                >
                  {row.starred ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                </IconButton>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: `hsl(${row.id * 60}, 70%, 60%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    {row.name.charAt(0)}
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {row.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.symbol}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right">{row.time}</TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <TrendingUpIcon fontSize="small" sx={{ color: '#f6c549', mr: 0.5 }} />
                  {row.volume}
                </Box>
              </TableCell>
              <TableCell align="right">{row.price}</TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: row.change > 0 ? '#4caf50' : '#f44336' }}>
                  {row.change > 0 ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                  {Math.abs(row.change)}%
                </Box>
              </TableCell>
              <TableCell align="right">{row.holders}</TableCell>
              <TableCell align="right">
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {row.buyRatio}
                  </Typography>
                  <Box sx={{ width: '100%', mt: 0.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={parseInt(row.buyDetail.split('/')[0]) / (parseInt(row.buyDetail.split('/')[0]) + parseInt(row.buyDetail.split('/')[1])) * 100}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: '#f44336',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#4caf50'
                        }
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {row.buyDetail}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell align="right">{row.marketCap}</TableCell>
              <TableCell align="right">
                <Chip
                  label="买入"
                  size="small"
                  className="buy-button"
                  sx={{
                    bgcolor: '#4caf50',
                    color: 'white',
                    '&:hover': { bgcolor: '#388e3c' }
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CryptoTable;