import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Table, Button, Modal, Form, Input, Space, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { api } from '@/lib/api'

export default function KOLManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: kols, isLoading } = useQuery({
    queryKey: ['kols'],
    queryFn: api.getKOLs,
  })

  const createMutation = useMutation({
    mutationFn: api.createKOL,
    onSuccess: () => {
      message.success('添加成功')
      queryClient.invalidateQueries({ queryKey: ['kols'] })
      setIsModalOpen(false)
      form.resetFields()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteKOL,
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['kols'] })
    },
  })

  const columns = [
    {
      title: 'Twitter账号',
      dataIndex: 'twitterHandle',
      key: 'twitterHandle',
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '粉丝数',
      dataIndex: 'followersCount',
      key: 'followersCount',
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) => (active ? '活跃' : '已停用'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => deleteMutation.mutate(record.id)}
        >
          删除
        </Button>
      ),
    },
  ]

  const handleSubmit = (values: any) => {
    createMutation.mutate(values)
  }

  return (
    <div>
      <Card
        title="KOL管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            添加KOL
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={kols}
          loading={isLoading}
          rowKey="id"
        />
      </Card>

      <Modal
        title="添加KOL"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Twitter账号"
            name="twitterHandle"
            rules={[{ required: true, message: '请输入Twitter账号' }]}
          >
            <Input placeholder="例如: elonmusk" />
          </Form.Item>

          <Form.Item
            label="Twitter ID"
            name="twitterId"
            rules={[{ required: true, message: '请输入Twitter ID' }]}
          >
            <Input placeholder="例如: 44196397" />
          </Form.Item>

          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="例如: Elon Musk" />
          </Form.Item>

          <Form.Item label="优先级" name="priority" initialValue={0}>
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

