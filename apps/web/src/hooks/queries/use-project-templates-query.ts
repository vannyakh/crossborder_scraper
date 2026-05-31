import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys } from '../../lib/api'
import {
  mapProjectDetail,
  type ApiProjectTemplateDetail,
  type ApiProjectTemplateList,
  type ApiProjectTemplateUseResponse,
} from '../../lib/api/project-map'
import type { ProjectEnvironment } from '../../components/projects/project-sample-data'

export function useProjectTemplatesQuery(category?: string) {
  return useQuery({
    queryKey: queryKeys.projectTemplates(category),
    queryFn: async () => {
      const suffix = category ? `?category=${encodeURIComponent(category)}` : ''
      return api<ApiProjectTemplateList>(`/projects/templates${suffix}`)
    },
  })
}

export function useProjectTemplateQuery(templateId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projectTemplate(templateId ?? ''),
    queryFn: async () =>
      api<ApiProjectTemplateDetail>(`/projects/templates/${encodeURIComponent(templateId!)}`),
    enabled: Boolean(templateId),
  })
}

export function useProjectTemplateUseMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      templateId: string
      name?: string
      environment?: ProjectEnvironment
      description?: string
    }) => {
      const { templateId, ...body } = payload
      const res = await api<ApiProjectTemplateUseResponse>(
        `/projects/templates/${encodeURIComponent(templateId)}/use`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      )
      return {
        ...res,
        project: mapProjectDetail(res.project),
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projectsList })
    },
  })
}
