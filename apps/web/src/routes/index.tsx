import { createBrowserRouter, Navigate, RouterProvider, useLocation, useParams } from 'react-router-dom'
import { isRoadmapFeatureId, roadmapPath } from '../components/roadmap/roadmap-sections'
import { AppShell } from '../components/layout/AppShell'
import { AgentPage } from '../pages/AgentPage'
import { ArtifactPage } from '../pages/ArtifactPage'
import { DatabasesPage } from '../pages/DatabasesPage'
import { DashboardPage } from '../pages/DashboardPage'
import { HealthPage } from '../pages/HealthPage'
import { IntegratePage } from '../pages/IntegratePage'
import { MonitorPage } from '../pages/MonitorPage'
import { LogsPage } from '../pages/LogsPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProductDetailPage } from '../pages/ProductDetailPage'
import { RoadmapPage } from '../pages/RoadmapPage'
import { SettingsPage } from '../pages/SettingsPage'
import { StorePage } from '../pages/StorePage'
import { SupportPage } from '../pages/SupportPage'
import { WorkflowPage } from '../pages/WorkflowPage'
import { AuthGuard } from './guards/AuthGuard'
import { GuestGuard } from './guards/GuestGuard'

function RedirectPreserveSearch({ to }: { to: string }) {
  const { search } = useLocation()
  return <Navigate to={`${to}${search}`} replace />
}

function InventoryDataLegacyRedirect() {
  const { pathname, search } = useLocation()
  if (pathname.startsWith('/inventory/products/') || pathname.startsWith('/data/products/')) {
    const id = pathname.split('/').pop()
    return <Navigate to={`/artifact/products/${id}${search}`} replace />
  }
  if (pathname.includes('/products')) {
    return <Navigate to={`/artifact/products${search}`} replace />
  }
  if (pathname.includes('/files')) {
    return <Navigate to={`/artifact/files${search}`} replace />
  }
  return <Navigate to={`/workflow/batches${search}`} replace />
}

function ProductIdLegacyRedirect() {
  const { id } = useParams()
  const { search } = useLocation()
  return <Navigate to={`/artifact/products/${id}${search}`} replace />
}

function ServiceSectionLegacyRedirect() {
  const { section } = useParams<{ section?: string }>()

  if (!section || section === 'overview') {
    return <Navigate to="/" replace />
  }
  if (section === 'health') {
    return <Navigate to="/health" replace />
  }
  if (section === 'support') {
    return <Navigate to="/support" replace />
  }
  if (isRoadmapFeatureId(section)) {
    return <Navigate to={roadmapPath(section)} replace />
  }

  return <Navigate to="/" replace />
}

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
            { path: 'workflow', element: <Navigate to="/workflow/batches" replace /> },
            { path: 'workflow/batches', element: <WorkflowPage /> },
            { path: 'artifact/products/:id', element: <ProductDetailPage /> },
            { path: 'artifact', element: <Navigate to="/artifact/products" replace /> },
            { path: 'artifact/:section', element: <ArtifactPage /> },
            { path: 'inventory/*', element: <InventoryDataLegacyRedirect /> },
            { path: 'data/*', element: <InventoryDataLegacyRedirect /> },
            { path: 'batches', element: <RedirectPreserveSearch to="/workflow/batches" /> },
            { path: 'products/:id', element: <ProductIdLegacyRedirect /> },
            { path: 'products', element: <RedirectPreserveSearch to="/artifact/products" /> },
            { path: 'files', element: <RedirectPreserveSearch to="/artifact/files" /> },
            { path: 'monitor', element: <MonitorPage /> },
            { path: 'store', element: <StorePage /> },
            { path: 'databases', element: <Navigate to="/databases/mysql" replace /> },
            { path: 'databases/:section', element: <DatabasesPage /> },
            { path: 'logs', element: <LogsPage /> },
            { path: 'health', element: <HealthPage /> },
            { path: 'support', element: <SupportPage /> },
            { path: 'roadmap/:feature', element: <RoadmapPage /> },
            { path: 'agent/telegram', element: <Navigate to="/integrate/telegram" replace /> },
            { path: 'agent/:section?', element: <AgentPage /> },
            { path: 'integrate/:section?', element: <IntegratePage /> },
            { path: 'service/:section', element: <ServiceSectionLegacyRedirect /> },
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
