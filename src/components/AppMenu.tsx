import { Menu } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import { routes, type AppRoute } from '../router/routes'
import type { MenuProps } from 'antd'

const AppMenu = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // 🔥 递归生成菜单
  const generateMenu = (menus: AppRoute[]): MenuProps['items'] => {
    return menus.map((item) => ({
      key: item.path,
      icon: item.icon,
      label: item.name,
      children: item.children ? generateMenu(item.children) : undefined
    }))
  }

  const items = generateMenu(routes)

  // ✅ 自动展开当前路径
  const openKeys = location.pathname
    .split('/')
    .slice(1, -1)
    .map((_, i, arr) => '/' + arr.slice(0, i + 1).join('/'))

  return (
    <Menu
      mode="inline"
      theme="dark"
      items={items}
      selectedKeys={[location.pathname]}
      defaultOpenKeys={openKeys}
      onClick={({ key }) => navigate(key)}
      style={{ height: '100%' }}
    />
  )
}

export default AppMenu