import React from 'react'
import { 
  Box, 
  CssBaseline, 
  ThemeProvider, 
  createTheme,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Grid,
  Card,
  CardContent,
  Fade,
  Slide,
  Zoom,
  Snackbar,
  Alert
} from '@mui/material'
import FlashOnIcon from '@mui/icons-material/FlashOn'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import SettingsIcon from '@mui/icons-material/Settings'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import './App.css'
import CryptoTable from './components/CryptoTable'
import PixelReaper from './components/PixelReaper'
import PixelFrog from './components/PixelFrog'
import DemoTokenView from './components/DemoTokenView'
import BuyModal from './components/BuyModal'

// 创建暗色主题
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3ddc84',
    },
    secondary: {
      main: '#9945FF',
    },
    background: {
      default: '#0f0f0f',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
  },
  typography: {
    fontFamily: "'Press Start 2P', 'Silkscreen', 'Zpix', 'Fusion Pixel', monospace",
    h1: {
      fontSize: 'clamp(1.5rem, 4vw, 2rem)',
      fontWeight: 'bold',
    },
    h2: {
      fontSize: 'clamp(1.25rem, 3.5vw, 1.5rem)',
      fontWeight: 'bold',
    },
    h3: {
      fontSize: 'clamp(1.125rem, 3vw, 1.25rem)',
      fontWeight: 'bold',
    },
    h4: {
      fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
      fontWeight: 'bold',
    },
    h5: {
      fontSize: 'clamp(0.875rem, 2vw, 1rem)',
      fontWeight: 'bold',
    },
    h6: {
      fontSize: 'clamp(0.75rem, 1.8vw, 0.875rem)',
      fontWeight: 'bold',
    },
    body1: {
      fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
    },
    body2: {
      fontSize: 'clamp(0.625rem, 1.3vw, 0.75rem)',
    },
    button: {
      fontSize: 'clamp(0.625rem, 1.3vw, 0.75rem)',
      fontWeight: 'bold',
      textTransform: 'none',
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 'bold',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          backgroundColor: '#1e1e1e',
          border: '1px solid #2a2a2a',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#0f0f0f',
          borderBottom: '1px solid #2a2a2a',
        },
      },
    },
  },
})

