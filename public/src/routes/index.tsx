import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { AgentPage } from '../pages/AgentPage'
import { BatchesPage } from '../pages/BatchesPage'
import { DashboardPage } from '../pages/DashboardPage'
import { FilesPage } from '../pages/FilesPage'
import { HealthPage } from '../pages/HealthPage'
import { LogsPage } from '../pages/LogsPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProductDetailPage } from '../pages/ProductDetailPage'
import { ProductsPage } from '../pages/ProductsPage'
import { RoadmapPage } from '../pages/RoadmapPage'
import { SettingsPage } from '../pages/SettingsPage'
import { StorePage } from '../pages/StorePage'
import { SupportPage } from '../pages/SupportPage'
import { AuthGuard } from './guards/AuthGuard'
import { GuestGuard } from './guards/GuestGuard'
import { ServiceLegacyRedirect } from './ServiceLegacyRedirect'

const router = createBrowserRouter(
  [
    {
      element: <GuestGuard />,
      children: [{ path: '/login', element: <LoginPage /> }],
    },
    {
      element: <AuthGuard />,
      children: [
        {
          path: '/',
          element: <AppShell />,
          children: [
            { index: true, element: <DashboardPage /> },
            { path: 'batches', element: <BatchesPage /> },
            { path: 'products', element: <ProductsPage /> },
            { path: 'products/:id', element: <ProductDetailPage /> },
            { path: 'files', element: <FilesPage /> },
            { path: 'store', element: <StorePage /> },
            { path: 'logs', element: <LogsPage /> },
            { path: 'health', element: <HealthPage /> },
            { path: 'support', element: <SupportPage /> },
            { path: 'roadmap/:feature', element: <RoadmapPage /> },
            { path: 'agent/:section?', element: <AgentPage /> },
            { path: 'service/:section', element: <ServiceLegacyRedirect /> },
            { path: 'service', element: <Navigate to="/" replace /> },
            { path: 'settings/service', element: <Navigate to="/health" replace /> },
            { path: 'settings', element: <Navigate to="/settings/ai" replace /> },
            { path: 'settings/:section?', element: <SettingsPage /> },
          ],
        },
      ],
    },
    { path: '*', element: <NotFoundPage /> },
  ],
  { basename: '/ui' },
)

export function AppRouter() {
  return <RouterProvider router={router} />
}
