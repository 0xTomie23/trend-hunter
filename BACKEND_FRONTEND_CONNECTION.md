# 后端前端对接说明

## 🌐 后端API接口

### 接口位置

**文件**：`backend/src/routes/index.ts`

**挂载路径**：
```typescript
// backend/src/index.ts 第35行
app.use('/api', apiRoutes);  
// 所有接口都是 /api/* 开头
```

---

### 提供的API（3个主要接口）

#### 1. 获取热点列表
```
GET http://localhost:3000/api/hot-topics?page=1&limit=20&timeRange=24h&sortBy=hot_score
```

**查询参数**：
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）
- `timeRange`: 时间范围
  - `1h` - 1小时
  - `6h` - 6小时
  - `24h` - 24小时（默认）
  - `7d` - 7天
- `sortBy`: 排序方式
  - `hot_score` - 按热度排序（默认）
  - `latest` - 按最新
  - `mentions` - 按代币数量

**返回数据**：
```json
{
  "data": [
    {
      "id": 1,
      "keyword": "索拉",
      "totalMentions": 3,
      "hotScore": 285,
      "firstSeenAt": "2024-10-21T10:00:00Z",
      "lastSeenAt": "2024-10-21T10:05:00Z",
      "matches": [
        {
          "token": {
            "id": 1,
            "name": "索拉拉",
            "symbol": "SOLA",
            "mintAddress": "ABC123...",
            "logoUri": "https://...",
            "marketData": [
              {
                "price": 0.001,
                "marketCap": 50000,
                "liquidityUsd": 25000,
                "volume24h": 10000,
                "priceChange24h": 15.5,
                "holderCount": 150,
                "transactionCount24h": 500
              }
            ],
            "pools": [...]
          },
          "matchScore": 0.85,
          "matchType": "cluster"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

#### 2. 获取热点详情
```
GET http://localhost:3000/api/hot-topics/:id
```

**示例**：
```bash
curl http://localhost:3000/api/hot-topics/1
```

**返回**：单个热点的完整信息

#### 3. 获取代币详情
```
GET http://localhost:3000/api/tokens/:mintAddress
```

**示例**：
```bash
curl http://localhost:3000/api/tokens/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

**返回**：代币的所有信息（市场数据、流动性池、所属话题等）

#### 4. 手动触发扫描（开发用）
```
POST http://localhost:3000/api/trigger/scan
```

---

## 🔌 前端调用方式

### 方式1: 创建API客户端（推荐）

**文件**：`frontend/src/api/index.js`（已创建）

**使用方法**：

```jsx
// 在你的组件中导入
import { getHotTopics, getToken } from '../api';

function HotTopicsPage() {
  const [topics, setTopics] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    // 获取热点列表
    async function fetchTopics() {
      try {
        const data = await getHotTopics({
          page: 1,
          limit: 20,
          timeRange: '24h',
          sortBy: 'hot_score'
        });
        
        setTopics(data.data);
        setLoading(false);
      } catch (error) {
        console.error('获取热点失败:', error);
      }
    }
    
    fetchTopics();
  }, []);
  
  return (
    <div>
      {topics.map(topic => (
        <div key={topic.id}>
          <h3>#{topic.keyword}</h3>
          <p>热度: {topic.hotScore}</p>
          <p>{topic.totalMentions}个代币</p>
          
          {/* 显示代币列表 */}
          {topic.matches.map(match => (
            <div key={match.token.id}>
              <p>{match.token.name} ({match.token.symbol})</p>
              <p>价格: ${match.token.marketData[0]?.price}</p>
              <p>市值: ${match.token.marketData[0]?.marketCap}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### 方式2: 直接使用fetch

```jsx
function MyComponent() {
  React.useEffect(() => {
    fetch('http://localhost:3000/api/hot-topics?page=1&limit=20')
      .then(res => res.json())
      .then(data => {
        console.log('热点列表:', data.data);
      });
  }, []);
}
```

---

## ⚡ WebSocket 实时推送

### 后端推送位置

**文件**：`backend/src/services/simple-token-monitor.ts` 第389-408行

```typescript
// 当发现新热点时，后端会推送
io.to('hot-topics').emit('new_topic', {
  topic: { keyword: "索拉", hotScore: 285, ... },
  tokenCount: 3,
  totalMarketCap: 150000,
  tokens: [...]
});
```

### 前端接收方式

**文件**：`frontend/src/api/socket.js`（已创建）

**使用方法**：

```jsx
import { connectSocket, subscribeToTopics } from '../api/socket';

