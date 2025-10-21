import { Layout, Menu } from 'antd'
import { FireOutlined, TeamOutlined, SettingOutlined } from '@ant-design/icons'
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
    {
      key: '/kols',
      icon: <TeamOutlined />,
      label: 'KOL管理',
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
        🚀 Meme Tracker
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

