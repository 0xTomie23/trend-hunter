import { Layout, Menu } from 'antd'
import { FireOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'

const { Header: AntHeader } = Layout

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    {
      key: '/',
      icon: <FireOutlined />,
      label: '热点追踪',
    },
  ]

  return (
    <AntHeader style={{ display: 'flex', alignItems: 'center', padding: '0 48px' }}>
      <div style={{ 
        color: 'white', 
        fontSize: '20px', 
        fontWeight: 'bold',
        marginRight: '40px'
      }}>
        🎯 TrendHunter
      </div>
      <Menu
        theme="dark"
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ flex: 1, minWidth: 0 }}
      />
    </AntHeader>
  )
}

