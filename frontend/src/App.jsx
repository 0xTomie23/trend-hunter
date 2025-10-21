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
  Button
} from '@mui/material'
import FlashOnIcon from '@mui/icons-material/FlashOn'
import './App.css'
import CryptoTable from './components/CryptoTable'
import PixelReaper from './components/PixelReaper'

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

  const getProvider = () => {
    if (window.phantom?.solana) return window.phantom.solana;
    if (window.solana && window.solana.isPhantom) return window.solana;
    return null;
  }

  const handlePhantomLogin = async () => {
    try {
      const provider = getProvider();
      if (!provider) {
        window.open('https://phantom.app/', '_blank');
        return;
      }
      const resp = await provider.connect({ onlyIfTrusted: false });
      setWalletAddress(resp.publicKey?.toString() || null);
    } catch (err) {
      console.error('Phantom 连接失败:', err);
    }
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* 像素风一级导航栏 */}
        <AppBar position="static" elevation={0} sx={{ height: '50px', bgcolor: '#0f0f0f', borderBottom: '1px solid #2a2a2a' }}>
          <Toolbar variant="dense" sx={{ minHeight: '50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pl: 1, pr: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PixelReaper size={20} />
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

            {/* 右侧登录按钮 */}
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
              {walletAddress ? `${walletAddress.slice(0,4)}...${walletAddress.slice(-4)}` : '登录'}
            </Button>
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