function HotTopicsPage() {
  const [topics, setTopics] = React.useState([]);
  
  React.useEffect(() => {
    // 连接 WebSocket
    connectSocket();
    
    // 订阅热点更新
    subscribeToTopics((newTopic) => {
      console.log('收到新热点:', newTopic);
      
      // 更新状态
      setTopics(prev => [newTopic, ...prev]);
      
      // 或者显示通知
      alert(`新热点: #${newTopic.topic.keyword}`);
    });
    
    return () => {
      // 清理
      disconnectSocket();
    };
  }, []);
}
```

---

## 🔄 完整数据流

```
┌─────────────────────────────────────────────────────────┐
│  后端定时任务（每5分钟）                                  │
│  backend/src/services/index.ts                           │
└────────────┬────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────┐
│  监控新代币                                              │
│  simple-token-monitor.ts → monitorNewTokens()           │
│  ├─ DexScreener: 获取新代币                              │
│  ├─ Helius: 获取持有人数、交易数                         │
│  └─ 保存到数据库                                         │
└────────────┬────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────┐
│  TODO: 主题匹配（明天实现）                              │
│  ├─ 聚类分析                                            │
│  ├─ 生成热点话题                                         │
│  └─ 保存到 HotTopic 表                                   │
└────────────┬────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────┐
│  实时推送（WebSocket）                                   │
│  io.emit('new_topic', data)                             │
└────────────┬────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────┐
│  前端接收                                                │
│  socket.on('new_topic', callback)                       │
└─────────────────────────────────────────────────────────┘

前端也可以主动查询：
┌─────────────────────────────────────────────────────────┐
│  前端调用 API                                            │
│  fetch('http://localhost:3000/api/hot-topics')          │
└────────────┬────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────┐
│  后端API路由                                             │
│  backend/src/routes/index.ts                            │
│  router.get('/hot-topics', ...)                         │
└────────────┬────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────┐
│  查询数据库                                              │
│  prisma.hotTopic.findMany()                             │
└────────────┬────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────┐
│  返回JSON数据                                            │
│  res.json({ data: [...] })                              │
└─────────────────────────────────────────────────────────┘
```

---

## 📍 后端接口文件位置

### 核心文件

```
backend/src/
├── index.ts                    # 第35-36行：挂载路由
│   app.use('/api', apiRoutes);
│   app.use('/api/trigger', triggerRoutes);
│
└── routes/
    ├── index.ts                # ⭐ 主要API接口定义
    │   ├─ GET /api/hot-topics          (第11行)
    │   ├─ GET /api/hot-topics/:id      (第98行)
    │   ├─ GET /api/tokens/:mintAddress (第163行)
    │   └─ GET /api/tokens/:mintAddress/full (第223行)
    │
    └── manual-trigger.ts       # 手动触发接口
        └─ POST /api/trigger/scan       (第12行)
```

---

## 🎨 前端集成示例

### 已创建的文件

1. **`frontend/src/api/index.js`** ⭐
   - API 调用函数
   - `getHotTopics()`, `getToken()` 等

2. **`frontend/src/api/socket.js`** ⭐
   - WebSocket 客户端
   - 订阅实时更新

### 使用示例

#### 示例1：显示热点列表

```jsx
// frontend/src/components/HotTopicsList.jsx

import React from 'react';
import { getHotTopics } from '../api';

