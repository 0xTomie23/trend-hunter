# 快速开始指南

这是一个5分钟快速启动指南，帮助你快速运行Meme Tracker项目。

## 步骤 1: 获取API密钥

### Twitter API密钥

1. 访问 [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. 创建一个新的App
3. 在 "Keys and tokens" 标签页获取:
   - Bearer Token
   - API Key
   - API Secret

**注意**: 免费版Twitter API限额较低，建议申请 Elevated Access。

### Helius API密钥

1. 访问 [Helius](https://www.helius.dev/)
2. 注册账号
3. 创建新项目
4. 复制API Key

免费版每天有10,000次请求限额，对于测试足够了。

## 步骤 2: 启动数据库

确保已安装Docker，然后运行:

```bash
cd /Users/solana/meme-tracker
docker-compose up -d
```

验证数据库是否运行:

```bash
docker ps
```

你应该看到两个容器在运行:
- `meme-tracker-db` (PostgreSQL)
- `meme-tracker-redis` (Redis)

## 步骤 3: 配置后端

```bash
cd backend

# 复制环境变量文件
cp .env.example .env

# 编辑.env文件，填入你的API密钥
nano .env  # 或使用其他编辑器
```

`.env` 文件示例:

```env
PORT=3000
NODE_ENV=development

DATABASE_URL="postgresql://meme_tracker:meme_tracker_password@localhost:5432/meme_tracker?schema=public"
REDIS_URL="redis://localhost:6379"

TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAxxxxxxxxxxxxxxxx
HELIUS_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

CORS_ORIGIN=http://localhost:5173
```

## 步骤 4: 初始化数据库

```bash
# 安装后端依赖
npm install

# 生成Prisma客户端
npm run generate

# 运行数据库迁移
npm run migrate

# 填充示例数据
npm run seed
```

## 步骤 5: 启动后端

在 `backend` 目录下:

```bash
npm run dev
```

你应该看到:

```
[timestamp] [info]: Database connected
[timestamp] [info]: Initializing services...
[timestamp] [info]: Services initialized successfully
[timestamp] [info]: Cron jobs scheduled
[timestamp] [info]: Server running on port 3000
```

## 步骤 6: 启动前端

打开新终端窗口:

```bash
cd /Users/solana/meme-tracker/frontend

# 安装前端依赖
npm install

# 启动开发服务器
npm run dev
```

你应该看到:

```
  VITE v5.0.8  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## 步骤 7: 访问应用

在浏览器中打开: http://localhost:5173

## 步骤 8: 添加KOL并测试

1. 点击顶部导航栏的 "KOL管理"
2. 点击 "添加KOL" 按钮
3. 填入KOL信息（示例数据中已包含一些KOL）
4. 返回首页，等待系统抓取推文（每5分钟一次）

## 或者使用 monorepo 命令（推荐）

从项目根目录一键启动前后端:

```bash
cd /Users/solana/meme-tracker

# 安装所有依赖
npm install

# 配置后端环境变量（见步骤3）
cd backend
cp .env.example .env
# 编辑 .env...

# 初始化数据库（见步骤4）
npm run generate
npm run migrate
npm run seed

# 返回根目录，同时启动前后端
cd ..
npm run dev
```

## 验证系统运行

### 检查API

```bash
# 健康检查
curl http://localhost:3000/health

# 获取KOL列表
curl http://localhost:3000/api/kols

# 获取热点话题
curl http://localhost:3000/api/hot-topics
```

### 查看日志

后端日志会输出到:
- 控制台
- `backend/logs/combined.log`
- `backend/logs/error.log`

## 常见问题

### 1. 数据库连接失败

**错误**: `Error: P1001: Can't reach database server`

**解决**:
- 确保Docker容器在运行: `docker ps`
- 检查端口5432是否被占用: `lsof -i :5432`
- 验证DATABASE_URL是否正确

### 2. Twitter API 401错误

**错误**: `Unauthorized`

**解决**:
- 检查Bearer Token是否正确
- 确保Twitter App有读取权限
- 验证Token没有过期

### 3. Helius API错误

**错误**: `Invalid API key`

**解决**:
- 检查HELIUS_API_KEY是否正确
- 确认API key没有超出配额
- 验证网络连接

### 4. 前端无法连接后端

**错误**: `Network Error` 或 `CORS error`

**解决**:
- 确保后端在 http://localhost:3000 运行
- 检查CORS_ORIGIN配置
- 清除浏览器缓存

### 5. Prisma迁移失败

**错误**: `Migration failed`

**解决**:
```bash
# 重置数据库
npm run migrate -- reset

# 重新运行迁移
npm run migrate

# 重新填充数据
npm run seed
```

## 下一步

现在你的Meme Tracker已经运行起来了！接下来可以:

1. **添加更多KOL**: 在KOL管理页面添加你关注的KOL
2. **等待数据收集**: 系统会每5分钟抓取一次推文
3. **查看热点**: 首页会显示识别到的热点话题
4. **查看代币**: 点击代币卡片查看详细市场数据
5. **自定义配置**: 修改定时任务频率、匹配算法等

详细文档请查看:
- [完整README](./README.md)
- [架构文档](./ARCHITECTURE.md)

## 获取帮助

如果遇到问题:
1. 检查日志文件
2. 查看控制台错误信息
3. 阅读完整文档
4. 提交Issue

祝你使用愉快！🚀

