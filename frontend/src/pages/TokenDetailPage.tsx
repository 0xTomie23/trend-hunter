import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, Spin, Typography, Empty } from 'antd'
import { api } from '@/lib/api'

const { Title } = Typography

export default function TokenDetailPage() {
  const { mintAddress } = useParams<{ mintAddress: string }>()

  const { data: token, isLoading } = useQuery({
    queryKey: ['token', mintAddress],
    queryFn: () => api.getToken(mintAddress!),
    enabled: !!mintAddress,
  })

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!token) {
    return <Empty description="代币不存在" />
  }

  return (
    <div>
      <Title level={2}>{token.name} ({token.symbol})</Title>
      <Card title="市场数据">
        {/* Market data */}
      </Card>
    </div>
  )
}

