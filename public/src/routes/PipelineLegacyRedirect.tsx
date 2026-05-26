import { Navigate, useLocation } from 'react-router-dom'

/** Legacy top-level paths → workflow / artifact */
export function PipelineLegacyRedirect({ section }: { section: 'batches' | 'products' | 'files' }) {
  const { search } = useLocation()
  const to = section === 'batches' ? `/workflow/batches${search}` : `/artifact/${section}${search}`
  return <Navigate to={to} replace />
}

export function PipelineProductLegacyRedirect() {
  const { pathname, search } = useLocation()
  const match = pathname.match(/\/products\/(\d+)/)
  if (match) {
    return <Navigate to={`/artifact/products/${match[1]}${search}`} replace />
  }
  return <Navigate to="/artifact/products" replace />
}

/** /inventory/* and /data/* → workflow or artifact */
export function PipelinePathLegacyRedirect() {
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
