import { withPanelPrefix } from './panel-prefix'

/** Example curl for project-scoped Bearer auth (panel origin + API prefix). */
export function projectBearerCurlExample(projectId: string): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://your-panel.example'
  const path = withPanelPrefix(`/projects/${encodeURIComponent(projectId)}/flow`)
  return [`curl -sS \\`, `  -H "Authorization: Bearer YOUR_TOKEN" \\`, `  "${origin}${path}"`].join(
    '\n',
  )
}
