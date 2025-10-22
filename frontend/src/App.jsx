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
  Tooltip
} from '@mui/material'
import FlashOnIcon from '@mui/icons-material/FlashOn'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js'
import './App.css'
import CryptoTable from './components/CryptoTable'
import PixelReaper from './components/PixelReaper'
import PixelFrog from './components/PixelFrog'

// 创建暗色主题
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1a1a1a',
    },
    secondary: {
      main: '#3a3a3a',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

function App() {
  const [walletAddress, setWalletAddress] = React.useState(null)
  const [walletMenuAnchor, setWalletMenuAnchor] = React.useState(null)
  const [solBalance, setSolBalance] = React.useState(null)

  const connectionRef = React.useRef(null)

  const getProvider = () => {
    if (window.phantom?.solana) return window.phantom.solana;
    if (window.solana && window.solana.isPhantom) return window.solana;
    return null;
  }

  const ensureConnection = () => {
    if (!connectionRef.current) {
      // 默认使用 mainnet；如需 devnet 可改为 clusterApiUrl('devnet')
      connectionRef.current = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed')
    }
    return connectionRef.current
  }

  const fetchBalance = async (addressStr) => {
    try {
      const conn = ensureConnection()
      const pubkey = new PublicKey(addressStr)
      const lamports = await conn.getBalance(pubkey)
      setSolBalance(lamports / 1_000_000_000) // 转 SOL
    } catch (e) {
      console.warn('获取余额失败:', e)
      setSolBalance(null)
    }
  }

  const handlePhantomLogin = async () => {
    try {
      const provider = getProvider();
      if (!provider) {
        window.open('https://phantom.app/', '_blank');
        return;
      }
      const resp = await provider.connect({ onlyIfTrusted: false });
      const addr = resp.publicKey?.toString() || null
      setWalletAddress(addr);
      if (addr) {
        await fetchBalance(addr)
      }
    } catch (err) {
      console.error('Phantom 连接失败:', err);
    }
  }

  const handleDisconnect = async () => {
    try {
      const provider = getProvider();
      if (provider?.disconnect) await provider.disconnect();
    } catch (e) {
      console.warn('断开失败，已本地重置状态', e);
    } finally {
      setWalletAddress(null);
      setSolBalance(null);
      setWalletMenuAnchor(null);
    }
  }

  const shortAddress = (addr) => addr ? `${addr.slice(0,4)}...${addr.slice(-4)}` : ''
  const handleCopy = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
    } catch (e) {
      console.warn('复制失败:', e);
    }
  }

  const openMenu = (e) => setWalletMenuAnchor(e.currentTarget)
  const closeMenu = () => setWalletMenuAnchor(null)

  // 可选：当 provider 账户变化时刷新余额
  React.useEffect(() => {
    const provider = getProvider()
    if (!provider) return
    const handler = async () => {
      const addr = provider.publicKey?.toString()
      if (addr) {
        setWalletAddress(addr)
        await fetchBalance(addr)
      }
    }
    provider.on?.('accountChanged', handler)
    return () => provider.removeListener?.('accountChanged', handler)
  }, [])

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* 像素风一级导航栏 */}
        <AppBar position="static" elevation={0} sx={{ height: '50px', bgcolor: '#0f0f0f', borderBottom: '1px solid #2a2a2a' }}>
          <Toolbar variant="dense" sx={{ minHeight: '50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pl: 1, pr: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PixelReaper size={20} />
              <PixelFrog size={20} />
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontFamily: "'Press Start 2P','Silkscreen', monospace", 
                  letterSpacing: '2px',
                  color: '#ffffff'
                }}
              >
                TRENDHUNTER
              </Typography>
            </Box>

            {/* 右侧登录/钱包状态 */}
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
                <Tooltip title="复制地址">
                  <IconButton size="small" sx={{ p: 0.5 }} onClick={handleCopy}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {/* 菜单展开 */}
                <IconButton size="small" sx={{ p: 0.5 }} onClick={openMenu}>
                  <ExpandMoreIcon fontSize="small" />
                </IconButton>
                <Menu anchorEl={walletMenuAnchor} open={Boolean(walletMenuAnchor)} onClose={closeMenu} keepMounted>
                  <MenuItem onClick={() => fetchBalance(walletAddress)}>刷新余额</MenuItem>
                  <MenuItem onClick={handleDisconnect}>断开钱包链接</MenuItem>
                </Menu>
              </Box>
            ) : (
              <Button 
                size="small"
                startIcon={<FlashOnIcon sx={{ fontSize: 16 }} />}
                onClick={handlePhantomLogin}
                sx={{
                  fontFamily: "'Silkscreen','Press Start 2P', monospace",
                  fontSize: 12,
                  bgcolor: '#0d1e12',
                  border: '1px solid #3ddc84',
                  color: '#3ddc84',
                  borderRadius: '10px',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#0f2617', borderColor: '#46f092' }
                }}
              >
                登录
              </Button>
            )}
          </Toolbar>
        </AppBar>
        {/* 主内容区域 */}
        <Container maxWidth="xl" sx={{ flexGrow: 1, py: 2, overflow: 'auto' }}>
          <CryptoTable />
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App
