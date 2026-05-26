import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { RootLayout } from '../layouts/RootLayout'
import { BatchesPage } from '../pages/BatchesPage'
import { DashboardPage } from '../pages/DashboardPage'
import { FilesPage } from '../pages/FilesPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProductDetailPage } from '../pages/ProductDetailPage'
import { ProductsPage } from '../pages/ProductsPage'

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <RootLayout />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'batches', element: <BatchesPage /> },
        { path: 'products', element: <ProductsPage /> },
        { path: 'products/:id', element: <ProductDetailPage /> },
        { path: 'files', element: <FilesPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: '/ui' },
)

export function AppRouter() {
  return <RouterProvider router={router} />
}
