# Meme Tracker - 链上热点追踪平台

一个实时监控Twitter KOL推文并自动匹配链上Meme币的数据聚合平台。

## 功能特性

- 🔥 **实时热点追踪**: 监控指定Twitter KOL的推文，自动提取热点话题
- 🔍 **智能匹配**: 根据关键词匹配链上同名或相关的Meme代币
- 📊 **市场数据**: 集成Helius RPC，获取代币市值、价格、持有人数等完整信息
- 💎 **流动性分析**: 展示DEX流动性池信息、交易量等关键指标
- 📈 **实时更新**: WebSocket实时推送新热点和代币数据更新
- 🎯 **精准评分**: 多维度匹配评分系统，快速识别高质量机会

## 技术栈

### 后端
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js + Socket.io
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **APIs**: Twitter API v2, Helius SDK, DexScreener API

### 前端
- **Framework**: React 18 + TypeScript
- **UI**: Ant Design
- **State**: TanStack Query + Zustand
- **Build**: Vite

## 快速开始

### 前置要求

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Twitter API 密钥
- Helius API 密钥

### 1. 克隆项目

```bash
cd /Users/solana/meme-tracker
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动数据库

使用Docker Compose启动PostgreSQL和Redis:

```bash
docker-compose up -d
```

### 4. 配置环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，填入你的API密钥:

```env
# Twitter API
TWITTER_BEARER_TOKEN=your_bearer_token_here

# Helius
HELIUS_API_KEY=your_helius_api_key_here

# Database
DATABASE_URL="postgresql://meme_tracker:meme_tracker_password@localhost:5432/meme_tracker?schema=public"
```

### 5. 初始化数据库

```bash
cd backend
npm run generate    # 生成Prisma客户端
npm run migrate     # 运行数据库迁移
```

### 6. 启动应用

```bash
# 从项目根目录启动前后端
npm run dev
```

- 后端API: http://localhost:3000
- 前端界面: http://localhost:5173

## 使用指南

### 添加KOL

1. 访问 http://localhost:5173/kols
2. 点击"添加KOL"按钮
3. 填入Twitter账号信息:
   - Twitter账号: 例如 `elonmusk`
   - Twitter ID: 可通过 [tweeterid.com](https://tweeterid.com/) 获取
   - 名称: 显示名称
   - 优先级: 数字越大优先级越高

### 查看热点

访问首页即可看到实时热点列表，包括:
- 热点关键词和热度分数
- 相关推文预览
- 匹配的代币及市场数据
- 24小时价格变化

### 查看代币详情

点击任意代币卡片可查看详细信息:
- 基础信息（名称、合约地址、创建时间）
- 市场数据（价格、市值、交易量）
- 持有人分布
- 流动性池信息
- 价格走势图
- 相关热点话题

## API文档

### 获取热点列表

```http
GET /api/hot-topics?page=1&limit=20&timeRange=24h&sortBy=hot_score
```

### 获取热点详情

```http
GET /api/hot-topics/:id
```

### 获取代币详情

```http
GET /api/tokens/:mintAddress
```

### KOL管理

```http
GET /api/kols              # 获取KOL列表
POST /api/kols             # 添加KOL
DELETE /api/kols/:id       # 删除KOL
```

## WebSocket事件

```javascript
// 连接
const socket = io('http://localhost:3000')

// 订阅热点更新
socket.emit('subscribe:topics')
socket.on('new_topic', (topic) => {
  console.log('新热点:', topic)
})

// 订阅代币更新
socket.emit('subscribe:token', mintAddress)
socket.on('market_update', (data) => {
  console.log('市场数据更新:', data)
})
```

## 项目结构

```
meme-tracker/
├── backend/                  # 后端服务
│   ├── prisma/
│   │   └── schema.prisma    # 数据库模型
│   └── src/
│       ├── index.ts         # 入口文件
│       ├── routes/          # API路由
│       ├── services/        # 业务逻辑
│       │   ├── twitter-monitor.ts    # Twitter监控
│       │   ├── chain-data.ts         # 链上数据
│       │   └── matching-engine.ts    # 匹配引擎
│       ├── lib/             # 工具库
│       └── utils/           # 工具函数
├── frontend/                # 前端应用
│   └── src/
│       ├── pages/           # 页面组件
│       ├── components/      # UI组件
│       └── lib/             # API客户端
├── docker-compose.yml       # Docker配置
└── README.md               # 本文件
```

## 配置说明

### 定时任务

系统默认配置了以下定时任务:

- **Twitter轮询**: 每5分钟抓取一次KOL推文
- **市场数据更新**: 每1分钟更新活跃代币的市场数据

可在 `backend/src/services/index.ts` 中修改。

### 匹配算法

匹配分数计算公式:

```
score = textSimilarity * 0.4 + exactnessBonus + qualityScore * 0.3
```

- **textSimilarity**: 文本相似度（0-1）
- **exactnessBonus**: 精确匹配加分（0-0.3）
- **qualityScore**: 市场质量分（0-0.4）

可在 `backend/src/services/matching-engine.ts` 中调整权重。

## 常见问题

### Q: Twitter API限流怎么办？

A: Twitter API v2有严格的速率限制。建议:
1. 使用Elevated Access提升限额
2. 增加轮询间隔
3. 使用Twitter Stream API替代轮询

### Q: Helius免费额度不够？

A: 免费版Helius限制较多，建议:
1. 升级到付费计划
2. 使用缓存减少API调用
3. 只更新活跃代币的数据

### Q: 如何提高匹配准确度？

A: 可以:
1. 调整匹配算法权重
2. 设置最低市值/流动性门槛
3. 添加更多过滤条件
4. 使用更精确的关键词提取算法

## 部署到生产环境

详见 [ARCHITECTURE.md](./ARCHITECTURE.md) 的部署章节。

简要步骤:
1. 使用环境变量管理配置
2. 配置Nginx反向代理
3. 使用PM2管理Node.js进程
4. 设置SSL证书
5. 配置监控和日志

## 贡献指南

欢迎提交Issue和Pull Request!

## 许可证

MIT

## 联系方式

如有问题，请提交Issue或联系开发者。

