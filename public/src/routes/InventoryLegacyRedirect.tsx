import { Navigate, useLocation } from 'react-router-dom'

/** Legacy paths → /inventory/… */
export function InventoryLegacyRedirect({ section }: { section: 'batches' | 'products' | 'files' }) {
  const { search } = useLocation()
  return <Navigate to={`/inventory/${section}${search}`} replace />
}

export function InventoryProductLegacyRedirect() {
  const { pathname, search } = useLocation()
  const match = pathname.match(/^\/(?:data\/)?products\/(\d+)\/?$/)
  if (match) {
    return <Navigate to={`/inventory/products/${match[1]}${search}`} replace />
  }
  return <Navigate to="/inventory/products" replace />
}

/** /data/* → /inventory/* */
export function InventoryDataPathRedirect() {
  const { pathname, search } = useLocation()
  const next = pathname.replace(/^\/data/, '/inventory')
  return <Navigate to={`${next}${search}`} replace />
}
