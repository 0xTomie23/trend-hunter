import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from 'antd'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import TopicDetailPage from './pages/TopicDetailPage'
import TokenDetailPage from './pages/TokenDetailPage'

const { Content } = Layout

function App() {
  return (
    <BrowserRouter>
      <Layout style={{ minHeight: '100vh' }}>
        <Header />
        <Content style={{ padding: '24px 48px' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/topics/:id" element={<TopicDetailPage />} />
            <Route path="/tokens/:mintAddress" element={<TokenDetailPage />} />
          </Routes>
        </Content>
      </Layout>
    </BrowserRouter>
  )
}

export default App

