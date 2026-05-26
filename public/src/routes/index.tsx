import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { RootLayout } from '../layouts/RootLayout'
import { DashboardPage } from '../pages/DashboardPage'
import { NotFoundPage } from '../pages/NotFoundPage'

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <RootLayout />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { basename: '/ui' },
)

export function AppRouter() {
  return <RouterProvider router={router} />
}
