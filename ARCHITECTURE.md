# Meme Coin 热点追踪平台 - 技术架构设计

## 一、系统架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                          前端展示层                               │
│                     (React + TypeScript)                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │ REST API / WebSocket
┌───────────────────────────────┴─────────────────────────────────┐
│                          后端服务层                               │
│                     (Node.js + Express)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  API Gateway │  │  WebSocket   │  │   数据聚合服务        │  │
│  │              │  │   Server     │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────┴─────────────────────────────────┐
│                         核心业务层                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Twitter 监控    │  │  链上数据抓取    │  │   匹配引擎       │ │
│  │   服务          │  │    服务         │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────┴─────────────────────────────────┐
│                        数据存储层                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  PostgreSQL  │  │    Redis     │  │   Elasticsearch      │  │
│  │  (主数据库)   │  │   (缓存)     │  │   (搜索引擎)          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────┴─────────────────────────────────┐
│                        外部服务层                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Twitter API  │  │  Helius RPC  │  │  DexScreener API     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 二、技术栈选择

### 2.1 前端技术栈
- **框架**: React 18 + TypeScript
- **UI组件库**: Ant Design / shadcn/ui
- **状态管理**: Zustand / Jotai
- **数据请求**: TanStack Query (React Query)
- **实时通信**: Socket.io-client
- **图表**: Recharts / Apache ECharts
- **构建工具**: Vite

### 2.2 后端技术栈
- **运行时**: Node.js 20+ / Bun
- **框架**: Express.js / Fastify
- **语言**: TypeScript
- **任务队列**: Bull (基于Redis)
- **实时通信**: Socket.io
- **定时任务**: node-cron
- **进程管理**: PM2

### 2.3 数据存储
- **主数据库**: PostgreSQL 15+
- **缓存**: Redis 7+
- **搜索引擎**: Elasticsearch (可选)
- **ORM**: Prisma / Drizzle ORM

### 2.4 区块链相关
- **RPC服务**: Helius
- **Solana SDK**: @solana/web3.js
- **代币信息**: Jupiter API / DexScreener API

## 三、核心模块设计

### 3.1 Twitter 监控服务

**职责**: 监控指定KOL的推文，提取热点话题

**功能**:
- KOL列表管理（可配置）
- 实时监控推文（Twitter API v2）
- 推文分析与热词提取（NLP）
- 热点话题识别与评分
- 推文存储与去重

**技术方案**:
```typescript
// Twitter Monitor Service
class TwitterMonitor {
  // 轮询或Stream方式监控
  async monitorKOLs(kolList: string[])
  
  // 提取关键词
  async extractKeywords(tweet: Tweet): string[]
  
  // 计算热度分数
  calculateHotScore(tweet: Tweet): number
  
  // 触发链上搜索
  async triggerOnChainSearch(keywords: string[])
}
```

**数据模型**:
```sql
-- KOL列表
CREATE TABLE kols (
  id SERIAL PRIMARY KEY,
  twitter_handle VARCHAR(100) UNIQUE,
  twitter_id VARCHAR(100),
  name VARCHAR(200),
  followers_count INTEGER,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 推文记录
CREATE TABLE tweets (
  id SERIAL PRIMARY KEY,
  tweet_id VARCHAR(100) UNIQUE,
  kol_id INTEGER REFERENCES kols(id),
  content TEXT,
  keywords JSONB,
  hot_score FLOAT,
  likes INTEGER,
  retweets INTEGER,
  replies INTEGER,
  created_at TIMESTAMP,
  indexed_at TIMESTAMP DEFAULT NOW()
);

-- 热点话题
CREATE TABLE hot_topics (
  id SERIAL PRIMARY KEY,
  keyword VARCHAR(200),
  total_mentions INTEGER,
  hot_score FLOAT,
  related_tweets JSONB,
  first_seen_at TIMESTAMP,
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.2 链上数据抓取服务

**职责**: 通过Helius RPC获取链上meme币信息

**功能**:
- 根据关键词搜索代币（名称、symbol匹配）
- 获取代币基础信息
- 获取市值、持有人数、交易数据
- 获取流动性池信息
- 获取价格走势
- 数据缓存与更新

**技术方案**:
```typescript
// Chain Data Service
class ChainDataService {
  private heliusClient: HeliusClient;
  
