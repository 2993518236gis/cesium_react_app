import { Layout, Button } from 'antd'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import AppMenu from '../components/AppMenu'

const { Header, Sider, Content } = Layout

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <Layout style={{ height: '100vh' }}>
      
      {/* ✅ 顶部 Header（独立一层） */}
      <Header
        style={{
          background: 'linear-gradient(90deg, #1a1a2e 0%, #16213e 100%)',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          
          {/* 折叠按钮 */}
          <Button
            type="text"
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 18, marginRight: 16,color: '#42b883' }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </Button>

          <span style={{ fontSize: 20, fontWeight: 700,color: '#42b883',letterSpacing: '0.03em' }}>
            🚀 WebGIS 可视化系统
          </span>
        </div>

        <div>admin</div>
      </Header>

      {/* ✅ 内容区（左右结构） */}
      <Layout>
        
        {/* 左侧菜单 */}
        <Sider
          collapsible
          collapsed={collapsed}
          trigger={null}
          width={220}
        >
          <AppMenu />
        </Sider>

        {/* 右侧内容 */}
        <Content>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout