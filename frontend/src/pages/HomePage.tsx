import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Space, Tag, Select, Spin, Empty, Typography, Row, Col, Statistic, Button } from 'antd'
import { FireOutlined, TrophyOutlined, ClockCircleOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { api } from '@/lib/api'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Title, Text, Paragraph } = Typography

export default function HomePage() {
  const navigate = useNavigate()
  const [timeRange, setTimeRange] = useState('24h')
  const [sortBy, setSortBy] = useState('hot_score')

  const { data, isLoading } = useQuery({
    queryKey: ['hot-topics', timeRange, sortBy],
    queryFn: () => api.getHotTopics({ timeRange, sortBy }),
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  const topics = data?.data || []

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <FireOutlined /> 热点话题追踪
        </Title>
        <Paragraph type="secondary">
          实时监控Twitter KOL推文，发现热门话题并匹配链上Meme币
        </Paragraph>
      </div>

      <Space style={{ marginBottom: 24 }}>
        <Select
          value={timeRange}
          onChange={setTimeRange}
          style={{ width: 120 }}
          options={[
            { label: '1小时', value: '1h' },
            { label: '6小时', value: '6h' },
            { label: '24小时', value: '24h' },
            { label: '7天', value: '7d' },
          ]}
        />
        <Select
          value={sortBy}
          onChange={setSortBy}
          style={{ width: 120 }}
          options={[
            { label: '热度排序', value: 'hot_score' },
            { label: '最新', value: 'latest' },
            { label: '提及次数', value: 'mentions' },
          ]}
        />
      </Space>

      {topics.length === 0 ? (
        <Empty description="暂无热点话题" />
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {topics.map((topic: any) => (
            <Card
              key={topic.id}
              hoverable
              onClick={() => navigate(`/topics/${topic.id}`)}
            >
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Space>
                    <Tag color="blue" style={{ fontSize: 16 }}>
                      #{topic.keyword}
                    </Tag>
                    <Text type="secondary">
                      <ClockCircleOutlined /> {dayjs(topic.lastSeenAt).fromNow()}
                    </Text>
                  </Space>
                </div>

                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    <Statistic
                      title="热度分数"
                      value={topic.hotScore}
                      prefix={<FireOutlined />}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="提及次数"
                      value={topic.totalMentions}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="相关代币"
                      value={topic.matches?.length || 0}
                      suffix="个"
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="首次发现"
                      value={dayjs(topic.firstSeenAt).format('HH:mm')}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="最后更新"
                      value={dayjs(topic.lastSeenAt).fromNow()}
                    />
                  </Col>
                </Row>

                {topic.matches && topic.matches.length > 0 && (
                  <div>
                    <Text strong>匹配代币：</Text>
                    <Space wrap style={{ marginTop: 8 }}>
                      {topic.matches.slice(0, 5).map((match: any) => {
                        const latestMarketData = match.token.marketData?.[0]
                        const priceChange = latestMarketData?.priceChange24h || 0
                        
                        return (
                          <Card
                            key={match.token.id}
                            size="small"
                            hoverable
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/tokens/${match.token.mintAddress}`)
                            }}
                            style={{ width: 200 }}
                          >
                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                              <Space>
                                {match.token.logoUri && (
                                  <img
                                    src={match.token.logoUri}
                                    alt={match.token.symbol}
                                    style={{ width: 24, height: 24, borderRadius: '50%' }}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                  />
                                )}
                                <Text strong>{match.token.symbol}</Text>
                                <Tag color={
                                  match.matchType === 'exact' ? 'green' : 
                                  match.matchType === 'contains' ? 'blue' : 'default'
                                }>
                                  {(match.matchScore * 100).toFixed(0)}%
                                </Tag>
                              </Space>
                              
                              {latestMarketData && (
                                <>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    ${latestMarketData.price ? Number(latestMarketData.price).toFixed(6) : 'N/A'}
                                  </Text>
                                  <Space>
                                    <Tag
                                      color={priceChange >= 0 ? 'green' : 'red'}
                                      icon={priceChange >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                                    >
                                      {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                                    </Tag>
                                    {latestMarketData.marketCap && (
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        MC: ${(Number(latestMarketData.marketCap) / 1000).toFixed(1)}K
                                      </Text>
                                    )}
                                  </Space>
                                </>
                              )}
                            </Space>
                          </Card>
                        )
                      })}
                    </Space>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </Space>
      )}
    </div>
  )
}