  // 搜索匹配的代币
  async searchTokensByKeyword(keyword: string): Token[]
  
  // 获取代币详细信息
  async getTokenDetails(mintAddress: string): TokenDetails
  
  // 获取持有人信息
  async getHolderInfo(mintAddress: string): HolderInfo
  
  // 获取交易数据
  async getTransactionStats(mintAddress: string): TransactionStats
  
  // 获取流动性池信息
  async getPoolInfo(mintAddress: string): PoolInfo
  
  // 批量更新代币数据
  async batchUpdateTokens(tokens: string[]): void
}

// Helius API 集成
interface HeliusClient {
  // DAS API - 获取代币元数据
  getAsset(mintAddress: string): Promise<Asset>
  
  // 获取代币账户
  getTokenAccounts(mintAddress: string): Promise<TokenAccount[]>
  
  // 获取交易历史
  getTransactionHistory(address: string): Promise<Transaction[]>
  
  // Webhook 订阅（实时更新）
  subscribeToAddress(address: string, callback: Function): void
}
```

**数据模型**:
```sql
-- 代币基础信息
CREATE TABLE tokens (
  id SERIAL PRIMARY KEY,
  mint_address VARCHAR(44) UNIQUE,
  name VARCHAR(200),
  symbol VARCHAR(50),
  decimals INTEGER,
  logo_uri TEXT,
  description TEXT,
  creator_address VARCHAR(44),
  created_at TIMESTAMP,
  indexed_at TIMESTAMP DEFAULT NOW()
);

