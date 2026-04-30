import { createBrowserRouter } from 'react-router-dom'
import MainLayout from '../layout/MainLayout'
// import Home from '../pages/Home'
// import MapPage from '../pages/MapPage'
import { routes } from './routes'
import { transformRoutes } from '@/utils/transformRoutes'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: transformRoutes(routes)
  }
])

export default router