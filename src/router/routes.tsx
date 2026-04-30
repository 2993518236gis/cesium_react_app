import type { ReactNode,LazyExoticComponent, ComponentType } from 'react'
import { HomeOutlined, GlobalOutlined, CarOutlined, BuildOutlined, EnvironmentOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Home, Map, ModelViewer, TilesViewer, MapboxViewer, MassDataViewer } from './lazy'

export interface AppRoute {
  path: string
  name: string
  component?: LazyExoticComponent<ComponentType>
  icon?: ReactNode
  children?: AppRoute[]
}

export const routes: AppRoute[] = [
  {
    path: '/',
    name: '首页',
    component: Home,
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
        component: Map
      },
      {
        path: '/map/3dtiles',
        name: '3D Tiles',
        icon: <BuildOutlined />,
        component: TilesViewer
      },
      {
        path: '/map/models',
        name: '3D 模型',
        icon: <CarOutlined />,
        component: ModelViewer
      },
      {
        path: '/map/mapbox',
        name: 'MapboxGL',
        icon: <EnvironmentOutlined />,
        component: MapboxViewer
      },
      {
        path: '/map/massdata',
        name: '大规模渲染',
        icon: <ThunderboltOutlined />,
        component: MassDataViewer
      }
    ]
  }
]