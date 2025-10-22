// 模拟加密货币数据（按话题划分，每个币只属于一个话题）
export const marketCategories = [
  'AI梗',
  '狗狗系',
  '政治梗',
  '游戏梗',
  '社交梗',
  '工具梗',
  '名人梗',
  '科幻梗'
];

export const cryptoData = [
  // AI梗
  { id: 1,  topic: 'AI梗', name: 'AIBonk',     symbol: 'AI_BONK',     time: '17h', volume: '1.5M',  price: '$12.5M', change: 1,   holders: '7.4K', ratio: '7/42', buyRatio: '6,687', buyDetail: '3,670/3,017', marketCap: '$2.6M',  starred: true },
  { id: 2,  topic: 'AI梗', name: 'GPTCat',     symbol: 'GPT_CAT',     time: '4h',  volume: '338.8K', price: '$1.2M',  change: 1.8, holders: '4.2K', ratio: '23/36', buyRatio: '3,371', buyDetail: '1,770/1,601', marketCap: '$541.8K', starred: true },

  // 狗狗系
  { id: 3,  topic: '狗狗系', name: 'DogeChef',  symbol: 'DOGE_CHEF',  time: '2h',  volume: '133.8K', price: '$632.2K', change: -0.8, holders: '1.9K', ratio: '4/17', buyRatio: '3,941', buyDetail: '2,250/1,691', marketCap: '$517.1K', starred: true },
  { id: 4,  topic: '狗狗系', name: 'BonkPlus', symbol: 'BONK_PLUS',  time: '108d',volume: '695.2K', price: '$5.7M',  change: 5,   holders: '5.9K', ratio: '11/111',buyRatio: '4,921', buyDetail: '2,624/2,397', marketCap: '$1.6M',  starred: false },

  // 政治梗
  { id: 5,  topic: '政治梗', name: 'VoteMeme', symbol: 'VOTE_MEME',  time: '4h',  volume: '206.6K', price: '$812.1K', change: -0.9, holders: '2.2K', ratio: '15/6',  buyRatio: '3,659', buyDetail: '2,206/1,453', marketCap: '$384K',  starred: false },
  { id: 6,  topic: '政治梗', name: 'GovPepe',  symbol: 'GOV_PEPE',   time: '1d',  volume: '420.2K', price: '$1.1M',  change: 2.2, holders: '3.1K', ratio: '12/21', buyRatio: '2,913', buyDetail: '1,522/1,391', marketCap: '$610K',  starred: false },

  // 游戏梗
  { id: 7,  topic: '游戏梗', name: 'Arena',    symbol: 'CRT_game',   time: '3h',  volume: '450.1K', price: '$932.4K', change: 3.1, holders: '2.8K', ratio: '18/29', buyRatio: '3,102', buyDetail: '1,701/1,401', marketCap: '$720K',  starred: false },
  { id: 8,  topic: '游戏梗', name: 'PixelKing',symbol: 'PIXEL_KING', time: '9h',  volume: '220.5K', price: '$530.2K', change: -1.2, holders: '1.5K', ratio: '9/12',  buyRatio: '1,902', buyDetail: '1,100/802',   marketCap: '$310K',  starred: false },

  // 社交梗
  { id: 9,  topic: '社交梗', name: 'Chirp',    symbol: 'CHIRP',      time: '2d',  volume: '310.9K', price: '$720.0K', change: 0.6, holders: '3.9K', ratio: '20/41', buyRatio: '2,211', buyDetail: '1,200/1,011', marketCap: '$480K',  starred: false },
  { id: 10, topic: '社交梗', name: 'PingPong', symbol: 'PING_PONG',  time: '5h',  volume: '120.3K', price: '$210.6K', change: -0.4, holders: '900', ratio: '5/8',   buyRatio: '1,102', buyDetail: '602/500',     marketCap: '$150K',  starred: false },

  // 工具梗
  { id: 11, topic: '工具梗', name: 'BotDex',   symbol: 'BOT_DEX',    time: '6h',  volume: '505.7K', price: '$1.9M',  change: 4.5, holders: '6.4K', ratio: '30/54', buyRatio: '4,521', buyDetail: '2,602/1,919', marketCap: '$1.2M',  starred: true },
  { id: 12, topic: '工具梗', name: 'ScanX',    symbol: 'SCAN_X',     time: '3d',  volume: '260.2K', price: '$430.0K', change: 0.3, holders: '1.8K', ratio: '8/15',  buyRatio: '1,301', buyDetail: '702/599',     marketCap: '$260K',  starred: false },

  // 名人梗
  { id: 13, topic: '名人梗', name: 'ElonPepe', symbol: 'ELON_PEPE',  time: '7h',  volume: '700.0K', price: '$2.1M',  change: 6.2, holders: '8.1K', ratio: '33/66', buyRatio: '5,211', buyDetail: '3,200/2,011', marketCap: '$1.8M',  starred: true },
  { id: 14, topic: '名人梗', name: 'KOLCoin',  symbol: 'KOL_COIN',   time: '12h', volume: '180.0K', price: '$330.0K', change: -1.5, holders: '1.2K', ratio: '6/10',  buyRatio: '1,023', buyDetail: '603/420',     marketCap: '$210K',  starred: false },

  // 科幻梗
  { id: 15, topic: '科幻梗', name: 'MarsDog',  symbol: 'MARS_DOG',   time: '1d',  volume: '390.0K', price: '$820.0K', change: 2.7, holders: '2.2K', ratio: '11/19', buyRatio: '2,231', buyDetail: '1,120/1,111', marketCap: '$600K',  starred: false },
  { id: 16, topic: '科幻梗', name: 'LaserCat', symbol: 'LASER_CAT',  time: '5h',  volume: '140.0K', price: '$210.0K', change: -0.7, holders: '870', ratio: '4/7',   buyRatio: '1,011', buyDetail: '530/481',     marketCap: '$140K',  starred: false },
];

// 时间过滤选项
export const timeFilters = ['1m', '5m', '1h', '6h', '24h'];