import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  useLocation,
  useParams,
} from 'react-router-dom'
import { isRoadmapFeatureId } from '../components/roadmap/roadmap-sections'
import { AppShell } from '../components/layout/AppShell'
import { AgentPage } from '../pages/AgentPage'
import { ArtifactPage } from '../pages/ArtifactPage'
import { DatabasesPage } from '../pages/DatabasesPage'
import { DashboardPage } from '../pages/DashboardPage'
import { DebugPage } from '../pages/DebugPage'
import { DockerPage } from '../pages/DockerPage'
import { FirewallPage } from '../pages/FirewallPage'
import { GuidesPage } from '../pages/GuidesPage'
import { HealthPage } from '../pages/HealthPage'
import { IntegratePage } from '../pages/IntegratePage'
import { MonitorPage } from '../pages/MonitorPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProductDetailPage } from '../pages/ProductDetailPage'
import { RoadmapPage } from '../pages/RoadmapPage'
import { SettingsPage } from '../pages/SettingsPage'
import { StorePage } from '../pages/StorePage'
import { SupportPage } from '../pages/SupportPage'
import { WorkflowPage } from '../pages/WorkflowPage'
import { ROUTE_PATHS, debugPath, integratePath, roadmapPath, settingsPath } from './route-config'
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
    return <Navigate to={`${ROUTE_PATHS.artifact.product(id ?? '')}${search}`} replace />
  }
  if (pathname.includes('/products')) {
    return <Navigate to={`${ROUTE_PATHS.artifact.products}${search}`} replace />
  }
  if (pathname.includes('/files')) {
    return <Navigate to={`${ROUTE_PATHS.artifact.files}${search}`} replace />
  }
  return <Navigate to={`${ROUTE_PATHS.workflow.batches}${search}`} replace />
}

function ProductIdLegacyRedirect() {
  const { id } = useParams()
  const { search } = useLocation()
  return <Navigate to={`${ROUTE_PATHS.artifact.product(id ?? '')}${search}`} replace />
}

function ServiceSectionLegacyRedirect() {
  const { section } = useParams<{ section?: string }>()

  if (!section || section === 'overview') {
    return <Navigate to={ROUTE_PATHS.home} replace />
  }
  if (section === 'health') {
    return <Navigate to={ROUTE_PATHS.health} replace />
  }
  if (section === 'support') {
    return <Navigate to={ROUTE_PATHS.support} replace />
  }
  if (isRoadmapFeatureId(section)) {
    return <Navigate to={roadmapPath(section)} replace />
  }

  return <Navigate to={ROUTE_PATHS.home} replace />
}

const router = createBrowserRouter(
  [
    {
      element: <GuestGuard />,
      children: [{ path: ROUTE_PATHS.login, element: <LoginPage /> }],
    },
    {
      element: <AuthGuard />,
      children: [
        {
          path: ROUTE_PATHS.home,
          element: <AppShell />,
          children: [
            { index: true, element: <DashboardPage /> },
            { path: 'workflow', element: <Navigate to={ROUTE_PATHS.workflow.batches} replace /> },
            { path: 'workflow/batches', element: <WorkflowPage /> },
            { path: 'artifact/products/:id', element: <ProductDetailPage /> },
            { path: 'artifact', element: <Navigate to={ROUTE_PATHS.artifact.products} replace /> },
            { path: 'artifact/:section', element: <ArtifactPage /> },
            { path: 'inventory/*', element: <InventoryDataLegacyRedirect /> },
            { path: 'data/*', element: <InventoryDataLegacyRedirect /> },
            {
              path: 'batches',
              element: <RedirectPreserveSearch to={ROUTE_PATHS.workflow.batches} />,
            },
            { path: 'products/:id', element: <ProductIdLegacyRedirect /> },
            {
              path: 'products',
              element: <RedirectPreserveSearch to={ROUTE_PATHS.artifact.products} />,
            },
            { path: 'files', element: <RedirectPreserveSearch to={ROUTE_PATHS.artifact.files} /> },
            { path: 'monitor', element: <MonitorPage /> },
            { path: 'store', element: <StorePage /> },
            { path: 'docker', element: <DockerPage /> },
            { path: 'firewall', element: <FirewallPage /> },
            {
              path: 'databases',
              element: <Navigate to={ROUTE_PATHS.databases.engine()} replace />,
            },
            { path: 'databases/:section', element: <DatabasesPage /> },
            {
              path: 'logs',
              element: <RedirectPreserveSearch to={ROUTE_PATHS.debug.section('logs')} />,
            },
            {
              path: 'debug',
              element: <Navigate to={debugPath('logs')} replace />,
            },
            { path: 'debug/:section?', element: <DebugPage /> },
            { path: 'health', element: <HealthPage /> },
            { path: 'guides', element: <GuidesPage /> },
            { path: 'support', element: <SupportPage /> },
            { path: 'roadmap/:feature', element: <RoadmapPage /> },
            {
              path: 'agent/telegram',
              element: <Navigate to={integratePath('telegram')} replace />,
            },
            {
              path: 'agent/tools',
              element: <Navigate to={debugPath('tools')} replace />,
            },
            { path: 'agent/:section?', element: <AgentPage /> },
            { path: 'integrate/:section?', element: <IntegratePage /> },
            { path: 'service/:section', element: <ServiceSectionLegacyRedirect /> },
            { path: 'service', element: <Navigate to={ROUTE_PATHS.home} replace /> },
            { path: 'settings/service', element: <Navigate to={ROUTE_PATHS.health} replace /> },
            { path: 'settings', element: <Navigate to={settingsPath()} replace /> },
            { path: 'settings/:section?', element: <SettingsPage /> },
            { path: '*', element: <NotFoundPage /> },
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

export {
  ROUTE_PATHS,
  agentPath,
  debugPath,
  integratePath,
  settingsPath,
  roadmapPath,
} from './route-config'
