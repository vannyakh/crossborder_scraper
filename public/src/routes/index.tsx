import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { AgentPage } from '../pages/AgentPage'
import { ArtifactPage } from '../pages/ArtifactPage'
import { DashboardPage } from '../pages/DashboardPage'
import { HealthPage } from '../pages/HealthPage'
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
import {
  PipelineLegacyRedirect,
  PipelinePathLegacyRedirect,
  PipelineProductLegacyRedirect,
} from './PipelineLegacyRedirect'
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
            { path: 'workflow', element: <Navigate to="/workflow/batches" replace /> },
            { path: 'workflow/batches', element: <WorkflowPage /> },
            { path: 'artifact/products/:id', element: <ProductDetailPage /> },
            { path: 'artifact', element: <Navigate to="/artifact/products" replace /> },
            { path: 'artifact/:section', element: <ArtifactPage /> },
            { path: 'inventory/*', element: <PipelinePathLegacyRedirect /> },
            { path: 'data/*', element: <PipelinePathLegacyRedirect /> },
            { path: 'batches', element: <PipelineLegacyRedirect section="batches" /> },
            { path: 'products/:id', element: <PipelineProductLegacyRedirect /> },
            { path: 'products', element: <PipelineLegacyRedirect section="products" /> },
            { path: 'files', element: <PipelineLegacyRedirect section="files" /> },
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
