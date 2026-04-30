import { lazy } from 'react'

export const Home = lazy(() => import('@/pages/Home'))
export const Map = lazy(() => import('@/pages/Map'))
export const ModelViewer = lazy(() => import('@/pages/ModelViewer'))
export const TilesViewer = lazy(() => import('@/pages/TilesViewer'))
export const MapboxViewer = lazy(() => import('@/pages/MapboxViewer'))
export const MassDataViewer = lazy(() => import('@/pages/MassDataViewer'))