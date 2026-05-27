import { useMutation } from '@tanstack/react-query'
import { api, type ExportPayload, type ExportResult } from '../../lib/api'

export function useExportProductMutation() {
  return useMutation({
    mutationFn: (payload: ExportPayload) =>
      api<ExportResult>('/products/export', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  })
}
