# 🎯 Trend Hunter - Solana Meme Coin Discovery Platform

链上按主题分类的meme信息聚合平台，监控市场热点梗，将链上同一主题代币并以统一可视化展示，供meme交易员全面分析相关同一主题的相关代币

## ✨ 核心功能

- 🤖 **智能聚类**: 使用聚类算法自动识别和分类相似的 Meme 币
- 📊 **实时监控**: 每秒捕获 Solana 链上新发射的代币
- 🎯 **自动主题**: 系统自动创建主题并归类相似代币
- 💎 **市场数据**: 实时价格、市值、流动性数据
- 💰 **一键交易**: 集成 Jupiter DEX 聚合器
- 🔐 **钱包集成**: 支持 Phantom 钱包


## 📦 项目结构

```
trend-hunter/
├── backend/              # Node.js + TypeScript 后端
│   ├── src/
│   │   ├── routes/      # API 路由
│   │   ├── services/    # 业务逻辑
│   │   └── utils/       # 工具函数
│   └── prisma/
│       ├── schema.prisma
│       └── dev.db       # SQLite 数据库 (含演示数据)
├── frontend/             # React + Vite 前端
│   └── src/
│       ├── components/  # React 组件
│       └── api/         # API 调用
└── python-clustering/    # Python AI 聚类服务
    ├── clustering.py
    └── simple_cluster_server.py
```



## 🎯 工作原理

1. **数据获取**: DexScreener API 每秒获取新代币
2. **实时聚类**: 发现新代币立即触发 Python 聚类算法
3. **主题创建**: 找到 3+ 相似代币时自动创建主题
4. **前端展示**: 用户主题 + 系统主题（带 🤖 标记）



## 🐛 常见问题

详见 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📄 License

MIT

## 👥 贡献

欢迎提交 Issues 和 Pull Requests！

---

**Happy Hunting! 🚀**
