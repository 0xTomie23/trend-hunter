# TrendHunter - 链上热点追踪平台

链上同一主题相关meme信息聚合平台，监控市场热点梗，将链上同一主题代币并以统一可视化展示，供meme交易员全面分析相关同一主题的相关代币

## 功能特性

- 🔥 **实时热点追踪**: 监控链上meme coin，自动提取热点话题
- 🔍 **智能匹配**: 根据关键词匹配链上同名或相关的Meme代币
- 📊 **市场数据**: 集成Helius RPC，获取代币市值、价格、持有人数等完整信息
- 📈 **实时更新**: WebSocket实时推送新热点和代币数据更新
- 🎯 **精准评分**: 多维度匹配评分系统，快速识别高质量机会

## 项目结构

```
trend-hunter/
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