function App() {
  // 使用钱包适配器的 hooks
  const { publicKey, disconnect } = useWallet()
  const { connection } = useConnection()
  
  const [walletMenuAnchor, setWalletMenuAnchor] = React.useState(null)
  const [solBalance, setSolBalance] = React.useState(null)
  const [currentTopic, setCurrentTopic] = React.useState(0)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [addTokenOpen, setAddTokenOpen] = React.useState(false)
  const [deleteTokenOpen, setDeleteTokenOpen] = React.useState(false)
  const [selectedTopicForDelete, setSelectedTopicForDelete] = React.useState(null)
  const [newTokenAddress, setNewTokenAddress] = React.useState('')
  const [newTopicName, setNewTopicName] = React.useState('')
  const [buyModalOpen, setBuyModalOpen] = React.useState(false)
  const [selectedTokenForBuy, setSelectedTokenForBuy] = React.useState(null)
  const [copySnackbarOpen, setCopySnackbarOpen] = React.useState(false)
  
  // 数据库状态
  const [user, setUser] = React.useState(null)
  const [topics, setTopics] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  
  const [sortField, setSortField] = React.useState('marketCap')
  const [sortDirection, setSortDirection] = React.useState('desc')
  
  // 计算钱包地址字符串
  const walletAddress = React.useMemo(() => publicKey?.toBase58() || null, [publicKey])

  // 数字滚动动画组件 - 只在数值真正变化时显示动画
  const AnimatedNumber = ({ value, format, color = '#ffffff' }) => {
    const [displayValue, setDisplayValue] = React.useState(value)
    const [isAnimating, setIsAnimating] = React.useState(false)
    const [hasChanged, setHasChanged] = React.useState(false)

    React.useEffect(() => {
      // 检查数值是否真正发生了变化
      if (displayValue !== value) {
        setHasChanged(true)
        setIsAnimating(true)
        const timer = setTimeout(() => {
          setDisplayValue(value)
          setIsAnimating(false)
          // 动画完成后重置变化标志
          setTimeout(() => setHasChanged(false), 200)
        }, 150)
        return () => clearTimeout(timer)
      }
    }, [value])

    return (
      <Zoom in={hasChanged ? !isAnimating : true} timeout={hasChanged ? 200 : 0}>
        <Typography 
          variant="body2" 
          sx={{ 
            color, 
            fontFamily: "'Press Start 2P', monospace",
            transform: hasChanged && isAnimating ? 'scale(1.1)' : 'scale(1)',
            transition: hasChanged ? 'transform 0.2s ease-in-out' : 'none'
          }}
        >
          {format ? format(displayValue) : displayValue}
        </Typography>
      </Zoom>
    )
  }

  // 数据库 API 调用函数
  const apiCall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`http://localhost:3000/api${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API call to ${endpoint} failed:`, error);
      throw error;
    }
  };

  // 用户登录/注册
  const loginUser = async (walletAddress, username) => {
    try {
      const result = await apiCall('/login', {
        method: 'POST',
        body: JSON.stringify({ walletAddress, username })
      });
      
      if (result.success) {
        setUser(result.data);
        setTopics(result.data.topics || []);
        return result.data;
      }
      throw new Error('Login failed');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  // 获取用户数据
  const fetchUserData = async (walletAddress) => {
    try {
      const result = await apiCall(`/${walletAddress}`);
      
      if (result.success) {
        setUser(result.data);
        
        // 同时获取系统自动创建的主题
        const userTopics = result.data.topics || [];
        const systemTopics = await fetchSystemTopics();
        
        // 合并用户主题和系统主题，并标记来源
        const allTopics = [
          ...userTopics.map(t => ({ ...t, source: 'user' })),
          ...systemTopics.map(t => ({ ...t, source: 'system' }))
        ];
        
        console.log(`📊 Total topics: ${allTopics.length} (${userTopics.length} user + ${systemTopics.length} system)`);
        
        setTopics(allTopics);
        // 不再触发全局动画，让每个组件自己判断是否需要动画
        return result.data;
      }
      throw new Error('Failed to fetch user data');
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      throw error;
    }
  };

  // 获取系统自动创建的主题
  const fetchSystemTopics = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/topics/system', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.warn('Failed to fetch system topics:', response.status);
        return [];
      }
      
      const result = await response.json();
      console.log('🤖 System topics:', result.data?.length || 0);
      return result.data || [];
    } catch (error) {
      console.error('Failed to fetch system topics:', error);
      return [];
    }
  };

  // 创建主题
  const createTopic = async (name, description) => {
    if (!user) throw new Error('User not logged in');
    
    try {
      const result = await apiCall('/topics', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, name, description })
      });
      
      if (result.success) {
        setTopics(prev => [...prev, result.data]);
        return result.data;
      }
      throw new Error('Failed to create topic');
    } catch (error) {
      console.error('Failed to create topic:', error);
      throw error;
    }
  };

  // 删除主题
  const deleteTopic = async (topicId) => {
    try {
      const result = await apiCall(`/topics/${topicId}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        setTopics(prev => prev.filter(topic => topic.id !== topicId));
        // 如果删除的是当前主题，切换到第一个主题
        if (currentTopic === topicId) {
          const remainingTopics = topics.filter(topic => topic.id !== topicId);
          setCurrentTopic(remainingTopics[0]?.id || 0);
        }
        return true;
      }
      throw new Error('Failed to delete topic');
    } catch (error) {
      console.error('Failed to delete topic:', error);
      throw error;
    }
  };

  // 重新排序主题
  const reorderTopics = async (topicIds) => {
    if (!user) throw new Error('User not logged in');
    
    try {
      const result = await apiCall('/topics/reorder', {
        method: 'PUT',
        body: JSON.stringify({ userId: user.id, topicIds })
      });
      
      if (result.success) {
        // 重新获取用户数据以更新主题顺序
        await fetchUserData(user.walletAddress);
        return true;
      }
      throw new Error('Failed to reorder topics');
    } catch (error) {
      console.error('Failed to reorder topics:', error);
      throw error;
    }
  };

  // 添加代币到主题
  const addTokenToTopic = async (topicId, mintAddress) => {
    try {
      const result = await apiCall('/tokens/add', {
        method: 'POST',
        body: JSON.stringify({ topicId, mintAddress })
      });
      
      if (result.success) {
        return result.data;
      }
      throw new Error('Failed to add token');
    } catch (error) {
      console.error('Failed to add token:', error);
      throw error;
    }
  };

  // 从主题删除代币
  const removeTokenFromTopic = async (topicTokenId) => {
    try {
      const result = await apiCall(`/tokens/${topicTokenId}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        return true;
      }
      throw new Error('Failed to remove token');
    } catch (error) {
      console.error('Failed to remove token:', error);
      throw error;
    }
  };

  // 获取 SOL 余额
  const fetchBalance = async () => {
    if (!publicKey || !connection) return
    
    try {
      const balance = await connection.getBalance(publicKey)
      setSolBalance(balance / 1e9)
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    }
  }

  // 处理断开连接
  const handleDisconnect = async () => {
    try {
      await disconnect()
      setSolBalance(null)
      setWalletMenuAnchor(null)
      
      // 清除 localStorage
      localStorage.removeItem('walletAddress')
      
      // 清除用户数据
      setUser(null)
      setTopics([])
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  const shortAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const handleCopy = async () => {
    if (walletAddress) {
      try {
        await navigator.clipboard.writeText(walletAddress)
        console.log('Address copied to clipboard')
      } catch (error) {
        console.error('Failed to copy address:', error)
      }
    }
  }

  const openMenu = (event) => {
    setWalletMenuAnchor(event.currentTarget)
  }

  const closeMenu = () => {
    setWalletMenuAnchor(null)
  }

  // 钱包连接时获取余额和登录
  React.useEffect(() => {
    if (publicKey && connection) {
      fetchBalance()
      
      const address = publicKey.toBase58()
      // 保存钱包地址到 localStorage
      localStorage.setItem('walletAddress', address)
      
      // 登录到数据库
      loginUser(address).then(() => {
        console.log('✅ User logged in successfully')
      }).catch((dbError) => {
        console.warn('⚠️ Database login failed, using demo mode:', dbError)
        // 如果数据库登录失败，使用默认主题
        setTopics([
          { id: 1, name: 'AI梗', tokens: [] },
          { id: 2, name: '狗狗系', tokens: [] },
          { id: 3, name: '索拉拉', tokens: [] }
        ])
      })
    }
  }, [publicKey, connection])

  // 页面加载时自动恢复用户数据
  React.useEffect(() => {
    const restoreUserSession = async () => {
      try {
        const savedWalletAddress = localStorage.getItem('walletAddress')
        if (savedWalletAddress && publicKey && publicKey.toBase58() === savedWalletAddress) {
          // 自动登录用户并获取数据
          await loginUser(savedWalletAddress)
          await fetchUserData(savedWalletAddress)
        }
      } catch (error) {
        console.error('Failed to restore user session:', error)
        localStorage.removeItem('walletAddress')
      }
    }

    if (publicKey) {
      restoreUserSession()
    }
  }, [publicKey])

  // 当主题列表变化时，确保 currentTopic 有效
  React.useEffect(() => {
    if (topics.length > 0) {
      // 如果当前主题为 0 或不存在于主题列表中，设置为第一个主题
      if (currentTopic === 0 || !topics.find(t => t.id === currentTopic)) {
        setCurrentTopic(topics[0].id)
      }
    }
  }, [topics])

  // 智能自动刷新代币数据
  React.useEffect(() => {
    if (!user || !walletAddress) return;

    // 检查是否有代币数据需要刷新
    const hasTokens = topics.some(topic => 
      topic.tokens && topic.tokens.length > 0
    );

    if (!hasTokens) {
      console.log('📊 No tokens to refresh, skipping auto-refresh');
      return;
    }

    console.log('🚀 Starting real-time token data refresh...');
    
    // 实时刷新数据（每1秒）
    const refreshInterval = setInterval(async () => {
      try {
        console.log('🔄 Auto-refreshing token data...');
        await fetchUserData(walletAddress);
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, 1000); // 1秒刷新一次，实时更新

    // 清理定时器
    return () => {
      clearInterval(refreshInterval);
      console.log('⏹️ Stopped auto-refresh');
    };
  }, [user, walletAddress, topics])

  const handleTopicChange = (event, newValue) => {
    setCurrentTopic(newValue)
  }

  const handleAddToken = async () => {
    if (!newTokenAddress.trim()) return
    
    if (!user) {
      alert('Please login first');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔄 Adding token...');
      
      // 第一步：添加代币（后端快速返回基本信息：名字、符号、图片）
      await addTokenToTopic(currentTopic, newTokenAddress);
      console.log('✅ Token basic info added');
      
      // 立即刷新以显示基本信息（名字、符号、图片）
      await fetchUserData(user.walletAddress);
      
      setNewTokenAddress('');
      setAddTokenOpen(false);
      
      // 第二步：等待3秒后再次刷新，获取市场数据（价格、市值等）
      console.log('⏳ Waiting for market data...');
      setTimeout(async () => {
        try {
          console.log('🔄 Refreshing market data...');
          await fetchUserData(user.walletAddress);
          console.log('✅ Market data updated');
        } catch (error) {
          console.error('Failed to refresh market data:', error);
        }
      }, 3000);
      
    } catch (error) {
      console.error('Failed to add token:', error);
      alert(`❌ Failed to add token: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleAddTopic = async () => {
    if (!newTopicName.trim()) return
    
    if (!user) {
      alert('Please login first');
      return;
    }
    
    try {
      setLoading(true);
      await createTopic(newTopicName);
      setNewTopicName('');
    } catch (error) {
      console.error('Failed to create topic:', error);
      alert(`❌ Failed to create topic: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteTopic = async (topicId) => {
    if (topics.length <= 1) {
      alert('At least one topic must remain')
      return
    }
    
    if (!user) {
      alert('Please login first');
      return;
    }
    
    try {
      setLoading(true);
      await deleteTopic(topicId);
    } catch (error) {
      console.error('Failed to delete topic:', error);
      alert(`❌ Failed to delete topic: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleMoveTopic = async (topicId, direction) => {
    if (!user) {
      alert('Please login first');
      return;
    }
    
    const currentIndex = topics.findIndex(t => t.id === topicId)
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    if (newIndex < 0 || newIndex >= topics.length) {
      return // 无法移动
    }
    
    try {
      setLoading(true);
      const newTopics = [...topics];
      [newTopics[currentIndex], newTopics[newIndex]] = [newTopics[newIndex], newTopics[currentIndex]];
      
      const topicIds = newTopics.map(topic => topic.id);
      await reorderTopics(topicIds);
    } catch (error) {
      console.error('Failed to move topic:', error);
      alert(`❌ Failed to move topic: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // 格式化大数字（K, M, B, T）
  const formatLargeNumber = (num) => {
    if (!num || num === 0) return '0'
    
    const absNum = Math.abs(num)
    
    if (absNum >= 1e12) {
      return (num / 1e12).toFixed(1) + 'T'
    } else if (absNum >= 1e9) {
      return (num / 1e9).toFixed(1) + 'B'
    } else if (absNum >= 1e6) {
      return (num / 1e6).toFixed(1) + 'M'
    } else if (absNum >= 1e3) {
      return (num / 1e3).toFixed(1) + 'K'
    } else {
      return num.toFixed(1)
    }
  }

  // 格式化价格（保留一位小数）
  const formatPrice = (price) => {
    if (!price || price === 0) return '$0.0'
    
    if (price >= 1) {
      return '$' + price.toFixed(1)
    } else if (price >= 0.01) {
      return '$' + price.toFixed(3)
    } else if (price >= 0.001) {
      return '$' + price.toFixed(4)
    } else {
      return '$' + price.toFixed(6)
    }
  }

  // 格式化百分比（保留一位小数）
  const formatPercentage = (percentage) => {
    if (!percentage && percentage !== 0) return '0.0%'
    
    const sign = percentage >= 0 ? '+' : ''
    return sign + percentage.toFixed(1) + '%'
  }

  // 格式化合约地址（显示前4位和后4位）
  const formatContractAddress = (address) => {
    if (!address || address.length < 8) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const getSortedTokens = () => {
    const currentTopicData = topics.find(topic => topic.id === currentTopic)
    if (!currentTopicData || !currentTopicData.tokens) return []
    
    // 从数据库结构转换为前端显示结构
    const tokens = currentTopicData.tokens.map(topicToken => {
      const token = topicToken.token;
      const marketData = token.marketData?.[0]; // 最新的市场数据
      
      return {
        id: token.id,
        mintAddress: token.mintAddress,
        name: token.name,
        symbol: token.symbol,
        logoUri: token.logoUri,
        price: marketData?.price || 0,
        priceChange24h: marketData?.priceChange24h || 0,
        marketCap: marketData?.marketCap || 0,
        volume24h: marketData?.volume24h || 0,
        liquidity: marketData?.liquidity || 0,
        holderCount: marketData?.holderCount || 0,
        transactionCount24h: marketData?.transactionCount24h || 0,
        fdv: marketData?.fdv || 0
      };
    });
    
    return tokens.sort((a, b) => {
      let aValue = a[sortField] || 0
      let bValue = b[sortField] || 0
      
      if (sortDirection === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })
  }

  // 生成统一风格的排序箭头
  const renderSortArrows = (field) => (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      opacity: sortField === field ? 1 : 0.4,
      transition: 'opacity 0.2s'
    }}>
      <Box sx={{ 
        width: 0,
        height: 0,
        borderLeft: '4px solid transparent',
        borderRight: '4px solid transparent',
        borderBottom: sortField === field && sortDirection === 'asc' ? '5px solid #3ddc84' : '5px solid #666',
        filter: sortField === field && sortDirection === 'asc' ? 'drop-shadow(0 0 3px rgba(61, 220, 132, 0.6))' : 'none'
      }} />
      <Box sx={{ 
        width: 0,
        height: 0,
        borderLeft: '4px solid transparent',
        borderRight: '4px solid transparent',
        borderTop: sortField === field && sortDirection === 'desc' ? '5px solid #3ddc84' : '5px solid #666',
        filter: sortField === field && sortDirection === 'desc' ? 'drop-shadow(0 0 3px rgba(61, 220, 132, 0.6))' : 'none'
      }} />
    </Box>
  );

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* 像素风一级导航栏 */}
        <AppBar position="static" elevation={0} sx={{ height: '56px', bgcolor: '#0f0f0f', borderBottom: '2px solid #2a2a2a' }}>
          <Toolbar variant="dense" sx={{ minHeight: '56px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <PixelReaper size={24} />
              <PixelFrog size={24} />
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontFamily: "'Press Start 2P','Silkscreen', monospace", 
                  letterSpacing: '2px',
                  fontSize: '16px',
                  color: '#3ddc84',
                  textShadow: '0 0 10px rgba(61, 220, 132, 0.5)'
                }}
              >
                TRENDHUNTER
              </Typography>
            </Box>

            {/* 右侧登录/钱包状态和设置 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* 设置按钮 */}
              <Tooltip title="Settings">
                <IconButton 
                  size="small" 
                  onClick={() => setSettingsOpen(true)}
                  sx={{ 
                    color: '#3ddc84',
                    '&:hover': { bgcolor: 'rgba(61, 220, 132, 0.1)' }
                  }}
                >
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              
            {walletAddress ? (
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                bgcolor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px',
                px: 1.25, py: 0.5
              }}>
                {/* Solana 标识与余额 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: '2px', background: 'linear-gradient(90deg, #9945FF, #14F195)' }} />
                  <Typography variant="body2">{solBalance == null ? '-' : solBalance.toFixed(4)}</Typography>
                </Box>
                {/* 地址简写与复制 */}
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>{shortAddress(walletAddress)}</Typography>
                  <Tooltip title="Copy Address">
                  <IconButton size="small" sx={{ p: 0.5 }} onClick={handleCopy}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {/* 菜单展开 */}
                <IconButton size="small" sx={{ p: 0.5 }} onClick={openMenu}>
                  <ExpandMoreIcon fontSize="small" />
                </IconButton>
                <Menu anchorEl={walletMenuAnchor} open={Boolean(walletMenuAnchor)} onClose={closeMenu} keepMounted>
                    <MenuItem onClick={fetchBalance}>Refresh Balance</MenuItem>
                    <MenuItem onClick={handleDisconnect}>Disconnect</MenuItem>
                </Menu>
              </Box>
            ) : (
              <WalletMultiButton 
                style={{
                  fontFamily: "'Silkscreen','Press Start 2P', monospace",
                  fontSize: '12px',
                  backgroundColor: '#0d1e12',
                  border: '1px solid #3ddc84',
                  color: '#3ddc84',
                  borderRadius: '10px',
                  height: '36px',
                  padding: '0 16px'
                }}
              />
            )}
            </Box>
          </Toolbar>
        </AppBar>
        {/* 主题切换 */}
        <Box sx={{ borderBottom: '2px solid #2a2a2a', bgcolor: '#0f0f0f' }}>
          <Container maxWidth="xl">
            <Tabs 
              value={currentTopic} 
              onChange={handleTopicChange}
              sx={{
                minHeight: '48px',
                '& .MuiTab-root': {
                  fontFamily: "'Silkscreen', monospace",
                  fontSize: '13px',
                  color: '#666',
                  minHeight: '48px',
                  py: 1.5,
                  transition: 'all 0.2s',
                  '&:hover': {
                    color: '#999',
                    bgcolor: 'rgba(61, 220, 132, 0.05)'
                  }
                },
                '& .Mui-selected': {
                  color: '#3ddc84 !important',
                  fontWeight: 'bold'
                },
                '& .MuiTabs-indicator': {
                  height: '3px',
                  bgcolor: '#3ddc84',
                  boxShadow: '0 0 8px rgba(61, 220, 132, 0.6)'
                }
              }}
            >
              {topics.map((topic) => (
                <Tab 
                  key={topic.id}
                  value={topic.id}
                  icon={<TrendingUpIcon sx={{ fontSize: '18px' }} />} 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <span>{topic.name}</span>
                      {topic.source === 'system' && (
                        <Chip 
                          label="🤖" 
                          size="small" 
                          sx={{ 
                            height: '16px', 
                            fontSize: '10px', 
                            bgcolor: 'rgba(61, 220, 132, 0.2)',
                            color: '#3ddc84',
                            fontFamily: "'Press Start 2P', monospace"
                          }} 
                        />
                      )}
                    </Box>
                  }
                  iconPosition="start"
                />
              ))}
            </Tabs>
          </Container>
        </Box>

        {/* 主内容区域 */}
        <Container maxWidth="xl" sx={{ flexGrow: 1, py: 4, overflow: 'auto' }}>
          <Box>
            {topics.find(t => t.id === currentTopic)?.tokens?.length === 0 ? (
              <Card sx={{ bgcolor: '#1e1e1e', border: '1px solid #2a2a2a', p: 3, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 2, fontFamily: "'Press Start 2P', 'Zpix', monospace" }}>
                  No Token Data
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: "'Press Start 2P', 'Zpix', monospace" }}>
                  Add tokens in Settings
                </Typography>
              </Card>
            ) : (
              <Box sx={{ bgcolor: '#1a1a1a', border: '2px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)' }}>
                {/* 表格头部 */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  px: 3, 
                  py: 2, 
                  borderBottom: '2px solid #2a2a2a',
                  bgcolor: 'rgba(61, 220, 132, 0.05)'
                }}>
                  <Box sx={{ width: '60px', textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "'Press Start 2P', monospace" }}>#</Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: '200px', ml: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "'Press Start 2P', monospace" }}>TOKEN</Typography>
                  </Box>
                  <Box 
                    sx={{ 
                      width: { xs: '80px', sm: '100px', md: '120px', lg: '140px' }, 
                      textAlign: 'right', 
                      cursor: 'pointer', 
                      pr: 2,
                      '&:hover': { bgcolor: 'rgba(61, 220, 132, 0.1)' },
                      borderRadius: '4px',
                      transition: 'background-color 0.2s'
                    }} 
                    onClick={() => handleSort('price')}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: "'Press Start 2P', monospace",
                        color: sortField === 'price' ? '#3ddc84' : '#888',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '6px'
                      }}
                    >
                      PRICE
                      {renderSortArrows('price')}
                    </Typography>
                  </Box>
                  <Box 
                    sx={{ 
                      width: { xs: '80px', sm: '100px', md: '120px', lg: '140px' }, 
                      textAlign: 'right', 
                      cursor: 'pointer', 
                      pr: 2,
                      '&:hover': { bgcolor: 'rgba(61, 220, 132, 0.1)' },
                      borderRadius: '4px',
                      transition: 'background-color 0.2s'
                    }} 
                    onClick={() => handleSort('priceChange24h')}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: "'Press Start 2P', monospace",
                        color: sortField === 'priceChange24h' ? '#3ddc84' : '#888',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '6px'
                      }}
                    >
                      24H CHG
                      {renderSortArrows('priceChange24h')}
                    </Typography>
                  </Box>
                  <Box 
                    sx={{ 
                      width: { xs: '80px', sm: '100px', md: '120px', lg: '140px' }, 
                      textAlign: 'right', 
                      cursor: 'pointer', 
                      pr: 2,
                      '&:hover': { bgcolor: 'rgba(61, 220, 132, 0.1)' },
                      borderRadius: '4px',
                      transition: 'background-color 0.2s'
                    }} 
                    onClick={() => handleSort('marketCap')}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: "'Press Start 2P', monospace",
                        color: sortField === 'marketCap' ? '#3ddc84' : '#888',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '6px'
                      }}
                    >
                      MCAP
                      {renderSortArrows('marketCap')}
                    </Typography>
                  </Box>
                  <Box 
                    sx={{ 
                      width: { xs: '80px', sm: '100px', md: '120px', lg: '140px' }, 
                      textAlign: 'right', 
                      cursor: 'pointer', 
                      pr: 2,
                      '&:hover': { bgcolor: 'rgba(61, 220, 132, 0.1)' },
                      borderRadius: '4px',
                      transition: 'background-color 0.2s'
                    }} 
                    onClick={() => handleSort('liquidity')}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: "'Press Start 2P', monospace",
                        color: sortField === 'liquidity' ? '#3ddc84' : '#888',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '6px'
                      }}
                    >
                      LIQUIDITY
                      {renderSortArrows('liquidity')}
                    </Typography>
                  </Box>
                  <Box 
                    sx={{ 
                      width: { xs: '80px', sm: '100px', md: '120px', lg: '140px' }, 
                      textAlign: 'right', 
                      cursor: 'pointer', 
                      pr: 2,
                      '&:hover': { bgcolor: 'rgba(61, 220, 132, 0.1)' },
                      borderRadius: '4px',
                      transition: 'background-color 0.2s'
                    }} 
                    onClick={() => handleSort('volume24h')}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: "'Press Start 2P', monospace",
                        color: sortField === 'volume24h' ? '#3ddc84' : '#888',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '6px'
                      }}
                    >
                      24H VOL
                      {renderSortArrows('volume24h')}
                    </Typography>
                  </Box>
                  <Box sx={{ width: { xs: '60px', sm: '80px', md: '100px', lg: '120px' }, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "'Press Start 2P', monospace" }}>ACTION</Typography>
                  </Box>
                </Box>
                
                {/* 表格内容 */}
                {getSortedTokens().map((token, index) => (
                  <Box 
                    key={token.id}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      px: 3, 
                      py: 2, 
                      borderBottom: index < getSortedTokens().length - 1 ? '1px solid #222' : 'none',
                      transition: 'all 0.2s',
                      '&:hover': { 
                        bgcolor: 'rgba(61, 220, 132, 0.08)',
                        transform: 'translateX(4px)'
                      }
                    }}
                  >
                    <Box sx={{ width: '60px', textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {index + 1}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: '200px', ml: 2, display: 'flex', alignItems: 'center' }}>
                      {token.logoUri ? (
                        <Box
                          component="img"
                          src={token.logoUri}
                          alt={token.symbol}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="%233ddc84"/><text x="16" y="20" text-anchor="middle" fill="%23000" font-size="16" font-family="monospace">?</text></svg>';
                          }}
                          sx={{ width: 32, height: 32, borderRadius: '50%', mr: 2, bgcolor: '#2a2a2a' }}
                        />
                      ) : (
                        <Box sx={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: '50%', 
                          mr: 2, 
                          bgcolor: '#2a2a2a',
                          border: '2px solid #3ddc84',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Typography sx={{ color: '#3ddc84', fontSize: '16px', fontFamily: "'Press Start 2P', monospace" }}>
                            ?
                          </Typography>
                        </Box>
                      )}
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 'bold', fontFamily: "'Press Start 2P', monospace" }}>
                            {token.symbol} <span style={{ color: '#888', fontSize: '0.8em', fontWeight: 'normal' }}>{formatContractAddress(token.mintAddress)}</span>
                          </Typography>
                          <Tooltip title="复制合约地址">
                            <IconButton 
                              size="small" 
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(token.mintAddress);
                                  console.log('✅ CA copied:', token.mintAddress);
                                  setCopySnackbarOpen(true);
                                } catch (error) {
                                  console.error('Failed to copy CA:', error);
                                }
                              }}
                              sx={{ 
                                p: 0.3,
                                color: '#888',
                                '&:hover': { 
                                  color: '#3ddc84',
                                  bgcolor: 'rgba(61, 220, 132, 0.1)'
                                }
                              }}
                            >
                              <ContentCopyIcon sx={{ fontSize: 12 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "'Zpix', 'Press Start 2P', monospace" }}>
                          {token.name}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ width: { xs: '80px', sm: '100px', md: '120px', lg: '140px' }, textAlign: 'right', pr: 2, overflow: 'hidden' }}>
                      <AnimatedNumber 
                        value={token.price} 
                        format={formatPrice} 
                        color="#3ddc84"
                      />
                    </Box>
                    <Box sx={{ width: { xs: '80px', sm: '100px', md: '120px', lg: '140px' }, textAlign: 'right', pr: 2, overflow: 'hidden' }}>
                      <AnimatedNumber 
                        value={token.priceChange24h} 
                        format={formatPercentage} 
                        color={token.priceChange24h >= 0 ? '#3ddc84' : '#ff4d4f'}
                      />
                    </Box>
                    <Box sx={{ width: { xs: '80px', sm: '100px', md: '120px', lg: '140px' }, textAlign: 'right', pr: 2, overflow: 'hidden' }}>
                      <AnimatedNumber 
                        value={token.marketCap} 
                        format={(val) => `$${formatLargeNumber(val)}`} 
                        color="#ffffff"
                      />
                    </Box>
                    <Box sx={{ width: { xs: '80px', sm: '100px', md: '120px', lg: '140px' }, textAlign: 'right', pr: 2, overflow: 'hidden' }}>
                      <AnimatedNumber 
                        value={token.liquidity} 
                        format={(val) => `$${formatLargeNumber(val)}`} 
                        color="#ffffff"
                      />
                    </Box>
                    <Box sx={{ width: { xs: '80px', sm: '100px', md: '120px', lg: '140px' }, textAlign: 'right', pr: 2, overflow: 'hidden' }}>
                      <AnimatedNumber 
                        value={token.volume24h} 
                        format={(val) => `$${formatLargeNumber(val)}`} 
                        color="#ffffff"
                      />
                    </Box>
                    <Box sx={{ width: { xs: '60px', sm: '80px', md: '100px', lg: '120px' }, textAlign: 'center' }}>
                      <Button 
                        size="small" 
                        variant="contained"
                        onClick={() => {
                          setSelectedTokenForBuy(token);
                          setBuyModalOpen(true);
                        }}
                        sx={{ 
                          bgcolor: '#3ddc84', 
                          color: '#000',
                          fontSize: '10px',
                          fontFamily: "'Press Start 2P', monospace",
                          '&:hover': { bgcolor: '#46f092' }
                        }}
                      >
                        BUY
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Container>
      </Box>

      {/* 设置对话框 */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#3ddc84', fontFamily: "'Press Start 2P', 'Zpix', monospace" }}>
          SETTINGS
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#ffffff', fontFamily: "'Press Start 2P', 'Zpix', monospace" }}>
              Add New Topic
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter topic name"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#ffffff',
                    fontFamily: "'Zpix', 'Press Start 2P', monospace",
                    '& fieldset': { borderColor: '#3ddc84' },
                    '&:hover fieldset': { borderColor: '#46f092' },
                    '&.Mui-focused fieldset': { borderColor: '#3ddc84' }
                  }
                }}
              />
              <Button 
                variant="contained" 
                onClick={handleAddTopic}
                disabled={loading}
                sx={{ bgcolor: '#3ddc84', color: '#000', fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }}
              >
                {loading ? 'ADDING...' : 'ADD'}
              </Button>
            </Box>
          </Box>
          
          <Box>
            <Typography variant="h6" sx={{ mb: 2, color: '#ffffff', fontFamily: "'Press Start 2P', 'Zpix', monospace" }}>
              Topic Management
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {topics.map((topic, index) => (
                <Box 
                  key={topic.id}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    p: 1.5, 
                    bgcolor: topic.id === currentTopic ? 'rgba(61, 220, 132, 0.1)' : '#2a2a2a',
                    border: topic.id === currentTopic ? '1px solid #3ddc84' : '1px solid #333',
                    borderRadius: '8px',
                    '&:hover': { bgcolor: topic.id === currentTopic ? 'rgba(61, 220, 132, 0.15)' : '#333' }
                  }}
                >
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: topic.id === currentTopic ? '#3ddc84' : '#ffffff',
                        fontWeight: topic.id === currentTopic ? 'bold' : 'normal',
                        fontFamily: "'Zpix', 'Press Start 2P', monospace",
                        cursor: 'pointer'
                      }}
                      onClick={() => setCurrentTopic(topic.id)}
                    >
                      {topic.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1, fontFamily: "'Press Start 2P', monospace" }}>
                      ({topic.tokens?.length || 0} tokens)
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {/* 添加代币按钮 */}
                    <Tooltip title="Add Token">
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setCurrentTopic(topic.id);
                          setAddTokenOpen(true);
                        }}
                        sx={{ 
                          color: '#3ddc84',
                          '&:hover': { color: '#46f092' }
                        }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    {/* 删除代币按钮 */}
                    <Tooltip title="Delete Token">
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setSelectedTopicForDelete(topic.id);
                          setDeleteTokenOpen(true);
                        }}
                        disabled={!topic.tokens || topic.tokens.length === 0}
                        sx={{ 
                          color: (!topic.tokens || topic.tokens.length === 0) ? '#666' : '#ff4d4f',
                          '&:hover': { color: '#ff7875' }
                        }}
                      >
                        <RemoveCircleIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Move Up">
                      <IconButton 
                        size="small" 
                        onClick={() => handleMoveTopic(topic.id, 'up')}
                        disabled={index === 0}
                        sx={{ 
                          color: index === 0 ? '#666' : '#999',
                          '&:hover': { color: '#3ddc84' }
                        }}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    {/* 下移按钮 */}
                    <Tooltip title="Move Down">
                      <IconButton 
                        size="small" 
                        onClick={() => handleMoveTopic(topic.id, 'down')}
                        disabled={index === topics.length - 1}
                        sx={{ 
                          color: index === topics.length - 1 ? '#666' : '#999',
                          '&:hover': { color: '#3ddc84' }
                        }}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    {/* 删除按钮 */}
                    <Tooltip title="Delete Topic">
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteTopic(topic.id)}
                        disabled={topics.length <= 1}
                        sx={{ 
                          color: topics.length <= 1 ? '#666' : '#ff4d4f',
                          '&:hover': { color: '#ff7875' }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setSettingsOpen(false)} 
            sx={{ 
              color: '#999',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '10px',
              '&:hover': { color: '#ffffff' }
            }}
          >
            CLOSE
          </Button>
        </DialogActions>
      </Dialog>

      {/* 添加代币对话框 */}
      <Dialog open={addTokenOpen} onClose={() => setAddTokenOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#3ddc84', fontFamily: "'Press Start 2P', 'Zpix', monospace" }}>
          Add Token to {topics.find(t => t.id === currentTopic)?.name || 'Current Topic'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Token Contract Address"
            placeholder="Enter token contract address (CA)"
            value={newTokenAddress}
            onChange={(e) => setNewTokenAddress(e.target.value)}
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                color: '#ffffff',
                fontFamily: "'Press Start 2P', monospace",
                '& fieldset': { borderColor: '#3ddc84' },
                '&:hover fieldset': { borderColor: '#46f092' },
                '&.Mui-focused fieldset': { borderColor: '#3ddc84' }
              },
              '& .MuiInputLabel-root': { color: '#999', fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: '10px', fontFamily: "'Press Start 2P', monospace" }}>
            💡 Auto-detect duplicate addresses
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddTokenOpen(false)} sx={{ color: '#999', fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }}>
            CANCEL
          </Button>
          <Button 
            onClick={handleAddToken} 
            variant="contained"
            disabled={loading}
            sx={{ bgcolor: '#3ddc84', color: '#000', fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }}
          >
            {loading ? 'ADDING...' : 'ADD TOKEN'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除代币对话框 */}
      <Dialog open={deleteTokenOpen} onClose={() => setDeleteTokenOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#ff4d4f', fontFamily: "'Press Start 2P', 'Zpix', monospace" }}>
          Delete Token from {topics.find(t => t.id === selectedTopicForDelete)?.name || 'Topic'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2, color: '#ffffff', fontFamily: "'Press Start 2P', monospace" }}>
              Select token to delete:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '400px', overflowY: 'auto' }}>
              {topics.find(t => t.id === selectedTopicForDelete)?.tokens?.map((topicToken) => (
                <Box 
                  key={topicToken.id}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    p: 2, 
                    bgcolor: '#2a2a2a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    '&:hover': { bgcolor: '#333' }
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ color: '#ffffff', fontFamily: "'Press Start 2P', monospace", fontWeight: 'bold' }}>
                      {topicToken.token.symbol} <span style={{ color: '#888', fontSize: '0.8em', fontWeight: 'normal' }}>{topicToken.token.mintAddress.slice(0, 4)}...{topicToken.token.mintAddress.slice(-4)}</span>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "'Zpix', monospace", mt: 0.5 }}>
                      {topicToken.token.name}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={async () => {
                      try {
                        setLoading(true);
                        await removeTokenFromTopic(topicToken.id);
                        await fetchUserData(user.walletAddress);
                        setDeleteTokenOpen(false);
                        alert('✅ Token deleted successfully');
                      } catch (error) {
                        console.error('Failed to delete token:', error);
                        alert(`❌ Failed to delete token: ${error.message}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    sx={{ 
                      bgcolor: '#ff4d4f', 
                      color: '#ffffff', 
                      fontFamily: "'Press Start 2P', monospace", 
                      fontSize: '8px',
                      '&:hover': { bgcolor: '#ff7875' }
                    }}
                  >
                    DELETE
                  </Button>
                </Box>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteTokenOpen(false)} 
            sx={{ color: '#999', fontFamily: "'Press Start 2P', monospace", fontSize: '10px' }}
          >
            CLOSE
          </Button>
        </DialogActions>
      </Dialog>

      {/* 买入弹窗 */}
      <BuyModal
        open={buyModalOpen}
        onClose={() => setBuyModalOpen(false)}
        token={selectedTokenForBuy}
      />

      {/* 复制成功提示 */}
      <Snackbar 
        open={copySnackbarOpen} 
        autoHideDuration={2000} 
        onClose={() => setCopySnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setCopySnackbarOpen(false)} 
          severity="success"
          sx={{ 
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '10px',
            bgcolor: '#0d1e12',
            color: '#3ddc84',
            border: '1px solid #3ddc84',
            '& .MuiAlert-icon': {
              color: '#3ddc84'
            }
          }}
        >
          ✅ 合约地址已复制
        </Alert>
      </Snackbar>
    </ThemeProvider>
  )
}

export default App