-- 代币市场数据（时序数据）
CREATE TABLE token_market_data (
  id SERIAL PRIMARY KEY,
  token_id INTEGER REFERENCES tokens(id),
  market_cap NUMERIC,
  price NUMERIC,
  price_change_24h FLOAT,
  volume_24h NUMERIC,
  holder_count INTEGER,
  transaction_count_24h INTEGER,
  liquidity_usd NUMERIC,
  fdv NUMERIC,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 流动性池信息
CREATE TABLE liquidity_pools (
  id SERIAL PRIMARY KEY,
  token_id INTEGER REFERENCES tokens(id),
  pool_address VARCHAR(44),
  dex VARCHAR(50),
  base_token VARCHAR(44),
  quote_token VARCHAR(44),
  liquidity_usd NUMERIC,
  volume_24h NUMERIC,
  created_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 持有人快照
CREATE TABLE holder_snapshots (
  id SERIAL PRIMARY KEY,
  token_id INTEGER REFERENCES tokens(id),
  total_holders INTEGER,
  top_10_percentage FLOAT,
  top_20_percentage FLOAT,
  snapshot_at TIMESTAMP DEFAULT NOW()
);
```

### 3.3 匹配引擎

**职责**: 将推文热点与链上代币进行智能匹配

**功能**:
- 关键词与代币名称/symbol模糊匹配
- 相似度评分
- 过滤低质量代币
- 匹配结果排序
- 匹配历史记录

**技术方案**:
```typescript
class MatchingEngine {
  // 匹配算法
  async matchTokensWithTopic(
    topic: HotTopic,
    tokens: Token[]
  ): MatchResult[] {
    // 1. 文本相似度匹配（Levenshtein距离、余弦相似度）
    // 2. 时间相关性（代币创建时间 vs 推文时间）
    // 3. 市场指标过滤（最低市值、最小持有人数等）
    // 4. 综合评分排序
  }
  
  // 计算匹配分数
  calculateMatchScore(
    topic: HotTopic,
    token: Token,
    marketData: TokenMarketData
  ): number {
    const textSimilarity = this.textSimilarity(topic.keyword, token.name);
    const timeRelevance = this.timeRelevance(topic.first_seen_at, token.created_at);
    const qualityScore = this.qualityScore(marketData);
    
    return textSimilarity * 0.4 + timeRelevance * 0.3 + qualityScore * 0.3;
  }
}
```

**数据模型**:
```sql
-- 匹配结果
CREATE TABLE topic_token_matches (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES hot_topics(id),
  token_id INTEGER REFERENCES tokens(id),
  match_score FLOAT,
  match_type VARCHAR(50), -- exact, fuzzy, related
  matched_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(topic_id, token_id)
);
```

### 3.4 数据聚合服务

**职责**: 整合数据，为前端提供统一API

**功能**:
- 聚合推文、代币、匹配结果
- 数据排序与分页
- 实时数据推送
- 数据过滤与搜索

**API设计**:
```typescript
// REST API

// 获取热点列表
GET /api/hot-topics
Query: {
  page: number
  limit: number
  timeRange: '1h' | '6h' | '24h' | '7d'
  sortBy: 'hot_score' | 'latest' | 'mentions'
}

// 获取热点详情（包含匹配的代币）
GET /api/hot-topics/:id
Response: {
  topic: HotTopic
  relatedTweets: Tweet[]
  matchedTokens: Array<{
    token: Token
    marketData: TokenMarketData
    matchScore: number
    pools: LiquidityPool[]
  }>
}

// 获取代币详情
GET /api/tokens/:mintAddress
Response: {
  token: Token
  marketData: TokenMarketData
  holderInfo: HolderSnapshot
  pools: LiquidityPool[]
  priceHistory: PricePoint[]
  relatedTopics: HotTopic[]
}

// 搜索代币
GET /api/tokens/search
Query: {
  keyword: string
  minMarketCap?: number
  minHolders?: number
  maxAge?: string
}

// KOL管理
GET /api/kols
POST /api/kols
PUT /api/kols/:id
DELETE /api/kols/:id

// WebSocket Events
ws://api/events
Events:
  - new_hot_topic
  - token_matched
  - market_data_update
  - new_tweet
```

## 四、前端页面设计

### 4.1 页面结构

```
/                           # 首页 - 热点列表
/topics/:id                 # 热点详情页
/tokens/:mintAddress        # 代币详情页
/kols                       # KOL管理页
/settings                   # 设置页
```

### 4.2 主要组件

**热点列表页**:
```tsx
<HotTopicsPage>
  <FilterBar />              {/* 时间范围、排序方式 */}
  <TopicList>
    <TopicCard>
      <TopicInfo />          {/* 关键词、热度、提及次数 */}
      <RelatedTweets />      {/* 相关推文预览 */}
      <MatchedTokens>
        <TokenCard>
          <TokenBasicInfo /> {/* 名称、symbol、logo */}
          <MarketMetrics />  {/* 市值、价格、涨跌幅 */}
          <QuickActions />   {/* 查看详情、交易链接 */}
        </TokenCard>
      </MatchedTokens>
    </TopicCard>
  </TopicList>
</HotTopicsPage>
```

**代币详情页**:
```tsx
<TokenDetailPage>
  <TokenHeader />            {/* 基础信息、价格 */}
  <MetricsGrid>
    <MetricCard title="市值" />
    <MetricCard title="持有人数" />
    <MetricCard title="24h交易量" />
    <MetricCard title="流动性" />
  </MetricsGrid>
  <PriceChart />             {/* 价格走势图 */}
  <PoolsTable />             {/* 流动性池列表 */}
  <HolderDistribution />     {/* 持有人分布图 */}
  <RelatedTopics />          {/* 相关热点 */}
  <TransactionHistory />     {/* 交易历史 */}
</TokenDetailPage>
```

## 五、关键技术实现

### 5.1 Twitter 监控实现

**方案1: Twitter API v2 (推荐)**
```typescript
import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi(bearerToken);

// 方式1: 定时轮询
async function pollKOLTweets() {
  const kols = await getKOLList();
  
  for (const kol of kols) {
    const tweets = await client.v2.userTimeline(kol.twitter_id, {
      max_results: 10,
      since_id: kol.last_tweet_id
    });
    
    for (const tweet of tweets.data) {
      await processTweet(tweet, kol);
    }
  }
}

// 方式2: Filtered Stream (实时)
async function streamKOLTweets() {
  const kols = await getKOLList();
  const userIds = kols.map(k => k.twitter_id);
  
  await client.v2.updateStreamRules({
    add: [{ value: `from:${userIds.join(' OR from:')}` }]
  });
  
  const stream = await client.v2.searchStream({
    'tweet.fields': ['created_at', 'public_metrics'],
    expansions: ['author_id']
  });
  
  stream.on('data', async (tweet) => {
    await processTweet(tweet);
  });
}
```

**方案2: nitter-scraper (免费但不稳定)**
```typescript
import Nitter from 'nitter-scraper';

async function scrapeKOLTweets() {
  const kols = await getKOLList();
  
  for (const kol of kols) {
    const tweets = await Nitter.getTweets(kol.twitter_handle, {
      count: 20
    });
    
    for (const tweet of tweets) {
      await processTweet(tweet, kol);
    }
  }
}
```

### 5.2 Helius 集成

```typescript
import { Helius } from 'helius-sdk';

const helius = new Helius(process.env.HELIUS_API_KEY);

// 1. 搜索代币（通过DAS API）
async function searchTokens(keyword: string) {
  // Helius 不直接支持搜索，需要其他方式
  // 可以使用 Jupiter API 或 DexScreener API
  
  const response = await fetch(
    `https://api.dexscreener.com/latest/dex/search?q=${keyword}`
  );
  const data = await response.json();
  
  return data.pairs.filter(p => p.chainId === 'solana');
}

// 2. 获取代币元数据
async function getTokenMetadata(mintAddress: string) {
  const asset = await helius.rpc.getAsset({
    id: mintAddress
  });
  
  return {
    name: asset.content?.metadata?.name,
    symbol: asset.content?.metadata?.symbol,
    logo: asset.content?.files?.[0]?.uri,
    creator: asset.creators?.[0]?.address
  };
}

// 3. 获取持有人信息
async function getHolderCount(mintAddress: string) {
  const accounts = await helius.rpc.getTokenAccounts({
    mint: mintAddress,
    limit: 1000
  });
  
  return {
    holderCount: accounts.token_accounts.length,
    accounts: accounts.token_accounts
  };
}

// 4. 获取交易历史
async function getTransactionHistory(mintAddress: string) {
  const transactions = await helius.rpc.getAssetTransactions({
    id: mintAddress,
    page: 1,
    limit: 100
  });
  
  return transactions;
}

// 5. Webhook 实时监控
async function setupWebhook(tokenAddresses: string[]) {
  const webhook = await helius.createWebhook({
    accountAddresses: tokenAddresses,
    transactionTypes: ['SWAP', 'TRANSFER'],
    webhookURL: 'https://your-domain.com/webhooks/helius'
  });
  
  return webhook;
}
```

### 5.3 关键词提取与匹配

```typescript
import natural from 'natural';
import stringSimilarity from 'string-similarity';

// NLP 关键词提取
function extractKeywords(text: string): string[] {
  const TfIdf = natural.TfIdf;
  const tfidf = new TfIdf();
  
  tfidf.addDocument(text);
  
  const keywords: string[] = [];
  tfidf.listTerms(0).slice(0, 10).forEach(item => {
    if (item.tfidf > 0.5) {
      keywords.push(item.term);
    }
  });
  
  // 添加 hashtags 和 cashtags
  const hashtags = text.match(/#\w+/g) || [];
  const cashtags = text.match(/\$\w+/g) || [];
  
  return [...keywords, ...hashtags, ...cashtags].map(k => 
    k.replace(/^[#$]/, '').toLowerCase()
  );
}

// 文本相似度匹配
function calculateSimilarity(keyword: string, tokenName: string): number {
  const similarity = stringSimilarity.compareTwoStrings(
    keyword.toLowerCase(),
    tokenName.toLowerCase()
  );
  
  // 检查是否包含
  const contains = tokenName.toLowerCase().includes(keyword.toLowerCase());
  
  return contains ? Math.max(similarity, 0.8) : similarity;
}
```

### 5.4 实时数据推送

```typescript
import { Server } from 'socket.io';

const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// 客户端连接
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // 订阅热点更新
  socket.on('subscribe:topics', () => {
    socket.join('hot-topics');
  });
  
  // 订阅特定代币
  socket.on('subscribe:token', (mintAddress) => {
    socket.join(`token:${mintAddress}`);
  });
});

// 推送新热点
export function broadcastNewTopic(topic: HotTopic) {
  io.to('hot-topics').emit('new_topic', topic);
}

// 推送代币更新
export function broadcastTokenUpdate(mintAddress: string, data: any) {
  io.to(`token:${mintAddress}`).emit('market_update', data);
}
```

## 六、部署方案

### 6.1 开发环境
```bash
# 本地开发
docker-compose up -d  # PostgreSQL, Redis
npm run dev           # 启动后端
cd frontend && npm run dev  # 启动前端
```

### 6.2 生产环境

**方案1: VPS 部署**
- 服务器: Ubuntu 22.04
- 反向代理: Nginx
- 进程管理: PM2
- 数据库: PostgreSQL (RDS)
- 缓存: Redis (ElastiCache)
- 监控: Grafana + Prometheus

**方案2: 容器化部署**
- Docker + Docker Compose
- 或使用 Kubernetes

**方案3: Serverless (部分功能)**
- Frontend: Vercel / Netlify
- Backend API: AWS Lambda / Cloudflare Workers
- Database: Supabase / PlanetScale
- Cache: Upstash Redis

### 6.3 CI/CD
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - run: npm run test
      - name: Deploy to server
        run: |
          # SSH 部署或 Docker 部署
```

## 七、性能优化建议

1. **数据缓存**: 使用 Redis 缓存热点数据（代币信息、市场数据）
2. **数据库索引**: 为常用查询字段添加索引
3. **分页加载**: 前端使用虚拟滚动或分页
4. **CDN加速**: 静态资源使用CDN
5. **API限流**: 防止滥用
6. **数据更新策略**: 
   - 高频数据（价格）: 30秒更新
   - 中频数据（持有人）: 5分钟更新
   - 低频数据（元数据）: 1小时更新

## 八、成本估算

- **Twitter API**: $100/月 (Basic Plan)
- **Helius RPC**: $50-200/月 (根据请求量)
- **服务器**: $20-50/月 (2-4核，4-8GB内存)
- **数据库**: $15-30/月
- **域名+SSL**: $15/年

总计: **约 $200-300/月**

## 九、开发路线图

### Phase 1: MVP (2-3周)
- [ ] 基础项目搭建
- [ ] Twitter KOL列表管理
- [ ] 推文抓取与存储
- [ ] 基础关键词提取
- [ ] Helius集成 - 代币信息获取
- [ ] 简单匹配算法
- [ ] 基础前端展示

### Phase 2: 增强功能 (2-3周)
- [ ] 实时推文监控
- [ ] 智能匹配算法优化
- [ ] 代币详情页
- [ ] 价格图表
- [ ] WebSocket实时推送
- [ ] 用户收藏/关注功能

### Phase 3: 高级功能 (3-4周)
- [ ] 高级过滤与搜索
- [ ] 交易信号提醒
- [ ] 历史数据分析
- [ ] 用户系统与权限
- [ ] 移动端适配
- [ ] API文档

### Phase 4: 优化与扩展 (持续)
- [ ] 性能优化
- [ ] 增加更多数据源
- [ ] AI分析与预测
- [ ] 社区功能
- [ ] 付费订阅功能

## 十、风险与挑战

1. **Twitter API限制**: 可能需要付费或使用替代方案
2. **链上数据准确性**: 需要多个数据源交叉验证
3. **实时性要求**: 需要优化数据更新策略
4. **成本控制**: API调用成本需要优化
5. **法律合规**: 数据使用需符合相关法律

## 十一、扩展方向

1. **多链支持**: 扩展到 ETH、Base、Polygon 等
2. **AI分析**: 使用机器学习预测热度
3. **交易集成**: 直接在平台交易
4. **社交功能**: 用户可以评论、分享
5. **移动APP**: iOS/Android 应用
6. **Telegram Bot**: 实时推送到TG
7. **数据API**: 提供数据API服务

