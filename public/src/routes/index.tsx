import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { BatchesPage } from '../pages/BatchesPage'
import { DashboardPage } from '../pages/DashboardPage'
import { FilesPage } from '../pages/FilesPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProductDetailPage } from '../pages/ProductDetailPage'
import { ProductsPage } from '../pages/ProductsPage'
import { SettingsPage } from '../pages/SettingsPage'
import { AuthGuard } from './guards/AuthGuard'
import { GuestGuard } from './guards/GuestGuard'

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
            { path: 'settings', element: <SettingsPage /> },
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
