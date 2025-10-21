// 模拟加密货币数据
export const cryptoData = [
  {
    id: 1,
    name: '索拉拉',
    symbol: 'CYIP_SOPR',
    time: '17h',
    volume: '1.5M',
    price: '$12.5M',
    change: 1,
    holders: '7.4K',
    ratio: '7/42',
    buyRatio: '6,687',
    buyDetail: '3,670/3,017',
    marketCap: '$2.6M',
    starred: true
  },
  {
    id: 2,
    name: 'Arena',
    symbol: 'CRT_game',
    time: '4d',
    volume: '338.8K',
    price: '$1.2M',
    change: 1.8,
    holders: '4.2K',
    ratio: '23/36',
    buyRatio: '3,371',
    buyDetail: '1,770/1,601',
    marketCap: '$541.8K',
    starred: true
  },
  {
    id: 3,
    name: '索拉拉人生',
    symbol: 'SNMO_HGnX',
    time: '2h',
    volume: '133.8K',
    price: '$632.2K',
    change: -0.8,
    holders: '1.9K',
    ratio: '4/17',
    buyRatio: '3,941',
    buyDetail: '2,250/1,691',
    marketCap: '$517.1K',
    starred: true
  },
  {
    id: 4,
    name: '旺柴',
    symbol: '83KG_bonk',
    time: '108d',
    volume: '695.2K',
    price: '$5.7M',
    change: 5,
    holders: '5.9K',
    ratio: '11/111',
    buyRatio: '4,921',
    buyDetail: '2,624/2,397',
    marketCap: '$1.6M',
    starred: false
  },
  {
    id: 5,
    name: 'PERC',
    symbol: 'CXvb_pump',
    time: '4h',
    volume: '206.6K',
    price: '$812.1K',
    change: -0.9,
    holders: '2.2K',
    ratio: '15/6',
    buyRatio: '3,659',
    buyDetail: '2,206/1,453',
    marketCap: '$384K',
    starred: false
  },
  {
    id: 6,
    name: 'LAUNCHCOIN',
    symbol: 'EVc9_XPnK',
    time: '270d',
    volume: '1.7M',
    price: '$66M',
    change: 6.9,
    holders: '21.9K',
    ratio: '25/214',
    buyRatio: '3,314',
    buyDetail: '1,756/1,558',
    marketCap: '$1M',
    starred: false
  }
];

// 时间过滤选项
export const timeFilters = ['1m', '5m', '1h', '6h', '24h'];

// 市场类别
export const marketCategories = ['热门', '飙升', '美股', '下个蓝筹'];