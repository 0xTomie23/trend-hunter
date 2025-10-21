import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, Spin, Typography, Space, Tag, Empty } from 'antd'
import { api } from '@/lib/api'

const { Title } = Typography

export default function TopicDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: topic, isLoading } = useQuery({
    queryKey: ['topic', id],
    queryFn: () => api.getTopic(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!topic) {
    return <Empty description="话题不存在" />
  }

  return (
    <div>
      <Title level={2}>#{topic.keyword}</Title>
      <Space style={{ marginBottom: 24 }}>
        <Tag>热度: {topic.hotScore}</Tag>
        <Tag>提及: {topic.totalMentions}次</Tag>
      </Space>

      <Card title="匹配的代币" style={{ marginBottom: 24 }}>
        {/* Token list */}
      </Card>

      <Card title="相关推文">
        {/* Tweet list */}
      </Card>
    </div>
  )
}

