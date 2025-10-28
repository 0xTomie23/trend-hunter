import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, VersionedTransaction } from '@solana/web3.js';

const BuyModal = ({ open, onClose, token }) => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [solAmount, setSolAmount] = useState('');
  const [estimatedTokens, setEstimatedTokens] = useState(null);
  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState(null);
  const [quote, setQuote] = useState(null);

  // 获取报价
  const fetchQuote = async (amount) => {
    if (!amount || parseFloat(amount) <= 0) {
      setEstimatedTokens(null);
      setQuote(null);
      return;
    }

    setQuoting(true);
    setError(null);

    try {
      const solInLamports = Math.floor(parseFloat(amount) * 1e9);
      
      // Jupiter API - 获取报价
      const response = await fetch(
        `https://quote-api.jup.ag/v6/quote?` +
        `inputMint=So11111111111111111111111111111111111111112&` + // SOL mint
        `outputMint=${token.mintAddress}&` +
        `amount=${solInLamports}&` +
        `slippageBps=50` // 0.5% 滑点
      );

      if (!response.ok) {
        throw new Error('无法获取报价');
      }

      const data = await response.json();
      setQuote(data);
      
      // 计算预估代币数量
      const outputAmount = parseInt(data.outAmount) / Math.pow(10, token.decimals || 9);
      setEstimatedTokens(outputAmount);
    } catch (err) {
      console.error('获取报价失败:', err);
      setError(err.message || '无法获取报价，请稍后重试');
      setEstimatedTokens(null);
      setQuote(null);
    } finally {
      setQuoting(false);
    }
  };

  // 监听 SOL 数量变化
  useEffect(() => {
    if (!token) return;
    
    const timer = setTimeout(() => {
      if (solAmount) {
        fetchQuote(solAmount);
      }
    }, 500); // 防抖 500ms

    return () => clearTimeout(timer);
  }, [solAmount, token?.mintAddress]);

  // 执行买入
  const handleBuy = async () => {
    if (!publicKey) {
      setError('请先连接钱包');
      return;
    }

    if (!quote) {
      setError('请等待报价加载完成');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 获取交换交易
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: publicKey.toString(),
          wrapAndUnwrapSol: true,
        }),
      });

      if (!swapResponse.ok) {
        throw new Error('无法创建交换交易');
      }

      const { swapTransaction } = await swapResponse.json();

      // 反序列化交易
      // 将 base64 字符串转为 Uint8Array
      const binaryString = atob(swapTransaction);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      let transaction;
      
      try {
        transaction = VersionedTransaction.deserialize(bytes);
      } catch {
        transaction = Transaction.from(bytes);
      }

      // 发送交易
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        maxRetries: 3,
      });

      console.log('交易已发送:', signature);

      // 等待确认
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error('交易失败');
      }

      // 成功
      alert(`买入成功！\n交易签名: ${signature}`);
      onClose();
      
    } catch (err) {
      console.error('买入失败:', err);
      setError(err.message || '买入失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 如果 token 为空，不显示对话框
  if (!token) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        买入 {token.symbol || 'Token'}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ py: 2 }}>
          {/* 代币信息 */}
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {token?.name || 'Unknown Token'}
          </Typography>
          
          {/* 快捷金额选项 */}
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              快捷金额
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {[0.1, 0.25, 0.5, 1].map((amount) => (
                <Button
                  key={amount}
                  variant={solAmount === amount.toString() ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setSolAmount(amount.toString())}
                  disabled={loading}
                  sx={{
                    flex: '1 1 calc(25% - 6px)',
                    minWidth: '60px',
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '10px',
                    bgcolor: solAmount === amount.toString() ? '#3ddc84' : 'transparent',
                    color: solAmount === amount.toString() ? '#000' : '#3ddc84',
                    borderColor: '#3ddc84',
                    '&:hover': {
                      bgcolor: solAmount === amount.toString() ? '#46f092' : 'rgba(61, 220, 132, 0.1)',
                      borderColor: '#46f092',
                    },
                  }}
                >
                  {amount} SOL
                </Button>
              ))}
            </Box>
          </Box>
          
          {/* SOL 输入 */}
          <TextField
            fullWidth
            label="自定义金额"
            type="number"
            value={solAmount}
            onChange={(e) => setSolAmount(e.target.value)}
            placeholder="0.0"
            inputProps={{ step: '0.01', min: '0' }}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '14px',
                '& fieldset': { borderColor: '#3ddc84' },
                '&:hover fieldset': { borderColor: '#46f092' },
                '&.Mui-focused fieldset': { borderColor: '#3ddc84' },
              },
              '& .MuiInputLabel-root': { 
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '10px',
                '&.Mui-focused': { color: '#3ddc84' },
              },
            }}
            disabled={loading}
          />

          {/* 预估代币数量 */}
          {quoting && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CircularProgress size={16} />
              <Typography variant="body2">获取报价中...</Typography>
            </Box>
          )}

          {estimatedTokens !== null && !quoting && (
            <Alert severity="info" sx={{ mb: 2 }}>
              预估获得: <strong>{estimatedTokens.toFixed(6)}</strong> {token?.symbol}
              <br />
              <Typography variant="caption">
                (滑点容差: 0.5%)
              </Typography>
            </Alert>
          )}

          {/* 错误信息 */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* 钱包未连接提示 */}
          {!publicKey && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              请先连接 Phantom 钱包
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button
          onClick={handleBuy}
          variant="contained"
          disabled={!publicKey || !quote || loading || quoting || !solAmount}
          startIcon={loading && <CircularProgress size={16} />}
        >
          {loading ? '处理中...' : '确认买入'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BuyModal;

