import type { ReactNode } from 'react'
import Home from '../pages/Home'
import Map from '../pages/Map'
import { HomeOutlined, GlobalOutlined } from '@ant-design/icons'

export interface AppRoute {
  path: string
  name: string
  element?: ReactNode
  icon?: ReactNode
  children?: AppRoute[]
}

export const routes: AppRoute[] = [
  {
    path: '/',
    name: '首页',
    element: <Home />,
    icon: <HomeOutlined />
  },
  {
    path: '/map',
    name: '三维地图',
    icon: <GlobalOutlined />,
    children: [
      {
        path: '/map/base',
        name: '基础地图',
        element: <Map />
      },
      {
        path: '/map/3dtiles',
        name: '3D Tiles',
        element: <Map />
      }
    ]
  }
]