# Moralis API 填写指南

## 📝 你只需要替换这些占位符

文件：`backend/src/services/moralis-token-service.ts`

---

## 1️⃣ 获取代币元数据（第66行）

### 查找你的 Moralis API
在 Moralis 文档中找到获取代币元数据的API，可能是：
- `getSPL`
- `getTokenMetadata`
- `getToken`
- 或其他类似名称

### 替换代码
```typescript
// 找到第72行，替换"你的API方法名"
const response = await Moralis.SolApi.token.你的API方法名({  // ← 这里
  network: "mainnet",
  address: mintAddress
});

// 然后根据实际返回的字段，替换"你的字段名"
return {
  name: response.name || response.你的字段名 || 'Unknown',  // ← 这里
  symbol: response.symbol || response.你的字段名 || '???',
  // ... 依此类推
};
```

**示例**：如果 Moralis API 是 `getSPL`，返回字段是 `tokenName`, `tokenSymbol`：
```typescript
const response = await Moralis.SolApi.token.getSPL({
  network: "mainnet",
  address: mintAddress
});

return {
  name: response.tokenName || 'Unknown',
  symbol: response.tokenSymbol || '???',
  logoUri: response.logo || null,
  decimals: response.decimals || 9,
  supply: response.supply || 0
};
```

---

## 2️⃣ 获取代币价格（第98行）

### 替换代码
```typescript
const response = await Moralis.SolApi.token.你的API方法名({  // ← 替换
  network: "mainnet",
  address: mintAddress
});

return {
  price: response.usdPrice || response.price || 0,  // ← 根据实际字段调整
  priceChange24h: response.priceChange24h || 0
};
```

---

## 3️⃣ 获取市场数据（第118行）

### 替换代码
```typescript
const response = await Moralis.SolApi.token.你的API方法名({  // ← 替换
  network: "mainnet",
  address: mintAddress
});

return {
  marketCap: response.marketCap || 0,      // ← 根据实际字段
  liquidity: response.liquidity || 0,
  volume24h: response.volume24h || 0,
  fdv: response.fdv || 0
};
```

---

## 4️⃣ 获取持有人数（第141行）⭐ 重要

### 替换代码
```typescript
const response = await Moralis.SolApi.token.你的API方法名({  // ← 替换
  network: "mainnet",
  address: mintAddress,
  limit: 100
});

return response.total || response.count || 0;  // ← 根据实际字段
```

---

## 5️⃣ 获取交易统计（第164行）⭐ 重要

### 替换代码
```typescript
const response = await Moralis.SolApi.token.你的API方法名({  // ← 替换
  network: "mainnet",
  address: mintAddress,
  limit: 1000
});

const transfers = response.result || response.transfers || [];  // ← 根据实际字段

// 后面的统计逻辑已经写好，只需要调整时间字段名
const txTime = new Date(tx.blockTimestamp || tx.timestamp).getTime();  // ← 这里
```

---

## 6️⃣ 获取新代币列表（第217行）⭐⭐⭐ 最重要

### 替换代码
```typescript
const response = await Moralis.SolApi.token.你的API方法名({  // ← 替换
  network: "mainnet",
  limit: 100,
  // 可能需要的时间参数（根据实际API）
  fromDate: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
});

const tokens = response.result || response.tokens || [];  // ← 根据实际字段

return tokens.map((token: any) => ({
  mintAddress: token.address || token.mint,  // ← 根据实际字段
  name: token.name || 'Unknown',
  symbol: token.symbol || '???',
  // ... 依此类推
}));
```

---

## 📚 Moralis 文档位置

### 查找API方法
访问：https://docs.moralis.io/web3-data-api/solana/reference

**常用API**：
- Token Metadata: `getSPL` 或 `getTokenMetadata`
- Token Price: `getTokenPrice`
- Token Owners: `getSPLTokenOwners`
- Token Transfers: `getSPLTokenTransfers`

### API 调用格式
```typescript
await Moralis.SolApi.token.方法名({
  network: "mainnet",  // 或 "devnet"
  address: "代币地址",
  // 其他参数...
});
```

---

## 🧪 测试步骤

### 1. 配置 API Key
```bash
cd backend
echo 'MORALIS_API_KEY=你的密钥' >> .env
```

### 2. 实现一个方法
比如先实现 `getTokenMetadata()`

### 3. 测试
```bash
npx tsx src/scripts/test-moralis.ts
```

### 4. 验证
看日志是否报错，数据是否正确

### 5. 依次实现其他方法

---

## ⚡ 快速示例

假设 Moralis API 文档告诉你：

**获取代币信息的方法是**：`Moralis.SolApi.token.getTokenInfo()`
**返回字段是**：`{ tokenName, tokenSymbol, tokenLogo }`

那么你就这样改：

```typescript
// 第72行
const response = await Moralis.SolApi.token.getTokenInfo({  // ✅ 改这里
  network: "mainnet",
  address: mintAddress
});

return {
  name: response.tokenName || 'Unknown',      // ✅ 改这里
  symbol: response.tokenSymbol || '???',      // ✅ 改这里
  logoUri: response.tokenLogo || null,        // ✅ 改这里
  decimals: response.decimals || 9,
  supply: response.supply || 0
};
```

---

## ✅ 总结

你需要做的：
1. 查 Moralis 文档，找到对应的 API 方法名
2. 把 `你的API方法名` 替换成实际的方法名
3. 把 `你的字段名` 替换成实际返回的字段名
4. 测试验证

所有调用逻辑、错误处理、数据整合都已经写好了！

