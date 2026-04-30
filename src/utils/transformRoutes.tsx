import type { RouteObject } from 'react-router-dom'
import { Suspense } from 'react'
import { Spin } from 'antd'
import type { AppRoute } from '@/router/routes'

export function transformRoutes(appRoutes: AppRoute[]): RouteObject[] {
  return appRoutes.map(route => {
    const { component: Component, children, ...rest } = route

    return {
      ...rest,
      element: Component ? (
        <Suspense fallback={<Spin size="large" />}>
          <Component />
        </Suspense>
      ) : undefined,
      children: children ? transformRoutes(children) : undefined
    }
  })
}