export default function HotTopicsList() {
  const [topics, setTopics] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    loadTopics();
  }, []);
  
  async function loadTopics() {
    try {
      const data = await getHotTopics({
        page: 1,
        limit: 20,
        timeRange: '24h',
        sortBy: 'hot_score'
      });
      
      setTopics(data.data);
      setLoading(false);
    } catch (error) {
      console.error('加载失败:', error);
      setLoading(false);
    }
  }
  
  if (loading) return <div>加载中...</div>;
  
  return (
    <div>
      <h2>🔥 热点话题</h2>
      
      {topics.map(topic => (
        <div key={topic.id} style={{ border: '1px solid #333', padding: '20px', margin: '10px 0' }}>
          <h3>#{topic.keyword}</h3>
          <p>热度: {topic.hotScore} | {topic.totalMentions}个代币</p>
          
          <div>
            {topic.matches.map(match => {
              const token = match.token;
              const marketData = token.marketData[0];
              
              return (
                <div key={token.id} style={{ padding: '10px', background: '#222' }}>
                  <p>{token.name} ({token.symbol})</p>
                  <p>价格: ${marketData?.price}</p>
                  <p>市值: ${marketData?.marketCap?.toLocaleString()}</p>
                  <p>流动性: ${marketData?.liquidityUsd?.toLocaleString()}</p>
                  <p>持有人: {marketData?.holderCount}</p>
                  <p>24h交易: {marketData?.transactionCount24h}</p>
                  <p>24h涨跌: {marketData?.priceChange24h}%</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

#### 示例2：使用 WebSocket 实时更新

```jsx
// frontend/src/components/RealTimeTopics.jsx

import React from 'react';
import { getHotTopics } from '../api';
import { connectSocket, subscribeToTopics } from '../api/socket';

export default function RealTimeTopics() {
  const [topics, setTopics] = React.useState([]);
  
  React.useEffect(() => {
    // 1. 首次加载
    loadInitialData();
    
    // 2. 连接 WebSocket
    connectSocket();
    
    // 3. 订阅实时更新
    subscribeToTopics((newTopic) => {
      console.log('🔥 收到新热点:', newTopic.topic.keyword);
      
      // 添加到列表顶部
      setTopics(prev => [
        {
          ...newTopic.topic,
          matches: newTopic.tokens.map(t => ({ token: t }))
        },
        ...prev
      ]);
      
      // 显示通知
      showNotification(`新热点: #${newTopic.topic.keyword}`);
    });
    
    return () => {
      // 组件卸载时断开连接
      disconnectSocket();
    };
  }, []);
  
  async function loadInitialData() {
    const data = await getHotTopics({ limit: 10 });
    setTopics(data.data);
  }
  
  return (
    <div>
      <h2>🔥 实时热点</h2>
      {topics.map(topic => (
        <div key={topic.id}>
          #{topic.keyword} - {topic.totalMentions}个代币
        </div>
      ))}
    </div>
  );
}
```

---

## 🔧 配置 Vite 代理（开发环境）

### 创建/修改 `frontend/vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 代理 API 请求到后端
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

**配置后的好处**：
```jsx
// 前端可以直接用相对路径
fetch('/api/hot-topics')  // 自动代理到 http://localhost:3000/api/hot-topics

// 而不需要写完整URL
// fetch('http://localhost:3000/api/hot-topics')
```

---

## 🧪 测试后端接口

### 使用 curl 测试

```bash
# 1. 健康检查
curl http://localhost:3000/health

# 2. 获取热点列表
curl http://localhost:3000/api/hot-topics

# 3. 获取热点详情
curl http://localhost:3000/api/hot-topics/1

# 4. 手动触发扫描
curl -X POST http://localhost:3000/api/trigger/scan

# 5. 等待5分钟后再查看
curl http://localhost:3000/api/hot-topics
```

### 使用浏览器测试

直接访问：
- http://localhost:3000/health
- http://localhost:3000/api/hot-topics

---

## 📊 数据结构说明

### 热点话题对象

```typescript
{
  id: number;                 // 热点ID
  keyword: string;            // 关键词（如"索拉"）
  totalMentions: number;      // 代币数量
  hotScore: number;           // 热度分数
  firstSeenAt: string;        // 首次发现时间
  lastSeenAt: string;         // 最后更新时间
  matches: [                  // 匹配的代币列表
    {
      token: {
        id: number;
        name: string;          // "索拉拉"
        symbol: string;        // "SOLA"
        mintAddress: string;   // 合约地址
        logoUri: string;       // Logo URL
        marketData: [{
          price: number;              // 价格
          marketCap: number;          // 市值
          liquidityUsd: number;       // 流动性
          volume24h: number;          // 24h交易量
          priceChange24h: number;     // 24h涨跌幅
          holderCount: number;        // 持有人数 (Helius)
          transactionCount24h: number; // 交易数 (Helius)
        }],
        pools: [...]          // 流动性池
      },
      matchScore: number;     // 匹配分数
      matchType: string;      // 'cluster'
    }
  ]
}
```

---

## ✅ 总结

### 后端接口在这里

**文件位置**：
- 主接口：`backend/src/routes/index.ts`
- 触发接口：`backend/src/routes/manual-trigger.ts`

**接口地址**：
```
http://localhost:3000/api/hot-topics
http://localhost:3000/api/hot-topics/:id
http://localhost:3000/api/tokens/:mintAddress
http://localhost:3000/api/tokens/:mintAddress/full
http://localhost:3000/api/trigger/scan
```

### 前端调用方式

**已创建的工具**：
- `frontend/src/api/index.js` - HTTP API调用
- `frontend/src/api/socket.js` - WebSocket实时订阅

**使用**：
```jsx
import { getHotTopics } from './api';
import { subscribeToTopics } from './api/socket';

// HTTP调用
const data = await getHotTopics({ page: 1 });

// WebSocket订阅
subscribeToTopics((newTopic) => {
  console.log('新热点:', newTopic);
});
```

现在你可以在前端任意组件中导入这些API函数来调用后端了！🚀
