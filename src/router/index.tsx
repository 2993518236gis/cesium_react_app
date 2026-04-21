import { createBrowserRouter } from 'react-router-dom'
import MainLayout from '../layout/MainLayout'
// import Home from '../pages/Home'
// import MapPage from '../pages/MapPage'
import { routes } from './routes'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: routes
  }
])

export default router